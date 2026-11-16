import re
import json
import urllib.request
import urllib.parse
from flask import Flask, jsonify, request, render_template

try:
    import yt_dlp
except ImportError:
    yt_dlp = None

app = Flask(__name__, static_folder="static", template_folder="static")


def sanitize_query(raw: str) -> str:
    q = (raw or "").strip()
    if len(q) > 120:
        q = q[:120]
    return re.sub(r"[<>{}\\]", "", q).strip()


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


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/search', methods=['GET'])
def search():
    query = sanitize_query(request.args.get('q') or '')
    if not query or yt_dlp is None:
        return jsonify([])

    ydl_opts = {
        'extract_flat': 'in_playlist',
        'skip_download': True,
        'quiet': True,
        'no_warnings': True,
        'ignoreerrors': True,
        'noplaylist': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"ytsearch15:{query}", download=False)
            results = []
            entries = info.get('entries', []) if info else []
            for entry in entries:
                if not entry:
                    continue
                video_id = entry.get('id') or entry.get('url')
                title = entry.get('title') or 'Unknown Title'
                channel = entry.get('uploader') or entry.get('channel') or 'YouTube Artist'
                dur_sec, dur_fmt = format_duration(entry.get('duration'))

                results.append({
                    "id": video_id,
                    "youtubeId": video_id,
                    "title": title,
                    "channel": channel,
                    "artist": channel,
                    "thumbnail": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
                    "durationSeconds": dur_sec,
                    "durationFormatted": dur_fmt,
                })

            return jsonify(results)
    except Exception as e:
        print("--> [ERROR] Search Error:", e)
        return jsonify([])


if __name__ == '__main__':
    print("SpotiTube running with keyless yt-dlp search on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
