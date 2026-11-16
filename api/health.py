from http.server import BaseHTTPRequestHandler
from datetime import datetime, timezone
import json


class handler(BaseHTTPRequestHandler):
    def version_string(self):
        return "SpotiTube"

    def do_GET(self):
        body = json.dumps(
            {
                "status": "healthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "service": "SpotiTube Python yt-dlp Engine (Vercel)",
            }
        ).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Permitted-Cross-Domain-Policies", "none")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Robots-Tag", "noindex")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        self.send_response(405)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(b'{"error":"Method not allowed."}')

