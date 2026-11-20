from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import urllib.error
import urllib.request
import json
import re

try:
    import yt_dlp
except ImportError:
    yt_dlp = None

from api._security import (
    EXTRACTION_SEMAPHORE,
    SafeTTLCache,
    UpstreamRateLimitError,
    evaluate_cors,
    extract_client_ip,
    is_blocked_user_agent,
    is_rate_limited,
    is_safe_upstream_audio_url,
    is_upstream_rate_limit_error,
    is_valid_video_id,
    is_youtube_cooled_down,
    mark_youtube_cooldown,
    safe_urlopen,
    validate_audio_video_id,
    verify_request_signature,
)

# 15-minute bounded TTL cache for resolved audio stream metadata
_AUDIO_CACHE = SafeTTLCache(maxsize=128, ttl=900)
_CHUNK_BYTES = 524288

PIPED_MIRRORS = (
    "https://pipedapi.kavin.rocks",
    "https://pipedapi.adminforge.de",
    "https://api.piped.private.coffee",
)

INVIDIOUS_MIRRORS = (
    "https://inv.nadeko.net",
    "https://invidious.nerdvpn.de",
    "https://yewtu.be",
)


def _pick_best_audio_stream(candidates: list[dict]):
    safe_candidates = [c for c in candidates if is_safe_upstream_audio_url(c.get("url"))]
    if not safe_candidates:
        return None
    mp4s = [c for c in safe_candidates if "audio/mp4" in str(c.get("mime_type", ""))]
    pool = mp4s if mp4s else safe_candidates
    pool.sort(key=lambda c: int(c.get("bitrate") or 0), reverse=True)
    best = pool[0]
    return {
        "url": best["url"],
        "mime_type": best.get("mime_type") or "audio/mp4",
        "content_length": best.get("content_length"),
    }


def _resolve_via_innertube(video_id: str):
    payload = json.dumps(
        {
            "videoId": video_id,
            "context": {
                "client": {
                    "clientName": "ANDROID_VR",
                    "clientVersion": "1.59.24",
                    "hl": "en",
                    "gl": "US",
                }
            },
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with safe_urlopen(req, timeout=4.5) as resp:
            if getattr(resp, "status", 200) in (403, 429):
                raise UpstreamRateLimitError(f"InnerTube audio HTTP {resp.status}")
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code in (403, 429):
            raise UpstreamRateLimitError(f"InnerTube audio HTTP {exc.code}") from exc
        return None
    except Exception as exc:
        if is_upstream_rate_limit_error(exc):
            raise UpstreamRateLimitError("InnerTube audio rate-limited") from exc
        return None

    status = data.get("playabilityStatus", {}).get("status")
    if status != "OK":
        reason = str(data.get("playabilityStatus", {}).get("reason") or "").lower()
        if "sign in" in reason or "rate" in reason or "429" in reason:
            raise UpstreamRateLimitError("InnerTube playback verification triggered")
        return None

    formats = data.get("streamingData", {}).get("adaptiveFormats", [])
    candidates = []
    for f in formats:
        mime = str(f.get("mimeType", ""))
        if not mime.startswith("audio/"):
            continue
        clen = f.get("contentLength")
        candidates.append(
            {
                "url": f.get("url", ""),
                "mime_type": mime.split(";")[0] or "audio/mp4",
                "bitrate": int(f.get("bitrate") or 0),
                "content_length": int(clen) if clen and str(clen).isdigit() else None,
            }
        )
    return _pick_best_audio_stream(candidates)


def _resolve_via_ytdlp(video_id: str):
    if yt_dlp is None:
        return None
    ydl_opts = {
        "format": "bestaudio[ext=m4a]/bestaudio/best",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "socket_timeout": 5,
        "allowed_extractors": ["youtube"],
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            url = info.get("url") if info else ""
            if is_safe_upstream_audio_url(url):
                return {
                    "url": url,
                    "mime_type": "audio/mp4" if info.get("ext") == "m4a" else "audio/webm",
                    "content_length": info.get("filesize") or info.get("filesize_approx"),
                }
    except Exception as exc:
        if is_upstream_rate_limit_error(exc):
            raise UpstreamRateLimitError("yt-dlp audio rate-limited") from exc
    return None


def _resolve_via_piped(video_id: str):
    saw_rate_limit = False
    for base in PIPED_MIRRORS:
        try:
            req = urllib.request.Request(
                f"{base}/streams/{video_id}",
                headers={"Accept": "application/json", "User-Agent": "Kiddwave/2.0"},
            )
            with safe_urlopen(req, timeout=4.0) as resp:
                status = getattr(resp, "status", 200)
                if status in (403, 429):
                    saw_rate_limit = True
                    continue
                if status != 200:
                    continue
                data = json.loads(resp.read().decode("utf-8"))
                raw_streams = data.get("audioStreams") or []
                candidates = []
                for s in raw_streams:
                    if not isinstance(s, dict):
                        continue
                    mime = str(s.get("mimeType") or "audio/mp4").split(";")[0]
                    clen = s.get("contentLength")
                    candidates.append(
                        {
                            "url": s.get("url", ""),
                            "mime_type": mime if mime.startswith("audio/") else "audio/mp4",
                            "bitrate": int(s.get("bitrate") or 0),
                            "content_length": int(clen) if clen and str(clen).isdigit() else None,
                        }
                    )
                best = _pick_best_audio_stream(candidates)
                if best:
                    return best
        except urllib.error.HTTPError as exc:
            if exc.code in (403, 429):
                saw_rate_limit = True
            continue
        except Exception:
            continue
    if saw_rate_limit:
        raise UpstreamRateLimitError("Piped audio mirrors rate-limited")
    return None


def _resolve_via_invidious(video_id: str):
    saw_rate_limit = False
    for base in INVIDIOUS_MIRRORS:
        try:
            req = urllib.request.Request(
                f"{base}/api/v1/videos/{video_id}",
                headers={"Accept": "application/json", "User-Agent": "Kiddwave/2.0"},
            )
            with safe_urlopen(req, timeout=4.0) as resp:
                status = getattr(resp, "status", 200)
                if status in (403, 429):
                    saw_rate_limit = True
                    continue
                if status != 200:
                    continue
                data = json.loads(resp.read().decode("utf-8"))
                formats = data.get("adaptiveFormats") or []
                candidates = []
                for f in formats:
                    if not isinstance(f, dict):
                        continue
                    mime_raw = str(f.get("type") or "")
                    if not mime_raw.startswith("audio/"):
                        continue
                    clen = f.get("clen")
                    candidates.append(
                        {
                            "url": f.get("url", ""),
                            "mime_type": mime_raw.split(";")[0] or "audio/mp4",
                            "bitrate": int(f.get("bitrate") or 0),
                            "content_length": int(clen) if clen and str(clen).isdigit() else None,
                        }
                    )
                best = _pick_best_audio_stream(candidates)
                if best:
                    return best
        except urllib.error.HTTPError as exc:
            if exc.code in (403, 429):
                saw_rate_limit = True
            continue
        except Exception:
            continue
    if saw_rate_limit:
        raise UpstreamRateLimitError("Invidious audio mirrors rate-limited")
    return None


def resolve_audio_stream_with_status(video_id: str) -> tuple[dict | None, bool]:
    """
    Resolves an audio stream URL with anti-ban cooldown and Piped/Invidious fallback.
    Returns (stream_dict_or_none, rate_limited).
    """
    if not is_valid_video_id(video_id):
        return None, False
    cached = _AUDIO_CACHE.get(video_id)
    if cached is not None:
        return cached, False

    acquired = EXTRACTION_SEMAPHORE.acquire(timeout=2.0)
    if not acquired:
        return None, True
    try:
        stream = None
        saw_rate_limit = False

        if not is_youtube_cooled_down():
            try:
                stream = _resolve_via_innertube(video_id)
            except UpstreamRateLimitError:
                saw_rate_limit = True
                mark_youtube_cooldown(60.0)
                stream = None

            if not stream and not is_youtube_cooled_down() and yt_dlp is not None:
                try:
                    stream = _resolve_via_ytdlp(video_id)
                except UpstreamRateLimitError:
                    saw_rate_limit = True
                    mark_youtube_cooldown(60.0)
                    stream = None
        else:
            saw_rate_limit = True

        if not stream:
            try:
                stream = _resolve_via_piped(video_id)
            except UpstreamRateLimitError:
                saw_rate_limit = True
                stream = None

        if not stream:
            try:
                stream = _resolve_via_invidious(video_id)
            except UpstreamRateLimitError:
                saw_rate_limit = True
                stream = None

        if stream and is_safe_upstream_audio_url(stream.get("url")):
            _AUDIO_CACHE.set(video_id, stream)
            return stream, False
        return None, saw_rate_limit
    finally:
        EXTRACTION_SEMAPHORE.release()


def resolve_audio_stream(video_id: str):
    stream, _ = resolve_audio_stream_with_status(video_id)
    return stream


class handler(BaseHTTPRequestHandler):
    def version_string(self):
        return "Kiddwave"

    def do_OPTIONS(self):
        cors_ok, cors_headers = evaluate_cors(
            self.headers.get("origin"), self.headers.get("host")
        )
        if not cors_ok:
            self._send_json(403, {"error": "Origin not allowed."}, extra_headers=cors_headers)
            return
        self.send_response(204)
        for k, v in cors_headers.items():
            self.send_header(k, v)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()

    def do_GET(self):
        try:
            cors_ok, cors_headers = evaluate_cors(
                self.headers.get("origin"), self.headers.get("host")
            )
            if not cors_ok:
                self._send_json(403, {"error": "Origin not allowed."}, extra_headers=cors_headers)
                return

            if is_blocked_user_agent(self.headers.get("user-agent")):
                self._send_json(
                    403,
                    {"error": "Automated requests are not permitted."},
                    extra_headers=cors_headers,
                )
                return

            if len(self.path) > 2048 or "\x00" in self.path:
                self._send_json(400, {"error": "Invalid request."}, extra_headers=cors_headers)
                return

            client_ip = extract_client_ip(
                self.headers,
                self.client_address[0] if self.client_address else "unknown",
            )
            if is_rate_limited(client_ip, bucket="audio"):
                self._send_json(
                    429,
                    {"error": "Too many requests."},
                    extra_headers={**cors_headers, "Retry-After": "60"},
                )
                return

            parsed = urlparse(self.path)
            params = parse_qs(parsed.query, keep_blank_values=False)

            if "url" in params:
                self._send_json(
                    400,
                    {"error": "Arbitrary URL parameters are not permitted."},
                    extra_headers=cors_headers,
                )
                return

            raw_vid = params.get("v", params.get("id", [""]))[0]
            if not verify_request_signature(
                self.headers,
                params,
                "/api/audio",
                raw_vid.strip(),
                allow_query_params=True,
            ):
                self._send_json(
                    403,
                    {"error": "Invalid or expired request signature."},
                    extra_headers=cors_headers,
                )
                return

            video_id = validate_audio_video_id(raw_vid)
            probe = params.get("probe", ["0"])[0] == "1"

            if not video_id:
                self._send_json(400, {"error": "Invalid video ID."}, extra_headers=cors_headers)
                return

            stream, rate_limited = resolve_audio_stream_with_status(video_id)
            if probe:
                if not stream and rate_limited:
                    self._send_json(
                        503,
                        {
                            "available": False,
                            "mimeType": None,
                            "rateLimited": True,
                            "error": "Audio providers are temporarily busy. Please try again in a few moments.",
                        },
                        extra_headers={**cors_headers, "Retry-After": "15"},
                    )
                    return
                self._send_json(
                    200,
                    {
                        "available": bool(stream),
                        "mimeType": stream["mime_type"] if stream else None,
                    },
                    extra_headers=cors_headers,
                )
                return

            if not stream or not is_safe_upstream_audio_url(stream.get("url")):
                if rate_limited:
                    self._send_json(
                        503,
                        {
                            "error": "Audio providers are temporarily busy. Please try again in a few moments.",
                            "rateLimited": True,
                        },
                        extra_headers={**cors_headers, "Retry-After": "15"},
                    )
                    return
                self._send_json(404, {"error": "Audio stream unavailable."}, extra_headers=cors_headers)
                return

            range_hdr = self.headers.get("range", "")
            m = re.match(r"^bytes=(\d+)-(\d*)$", range_hdr.strip(), re.I)
            start = int(m.group(1)) if m else 0
            req_end = int(m.group(2)) if (m and m.group(2)) else None
            total = stream.get("content_length")
            end = start + _CHUNK_BYTES - 1
            if req_end is not None and req_end >= start:
                end = min(end, req_end)
            if total:
                if start >= total:
                    start = max(0, total - 1)
                end = min(end, total - 1)
            end = max(start, end)

            try:
                upstream_req = urllib.request.Request(
                    stream["url"],
                    headers={"Range": f"bytes={start}-{end}"},
                )
                with safe_urlopen(upstream_req, timeout=6) as resp:
                    data = resp.read(_CHUNK_BYTES + 1024)
                    if len(data) > _CHUNK_BYTES:
                        data = data[:_CHUNK_BYTES]
                    self.send_response(206 if resp.status in (200, 206) else resp.status)
                    self.send_header("Content-Type", stream["mime_type"])
                    self.send_header("Accept-Ranges", "bytes")
                    self.send_header("Content-Length", str(len(data)))
                    cr = resp.headers.get("Content-Range")
                    if cr:
                        self.send_header("Content-Range", cr)
                    elif total:
                        self.send_header("Content-Range", f"bytes {start}-{start + len(data) - 1}/{total}")
                    self.send_header("Cache-Control", "no-store")
                    self.send_header("X-Content-Type-Options", "nosniff")
                    self.send_header("X-Frame-Options", "DENY")
                    for k, v in cors_headers.items():
                        self.send_header(k, v)
                    self.end_headers()
                    self.wfile.write(data)
            except urllib.error.HTTPError as exc:
                _AUDIO_CACHE.delete(video_id)
                if exc.code in (403, 429):
                    mark_youtube_cooldown(60.0)
                    self._send_json(
                        503,
                        {
                            "error": "Audio providers are temporarily busy. Please try again in a few moments.",
                            "rateLimited": True,
                        },
                        extra_headers={**cors_headers, "Retry-After": "15"},
                    )
                    return
                self._send_json(502, {"error": "Audio upstream unavailable."}, extra_headers=cors_headers)
            except Exception:
                _AUDIO_CACHE.delete(video_id)
                self._send_json(502, {"error": "Audio upstream unavailable."}, extra_headers=cors_headers)
        except Exception:
            self._send_json(500, {"error": "Internal server error."})

    def do_POST(self):
        self._send_json(405, {"error": "Method not allowed."})

    def do_PUT(self):
        self._send_json(405, {"error": "Method not allowed."})

    def do_DELETE(self):
        self._send_json(405, {"error": "Method not allowed."})

    def _send_json(self, status_code: int, payload, extra_headers=None):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Cache-Control", "no-store")
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)
