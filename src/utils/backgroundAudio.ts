import { Track } from '../types/music';
import { isValidYouTubeId, sanitizeMediaUrl } from './security';

export interface MediaMetadataSpec {
  title: string;
  artist: string;
  album: string;
  artwork: Array<{ src: string; sizes: string; type: string }>;
}

/**
 * Builds MediaSession metadata payload with valid HTTPS artwork sizes
 * for Android/iOS lock-screen & notification media controls.
 */
export function buildMediaMetadataInit(track: Track): MediaMetadataSpec {
  const artwork: Array<{ src: string; sizes: string; type: string }> = [];
  const safeThumb = sanitizeMediaUrl(track.thumbnail);
  if (safeThumb) {
    artwork.push({ src: safeThumb, sizes: '320x180', type: 'image/jpeg' });
  }
  if (isValidYouTubeId(track.youtubeId)) {
    artwork.push(
      {
        src: `https://i.ytimg.com/vi/${track.youtubeId}/mqdefault.jpg`,
        sizes: '320x180',
        type: 'image/jpeg'
      },
      {
        src: `https://i.ytimg.com/vi/${track.youtubeId}/hqdefault.jpg`,
        sizes: '480x360',
        type: 'image/jpeg'
      }
    );
  }
  if (artwork.length === 0) {
    artwork.push({ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' });
  }

  return {
    title: track.title || 'Kiddwave Track',
    artist: track.artist || 'Kiddwave',
    album: track.album || 'Kiddwave Music',
    artwork
  };
}

/**
 * Determines if a player 'paused' event was triggered involuntarily by the mobile
 * browser hiding/backgrounding the page while the user still intended to play.
 */
export function shouldPreserveIntentOnVisibilityPause(params: {
  isDocumentHidden: boolean;
  userIntendedPlay: boolean;
  msSinceHidden: number;
}): boolean {
  if (!params.userIntendedPlay) return false;
  return params.isDocumentHidden || (params.msSinceHidden >= 0 && params.msSinceHidden <= 2000);
}

/**
 * Generates a valid 1-second 8kHz 16-bit mono PCM WAV ArrayBuffer with an
 * inaudible -90 dBFS alternating LSB signal (±1) so mobile browsers treat the
 * audio stream as active media rather than idle silence.
 */
export function createKeepAliveWavBuffer(): ArrayBuffer {
  const sampleRate = 8000;
  const numSamples = sampleRate; // 1 second
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset + i, s.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    view.setInt16(44 + i * 2, i % 2 === 0 ? 1 : -1, true);
  }

  return buffer;
}

/**
 * Wraps the keep-alive WAV buffer in an Object URL for HTMLAudioElement playback.
 */
export function createSilentWavBlobUrl(): string | null {
  if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return null;
  }
  const buffer = createKeepAliveWavBuffer();
  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

let keepAliveAudio: HTMLAudioElement | null = null;
let keepAliveUrl: string | null = null;
let primaryAudioElement: HTMLAudioElement | null = null;

function ensureKeepAliveUrl(): string | null {
  if (!keepAliveUrl) {
    keepAliveUrl = createSilentWavBlobUrl();
  }
  return keepAliveUrl;
}

function getKeepAliveAudio(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  if (!keepAliveAudio) {
    const url = ensureKeepAliveUrl();
    if (!url) return null;
    keepAliveAudio = new Audio(url);
    keepAliveAudio.loop = true;
    keepAliveAudio.volume = 0.01;
    keepAliveAudio.setAttribute('playsinline', 'true');
  }
  return keepAliveAudio;
}

/**
 * Registers the primary <audio> player element so it can be unlocked synchronously
 * during a user tap/click before async stream resolution finishes.
 */
export function registerPrimaryAudioElement(el: HTMLAudioElement | null): void {
  primaryAudioElement = el;
}

/**
 * Unlocks mobile audio session synchronously inside a user tap/click gesture,
 * priming both the keep-alive anchor and the primary <audio> element.
 */
export function unlockAudioKeepAlive(): void {
  const audio = getKeepAliveAudio();
  if (audio) {
    try {
      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    } catch {
      // ignore autoplay restriction if not triggered by gesture
    }
  }

  if (primaryAudioElement && !primaryAudioElement.getAttribute('src')) {
    const url = ensureKeepAliveUrl();
    if (url) {
      try {
        primaryAudioElement.src = url;
        primaryAudioElement.volume = 0.01;
        const p = primaryAudioElement.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      } catch {
        // ignore priming error
      }
    }
  }
}

/**
 * Syncs the background keep-alive audio element with active playback state.
 */
export function setAudioKeepAlivePlaying(active: boolean): void {
  const audio = getKeepAliveAudio();
  if (!audio) return;
  try {
    if (active) {
      if (audio.paused) {
        const p = audio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      }
    } else if (!audio.paused) {
      audio.pause();
    }
  } catch {
    // ignore transient audio state errors
  }
}

export type MediaBridgeCommand =
  | { type: 'play' | 'pause' | 'stop' | 'toggle' | 'next' | 'previous' }
  | { type: 'seek'; seconds: number };

const MAX_SEEK_MS = 12 * 3600 * 1000;

/**
 * Parses commands sent by the native Android MediaStyle notification bar
 * (including `seek:<positionMs>` from dragging the lockscreen/notification circle).
 */
export function parseMediaBridgeCommand(rawCmd: string): MediaBridgeCommand | null {
  const cmd = rawCmd.trim();
  if (!cmd) return null;

  if (
    cmd === 'play' ||
    cmd === 'pause' ||
    cmd === 'stop' ||
    cmd === 'toggle' ||
    cmd === 'next' ||
    cmd === 'previous'
  ) {
    return { type: cmd };
  }

  if (cmd.startsWith('seek:')) {
    const rawMs = Number(cmd.slice(5));
    if (!Number.isFinite(rawMs) || rawMs < 0) return null;
    const clampedMs = Math.min(rawMs, MAX_SEEK_MS);
    return { type: 'seek', seconds: clampedMs / 1000 };
  }

  return null;
}

/**
 * Computes clamped seekbar percentage (0..100) and clamped timestamp for PlayerBar UI.
 */
export function computeSeekProgress(currentTime: number, duration: number): {
  percent: number;
  clampedTime: number;
} {
  if (!Number.isFinite(duration) || duration <= 0) {
    return { percent: 0, clampedTime: 0 };
  }
  const safeTime = Number.isFinite(currentTime) ? Math.min(duration, Math.max(0, currentTime)) : 0;
  const percent = Math.min(100, Math.max(0, (safeTime / duration) * 100));
  return { percent, clampedTime: safeTime };
}

