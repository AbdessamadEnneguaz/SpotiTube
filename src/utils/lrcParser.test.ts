import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cleanArtistForLyrics,
  cleanTrackTitleForLyrics,
  findActiveLyricIndex,
  parseLrcLyrics,
} from './lrcParser';

test('parseLrcLyrics parses single, millisecond, and multi-timestamp lines in sorted order', () => {
  const sample = [
    '[ar:Test Artist]',
    '[ti:Midnight Echo]',
    '[00:12.50][01:02.250]Chorus line repeated',
    '[00:05.10]Opening verse line',
    '[00:09.00]   ',
  ].join('\n');

  const lines = parseLrcLyrics(sample);
  assert.equal(lines.length, 3);
  assert.deepEqual(lines[0], { time: 5.1, text: 'Opening verse line' });
  assert.deepEqual(lines[1], { time: 12.5, text: 'Chorus line repeated' });
  assert.deepEqual(lines[2], { time: 62.25, text: 'Chorus line repeated' });
});

test('cleanTrackTitleForLyrics and cleanArtistForLyrics remove YouTube clutter cleanly', () => {
  assert.equal(
    cleanTrackTitleForLyrics('Blinding Lights (Official Audio) [HD] ft. Rosalia'),
    'Blinding Lights'
  );
  assert.equal(
    cleanArtistForLyrics('Burna Boy - Topic'),
    'Burna Boy'
  );
  assert.equal(
    cleanArtistForLyrics('Daft Punk, Pharrell Williams'),
    'Daft Punk'
  );
});

test('findActiveLyricIndex finds exact line via binary search', () => {
  const lines = [
    { time: 5, text: 'One' },
    { time: 12, text: 'Two' },
    { time: 20, text: 'Three' },
  ];
  assert.equal(findActiveLyricIndex(lines, 2), -1);
  assert.equal(findActiveLyricIndex(lines, 5), 0);
  assert.equal(findActiveLyricIndex(lines, 15), 1);
  assert.equal(findActiveLyricIndex(lines, 25), 2);
});
