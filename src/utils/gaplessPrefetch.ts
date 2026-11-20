import { RepeatMode } from '../types/music';

export const PREFETCH_PROGRESS_THRESHOLD = 0.75;
export const PREFETCH_REMAINING_SECONDS = 20;
export const SIGNATURE_FRESH_MS = 90_000;

export interface PrefetchDecisionInput {
  currentTime: number;
  duration: number;
  nextTrackId: string | null;
  alreadyPrefetchedId: string | null;
  repeatMode: RepeatMode;
}

/**
 * Triggers next-track pre-fetching at >=75% progress or <=20 seconds remaining.
 */
export function shouldPrefetchNextTrack(input: PrefetchDecisionInput): boolean {
  const { currentTime, duration, nextTrackId, alreadyPrefetchedId, repeatMode } = input;
  if (!nextTrackId || repeatMode === 'one') return false;
  if (alreadyPrefetchedId === nextTrackId) return false;
  if (!Number.isFinite(duration) || duration <= 4) return false;
  if (!Number.isFinite(currentTime) || currentTime < 0) return false;

  const progressRatio = currentTime / duration;
  const remainingSec = duration - currentTime;

  return progressRatio >= PREFETCH_PROGRESS_THRESHOLD || remainingSec <= PREFETCH_REMAINING_SECONDS;
}

export function isSignatureFresh(signedAtMs: number, nowMs: number = Date.now()): boolean {
  if (!Number.isFinite(signedAtMs) || signedAtMs <= 0) return false;
  return nowMs - signedAtMs < SIGNATURE_FRESH_MS;
}

export interface CrossfadeDecisionInput {
  currentTime: number;
  duration: number;
  crossfadeSeconds: 0 | 2 | 4;
  hasPreparedNextTrack: boolean;
  engineMode: 'native_audio' | 'youtube_iframe';
  repeatMode: RepeatMode;
}

export function shouldTriggerCrossfade(input: CrossfadeDecisionInput): boolean {
  const {
    currentTime,
    duration,
    crossfadeSeconds,
    hasPreparedNextTrack,
    engineMode,
    repeatMode,
  } = input;
  if (crossfadeSeconds <= 0) return false;
  if (engineMode !== 'native_audio') return false;
  if (!hasPreparedNextTrack || repeatMode === 'one') return false;
  if (!Number.isFinite(duration) || duration <= crossfadeSeconds + 4) return false;

  const remaining = duration - currentTime;
  return remaining <= crossfadeSeconds && remaining > 0.05;
}

/**
 * Equal-power crossfade gain curve for smooth transitions without volume dips.
 */
export function computeCrossfadeGains(progress01: number): {
  outgoingGain: number;
  incomingGain: number;
} {
  const t = Math.min(1, Math.max(0, Number.isFinite(progress01) ? progress01 : 0));
  return {
    outgoingGain: Math.cos((t * Math.PI) / 2),
    incomingGain: Math.sin((t * Math.PI) / 2),
  };
}
