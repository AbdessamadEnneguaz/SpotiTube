from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, quote
import urllib.request
import json
import re
import time

try:
    import yt_dlp
except ImportError:
    yt_dlp = None

# Bounded in-memory rate limiter + global burst limit per warm lambda instance
_RATE_LIMITS = {}
_WINDOW_SECONDS = 60
_MAX_REQUESTS = 40
_MAX_TRACKED_IPS = 2000

_GLOBAL_WINDOW = {"count": 0, "reset_at": 0.0}
_MAX_GLOBAL_PER_MIN = 250

# In-memory TTL search cache (prevents cache stampede / upstream DoS)
_RESULT_CACHE = {}
_CACHE_TTL_SECONDS = 300
_MAX_CACHED_QUERIES = 100

_VIDEO_ID_RE = re.compile(r"^[0-9A-Za-z_-]{11}$")


def is_valid_video_id(vid: str) -> bool:
    return bool(vid and _VIDEO_ID_RE.match(vid))


def safe_https_thumbnail(raw_url, video_id: str) -> str:
    if isinstance(raw_url, str):
        trimmed = raw_url.strip()
        if trimmed.startswith("https://"):
            return trimmed
    return f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg"


def is_rate_limited(client_ip: str) -> bool:
    now = time.time()

    # Global burst guard across all IPs (protects against distributed/spoofed IP floods)
    if now > _GLOBAL_WINDOW["reset_at"]:
        _GLOBAL_WINDOW["count"] = 1
        _GLOBAL_WINDOW["reset_at"] = now + _WINDOW_SECONDS
    else:
        _GLOBAL_WINDOW["count"] += 1
        if _GLOBAL_WINDOW["count"] > _MAX_GLOBAL_PER_MIN:
            return True

    # Prune expired IP entries before adding new ones to cap memory
    if len(_RATE_LIMITS) >= _MAX_TRACKED_IPS:
        expired = [ip for ip, rec in _RATE_LIMITS.items() if now > rec["reset_at"]]
        for ip in expired:
            _RATE_LIMITS.pop(ip, None)
        while len(_RATE_LIMITS) >= _MAX_TRACKED_IPS:
            oldest_ip = next(iter(_RATE_LIMITS))
            _RATE_LIMITS.pop(oldest_ip, None)

    rec = _RATE_LIMITS.get(client_ip)
    if not rec or now > rec["reset_at"]:
        _RATE_LIMITS[client_ip] = {"count": 1, "reset_at": now + _WINDOW_SECONDS}
        return False
    if rec["count"] >= _MAX_REQUESTS:
        return True
    rec["count"] += 1
    return False


def sanitize_query(raw: str) -> str:
    q = re.sub(r"[\x00-\x1f\x7f]", "", str(raw or ""))
    q = re.sub(r"[<>{}\"'\\]", "", q)
    q = re.sub(r"\s+", " ", q).strip()
    if len(q) > 100:
        q = q[:100].strip()
    return q


def _get_cached_results(cache_key: str):
    entry = _RESULT_CACHE.get(cache_key)
    if not entry:
        return None
    if time.time() > entry["expires_at"]:
        _RESULT_CACHE.pop(cache_key, None)
        return None
    return entry["results"]


def _set_cached_results(cache_key: str, results: list):
    if not results:
        return
    now = time.time()
    if len(_RESULT_CACHE) >= _MAX_CACHED_QUERIES:
        expired = [k for k, v in _RESULT_CACHE.items() if now > v["expires_at"]]
        for k in expired:
            _RESULT_CACHE.pop(k, None)
        while len(_RESULT_CACHE) >= _MAX_CACHED_QUERIES:
            oldest_key = next(iter(_RESULT_CACHE))
            _RESULT_CACHE.pop(oldest_key, None)
    _RESULT_CACHE[cache_key] = {"results": results, "expires_at": now + _CACHE_TTL_SECONDS}


def format_duration(seconds_val):
    try:
        sec = int(float(seconds_val))
    except (TypeError, ValueError):
        return 210, "3:30"
    if sec <= 0:
        return 210, "3:30"
    hrs = sec // 3600
    mins = (sec % 3600) // 60
    secs = sec % 60
    if hrs > 0:
        return sec, f"{hrs}:{mins:02d}:{secs:02d}"
    return sec, f"{mins}:{secs:02d}"


def search_with_ytdlp(query: str) -> list:
    if yt_dlp is None:
        return []

    ydl_opts = {
        "extract_flat": "in_playlist",
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
        "ignoreerrors": True,
        "noplaylist": True,
        "socket_timeout": 6,
    }

    results = []
    seen = set()
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(f"ytsearch15:{query}", download=False)
        entries = info.get("entries", []) if info else []
        for entry in entries:
            if not entry:
                continue
            video_id = str(entry.get("id") or "")
            if not is_valid_video_id(video_id) and entry.get("url"):
                m = re.search(r"(?:v=|/)([0-9A-Za-z_-]{11})", str(entry.get("url")))
                if m:
                    video_id = m.group(1)
            if not is_valid_video_id(video_id) or video_id in seen:
                continue
            seen.add(video_id)

            title = str(entry.get("title") or "Unknown Title")[:160]
            channel = str(entry.get("uploader") or entry.get("channel") or "YouTube Artist")[:100]
            dur_sec, dur_fmt = format_duration(entry.get("duration"))
            thumb = entry.get("thumbnail")
            if not thumb and isinstance(entry.get("thumbnails"), list) and entry["thumbnails"]:
                thumb = entry["thumbnails"][-1].get("url")
            thumb = safe_https_thumbnail(thumb, video_id)

            results.append(
                {
                    "id": video_id,
                    "youtubeId": video_id,
                    "title": title,
                    "channel": channel,
                    "artist": channel,
                    "thumbnail": thumb,
                    "durationSeconds": dur_sec,
                    "durationFormatted": dur_fmt,
                }
            )
    return results


def search_with_innertube(query: str) -> list:
    payload = json.dumps(
        {
            "context": {
                "client": {
                    "hl": "en",
                    "gl": "US",
                    "clientName": "WEB",
                    "clientVersion": "2.20241101.00.00",
                }
            },
            "query": query,
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        "https://www.youtube.com/youtubei/v1/search?prettyPrint=false",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
            ),
            "Cookie": "CONSENT=YES+cb; SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg",
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=6) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    sections = (
        data.get("contents", {})
        .get("twoColumnSearchResultsRenderer", {})
        .get("primaryContents", {})
        .get("sectionListRenderer", {})
        .get("contents", [])
    )

    results = []
    seen = set()
    for section in sections:
        items = section.get("itemSectionRenderer", {}).get("contents", [])
        for item in items:
            v = item.get("videoRenderer")
            if not v or not v.get("videoId"):
                continue
            vid = str(v["videoId"])
            if not is_valid_video_id(vid) or vid in seen:
                continue
            seen.add(vid)

            title_runs = v.get("title", {}).get("runs", [])
            title = ("".join(r.get("text", "") for r in title_runs) or v.get("title", {}).get("simpleText", "Unknown Title"))[:160]
            owner_runs = v.get("ownerText", {}).get("runs", [])
            channel = ("".join(r.get("text", "") for r in owner_runs) or "YouTube Artist")[:100]
            length_str = v.get("lengthText", {}).get("simpleText", "3:30")

            parts = [int(p) for p in length_str.split(":") if p.isdigit()]
            if len(parts) == 3:
                dur_sec = parts[0] * 3600 + parts[1] * 60 + parts[2]
            elif len(parts) == 2:
                dur_sec = parts[0] * 60 + parts[1]
            else:
                dur_sec = 210

            thumbs = v.get("thumbnail", {}).get("thumbnails", [])
            raw_thumb = thumbs[-1].get("url") if thumbs else None
            thumb = safe_https_thumbnail(raw_thumb, vid)

            results.append(
                {
                    "id": vid,
                    "youtubeId": vid,
                    "title": title,
                    "channel": channel,
                    "artist": channel,
                    "thumbnail": thumb,
                    "durationSeconds": dur_sec,
                    "durationFormatted": length_str,
                }
            )
            if len(results) >= 15:
                return results
    return results


def search_with_piped(query: str) -> list:
    mirrors = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.adminforge.de",
        "https://api.piped.private.coffee",
    ]
    for base in mirrors:
        try:
            url = f"{base}/search?q={quote(query)}&filter=videos"
            req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "SpotiTube/2.0"})
            with urllib.request.urlopen(req, timeout=4) as resp:
                if resp.status != 200:
                    continue
                data = json.loads(resp.read().decode("utf-8"))
                results = []
                for item in data.get("items", []):
                    u = str(item.get("url") or "")
                    m = re.search(r"[?&]v=([0-9A-Za-z_-]{11})", u) or re.search(r"/watch/([0-9A-Za-z_-]{11})", u)
                    if not m:
                        continue
                    vid = m.group(1)
                    if not is_valid_video_id(vid):
                        continue
                    dur_sec, dur_fmt = format_duration(item.get("duration"))
                    results.append(
                        {
                            "id": vid,
                            "youtubeId": vid,
                            "title": str(item.get("title") or "Unknown Title")[:160],
                            "channel": str(item.get("uploaderName") or "YouTube Artist")[:100],
                            "artist": str(item.get("uploaderName") or "YouTube Artist")[:100],
                            "thumbnail": safe_https_thumbnail(item.get("thumbnail"), vid),
                            "durationSeconds": dur_sec,
                            "durationFormatted": dur_fmt,
                        }
                    )
                    if len(results) >= 15:
                        break
                if results:
                    return results
        except Exception:
            continue
    return []


class handler(BaseHTTPRequestHandler):
    def version_string(self):
        return "SpotiTube"

    def do_GET(self):
        if len(self.path) > 2048:
            self._send_json(414, {"error": "Request URI too long."})
            return
        if "\x00" in self.path:
            self._send_json(400, {"error": "Invalid request."})
            return

        forwarded = self.headers.get("x-forwarded-for", "")
        client_ip = (
            forwarded.split(",")[0].strip()
            if forwarded
            else (self.client_address[0] if self.client_address else "unknown")
        )

        if is_rate_limited(client_ip):
            self._send_json(
                429,
                {"error": "Too many search requests. Please wait a moment."},
                extra_headers={"Retry-After": "60"},
            )
            return

        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        query = sanitize_query(params.get("q", [""])[0])

        if not query:
            self._send_json(200, [])
            return

        cache_key = query.lower()
        cached = _get_cached_results(cache_key)
        if cached is not None:
            self._send_json(200, cached, cache_control="public, s-maxage=120, stale-while-revalidate=300")
            return

        results = []
        # 1. Keyless Python yt-dlp search (unlimited, no API key required)
        try:
            results = search_with_ytdlp(query)
        except Exception:
            results = []

        # 2. Keyless Python InnerTube fallback
        if not results:
            try:
                results = search_with_innertube(query)
            except Exception:
                results = []

        # 3. Public Piped mirror fallback
        if not results:
            try:
                results = search_with_piped(query)
            except Exception:
                results = []

        if results:
            _set_cached_results(cache_key, results)

        cache_hdr = "public, s-maxage=120, stale-while-revalidate=300" if results else "no-store"
        self._send_json(200, results, cache_control=cache_hdr)

    def do_POST(self):
        self._send_json(405, {"error": "Method not allowed."})

    def do_PUT(self):
        self._send_json(405, {"error": "Method not allowed."})

    def do_DELETE(self):
        self._send_json(405, {"error": "Method not allowed."})

    def do_PATCH(self):
        self._send_json(405, {"error": "Method not allowed."})

    def _send_json(self, status_code: int, payload, cache_control: str = "no-store", extra_headers=None):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Permitted-Cross-Domain-Policies", "none")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Robots-Tag", "noindex")
        self.send_header("Cache-Control", cache_control)
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

