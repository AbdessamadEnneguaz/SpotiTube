import test from 'node:test';
import assert from 'node:assert/strict';
import { recordTrackPlay, getFrequentTracks, searchCachedTracks, CachedTrackEntry } from './trackCache.ts';
import { Track } from '../types/music.ts';

const makeTrack = (id: string, title: string, artist: string): Track => ({
  id: `track_${id}`,
  youtubeId: id,
  title,
  artist,
  album: 'Test Album',
  thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
  durationSeconds: 180,
  durationFormatted: '3:00',
  genre: 'chaabi',
});

test('recordTrackPlay increments play count and sorts most frequently played first', () => {
  const t1 = makeTrack('abc1', 'Aayta Daoudia', 'Abdellah Daoudi');
  const t2 = makeTrack('xyz2', 'Didi', 'Cheb Khaled');

  let entries: CachedTrackEntry[] = [];
  entries = recordTrackPlay(entries, t1, 50, 1000);
  entries = recordTrackPlay(entries, t2, 50, 2000);
  entries = recordTrackPlay(entries, t2, 50, 3000);

  assert.equal(entries.length, 2);
  assert.equal(entries[0].track.youtubeId, 'xyz2');
  assert.equal(entries[0].playCount, 2);
  assert.equal(entries[1].track.youtubeId, 'abc1');
  assert.equal(entries[1].playCount, 1);
});

test('recordTrackPlay enforces maxEntries cap', () => {
  let entries: CachedTrackEntry[] = [];
  for (let i = 0; i < 6; i++) {
    entries = recordTrackPlay(entries, makeTrack(`id_${i}`, `Track ${i}`, 'Artist'), 4, 1000 + i);
  }
  assert.equal(entries.length, 4);
});

test('getFrequentTracks returns ordered tracks up to limit', () => {
  const t1 = makeTrack('a1', 'Song One', 'Artist A');
  const t2 = makeTrack('b2', 'Song Two', 'Artist B');
  const t3 = makeTrack('c3', 'Song Three', 'Artist C');

  let entries: CachedTrackEntry[] = [];
  entries = recordTrackPlay(entries, t1, 50, 1000);
  entries = recordTrackPlay(entries, t2, 50, 2000);
  entries = recordTrackPlay(entries, t2, 50, 3000);
  entries = recordTrackPlay(entries, t3, 50, 4000);

  const topTwo = getFrequentTracks(entries, 2);
  assert.equal(topTwo.length, 2);
  assert.equal(topTwo[0].youtubeId, 'b2');
  assert.equal(topTwo[1].youtubeId, 'c3');
});

test('searchCachedTracks finds matching cached metadata offline', () => {
  const t1 = makeTrack('a1', 'Aayta Daoudia', 'Abdellah Daoudi');
  const t2 = makeTrack('b2', 'Blinding Lights', 'The Weeknd');

  let entries: CachedTrackEntry[] = [];
  entries = recordTrackPlay(entries, t1, 50, 1000);
  entries = recordTrackPlay(entries, t2, 50, 2000);

  const results = searchCachedTracks(entries, 'daoudi');
  assert.equal(results.length, 1);
  assert.equal(results[0].youtubeId, 'a1');
});
