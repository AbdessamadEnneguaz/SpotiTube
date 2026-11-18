import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractPrimaryArtistName,
  getCuratedArtistProfile,
  buildArtistProfile,
  findRelatedTracks,
  sanitizeWikiSummary
} from './artistProfile';
import { Track } from '../types/music';

test('extractPrimaryArtistName isolates headlining artist cleanly', () => {
  assert.equal(extractPrimaryArtistName('Daft Punk ft. Pharrell Williams'), 'Daft Punk');
  assert.equal(extractPrimaryArtistName('Arijit Singh & Pritam'), 'Arijit Singh');
  assert.equal(extractPrimaryArtistName('Sting feat. Cheb Mami'), 'Sting');
});

test('getCuratedArtistProfile returns rich artist details for curated tracks', () => {
  const burna = getCuratedArtistProfile('Burna Boy');
  assert.ok(burna);
  assert.equal(burna.origin, 'Port Harcourt, Nigeria');
  assert.ok(burna.bio.length > 40);
  assert.ok(burna.craftSummary.length > 30);
  assert.ok(burna.notableWorks.length >= 2);

  const rosalia = getCuratedArtistProfile('ROSALÍA');
  assert.ok(rosalia);
  assert.equal(rosalia.origin, 'Barcelona, Spain');
});

test('buildArtistProfile merges Wikipedia summary cleanly for searched artists', () => {
  const dynamicTrack: Track = {
    id: 'yt_test1234567',
    youtubeId: 'test1234567',
    title: 'Sample Song',
    artist: 'Stromae ft. Guest',
    album: 'Studio Single',
    thumbnail: 'https://i.ytimg.com/vi/test1234567/mqdefault.jpg',
    durationSeconds: 200,
    durationFormatted: '3:20',
    genre: 'electronic'
  };

  const curatedProfile = buildArtistProfile(dynamicTrack);
  assert.equal(curatedProfile.name, 'Stromae');
  assert.equal(curatedProfile.origin, 'Brussels, Belgium');

  const unknownTrack: Track = {
    ...dynamicTrack,
    artist: 'Aurora Aksnes',
    country: 'Norway'
  };

  const liveProfile = buildArtistProfile(unknownTrack, {
    extract: 'Norwegian singer-songwriter and record producer known for ethereal electropop.',
    description: 'Norwegian singer-songwriter'
  });
  assert.equal(liveProfile.name, 'Aurora Aksnes');
  assert.equal(liveProfile.origin, 'Norway');
  assert.equal(liveProfile.isLiveFetched, true);
  assert.match(liveProfile.bio, /Norwegian singer-songwriter/);
});

test('sanitizeWikiSummary strips unsafe chars and truncates cleanly', () => {
  const dirty = '<script>Hello\u0000 world.</script> Second sentence.';
  const clean = sanitizeWikiSummary(dirty);
  assert.equal(clean.includes('<'), false);
  assert.equal(clean.includes('\u0000'), false);
});

test('findRelatedTracks prioritizes same artist or region/genre without duplicating current track', () => {
  const catalog: Track[] = [
    {
      id: 't1',
      youtubeId: '11111111111',
      title: 'Track One',
      artist: 'Burna Boy',
      album: 'Album A',
      country: 'Nigeria',
      region: 'africa',
      thumbnail: 'https://i.ytimg.com/vi/11111111111/mqdefault.jpg',
      durationSeconds: 180,
      durationFormatted: '3:00',
      genre: 'afrobeats'
    },
    {
      id: 't2',
      youtubeId: '22222222222',
      title: 'Track Two',
      artist: 'Burna Boy ft. Rema',
      album: 'Album B',
      country: 'Nigeria',
      region: 'africa',
      thumbnail: 'https://i.ytimg.com/vi/22222222222/mqdefault.jpg',
      durationSeconds: 190,
      durationFormatted: '3:10',
      genre: 'afrobeats'
    },
    {
      id: 't3',
      youtubeId: '33333333333',
      title: 'Track Three',
      artist: 'Tyla',
      album: 'Tyla',
      country: 'South Africa',
      region: 'africa',
      thumbnail: 'https://i.ytimg.com/vi/33333333333/mqdefault.jpg',
      durationSeconds: 200,
      durationFormatted: '3:20',
      genre: 'afrobeats'
    }
  ];

  const related = findRelatedTracks(catalog[0], catalog, 4);
  assert.equal(related.length, 2);
  assert.equal(related[0].id, 't2');
  assert.equal(related.some((t) => t.youtubeId === catalog[0].youtubeId), false);
});
