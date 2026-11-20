import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeCrossfadeGains,
  isSignatureFresh,
  shouldPrefetchNextTrack,
  shouldTriggerCrossfade,
} from './gaplessPrefetch';

test('shouldPrefetchNextTrack triggers at >=75% progress or <=20s remaining', () => {
  assert.equal(
    shouldPrefetchNextTrack({
      currentTime: 100,
      duration: 200,
      nextTrackId: 'abc12345678',
      alreadyPrefetchedId: null,
      repeatMode: 'off',
    }),
    false
  );

  // 75% of 200s = 150s
  assert.equal(
    shouldPrefetchNextTrack({
      currentTime: 150,
      duration: 200,
      nextTrackId: 'abc12345678',
      alreadyPrefetchedId: null,
      repeatMode: 'off',
    }),
    true
  );

  // Short 40s track: <=20s remaining triggers at 20s even if 50%
  assert.equal(
    shouldPrefetchNextTrack({
      currentTime: 22,
      duration: 40,
      nextTrackId: 'abc12345678',
      alreadyPrefetchedId: null,
      repeatMode: 'all',
    }),
    true
  );

  // Skips when repeat one or already prefetched
  assert.equal(
    shouldPrefetchNextTrack({
      currentTime: 185,
      duration: 200,
      nextTrackId: 'abc12345678',
      alreadyPrefetchedId: 'abc12345678',
      repeatMode: 'off',
    }),
    false
  );
  assert.equal(
    shouldPrefetchNextTrack({
      currentTime: 185,
      duration: 200,
      nextTrackId: 'abc12345678',
      alreadyPrefetchedId: null,
      repeatMode: 'one',
    }),
    false
  );
});

test('isSignatureFresh enforces <90s window for cached signed URLs', () => {
  const now = 1_700_000_000_000;
  assert.equal(isSignatureFresh(now - 30_000, now), true);
  assert.equal(isSignatureFresh(now - 95_000, now), false);
});

test('shouldTriggerCrossfade & computeCrossfadeGains produce smooth equal-power curves', () => {
  assert.equal(
    shouldTriggerCrossfade({
      currentTime: 196.5,
      duration: 200,
      crossfadeSeconds: 4,
      hasPreparedNextTrack: true,
      engineMode: 'native_audio',
      repeatMode: 'off',
    }),
    true
  );
  assert.equal(
    shouldTriggerCrossfade({
      currentTime: 196.5,
      duration: 200,
      crossfadeSeconds: 4,
      hasPreparedNextTrack: true,
      engineMode: 'youtube_iframe',
      repeatMode: 'off',
    }),
    false
  );

  const start = computeCrossfadeGains(0);
  const mid = computeCrossfadeGains(0.5);
  const end = computeCrossfadeGains(1);
  assert.ok(start.outgoingGain > 0.99 && start.incomingGain < 0.01);
  assert.ok(Math.abs(mid.outgoingGain - mid.incomingGain) < 0.01);
  assert.ok(end.outgoingGain < 0.01 && end.incomingGain > 0.99);
});
