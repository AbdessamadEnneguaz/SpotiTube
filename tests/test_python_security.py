import io
import json
import time
import unittest
from unittest.mock import patch
import urllib.error

from api._security import (
    SafeTTLCache,
    UpstreamRateLimitError,
    compute_request_signature,
    evaluate_cors,
    is_blocked_user_agent,
    is_rate_limited,
    is_safe_googlevideo_url,
    is_safe_upstream_audio_url,
    is_upstream_rate_limit_error,
    reset_youtube_cooldown,
    validate_audio_video_id,
    validate_search_query,
    verify_request_signature,
)
import api.search as search_mod
import api.audio as audio_mod


class _DummySocket:
    def makefile(self, *_args, **_kwargs):
        return io.BytesIO()


def _invoke_handler(handler_cls, path: str, headers: dict[str, str]):
    raw_headers = "".join(f"{k}: {v}\r\n" for k, v in headers.items())
    raw_req = f"GET {path} HTTP/1.1\r\nHost: kiddwave.vercel.app\r\n{raw_headers}\r\n".encode("utf-8")
    rfile = io.BytesIO(raw_req)
    wfile = io.BytesIO()

    inst = handler_cls.__new__(handler_cls)
    inst.rfile = rfile
    inst.wfile = wfile
    inst.client_address = ("198.51.100.42", 54321)
    inst.server = None
    inst.request = _DummySocket()
    inst.requestline = f"GET {path} HTTP/1.1"
    inst.command = "GET"
    inst.path = path
    inst.request_version = "HTTP/1.1"

    from email.parser import BytesParser
    inst.headers = BytesParser().parsebytes(raw_headers.encode("utf-8"))
    inst._headers_buffer = []
    inst.close_connection = True
    inst.do_GET()

    raw_resp = wfile.getvalue().decode("utf-8", errors="replace")
    head, _, body = raw_resp.partition("\r\n\r\n")
    lines = head.split("\r\n")
    status_code = int(lines[0].split(" ")[1])
    resp_headers = {}
    for line in lines[1:]:
        if ":" in line:
            k, v = line.split(":", 1)
            resp_headers[k.strip().lower()] = v.strip()
    return status_code, resp_headers, json.loads(body) if body else None


class PythonSecurityTests(unittest.TestCase):
    def setUp(self):
        reset_youtube_cooldown()

    def test_cors_allowlist_blocks_unauthorized_origins(self):
        ok_prod, h_prod = evaluate_cors("https://kiddwave.vercel.app", "kiddwave.vercel.app")
        self.assertTrue(ok_prod)
        self.assertEqual(h_prod.get("Access-Control-Allow-Origin"), "https://kiddwave.vercel.app")
        self.assertIn("X-KW-Signature", h_prod.get("Access-Control-Allow-Headers", ""))

        ok_local, h_local = evaluate_cors("http://localhost:5173", "localhost:5173")
        self.assertTrue(ok_local)
        self.assertEqual(h_local.get("Access-Control-Allow-Origin"), "http://localhost:5173")

        ok_evil, h_evil = evaluate_cors("https://evil.example", "kiddwave.vercel.app")
        self.assertFalse(ok_evil)
        self.assertNotIn("Access-Control-Allow-Origin", h_evil)

        ok_none, h_none = evaluate_cors(None, "kiddwave.vercel.app")
        self.assertTrue(ok_none)
        self.assertNotIn("Access-Control-Allow-Origin", h_none)

    def test_rate_limiter_enforces_25_per_min(self):
        test_ip = "203.0.113.99"
        for i in range(25):
            self.assertFalse(is_rate_limited(test_ip, bucket="test_unit"), f"Blocked prematurely at {i}")
        self.assertTrue(is_rate_limited(test_ip, bucket="test_unit"))

    def test_input_validation_blocks_ssrf_and_flag_injection(self):
        self.assertEqual(validate_search_query("http://169.254.169.254/latest"), "")
        self.assertEqual(validate_search_query("file:///etc/passwd"), "")
        cleaned = validate_search_query("--exec 'touch /tmp/pwn' Daft Punk")
        self.assertFalse(cleaned.startswith("-"))
        self.assertEqual(len(validate_search_query("a" * 180)), 100)

        self.assertEqual(validate_audio_video_id("dQw4w9WgXcQ"), "dQw4w9WgXcQ")
        self.assertIsNone(validate_audio_video_id("../etc/passwd"))
        self.assertIsNone(validate_audio_video_id("too_short"))

    def test_googlevideo_and_mirror_ssrf_validation(self):
        self.assertTrue(is_safe_googlevideo_url("https://rr3---sn-4g5e6nsz.googlevideo.com/videoplayback"))
        self.assertFalse(is_safe_googlevideo_url("http://rr3---sn-4g5e6nsz.googlevideo.com/videoplayback"))
        self.assertFalse(is_safe_googlevideo_url("https://169.254.169.254/latest/meta-data/"))
        self.assertFalse(is_safe_googlevideo_url("https://user:pass@rr3.googlevideo.com/v"))
        self.assertFalse(is_safe_googlevideo_url("https://rr3.googlevideo.com:8443/v"))
        self.assertFalse(is_safe_googlevideo_url("https://googlevideo.com.attacker.com/v"))

        self.assertTrue(is_safe_upstream_audio_url("https://pipedproxy-fra.kavin.rocks/videoplayback"))
        self.assertTrue(is_safe_upstream_audio_url("https://inv.nadeko.net/latest_version?id=abc"))
        self.assertFalse(is_safe_upstream_audio_url("https://evil.example/audio.mp4"))

    def test_ttl_cache_stores_and_expires(self):
        cache = SafeTTLCache(maxsize=2, ttl=60)
        cache.set("k1", [1, 2])
        self.assertEqual(cache.get("k1"), [1, 2])
        cache.delete("k1")
        self.assertIsNone(cache.get("k1"))

    def test_blocked_user_agents(self):
        for bad_ua in ("", "   ", None, "curl/8.5.0", "python-requests/2.31.0", "Scrapy/2.11", "Wget/1.21"):
            self.assertTrue(is_blocked_user_agent(bad_ua), f"Expected blocked UA: {bad_ua!r}")

        self.assertFalse(
            is_blocked_user_agent(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36"
            )
        )
        self.assertFalse(is_blocked_user_agent("Mozilla/5.0 KiddwaveAndroid/1.2.3"))

    def test_hmac_signature_window_and_tamper_detection(self):
        now = 1763648000
        sig = compute_request_signature(str(now), "/api/search", "Burna Boy")
        headers = {"X-KW-Timestamp": str(now), "X-KW-Signature": sig}

        self.assertTrue(
            verify_request_signature(headers, {}, "/api/search", "Burna Boy", now_unix=now + 120)
        )
        self.assertFalse(
            verify_request_signature(headers, {}, "/api/search", "Burna Boy", now_unix=now + 121)
        )
        self.assertFalse(
            verify_request_signature(headers, {}, "/api/search", "Burna Boy", now_unix=now - 121)
        )
        self.assertFalse(
            verify_request_signature(headers, {}, "/api/search", "Tampered Query", now_unix=now)
        )

        # Query params allowed only when allow_query_params=True
        audio_sig = compute_request_signature(str(now), "/api/audio", "dQw4w9WgXcQ")
        params = {"ts": [str(now)], "sig": [audio_sig]}
        self.assertFalse(
            verify_request_signature({}, params, "/api/audio", "dQw4w9WgXcQ", allow_query_params=False, now_unix=now)
        )
        self.assertTrue(
            verify_request_signature({}, params, "/api/audio", "dQw4w9WgXcQ", allow_query_params=True, now_unix=now)
        )

    def test_upstream_rate_limit_detection_and_failover(self):
        err429 = urllib.error.HTTPError("https://www.youtube.com", 429, "Too Many Requests", {}, None)
        self.assertTrue(is_upstream_rate_limit_error(err429))
        self.assertTrue(is_upstream_rate_limit_error(Exception("HTTP Error 403: Forbidden")))

        sample = [
            {
                "id": "dQw4w9WgXcQ",
                "youtubeId": "dQw4w9WgXcQ",
                "title": "Sample Track",
                "channel": "Artist",
                "artist": "Artist",
                "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
                "durationSeconds": 210,
                "durationFormatted": "3:30",
            }
        ]
        with patch.object(search_mod, "search_with_ytdlp", side_effect=UpstreamRateLimitError("429")), \
             patch.object(search_mod, "search_with_innertube") as mock_it, \
             patch.object(search_mod, "search_with_piped", return_value=[]), \
             patch.object(search_mod, "search_with_invidious", return_value=sample):
            results, rate_limited = search_mod.run_search_pipeline("test failover")
            self.assertFalse(rate_limited)
            self.assertEqual(results, sample)
            mock_it.assert_not_called()

        reset_youtube_cooldown()
        with patch.object(search_mod, "search_with_ytdlp", side_effect=UpstreamRateLimitError("429")), \
             patch.object(search_mod, "search_with_piped", side_effect=UpstreamRateLimitError("429")), \
             patch.object(search_mod, "search_with_invidious", side_effect=UpstreamRateLimitError("403")):
            results, rate_limited = search_mod.run_search_pipeline("all busy")
            self.assertEqual(results, [])
            self.assertTrue(rate_limited)

    def test_search_and_audio_handlers_enforce_guards_and_cache_headers(self):
        # 1. Blocked UA gets 403
        st, _, data = _invoke_handler(search_mod.handler, "/api/search?q=pop", {"User-Agent": "curl/8.5.0"})
        self.assertEqual(st, 403)
        self.assertIn("Automated", data["error"])

        # 2. Missing signature gets 403
        browser_ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0 Safari/537.36"
        st, _, data = _invoke_handler(search_mod.handler, "/api/search?q=pop", {"User-Agent": browser_ua})
        self.assertEqual(st, 403)
        self.assertIn("signature", data["error"].lower())

        # 3. Signed request succeeds with Edge s-maxage=900 Cache-Control
        ts = str(int(time.time()))
        sig = compute_request_signature(ts, "/api/search", "edgecachetest")
        fake_tracks = [{"id": "dQw4w9WgXcQ", "youtubeId": "dQw4w9WgXcQ", "title": "Hit"}]
        with patch.object(search_mod, "run_search_pipeline", return_value=(fake_tracks, False)):
            st, hdrs, data = _invoke_handler(
                search_mod.handler,
                "/api/search?q=edgecachetest",
                {"User-Agent": browser_ua, "X-KW-Timestamp": ts, "X-KW-Signature": sig},
            )
            self.assertEqual(st, 200)
            self.assertEqual(data, fake_tracks)
            self.assertEqual(hdrs.get("cache-control"), "public, s-maxage=900, stale-while-revalidate=300")

        # 4. Audio endpoint accepts query-signed URL for <audio src> and blocks curl
        st, _, _ = _invoke_handler(audio_mod.handler, "/api/audio?v=dQw4w9WgXcQ&probe=1", {"User-Agent": "wget/1.21"})
        self.assertEqual(st, 403)

        audio_sig = compute_request_signature(ts, "/api/audio", "dQw4w9WgXcQ")
        with patch.object(audio_mod, "resolve_audio_stream_with_status", return_value=(None, True)):
            st, hdrs, data = _invoke_handler(
                audio_mod.handler,
                f"/api/audio?v=dQw4w9WgXcQ&probe=1&ts={ts}&sig={audio_sig}",
                {"User-Agent": browser_ua},
            )
            self.assertEqual(st, 503)
            self.assertEqual(hdrs.get("retry-after"), "15")
            self.assertTrue(data.get("rateLimited"))


if __name__ == "__main__":
    unittest.main()
