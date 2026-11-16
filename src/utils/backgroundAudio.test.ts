import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMediaMetadataInit,
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
