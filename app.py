import re
from flask import Flask, jsonify, request, render_template
from api.search import search_with_ytdlp, search_with_innertube, search_with_piped, sanitize_query

app = Flask(__name__, static_folder="python-local/static", template_folder="python-local/static")


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/search', methods=['GET'])
def search():
    query = sanitize_query(request.args.get('q') or '')
    if not query:
        return jsonify([])

    results = []
    try:
        results = search_with_ytdlp(query)
    except Exception as e:
        print("--> [WARN] yt-dlp search fallback:", e)

    if not results:
        try:
            results = search_with_innertube(query)
        except Exception as e:
            print("--> [WARN] InnerTube search fallback:", e)

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
    print("SpotiTube running with keyless yt-dlp search on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
