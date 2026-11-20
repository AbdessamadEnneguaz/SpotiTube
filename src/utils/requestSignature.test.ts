import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  SIGNATURE_WINDOW_SECONDS,
  buildCanonicalPayload,
  buildSignedAudioUrl,
  computeRequestSignature,
  createSignedHeaders,
} from './requestSignature';

const EXPECTED_KEY = Buffer.from('kw-v1-a8f4c291e5b07d33', 'utf-8');

test('computeRequestSignature produces deterministic 64-char HMAC-SHA256 hex matching Node crypto', async () => {
  const ts = 1763648000;
  const sig = await computeRequestSignature(ts, '/api/search', 'Burna Boy');
  const expected = crypto
    .createHmac('sha256', EXPECTED_KEY)
    .update(buildCanonicalPayload(ts, '/api/search', 'Burna Boy'))
    .digest('hex');

  assert.equal(sig.length, 64);
  assert.match(sig, /^[0-9a-f]{64}$/);
  assert.equal(sig, expected);
});

test('createSignedHeaders outputs X-KW-Timestamp and X-KW-Signature headers', async () => {
  const fixedNowMs = 1763648123456;
  const headers = await createSignedHeaders('/api/search', 'afrobeats', fixedNowMs);

  assert.equal(headers['X-KW-Timestamp'], '1763648123');
  const expected = await computeRequestSignature('1763648123', '/api/search', 'afrobeats');
  assert.equal(headers['X-KW-Signature'], expected);
});

test('tampered query or path alters signature', async () => {
  const h1 = await createSignedHeaders('/api/search', 'daft punk', 1763648000000);
  const h2 = await createSignedHeaders('/api/search', 'daft punk2', 1763648000000);
  const h3 = await createSignedHeaders('/api/audio', 'daft punk', 1763648000000);

  assert.notEqual(h1['X-KW-Signature'], h2['X-KW-Signature']);
  assert.notEqual(h1['X-KW-Signature'], h3['X-KW-Signature']);
  assert.equal(SIGNATURE_WINDOW_SECONDS, 120);
});

test('buildSignedAudioUrl includes v, ts, and sig parameters', async () => {
  const url = await buildSignedAudioUrl('dQw4w9WgXcQ', 1763648500000);
  const parsed = new URL(url, 'https://kiddwave.vercel.app');

  assert.equal(parsed.pathname, '/api/audio');
  assert.equal(parsed.searchParams.get('v'), 'dQw4w9WgXcQ');
  assert.equal(parsed.searchParams.get('ts'), '1763648500');
  const sig = parsed.searchParams.get('sig') || '';
  assert.equal(sig.length, 64);
  assert.equal(sig, await computeRequestSignature('1763648500', '/api/audio', 'dQw4w9WgXcQ'));
});
