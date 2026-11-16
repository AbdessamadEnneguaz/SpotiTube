import os
from flask import Flask, jsonify, request, render_template
from api.search import (
    search_with_ytdlp,
    search_with_innertube,
    search_with_piped,
    sanitize_query,
    is_rate_limited,
)

app = Flask(__name__, static_folder="python-local/static", template_folder="python-local/static")


@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
    return response


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/search', methods=['GET'])
def search():
    client_ip = request.remote_addr or "unknown"
    if is_rate_limited(client_ip):
        return jsonify({"error": "Too many search requests."}), 429

    query = sanitize_query(request.args.get('q') or '')
    if not query:
        return jsonify([])

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

    return jsonify(results)


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "SpotiTube Python yt-dlp Engine"})


if __name__ == '__main__':
    is_debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    print("SpotiTube running with keyless yt-dlp search on http://127.0.0.1:5000")
    app.run(debug=is_debug, port=5000)

