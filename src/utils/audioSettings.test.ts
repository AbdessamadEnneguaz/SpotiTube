import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_AUDIO_SETTINGS,
  EQ_BANDS,
  EQ_PRESETS,
  applyEqPreset,
  clampEqDb,
  normalizeCrossfadeSeconds,
  sanitizeAudioSettings,
  updateEqBand,
} from './audioSettings';

test('EQ_BANDS exposes the exact 5 Spotify-style bands', () => {
  assert.deepEqual(
    EQ_BANDS.map((b) => b.label),
    ['60Hz', '230Hz', '910Hz', '3.6kHz', '14kHz']
  );
  assert.deepEqual(
    EQ_BANDS.map((b) => b.frequency),
    [60, 230, 910, 3600, 14000]
  );
});

test('EQ_PRESETS includes all required presets and applies gains', () => {
  assert.deepEqual(Object.keys(EQ_PRESETS), [
    'flat',
    'bass_boost',
    'pop',
    'rock',
    'vocal',
    'electronic',
  ]);
  const bass = applyEqPreset(DEFAULT_AUDIO_SETTINGS.equalizer, 'bass_boost');
  assert.equal(bass.preset, 'bass_boost');
  assert.ok(bass.band60Hz > 5);
  assert.ok(bass.band230Hz > 2);
});

test('clampEqDb and updateEqBand enforce [-12, 12] dB limits', () => {
  assert.equal(clampEqDb(99), 12);
  assert.equal(clampEqDb(-25), -12);
  assert.equal(clampEqDb(Number.NaN), 0);

  const custom = updateEqBand(DEFAULT_AUDIO_SETTINGS.equalizer, 'band60Hz', 20);
  assert.equal(custom.band60Hz, 12);
});

test('normalizeCrossfadeSeconds restricts values to 0 | 2 | 4', () => {
  assert.equal(normalizeCrossfadeSeconds(0), 0);
  assert.equal(normalizeCrossfadeSeconds(2), 2);
  assert.equal(normalizeCrossfadeSeconds(4), 4);
  assert.equal(normalizeCrossfadeSeconds(7), 0);
});

test('sanitizeAudioSettings safely normalizes malformed persisted JSON', () => {
  const clean = sanitizeAudioSettings({
    normalizationEnabled: false,
    crossfadeSeconds: 4,
    equalizer: {
      preset: 'rock',
      band60Hz: 50,
      band230Hz: -50,
    },
  });
  assert.equal(clean.normalizationEnabled, false);
  assert.equal(clean.crossfadeSeconds, 4);
  assert.equal(clean.equalizer.preset, 'rock');
  assert.equal(clean.equalizer.band60Hz, 12);
  assert.equal(clean.equalizer.band230Hz, -12);
});
