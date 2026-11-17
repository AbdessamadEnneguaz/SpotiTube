import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMediaMetadataInit,
  createKeepAliveWavBuffer,
  shouldPreserveIntentOnVisibilityPause
} from './backgroundAudio.ts';
import { Track } from '../types/music';

const sampleTrack: Track = {
  id: 'yt_dQw4w9WgXcQ',
  youtubeId: 'dQw4w9WgXcQ',
  title: 'Never Gonna Give You Up',
  artist: 'Rick Astley',
  album: 'Whenever You Need Somebody',
  thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
  durationSeconds: 213,
  durationFormatted: '3:33',
  genre: 'global'
};

test('buildMediaMetadataInit builds valid artwork and ignores unsafe URLs', () => {
  const meta = buildMediaMetadataInit({
    ...sampleTrack,
    thumbnail: 'javascript:alert(1)'
  });
  assert.equal(meta.title, 'Never Gonna Give You Up');
  assert.equal(meta.artist, 'Rick Astley');
  assert.ok(meta.artwork.every((art) => art.src.startsWith('https://')));
  assert.ok(meta.artwork.some((art) => art.src.includes('mqdefault.jpg')));
});

test('shouldPreserveIntentOnVisibilityPause preserves play intent when page is hidden', () => {
  assert.equal(
    shouldPreserveIntentOnVisibilityPause({
      isDocumentHidden: true,
      userIntendedPlay: true,
      msSinceHidden: 0
    }),
    true
  );
  assert.equal(
    shouldPreserveIntentOnVisibilityPause({
      isDocumentHidden: false,
      userIntendedPlay: true,
      msSinceHidden: 500
    }),
    true
  );
  assert.equal(
    shouldPreserveIntentOnVisibilityPause({
      isDocumentHidden: false,
      userIntendedPlay: true,
      msSinceHidden: 5000
    }),
    false
  );
  assert.equal(
    shouldPreserveIntentOnVisibilityPause({
      isDocumentHidden: true,
      userIntendedPlay: false,
      msSinceHidden: 0
    }),
    false
  );
});

test('createKeepAliveWavBuffer builds valid RIFF/WAVE PCM with inaudible non-zero dither', () => {
  const buf = createKeepAliveWavBuffer();
  assert.equal(buf.byteLength, 44 + 8000 * 2);
  const view = new DataView(buf);
  const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
  assert.equal(riff, 'RIFF');
  assert.equal(wave, 'WAVE');
  assert.equal(view.getInt16(44, true), 1);
  assert.equal(view.getInt16(46, true), -1);
});
