from collections import OrderedDict, deque
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
    clean_origin = (origin or "").strip()
    if not clean_origin:
        return True, base_headers

    if clean_origin in ALLOWED_ORIGINS:
        return True, {
            **base_headers,
            "Access-Control-Allow-Origin": clean_origin,
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Range",
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
                "Access-Control-Allow-Headers": "Content-Type, Range",
                "Access-Control-Max-Age": "600",
            }

    return False, base_headers


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
