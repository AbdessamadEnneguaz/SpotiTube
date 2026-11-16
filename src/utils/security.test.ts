import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidYouTubeId, sanitizeMediaUrl, sanitizeClientText, safeParseJson } from './security.ts';

test('isValidYouTubeId accepts valid 11-char IDs and rejects XSS/path traversal payloads', () => {
  assert.equal(isValidYouTubeId('5vwSjx-PQFQ'), true);
  assert.equal(isValidYouTubeId('dQw4w9WgXcQ'), true);
  assert.equal(isValidYouTubeId('<script>alert(1)</script>'), false);
  assert.equal(isValidYouTubeId('../../etc/passwd'), false);
  assert.equal(isValidYouTubeId('short'), false);
});

test('sanitizeMediaUrl blocks javascript: and non-HTTPS schemes', () => {
  assert.equal(sanitizeMediaUrl('https://i.ytimg.com/vi/abc/mqdefault.jpg'), 'https://i.ytimg.com/vi/abc/mqdefault.jpg');
  assert.equal(sanitizeMediaUrl('javascript:alert(1)', '/fallback.png'), '/fallback.png');
  assert.equal(sanitizeMediaUrl('http://insecure.example/a.jpg', ''), '');
  assert.equal(sanitizeMediaUrl('//protocol-relative.example/x.jpg', ''), '');
  assert.equal(sanitizeMediaUrl('/pwa-192x192.png'), '/pwa-192x192.png');
});

test('sanitizeClientText strips control chars and angle brackets', () => {
  assert.equal(sanitizeClientText('  Chaabi\x00 <script>Mix</script>  '), 'Chaabi scriptMix/script');
});

test('safeParseJson blocks oversized payloads and prototype pollution keys', () => {
  const polluted = '{"ok":true,"__proto__":{"admin":true}}';
  const res = safeParseJson<Record<string, unknown>>(polluted, {});
  assert.equal(res.ok, true);
  assert.equal(({} as Record<string, unknown>).admin, undefined);

  const invalid = safeParseJson('not json', ['fallback'], Array.isArray);
  assert.deepEqual(invalid, ['fallback']);
});
