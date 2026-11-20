import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePrimaryArtist,
  getRecentTracksFeed,
  buildQuickAccessItems,
  extractPopularArtists,
  isNewLibraryUser,
} from './libraryFeed';
import { Track, Playlist } from '../types/music';
import { CachedTrackEntry } from './trackCache';

const makeTrack = (id: string, title: string, artist: string): Track => ({
  id,
  youtubeId: id.padEnd(11, '0').slice(0, 11),
  title,
  artist,
  thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
  durationSeconds: 200,
  durationFormatted: '3:20',
  genre: 'pop',
});

const SAMPLE_PLAYLIST: Playlist = {
  id: 'pl_global',
  name: 'Global Top Rotation',
  description: 'Global hits',
  coverImage: '/cover.jpg',
  tracks: [makeTrack('trk1aaaaaaa', 'Blinding Lights', 'The Weeknd')],
};

test('normalizePrimaryArtist extracts lead artist cleanly', () => {
  assert.equal(normalizePrimaryArtist('Daft Punk ft. Pharrell Williams'), 'Daft Punk');
  assert.equal(normalizePrimaryArtist('Arijit Singh & Pritam'), 'Arijit Singh');
  assert.equal(normalizePrimaryArtist('The Weeknd'), 'The Weeknd');
});

test('getRecentTracksFeed sorts by lastPlayedAt desc and deduplicates by youtubeId', () => {
  const t1 = makeTrack('track1aaaaa', 'First Played', 'Artist A');
  const t2 = makeTrack('track2bbbbb', 'Most Recent', 'Artist B');
  const entries: CachedTrackEntry[] = [
    { track: t1, playCount: 10, lastPlayedAt: 1000 },
    { track: t2, playCount: 1, lastPlayedAt: 5000 },
    { track: { ...t2, id: 'dup' }, playCount: 2, lastPlayedAt: 4000 },
  ];

  const feed = getRecentTracksFeed(entries, 4);
  assert.equal(feed.length, 2);
  assert.equal(feed[0].title, 'Most Recent');
  assert.equal(feed[1].title, 'First Played');
});

test('buildQuickAccessItems always returns 6 tiles starting with Favorites and Offline Vault', () => {
  const catalog = [
    makeTrack('c1aaaaaaaaa', 'Song 1', 'Artist 1'),
    makeTrack('c2bbbbbbbbb', 'Song 2', 'Artist 2'),
    makeTrack('c3ccccccccc', 'Song 3', 'Artist 3'),
    makeTrack('c4ddddddddd', 'Song 4', 'Artist 4'),
  ];
  const recent: CachedTrackEntry[] = [
    { track: makeTrack('r1xxxxxxxxx', 'Recent Hit', 'Burna Boy'), playCount: 3, lastPlayedAt: 9000 },
  ];

  const items = buildQuickAccessItems({
    cachedEntries: recent,
    curatedTracks: catalog,
    playlists: [SAMPLE_PLAYLIST],
    likedCount: 5,
    offlineCount: 2,
  });

  assert.equal(items.length, 6);
  assert.equal(items[0].kind, 'favorites');
  assert.equal(items[0].subtitle, '5 tracks');
  assert.equal(items[1].kind, 'offline');
  assert.equal(items[1].subtitle, '2 downloaded');
  assert.equal(items[2].title, 'Recent Hit');
  assert.equal(items[3].kind, 'playlist');
});

test('extractPopularArtists prioritizes frequently played user artists and deduplicates', () => {
  const tA = makeTrack('ta111111111', 'Hit A', 'The Weeknd');
  const tB = makeTrack('tb222222222', 'Hit B', 'Dua Lipa');
  const tB2 = makeTrack('tb333333333', 'Hit B2', 'Dua Lipa');

  const artists = extractPopularArtists(
    [{ track: tB, playCount: 7, lastPlayedAt: 2000 }],
    [tA, tB, tB2],
    5
  );

  assert.equal(artists.length, 2);
  assert.equal(artists[0].name, 'Dua Lipa');
  assert.equal(artists[0].playCount, 7);
  assert.equal(artists[0].tracks.length, 2);
  assert.equal(artists[1].name, 'The Weeknd');
});

test('isNewLibraryUser returns true only when cache, custom playlists, and offline vault are empty', () => {
  assert.equal(isNewLibraryUser({ cachedCount: 0, customPlaylistCount: 0, offlineCount: 0 }), true);
  assert.equal(isNewLibraryUser({ cachedCount: 1, customPlaylistCount: 0, offlineCount: 0 }), false);
  assert.equal(isNewLibraryUser({ cachedCount: 0, customPlaylistCount: 1, offlineCount: 0 }), false);
  assert.equal(isNewLibraryUser({ cachedCount: 0, customPlaylistCount: 0, offlineCount: 1 }), false);
});
