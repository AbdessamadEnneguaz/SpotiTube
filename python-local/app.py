import os
import re
import sys
from pathlib import Path
from flask import Flask, jsonify, request, render_template, make_response

try:
    import yt_dlp
except ImportError:
    yt_dlp = None

# Ensure root package imports resolve cleanly when executed from python-local/
ROOT_DIR = str(Path(__file__).resolve().parent.parent)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from api._security import (
    EXTRACTION_SEMAPHORE,
    SafeTTLCache,
    evaluate_cors,
    extract_client_ip,
    is_blocked_user_agent,
    is_rate_limited,
    is_upstream_rate_limit_error,
    is_valid_video_id,
    safe_https_thumbnail,
    validate_search_query,
    verify_request_signature,
)
from api.search import (
    SEARCH_CACHE_CONTROL,
    search_with_invidious,
    search_with_piped,
)

app = Flask(__name__, static_folder="static", template_folder="static")
app.config["PROPAGATE_EXCEPTIONS"] = False
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024

_LOCAL_CACHE = SafeTTLCache(maxsize=120, ttl=1200)


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


@app.before_request
def enforce_cors():
    cors_ok, cors_headers = evaluate_cors(request.headers.get("Origin"), request.headers.get("Host"))
    if not cors_ok:
        resp = make_response(jsonify({"error": "Origin not allowed."}), 403)
        for k, v in cors_headers.items():
            resp.headers[k] = v
        return resp
    if request.method == "OPTIONS":
        resp = make_response("", 204)
        for k, v in cors_headers.items():
            resp.headers[k] = v
        return resp
    return None


@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    _, cors_headers = evaluate_cors(request.headers.get("Origin"), request.headers.get("Host"))
    for k, v in cors_headers.items():
        response.headers[k] = v
    return response


@app.errorhandler(Exception)
def handle_error(_err):
    return jsonify({"error": "Internal server error."}), 500


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/search', methods=['GET'])
def search():
    if is_blocked_user_agent(request.headers.get("User-Agent")):
        return jsonify({"error": "Automated requests are not permitted."}), 403

    if "url" in request.args:
        return jsonify({"error": "Arbitrary URL parameters are not permitted."}), 400

    client_ip = extract_client_ip(request.headers, request.remote_addr or "unknown")
    if is_rate_limited(client_ip, bucket="local_search"):
        resp = make_response(jsonify({"error": "Too many requests."}), 429)
        resp.headers["Retry-After"] = "60"
        return resp

    raw_q = request.args.get('q') or ''
    if len(raw_q) > 200:
        return jsonify({"error": "Query exceeds maximum length."}), 400

    if not verify_request_signature(request.headers, request.args, "/api/search", raw_q.strip()):
        return jsonify({"error": "Invalid or expired request signature."}), 403

    query = validate_search_query(raw_q)
    if not query:
        return jsonify([])

    cache_key = query.lower()
    cached = _LOCAL_CACHE.get(cache_key)
    if cached is not None:
        resp = make_response(jsonify(cached), 200)
        resp.headers["Cache-Control"] = SEARCH_CACHE_CONTROL
        return resp

    if not EXTRACTION_SEMAPHORE.acquire(timeout=2.0):
        return jsonify({"error": "Search service busy."}), 503

    ydl_opts = {
        'extract_flat': 'in_playlist',
        'skip_download': True,
        'quiet': True,
        'no_warnings': True,
        'ignoreerrors': True,
        'noplaylist': True,
        'socket_timeout': 6,
        'default_search': 'ytsearch15',
        'allowed_extractors': ['youtube', 'youtube:search', 'youtube:tab'],
    }

    try:
        results = []
        saw_rate_limit = False
        if yt_dlp is not None:
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(f"ytsearch15:{query}", download=False)
                    seen = set()
                    entries = info.get('entries', []) if info else []
                    for entry in entries:
                        if not entry:
                            continue
                        video_id = str(entry.get('id') or '')
                        if not is_valid_video_id(video_id) and entry.get('url'):
                            m = re.search(r"(?:v=|/)([0-9A-Za-z_-]{11})", str(entry.get('url')))
                            if m:
                                video_id = m.group(1)
                        if not is_valid_video_id(video_id) or video_id in seen:
                            continue
                        seen.add(video_id)

                        title = str(entry.get('title') or 'Unknown Title')[:160]
                        channel = str(entry.get('uploader') or entry.get('channel') or 'YouTube Artist')[:100]
                        dur_sec, dur_fmt = format_duration(entry.get('duration'))

                        results.append({
                            "id": video_id,
                            "youtubeId": video_id,
                            "title": title,
                            "channel": channel,
                            "artist": channel,
                            "thumbnail": safe_https_thumbnail(entry.get('thumbnail'), video_id),
                            "durationSeconds": dur_sec,
                            "durationFormatted": dur_fmt,
                        })
            except Exception as exc:
                if is_upstream_rate_limit_error(exc):
                    saw_rate_limit = True
                results = []

        if not results:
            try:
                results = search_with_piped(query)
            except Exception as exc:
                if is_upstream_rate_limit_error(exc):
                    saw_rate_limit = True
                results = []

        if not results:
            try:
                results = search_with_invidious(query)
            except Exception as exc:
                if is_upstream_rate_limit_error(exc):
                    saw_rate_limit = True
                results = []

        if not results and saw_rate_limit:
            resp = make_response(
                jsonify({
                    "error": "Search providers are temporarily busy. Please try again in a few moments.",
                    "rateLimited": True,
                }),
                503,
            )
            resp.headers["Retry-After"] = "15"
            resp.headers["Cache-Control"] = "no-store"
            return resp

        if results:
            _LOCAL_CACHE.set(cache_key, results)
        resp = make_response(jsonify(results), 200)
        resp.headers["Cache-Control"] = SEARCH_CACHE_CONTROL if results else "no-store"
        return resp
    except Exception:
        return jsonify({"error": "Search request failed."}), 500
    finally:
        EXTRACTION_SEMAPHORE.release()


if __name__ == '__main__':
    is_debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(debug=is_debug, host="127.0.0.1", port=5000)
