from collections import OrderedDict, deque
import hashlib
import hmac
import re
import threading
import time
import urllib.error
import urllib.request
from urllib.parse import urlparse

try:
    from cachetools import TTLCache as _CachetoolsTTLCache
except ImportError:
    _CachetoolsTTLCache = None

try:
    from pydantic import BaseModel, Field, field_validator
except ImportError:
    BaseModel = None
    Field = None
    field_validator = None

ALLOWED_ORIGINS = frozenset(
    {
        "https://kiddwave.vercel.app",
        "http://localhost:5173",
    }
)

VIDEO_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{11}$")
GOOGLESAFETY_HOST_RE = re.compile(r"^[a-z0-9-]+\.googlevideo\.com$")
DISALLOWED_URL_SCHEME_RE = re.compile(r"(?:https?|ftp|file|javascript|data):", re.I)

# Sliding-window rate limiter defaults (25 req / 60s per IP + global burst cap)
_WINDOW_SECONDS = 60.0
_MAX_REQUESTS_PER_IP = 25
_MAX_TRACKED_IPS = 2000
_MAX_GLOBAL_PER_WINDOW = 200

_rate_lock = threading.Lock()
_ip_windows: dict[str, deque[float]] = {}
_global_window: deque[float] = deque()

# Bound concurrent yt-dlp / upstream extractions to protect CPU & RAM
EXTRACTION_SEMAPHORE = threading.BoundedSemaphore(value=4)


def extract_client_ip(headers, remote_addr: str = "unknown") -> str:
    """Extracts best-effort client IP from trusted proxy headers safely."""
    for header_name in ("x-real-ip", "x-vercel-forwarded-for", "x-forwarded-for"):
        raw = headers.get(header_name) if hasattr(headers, "get") else None
        if isinstance(raw, str) and raw.strip():
            first_ip = raw.split(",")[0].strip()[:64]
            if first_ip:
                return first_ip
    return (remote_addr or "unknown")[:64]


def is_rate_limited(client_ip: str, bucket: str = "default") -> bool:
    """Sliding-window per-IP rate limiter with bounded memory and global burst protection."""
    now = time.monotonic()
    cutoff = now - _WINDOW_SECONDS
    key = f"{bucket}:{(client_ip or 'unknown')[:64]}"

    with _rate_lock:
        while _global_window and _global_window[0] < cutoff:
            _global_window.popleft()
        if len(_global_window) >= _MAX_GLOBAL_PER_WINDOW:
            return True
        _global_window.append(now)

        if key not in _ip_windows and len(_ip_windows) >= _MAX_TRACKED_IPS:
            stale = [k for k, dq in _ip_windows.items() if not dq or dq[-1] < cutoff]
            for k in stale:
                _ip_windows.pop(k, None)
            while len(_ip_windows) >= _MAX_TRACKED_IPS:
                oldest_key = next(iter(_ip_windows))
                _ip_windows.pop(oldest_key, None)

        dq = _ip_windows.get(key)
        if dq is None:
            dq = deque()
            _ip_windows[key] = dq

        while dq and dq[0] < cutoff:
            dq.popleft()

        if len(dq) >= _MAX_REQUESTS_PER_IP:
            return True

        dq.append(now)
        return False


def evaluate_cors(origin: str | None, host: str | None = None) -> tuple[bool, dict[str, str]]:
    """
    Strictly enforces CORS allowlist:
    - Allows requests with no Origin header (same-origin GETs / native wrapper) with Vary: Origin
    - Allows https://kiddwave.vercel.app and http://localhost:5173
    - Allows exact same-host local preview origins on loopback/localhost if host matches
    - Blocks all unauthorized external cross-site origins with 403 and emits zero wildcard '*'
    """
    base_headers = {"Vary": "Origin"}
    allow_headers = "Content-Type, Range, X-KW-Timestamp, X-KW-Signature"
    clean_origin = (origin or "").strip()
    if not clean_origin:
        return True, base_headers

    if clean_origin in ALLOWED_ORIGINS:
        return True, {
            **base_headers,
            "Access-Control-Allow-Origin": clean_origin,
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": allow_headers,
            "Access-Control-Max-Age": "600",
        }

    # Allow exact same-host loopback during local dev preview (never wildcards or external hosts)
    if host:
        clean_host = host.strip().lower()
        if clean_host.startswith(("localhost:", "127.0.0.1:")) and clean_origin.lower() in {
            f"http://{clean_host}",
            f"https://{clean_host}",
        }:
            return True, {
                **base_headers,
                "Access-Control-Allow-Origin": clean_origin,
                "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                "Access-Control-Allow-Headers": allow_headers,
                "Access-Control-Max-Age": "600",
            }

    return False, base_headers


# Anti-bot / anti-scraping User-Agent blocklist
BLOCKED_USER_AGENT_TOKENS = (
    "curl/",
    "python-requests",
    "scrapy",
    "wget",
    "httpie",
    "go-http-client",
    "libwww-perl",
    "python-urllib",
    "aiohttp/",
)

REQUEST_SIGNATURE_WINDOW_SECONDS = 120
_CLIENT_TAG_BYTES = b"kw-v1-a8f4c291e5b07d33"
_HEX64_RE = re.compile(r"^[0-9a-fA-F]{64}$")
_DIGITS_RE = re.compile(r"^\d{9,12}$")


def is_blocked_user_agent(user_agent: str | None) -> bool:
    """Blocks empty or known automated CLI/scraper User-Agents with HTTP 403."""
    if not isinstance(user_agent, str) or not user_agent.strip():
        return True
    ua_lower = user_agent.strip().lower()
    return any(token in ua_lower for token in BLOCKED_USER_AGENT_TOKENS)


def _get_header_ci(headers, name: str) -> str | None:
    if headers is None:
        return None
    val = headers.get(name) if hasattr(headers, "get") else None
    if val is not None:
        return str(val)
    target = name.lower()
    if hasattr(headers, "items"):
        for k, v in headers.items():
            if str(k).lower() == target:
                return str(v)
    return None


def compute_request_signature(timestamp_str: str | int, path: str, param_value: str) -> str:
    payload = f"{str(timestamp_str).strip()}:{path.strip()}:{param_value.strip()}"
    return hmac.new(_CLIENT_TAG_BYTES, payload.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_request_signature(
    headers,
    params,
    path: str,
    param_value: str,
    *,
    allow_query_params: bool = False,
    now_unix: float | None = None,
) -> bool:
    """
    Verifies rotating HMAC-SHA256 signature within a ±120s time window.
    Accepts X-KW-Timestamp / X-KW-Signature headers, and optionally ts / sig
    query parameters for native HTML <audio src> media streaming requests.
    """
    ts_raw = _get_header_ci(headers, "x-kw-timestamp")
    sig_raw = _get_header_ci(headers, "x-kw-signature")

    if (not ts_raw or not sig_raw) and allow_query_params and params:
        raw_ts_param = params.get("ts")
        raw_sig_param = params.get("sig")
        if isinstance(raw_ts_param, list):
            ts_raw = raw_ts_param[0] if raw_ts_param else None
        elif isinstance(raw_ts_param, str):
            ts_raw = raw_ts_param
        if isinstance(raw_sig_param, list):
            sig_raw = raw_sig_param[0] if raw_sig_param else None
        elif isinstance(raw_sig_param, str):
            sig_raw = raw_sig_param

    if not ts_raw or not sig_raw:
        return False

    ts_clean = str(ts_raw).strip()
    sig_clean = str(sig_raw).strip()
    if not _DIGITS_RE.match(ts_clean) or not _HEX64_RE.match(sig_clean):
        return False

    now_val = time.time() if now_unix is None else float(now_unix)
    if abs(now_val - int(ts_clean)) > REQUEST_SIGNATURE_WINDOW_SECONDS:
        return False

    expected = compute_request_signature(ts_clean, path, param_value)
    return hmac.compare_digest(expected, sig_clean.lower())


def is_valid_video_id(vid: str | None) -> bool:
    return bool(isinstance(vid, str) and VIDEO_ID_RE.match(vid))


def sanitize_query(raw: str | None) -> str:
    """
    Strict search query sanitizer:
    - Strips control bytes and shell metacharacters
    - Blocks URL schemes (SSRF prevention)
    - Strips leading dashes so CLI flag injection (e.g., --exec) is impossible
    - Caps length at 100 chars
    """
    if raw is None:
        return ""
    q = str(raw)
    if DISALLOWED_URL_SCHEME_RE.search(q):
        return ""
    q = re.sub(r"[\x00-\x1f\x7f]", "", q)
    q = re.sub(r"[<>{}\"'`\\;|&$()]", "", q)
    q = re.sub(r"\s+", " ", q).strip()
    # Prevent leading hyphen/flag injection
    q = q.lstrip("-").strip()
    if len(q) > 100:
        q = q[:100].strip()
    return q


if BaseModel is not None:

    class SearchRequestModel(BaseModel):
        q: str = Field(default="", max_length=100)

        @field_validator("q", mode="before")
        @classmethod
        def _clean_q(cls, v):
            return sanitize_query(v)

    class AudioRequestModel(BaseModel):
        v: str = Field(min_length=11, max_length=11)

        @field_validator("v")
        @classmethod
        def _check_vid(cls, val: str) -> str:
            if not is_valid_video_id(val):
                raise ValueError("Invalid video ID format.")
            return val


def validate_search_query(raw: str | None) -> str:
    if BaseModel is not None:
        try:
            model = SearchRequestModel(q=sanitize_query(raw))
            return model.q
        except Exception:
            return ""
    return sanitize_query(raw)


def validate_audio_video_id(raw: str | None) -> str | None:
    candidate = (raw or "").strip()
    if BaseModel is not None:
        try:
            model = AudioRequestModel(v=candidate)
            return model.v
        except Exception:
            return None
    return candidate if is_valid_video_id(candidate) else None


def is_safe_googlevideo_url(url: str | None) -> bool:
    """Strictly validates HTTPS *.googlevideo.com stream URLs (SSRF defense)."""
    if not isinstance(url, str) or not url.startswith("https://") or len(url) > 2048:
        return False
    try:
        parsed = urlparse(url)
    except Exception:
        return False
    if parsed.scheme != "https":
        return False
    if parsed.username or parsed.password:
        return False
    if parsed.port not in (None, 443):
        return False
    host = (parsed.hostname or "").lower()
    return bool(GOOGLESAFETY_HOST_RE.match(host))


ALLOWED_MIRROR_AUDIO_HOSTS = frozenset(
    {
        "pipedapi.kavin.rocks",
        "pipedapi.adminforge.de",
        "api.piped.private.coffee",
        "inv.nadeko.net",
        "invidious.nerdvpn.de",
        "yewtu.be",
    }
)
PIPED_PROXY_HOST_RE = re.compile(r"^[a-z0-9-]+proxy[a-z0-9-]*\.[a-z0-9.-]+$")


def is_safe_upstream_audio_url(url: str | None) -> bool:
    """
    Validates HTTPS stream URLs from either googlevideo.com or explicit
    allowlisted Piped/Invidious mirror proxy hosts (SSRF defense).
    """
    if is_safe_googlevideo_url(url):
        return True
    if not isinstance(url, str) or not url.startswith("https://") or len(url) > 2048:
        return False
    try:
        parsed = urlparse(url)
    except Exception:
        return False
    if parsed.scheme != "https" or parsed.username or parsed.password:
        return False
    if parsed.port not in (None, 443):
        return False
    host = (parsed.hostname or "").lower()
    if host in ALLOWED_MIRROR_AUDIO_HOSTS:
        return True
    return bool(
        PIPED_PROXY_HOST_RE.match(host)
        and host.endswith((".kavin.rocks", ".adminforge.de", ".private.coffee"))
    )


class UpstreamRateLimitError(Exception):
    """Raised when an upstream provider rejects requests with HTTP 429 or 403."""


_cooldown_lock = threading.Lock()
_youtube_cooldown_until = 0.0


def is_upstream_rate_limit_error(exc: Exception) -> bool:
    code = getattr(exc, "code", None) or getattr(exc, "status", None)
    if code in (403, 429):
        return True
    msg = str(exc).lower()
    return any(
        token in msg
        for token in (
            "429",
            "too many requests",
            "http error 403",
            "status=403",
            "sign in to confirm",
            "rate limit",
            "quota",
        )
    )


def is_youtube_cooled_down(now_mono: float | None = None) -> bool:
    now_val = time.monotonic() if now_mono is None else float(now_mono)
    with _cooldown_lock:
        return now_val < _youtube_cooldown_until


def mark_youtube_cooldown(seconds: float = 60.0, now_mono: float | None = None) -> None:
    global _youtube_cooldown_until
    now_val = time.monotonic() if now_mono is None else float(now_mono)
    with _cooldown_lock:
        _youtube_cooldown_until = max(_youtube_cooldown_until, now_val + max(1.0, float(seconds)))


def reset_youtube_cooldown() -> None:
    global _youtube_cooldown_until
    with _cooldown_lock:
        _youtube_cooldown_until = 0.0


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code, "Upstream redirects disabled", headers, fp)


_NO_REDIRECT_OPENER = urllib.request.build_opener(_NoRedirectHandler())


def safe_urlopen(req: urllib.request.Request, timeout: float = 5.0):
    """Executes an outbound HTTP request with redirects disabled to block SSRF redirect pivots."""
    return _NO_REDIRECT_OPENER.open(req, timeout=timeout)


class SafeTTLCache:
    """Thread-safe bounded TTL cache backed by cachetools.TTLCache when installed."""

    def __init__(self, maxsize: int = 128, ttl: int = 1200):
        self._lock = threading.Lock()
        self._ttl = ttl
        self._maxsize = maxsize
        if _CachetoolsTTLCache is not None:
            self._store = _CachetoolsTTLCache(maxsize=maxsize, ttl=ttl)
            self._is_cachetools = True
        else:
            self._store = OrderedDict()
            self._is_cachetools = False

    def get(self, key: str):
        with self._lock:
            if self._is_cachetools:
                return self._store.get(key)
            entry = self._store.get(key)
            if not entry:
                return None
            expires_at, val = entry
            if time.monotonic() > expires_at:
                self._store.pop(key, None)
                return None
            self._store.move_to_end(key)
            return val

    def set(self, key: str, value) -> None:
        with self._lock:
            if self._is_cachetools:
                self._store[key] = value
                return
            now = time.monotonic()
            if len(self._store) >= self._maxsize:
                expired = [k for k, (exp, _) in self._store.items() if now > exp]
                for k in expired:
                    self._store.pop(k, None)
                while len(self._store) >= self._maxsize:
                    self._store.popitem(last=False)
            self._store[key] = (now + self._ttl, value)
            self._store.move_to_end(key)

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)


def safe_https_thumbnail(raw_url, video_id: str) -> str:
    if isinstance(raw_url, str):
        trimmed = raw_url.strip()
        if trimmed.startswith("https://"):
            try:
                parsed = urlparse(trimmed)
                host = (parsed.hostname or "").lower()
                if host.endswith(("ytimg.com", "ggpht.com", "googleusercontent.com", "unsplash.com")):
                    return trimmed
            except Exception:
                pass
    return f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg"
