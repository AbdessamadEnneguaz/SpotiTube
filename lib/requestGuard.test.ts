import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeServerSignature,
  isBlockedUserAgent,
  isSafeUpstreamAudioUrl,
  verifyServerRequestSignature,
} from './requestGuard';

test('isBlockedUserAgent blocks empty and CLI/scraper user agents', () => {
  assert.equal(isBlockedUserAgent(''), true);
  assert.equal(isBlockedUserAgent(undefined), true);
  assert.equal(isBlockedUserAgent('curl/8.5.0'), true);
  assert.equal(isBlockedUserAgent('python-requests/2.31.0'), true);
  assert.equal(isBlockedUserAgent('Scrapy/2.11.0'), true);
  assert.equal(isBlockedUserAgent('Wget/1.21.4'), true);

  assert.equal(
    isBlockedUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'
    ),
    false
  );
  assert.equal(isBlockedUserAgent('Mozilla/5.0 KiddwaveAndroid/1.2.3'), false);
});

test('verifyServerRequestSignature accepts valid ±120s signatures and rejects expired/tampered', () => {
  const nowSec = 1763648000;
  const sig = computeServerSignature(nowSec, '/api/search', 'Burna Boy');

  assert.equal(
    verifyServerRequestSignature({
      headers: { 'x-kw-timestamp': String(nowSec), 'x-kw-signature': sig },
      path: '/api/search',
      paramValue: 'Burna Boy',
      nowUnixSeconds: nowSec + 119,
    }),
    true
  );

  // Expired beyond 120s
  assert.equal(
    verifyServerRequestSignature({
      headers: { 'x-kw-timestamp': String(nowSec), 'x-kw-signature': sig },
      path: '/api/search',
      paramValue: 'Burna Boy',
      nowUnixSeconds: nowSec + 121,
    }),
    false
  );

  // Tampered query
  assert.equal(
    verifyServerRequestSignature({
      headers: { 'x-kw-timestamp': String(nowSec), 'x-kw-signature': sig },
      path: '/api/search',
      paramValue: 'Other Artist',
      nowUnixSeconds: nowSec,
    }),
    false
  );

  // Query param signature allowed only when allowQueryParams=true (e.g., <audio src>)
  const audioSig = computeServerSignature(nowSec, '/api/audio', 'dQw4w9WgXcQ');
  assert.equal(
    verifyServerRequestSignature({
      headers: {},
      query: { ts: String(nowSec), sig: audioSig },
      path: '/api/audio',
      paramValue: 'dQw4w9WgXcQ',
      allowQueryParams: false,
      nowUnixSeconds: nowSec,
    }),
    false
  );
  assert.equal(
    verifyServerRequestSignature({
      headers: {},
      query: { ts: String(nowSec), sig: audioSig },
      path: '/api/audio',
      paramValue: 'dQw4w9WgXcQ',
      allowQueryParams: true,
      nowUnixSeconds: nowSec,
    }),
    true
  );
});

test('isSafeUpstreamAudioUrl allows googlevideo and mirror hosts while blocking SSRF targets', () => {
  assert.equal(isSafeUpstreamAudioUrl('https://rr3---sn-4g5e6nsz.googlevideo.com/videoplayback'), true);
  assert.equal(isSafeUpstreamAudioUrl('https://pipedproxy-fra.adminforge.de/videoplayback'), true);
  assert.equal(isSafeUpstreamAudioUrl('https://inv.nadeko.net/latest_version?id=abc'), true);
  assert.equal(isSafeUpstreamAudioUrl('https://169.254.169.254/latest/meta-data/'), false);
  assert.equal(isSafeUpstreamAudioUrl('http://inv.nadeko.net/latest_version'), false);
});
