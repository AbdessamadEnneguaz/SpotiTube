import os
from flask import Flask, jsonify, request, render_template, make_response
from api._security import (
    EXTRACTION_SEMAPHORE,
    SafeTTLCache,
    evaluate_cors,
    extract_client_ip,
    is_rate_limited,
    validate_search_query,
)
from api.search import (
    search_with_ytdlp,
    search_with_innertube,
    search_with_piped,
)

app = Flask(__name__, static_folder="python-local/static", template_folder="python-local/static")
app.config["PROPAGATE_EXCEPTIONS"] = False
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024

_SEARCH_CACHE = SafeTTLCache(maxsize=150, ttl=1200)


@app.before_request
def enforce_cors_and_preflight():
    origin = request.headers.get("Origin")
    host = request.headers.get("Host")
    cors_ok, cors_headers = evaluate_cors(origin, host)
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
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
    _, cors_headers = evaluate_cors(request.headers.get("Origin"), request.headers.get("Host"))
    for k, v in cors_headers.items():
        response.headers[k] = v
    return response


@app.errorhandler(404)
def not_found(_err):
    return jsonify({"error": "Endpoint not found."}), 404


@app.errorhandler(405)
def method_not_allowed(_err):
    return jsonify({"error": "Method not allowed."}), 405


@app.errorhandler(Exception)
def handle_unexpected_error(_err):
    return jsonify({"error": "Internal server error."}), 500


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/search', methods=['GET', 'OPTIONS'])
def search():
    if "url" in request.args:
        return jsonify({"error": "Arbitrary URL parameters are not permitted."}), 400

    client_ip = extract_client_ip(request.headers, request.remote_addr or "unknown")
    if is_rate_limited(client_ip, bucket="flask_search"):
        resp = make_response(jsonify({"error": "Too many search requests."}), 429)
        resp.headers["Retry-After"] = "60"
        return resp

    raw_q = request.args.get('q') or ''
    if len(raw_q) > 200:
        return jsonify({"error": "Query exceeds maximum length."}), 400

    query = validate_search_query(raw_q)
    if not query:
        return jsonify([])

    cache_key = query.lower()
    cached = _SEARCH_CACHE.get(cache_key)
    if cached is not None:
        return jsonify(cached)

    if not EXTRACTION_SEMAPHORE.acquire(timeout=2.0):
        return jsonify({"error": "Search service busy. Please retry shortly."}), 503

    try:
        results = []
        try:
            results = search_with_ytdlp(query)
        except Exception:
            results = []

        if not results:
            try:
                results = search_with_innertube(query)
            except Exception:
                results = []

        if not results:
            try:
                results = search_with_piped(query)
            except Exception:
                results = []

        if results:
            _SEARCH_CACHE.set(cache_key, results)
        return jsonify(results)
    finally:
        EXTRACTION_SEMAPHORE.release()


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "Kiddwave Python Media Engine"})


if __name__ == '__main__':
    is_debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(debug=is_debug, host="127.0.0.1", port=5000)
