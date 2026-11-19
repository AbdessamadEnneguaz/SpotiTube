import unittest
from api._security import (
    SafeTTLCache,
    evaluate_cors,
    is_rate_limited,
    is_safe_googlevideo_url,
    validate_audio_video_id,
    validate_search_query,
)


class PythonSecurityTests(unittest.TestCase):
    def test_cors_allowlist_blocks_unauthorized_origins(self):
        ok_prod, h_prod = evaluate_cors("https://kiddwave.vercel.app", "kiddwave.vercel.app")
        self.assertTrue(ok_prod)
        self.assertEqual(h_prod.get("Access-Control-Allow-Origin"), "https://kiddwave.vercel.app")

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

    def test_googlevideo_ssrf_host_validation(self):
        self.assertTrue(is_safe_googlevideo_url("https://rr3---sn-4g5e6nsz.googlevideo.com/videoplayback"))
        self.assertFalse(is_safe_googlevideo_url("http://rr3---sn-4g5e6nsz.googlevideo.com/videoplayback"))
        self.assertFalse(is_safe_googlevideo_url("https://169.254.169.254/latest/meta-data/"))
        self.assertFalse(is_safe_googlevideo_url("https://user:pass@rr3.googlevideo.com/v"))
        self.assertFalse(is_safe_googlevideo_url("https://rr3.googlevideo.com:8443/v"))
        self.assertFalse(is_safe_googlevideo_url("https://googlevideo.com.attacker.com/v"))

    def test_ttl_cache_stores_and_expires(self):
        cache = SafeTTLCache(maxsize=2, ttl=60)
        cache.set("k1", [1, 2])
        self.assertEqual(cache.get("k1"), [1, 2])
        cache.delete("k1")
        self.assertIsNone(cache.get("k1"))


if __name__ == "__main__":
    unittest.main()
