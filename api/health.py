from http.server import BaseHTTPRequestHandler
from datetime import datetime, timezone
import json

from api._security import evaluate_cors


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
        self.end_headers()

    def do_GET(self):
        try:
            cors_ok, cors_headers = evaluate_cors(
                self.headers.get("origin"), self.headers.get("host")
            )
            if not cors_ok:
                self._send_json(403, {"error": "Origin not allowed."}, extra_headers=cors_headers)
                return

            self._send_json(
                200,
                {
                    "status": "healthy",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "service": "Kiddwave Media Engine",
                },
                extra_headers=cors_headers,
            )
        except Exception:
            self._send_json(500, {"error": "Internal server error."})

    def do_POST(self):
        self._send_json(405, {"error": "Method not allowed."})

    def _send_json(self, status_code: int, payload, extra_headers=None):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-Permitted-Cross-Domain-Policies", "none")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Robots-Tag", "noindex")
        self.send_header("Cache-Control", "no-store")
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)
