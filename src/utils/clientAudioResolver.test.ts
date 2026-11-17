import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractAudioFromPipedPayload,
  extractAudioFromInvidiousPayload,
  selectBestAudioCandidate,
  isSafeHttpsStreamUrl
} from './clientAudioResolver';

test('isSafeHttpsStreamUrl rejects unsafe protocols and allows https', () => {
  assert.equal(isSafeHttpsStreamUrl('https://cdn.example.com/audio.m4a'), true);
  assert.equal(isSafeHttpsStreamUrl('http://cdn.example.com/audio.m4a'), false);
  assert.equal(isSafeHttpsStreamUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpsStreamUrl('data:audio/mp4;base64,AAAA'), false);
  assert.equal(isSafeHttpsStreamUrl(null), false);
});

test('extractAudioFromPipedPayload picks highest-bitrate playable audio/mp4 first', () => {
  const payload = {
    audioStreams: [
      { url: 'http://insecure.example.com/1.m4a', mimeType: 'audio/mp4', bitrate: 320000 },
      { url: 'https://proxy.example.com/opus.webm', mimeType: 'audio/webm', bitrate: 160000 },
      { url: 'https://proxy.example.com/low.m4a', mimeType: 'audio/mp4', bitrate: 48000 },
      { url: 'https://proxy.example.com/high.m4a', mimeType: 'audio/mp4', bitrate: 130000 }
    ]
  };

  const best = extractAudioFromPipedPayload(payload);
  assert.ok(best);
  assert.equal(best.url, 'https://proxy.example.com/high.m4a');
  assert.equal(best.bitrate, 130000);
});

test('extractAudioFromInvidiousPayload respects canPlay filter and avoids unplayable codecs', () => {
  const payload = {
    adaptiveFormats: [
      { url: 'https://inv.example.com/video.mp4', type: 'video/mp4; codecs="avc1"', bitrate: '800000' },
      { url: 'https://inv.example.com/audio.m4a', type: 'audio/mp4; codecs="mp4a.40.2"', bitrate: '128000' },
      { url: 'https://inv.example.com/audio.webm', type: 'audio/webm; codecs="opus"', bitrate: '150000' }
    ]
  };

  // Simulate iOS Safari rejecting audio/webm
  const iosCanPlay = (mime: string) => mime.includes('audio/mp4');
  const bestIos = extractAudioFromInvidiousPayload(payload, iosCanPlay);
  assert.ok(bestIos);
  assert.equal(bestIos.url, 'https://inv.example.com/audio.m4a');

  // If MP4 is rejected and WebM is accepted, fallback to WebM
  const webmOnly = selectBestAudioCandidate(
    [
      { url: 'https://inv.example.com/audio.m4a', mimeType: 'audio/mp4', bitrate: 128000 },
      { url: 'https://inv.example.com/audio.webm', mimeType: 'audio/webm', bitrate: 150000 }
    ],
    (mime) => mime.includes('audio/webm')
  );
  assert.ok(webmOnly);
  assert.equal(webmOnly.url, 'https://inv.example.com/audio.webm');
});

test('extractAudioFromPipedPayload falls back to muxed non-videoOnly MP4 when audioStreams is empty', () => {
  const payload = {
    audioStreams: [],
    videoStreams: [
      { url: 'https://cdn.example.com/silent-video.mp4', mimeType: 'video/mp4', videoOnly: true, bitrate: 1000000 },
      { url: 'https://cdn.example.com/muxed.mp4', mimeType: 'video/mp4', videoOnly: false, bitrate: 256000 }
    ]
  };
  const fallback = extractAudioFromPipedPayload(payload);
  assert.ok(fallback);
  assert.equal(fallback.url, 'https://cdn.example.com/muxed.mp4');
});
