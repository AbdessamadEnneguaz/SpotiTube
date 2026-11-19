from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
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
    evaluate_cors,
    extract_client_ip,
    is_rate_limited,
    is_safe_googlevideo_url,
    is_valid_video_id,
    safe_urlopen,
    validate_audio_video_id,
)

# 15-minute bounded TTL cache for resolved audio stream metadata
_AUDIO_CACHE = SafeTTLCache(maxsize=128, ttl=900)
_CHUNK_BYTES = 524288


def resolve_audio_stream(video_id: str):
    if not is_valid_video_id(video_id):
        return None
    cached = _AUDIO_CACHE.get(video_id)
    if cached is not None:
        return cached

    acquired = EXTRACTION_SEMAPHORE.acquire(timeout=2.0)
    if not acquired:
        return None
    try:
        stream = _resolve_via_innertube(video_id)
        if not stream and yt_dlp is not None:
            stream = _resolve_via_ytdlp(video_id)
        if stream and is_safe_googlevideo_url(stream.get("url")):
            _AUDIO_CACHE.set(video_id, stream)
            return stream
        return None
    finally:
        EXTRACTION_SEMAPHORE.release()


def _resolve_via_innertube(video_id: str):
    try:
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
        with safe_urlopen(req, timeout=4.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if data.get("playabilityStatus", {}).get("status") != "OK":
            return None
        formats = data.get("streamingData", {}).get("adaptiveFormats", [])
        mp4s = [
            f
            for f in formats
            if "audio/mp4" in str(f.get("mimeType", "")) and is_safe_googlevideo_url(f.get("url", ""))
        ]
        if not mp4s:
            return None
        mp4s.sort(key=lambda f: int(f.get("bitrate") or 0), reverse=True)
        best = mp4s[0]
        clen = best.get("contentLength")
        return {
            "url": best["url"],
            "mime_type": "audio/mp4",
            "content_length": int(clen) if clen and str(clen).isdigit() else None,
        }
    except Exception:
        return None


def _resolve_via_ytdlp(video_id: str):
    try:
        ydl_opts = {
            "format": "bestaudio[ext=m4a]/bestaudio/best",
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "socket_timeout": 5,
            "allowed_extractors": ["youtube"],
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            url = info.get("url") if info else ""
            if is_safe_googlevideo_url(url):
                return {
                    "url": url,
                    "mime_type": "audio/mp4" if info.get("ext") == "m4a" else "audio/webm",
                    "content_length": info.get("filesize") or info.get("filesize_approx"),
                }
    except Exception:
        pass
    return None


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
            video_id = validate_audio_video_id(raw_vid)
            probe = params.get("probe", ["0"])[0] == "1"

            if not video_id:
                self._send_json(400, {"error": "Invalid video ID."}, extra_headers=cors_headers)
                return

            stream = resolve_audio_stream(video_id)
            if probe:
                self._send_json(
                    200,
                    {
                        "available": bool(stream),
                        "mimeType": stream["mime_type"] if stream else None,
                    },
                    extra_headers=cors_headers,
                )
                return

            if not stream or not is_safe_googlevideo_url(stream.get("url")):
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
