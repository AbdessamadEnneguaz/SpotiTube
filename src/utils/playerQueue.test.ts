import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getNextIndex,
  getPreviousIndex,
  addToQueue,
  removeFromQueue,
  reorderQueue,
  generateShuffledIndices
} from './playerQueue';
import { formatDuration, parseYouTubeTitle, filterTracks } from './formatters';
import { Track } from '../types/music';

const mockTracks: Track[] = [
  {
    id: 't1',
    youtubeId: 'vid1',
    title: 'Dima Labas',
    artist: 'Cheb Khaled',
    thumbnail: '',
    durationSeconds: 210,
    durationFormatted: '3:30',
    genre: 'rai'
  },
  {
    id: 't2',
    youtubeId: 'vid2',
    title: 'Siniya',
    artist: 'Nass El Ghiwane',
    thumbnail: '',
    durationSeconds: 340,
    durationFormatted: '5:40',
    genre: 'chaabi'
  },
  {
    id: 't3',
    youtubeId: 'vid3',
    title: 'Gueule Tapee',
    artist: 'ElGrandeToto',
    thumbnail: '',
    durationSeconds: 180,
    durationFormatted: '3:00',
    genre: 'rap'
  }
];

test('formatDuration formats seconds accurately', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(45), '0:45');
  assert.equal(formatDuration(65), '1:05');
  assert.equal(formatDuration(3665), '1:01:05');
  assert.equal(formatDuration(-10), '0:00');
});

test('parseYouTubeTitle extracts clean title and artist', () => {
  const parsed1 = parseYouTubeTitle('ElGrandeToto - Silhouette (Official Music Video)');
  assert.equal(parsed1.artist, 'ElGrandeToto');
  assert.equal(parsed1.title, 'Silhouette');

  const parsed2 = parseYouTubeTitle('Cheb Khaled - Didi (Lyrics)', 'Cheb Khaled - Topic');
  assert.equal(parsed2.artist, 'Cheb Khaled');
  assert.equal(parsed2.title, 'Didi');

  const parsed3 = parseYouTubeTitle('Najat Aatabou - Hedi Kedba Bayna (Audio HQ)');
  assert.equal(parsed3.artist, 'Najat Aatabou');
  assert.equal(parsed3.title, 'Hedi Kedba Bayna');
});

test('filterTracks filters correctly by artist and genre', () => {
  const resultRai = filterTracks(mockTracks, 'khaled');
  assert.equal(resultRai.length, 1);
  assert.equal(resultRai[0].artist, 'Cheb Khaled');

  const resultGenre = filterTracks(mockTracks, 'chaabi');
  assert.equal(resultGenre.length, 1);
  assert.equal(resultGenre[0].title, 'Siniya');

  const resultEmpty = filterTracks(mockTracks, '');
  assert.equal(resultEmpty.length, 3);
});

test('getNextIndex handles sequential, repeat, and queue termination', () => {
  // Sequential next
  assert.equal(getNextIndex(3, 0, 'off', false, []), 1);
  assert.equal(getNextIndex(3, 1, 'off', false, []), 2);
  // End of queue without repeat -> null
  assert.equal(getNextIndex(3, 2, 'off', false, []), null);
  // End of queue with repeat all -> 0
  assert.equal(getNextIndex(3, 2, 'all', false, []), 0);
  // Repeat one -> current index
  assert.equal(getNextIndex(3, 1, 'one', false, []), 1);
});

test('getPreviousIndex handles bounds', () => {
  assert.equal(getPreviousIndex(3, 2, false, []), 1);
  assert.equal(getPreviousIndex(3, 0, false, []), 0);
});

test('addToQueue and playNext', () => {
  const newTrack: Track = {
    id: 't4',
    youtubeId: 'vid4',
    title: 'Clando',
    artist: 'Dizzy Dros',
    thumbnail: '',
    durationSeconds: 200,
    durationFormatted: '3:20',
    genre: 'rap'
  };

  // Normal append
  const appended = addToQueue(mockTracks, newTrack, false);
  assert.equal(appended.length, 4);
  assert.equal(appended[3].id, 't4');

  // Play next after index 0
  const playNext = addToQueue(mockTracks, newTrack, true, 0);
  assert.equal(playNext.length, 4);
  assert.equal(playNext[1].id, 't4');
});

test('removeFromQueue and reorderQueue work correctly', () => {
  const removed = removeFromQueue(mockTracks, 1);
  assert.equal(removed.length, 2);
  assert.equal(removed[0].id, 't1');
  assert.equal(removed[1].id, 't3');

  const reordered = reorderQueue(mockTracks, 0, 2);
  assert.equal(reordered[0].id, 't2');
  assert.equal(reordered[1].id, 't3');
  assert.equal(reordered[2].id, 't1');
});

test('getLyricsForTrack returns custom or generated synchronized lyrics', async () => {
  const { getLyricsForTrack } = await import('../data/lyricsCatalog');
  // Specific track test
  const daoudiLyrics = getLyricsForTrack('chaabi_1', 'Aayta Daoudia', 'Abdellah Daoudi', 310);
  assert.ok(daoudiLyrics.length > 5);
  assert.ok(daoudiLyrics.some(l => l.text.includes('Daoudi')));

  // Fallback generation test
  const customLyrics = getLyricsForTrack('unknown_track', 'Sample Song', 'Unknown Artist', 180);
  assert.ok(customLyrics.length > 5);
  assert.equal(customLyrics[0].time, 0);
  assert.ok(customLyrics[0].text.includes('Sample Song'));
});

