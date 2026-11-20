from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, quote
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
    is_upstream_rate_limit_error,
    is_valid_video_id,
    is_youtube_cooled_down,
    mark_youtube_cooldown,
    safe_https_thumbnail,
    safe_urlopen,
    validate_search_query,
    verify_request_signature,
)

# 20-minute bounded TTL cache for repeated searches
_RESULT_CACHE = SafeTTLCache(maxsize=150, ttl=1200)
SEARCH_CACHE_CONTROL = "public, s-maxage=900, stale-while-revalidate=300"

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
    safe_q = validate_search_query(query)
    if not safe_q:
        return []

    ydl_opts = {
        "extract_flat": "in_playlist",
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
        "ignoreerrors": False,
        "noplaylist": True,
        "socket_timeout": 6,
        "default_search": "ytsearch15",
        "allowed_extractors": ["youtube", "youtube:search", "youtube:tab"],
    }

    results = []
    seen = set()
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"ytsearch15:{safe_q}", download=False)
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
    except Exception as exc:
        if is_upstream_rate_limit_error(exc):
            raise UpstreamRateLimitError("YouTube search rate-limited") from exc
        raise
    return results


def search_with_innertube(query: str) -> list:
    safe_q = validate_search_query(query)
    if not safe_q:
        return []
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
            "query": safe_q,
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

    try:
        with safe_urlopen(req, timeout=6) as resp:
            if getattr(resp, "status", 200) in (403, 429):
                raise UpstreamRateLimitError(f"InnerTube HTTP {resp.status}")
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code in (403, 429):
            raise UpstreamRateLimitError(f"InnerTube HTTP {exc.code}") from exc
        raise

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
            title = (
                "".join(r.get("text", "") for r in title_runs)
                or v.get("title", {}).get("simpleText", "Unknown Title")
            )[:160]
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
    safe_q = validate_search_query(query)
    if not safe_q:
        return []
    saw_rate_limit = False
    for base in PIPED_MIRRORS:
        try:
            url = f"{base}/search?q={quote(safe_q)}&filter=videos"
            req = urllib.request.Request(
                url,
                headers={"Accept": "application/json", "User-Agent": "Kiddwave/2.0"},
            )
            with safe_urlopen(req, timeout=4) as resp:
                status = getattr(resp, "status", 200)
                if status in (403, 429):
                    saw_rate_limit = True
                    continue
                if status != 200:
                    continue
                data = json.loads(resp.read().decode("utf-8"))
                results = []
                for item in data.get("items", []):
                    u = str(item.get("url") or "")
                    m = re.search(r"[?&]v=([0-9A-Za-z_-]{11})", u) or re.search(
                        r"/watch/([0-9A-Za-z_-]{11})", u
                    )
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
        except urllib.error.HTTPError as exc:
            if exc.code in (403, 429):
                saw_rate_limit = True
            continue
        except Exception:
            continue
    if saw_rate_limit:
        raise UpstreamRateLimitError("Piped mirrors rate-limited")
    return []


def search_with_invidious(query: str) -> list:
    safe_q = validate_search_query(query)
    if not safe_q:
        return []
    saw_rate_limit = False
    for base in INVIDIOUS_MIRRORS:
        try:
            url = f"{base}/api/v1/search?q={quote(safe_q)}&type=video"
            req = urllib.request.Request(
                url,
                headers={"Accept": "application/json", "User-Agent": "Kiddwave/2.0"},
            )
            with safe_urlopen(req, timeout=4) as resp:
                status = getattr(resp, "status", 200)
                if status in (403, 429):
                    saw_rate_limit = True
                    continue
                if status != 200:
                    continue
                items = json.loads(resp.read().decode("utf-8"))
                if not isinstance(items, list):
                    continue
                results = []
                seen = set()
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    vid = str(item.get("videoId") or "")
                    if not is_valid_video_id(vid) or vid in seen:
                        continue
                    seen.add(vid)
                    dur_sec, dur_fmt = format_duration(item.get("lengthSeconds"))
                    thumbs = item.get("videoThumbnails") or []
                    raw_thumb = thumbs[0].get("url") if isinstance(thumbs, list) and thumbs else None
                    channel = str(item.get("author") or "YouTube Artist")[:100]
                    results.append(
                        {
                            "id": vid,
                            "youtubeId": vid,
                            "title": str(item.get("title") or "Unknown Title")[:160],
                            "channel": channel,
                            "artist": channel,
                            "thumbnail": safe_https_thumbnail(raw_thumb, vid),
                            "durationSeconds": dur_sec,
                            "durationFormatted": dur_fmt,
                        }
                    )
                    if len(results) >= 15:
                        break
                if results:
                    return results
        except urllib.error.HTTPError as exc:
            if exc.code in (403, 429):
                saw_rate_limit = True
            continue
        except Exception:
            continue
    if saw_rate_limit:
        raise UpstreamRateLimitError("Invidious mirrors rate-limited")
    return []


def run_search_pipeline(query: str) -> tuple[list, bool]:
    """
    Executes multi-tier search with automatic 429/403 anti-ban cooldown and
    Piped/Invidious mirror failover. Returns (results, rate_limited).
    """
    results: list = []
    saw_rate_limit = False

    if not is_youtube_cooled_down():
        try:
            results = search_with_ytdlp(query)
        except UpstreamRateLimitError:
            saw_rate_limit = True
            mark_youtube_cooldown(60.0)
            results = []
        except Exception as exc:
            if is_upstream_rate_limit_error(exc):
                saw_rate_limit = True
                mark_youtube_cooldown(60.0)
            results = []

        if not results and not is_youtube_cooled_down():
            try:
                results = search_with_innertube(query)
            except UpstreamRateLimitError:
                saw_rate_limit = True
                mark_youtube_cooldown(60.0)
                results = []
            except Exception as exc:
                if is_upstream_rate_limit_error(exc):
                    saw_rate_limit = True
                    mark_youtube_cooldown(60.0)
                results = []
    else:
        saw_rate_limit = True

    if not results:
        try:
            results = search_with_piped(query)
        except UpstreamRateLimitError:
            saw_rate_limit = True
            results = []
        except Exception:
            results = []

    if not results:
        try:
            results = search_with_invidious(query)
        except UpstreamRateLimitError:
            saw_rate_limit = True
            results = []
        except Exception:
            results = []

    if results:
        return results, False
    return [], saw_rate_limit


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

            if len(self.path) > 2048:
                self._send_json(414, {"error": "Request URI too long."}, extra_headers=cors_headers)
                return
            if "\x00" in self.path:
                self._send_json(400, {"error": "Invalid request."}, extra_headers=cors_headers)
                return

            client_ip = extract_client_ip(
                self.headers,
                self.client_address[0] if self.client_address else "unknown",
            )

            if is_rate_limited(client_ip, bucket="search"):
                self._send_json(
                    429,
                    {"error": "Too many search requests. Please wait a moment."},
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

            raw_q = params.get("q", [""])[0]
            if len(raw_q) > 200:
                self._send_json(400, {"error": "Query exceeds maximum length."}, extra_headers=cors_headers)
                return

            if not verify_request_signature(
                self.headers,
                params,
                "/api/search",
                raw_q.strip(),
                allow_query_params=False,
            ):
                self._send_json(
                    403,
                    {"error": "Invalid or expired request signature."},
                    extra_headers=cors_headers,
                )
                return

            query = validate_search_query(raw_q)
            if not query:
                self._send_json(200, [], extra_headers=cors_headers)
                return

            cache_key = query.lower()
            cached = _RESULT_CACHE.get(cache_key)
            if cached is not None:
                self._send_json(
                    200,
                    cached,
                    cache_control=SEARCH_CACHE_CONTROL,
                    extra_headers=cors_headers,
                )
                return

            acquired = EXTRACTION_SEMAPHORE.acquire(timeout=2.0)
            if not acquired:
                self._send_json(
                    503,
                    {"error": "Search service busy. Please retry shortly."},
                    extra_headers={**cors_headers, "Retry-After": "3"},
                )
                return

            try:
                results, rate_limited = run_search_pipeline(query)
            finally:
                EXTRACTION_SEMAPHORE.release()

            if not results and rate_limited:
                self._send_json(
                    503,
                    {
                        "error": "Search providers are temporarily busy. Please try again in a few moments.",
                        "rateLimited": True,
                    },
                    extra_headers={**cors_headers, "Retry-After": "15"},
                )
                return

            if results:
                _RESULT_CACHE.set(cache_key, results)

            cache_hdr = SEARCH_CACHE_CONTROL if results else "no-store"
            self._send_json(200, results, cache_control=cache_hdr, extra_headers=cors_headers)
        except Exception:
            self._send_json(500, {"error": "Internal server error."})

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
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-Permitted-Cross-Domain-Policies", "none")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Robots-Tag", "noindex")
        self.send_header("Cache-Control", cache_control)
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)
