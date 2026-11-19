import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMediaMetadataInit,
  computeSeekProgress,
  createKeepAliveWavBuffer,
  parseMediaBridgeCommand,
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

test('parseMediaBridgeCommand parses transport and seek:<ms> commands safely', () => {
  assert.deepEqual(parseMediaBridgeCommand('play'), { type: 'play' });
  assert.deepEqual(parseMediaBridgeCommand('pause'), { type: 'pause' });
  assert.deepEqual(parseMediaBridgeCommand('seek:45000'), { type: 'seek', seconds: 45 });
  assert.deepEqual(parseMediaBridgeCommand('seek:0'), { type: 'seek', seconds: 0 });
  assert.equal(parseMediaBridgeCommand('seek:-100'), null);
  assert.equal(parseMediaBridgeCommand('seek:notanumber'), null);
  assert.equal(parseMediaBridgeCommand('unknown_cmd'), null);
});

test('computeSeekProgress clamps seek percentage cleanly between 0 and 100', () => {
  assert.deepEqual(computeSeekProgress(0, 200), { percent: 0, clampedTime: 0 });
  assert.deepEqual(computeSeekProgress(50, 200), { percent: 25, clampedTime: 50 });
  assert.deepEqual(computeSeekProgress(250, 200), { percent: 100, clampedTime: 200 });
  assert.deepEqual(computeSeekProgress(-10, 200), { percent: 0, clampedTime: 0 });
  assert.deepEqual(computeSeekProgress(30, 0), { percent: 0, clampedTime: 0 });
});
