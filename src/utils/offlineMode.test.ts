import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCachedYoutubeIdSet,
  isTrackPlayableOffline,
  filterTracksForOffline
} from './offlineMode.ts';
import { Track } from '../types/music';
import { CachedTrackEntry } from './trackCache';

const cachedTrack: Track = {
  id: 'rai_1',
  youtubeId: 'tTcnIYYeZI8',
  title: 'Didi',
  artist: 'Cheb Khaled',
  thumbnail: 'https://i.ytimg.com/vi/tTcnIYYeZI8/mqdefault.jpg',
  durationSeconds: 206,
  durationFormatted: '3:26',
  genre: 'rai'
};

const uncachedTrack: Track = {
  id: 'global_1',
  youtubeId: '4NRXx6U8ABQ',
  title: 'Blinding Lights',
  artist: 'The Weeknd',
  thumbnail: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/mqdefault.jpg',
  durationSeconds: 263,
  durationFormatted: '4:23',
  genre: 'global'
};

const cachedEntries: CachedTrackEntry[] = [
  { track: cachedTrack, playCount: 3, lastPlayedAt: 1000 }
];

test('isTrackPlayableOffline restricts playback strictly to cached tracks when offline is detected', () => {
  const cachedIds = getCachedYoutubeIdSet(cachedEntries);
  assert.equal(isTrackPlayableOffline(cachedTrack, cachedIds, true), true);
  assert.equal(isTrackPlayableOffline(uncachedTrack, cachedIds, true), false);
  assert.equal(isTrackPlayableOffline(uncachedTrack, cachedIds, false), true);
});

test('filterTracksForOffline returns only cached tracks when offline is detected', () => {
  const cachedIds = getCachedYoutubeIdSet(cachedEntries);
  const filtered = filterTracksForOffline([cachedTrack, uncachedTrack], cachedIds, true);
  assert.deepEqual(filtered.map((t) => t.youtubeId), ['tTcnIYYeZI8']);

  const onlineList = filterTracksForOffline([cachedTrack, uncachedTrack], cachedIds, false);
  assert.equal(onlineList.length, 2);
});
