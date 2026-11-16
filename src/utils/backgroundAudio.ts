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
    title: track.title || 'SpotiTube Track',
    artist: track.artist || 'SpotiTube',
    album: track.album || 'SpotiTube Music',
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
 * Generates a valid 1-second silent 8kHz 16-bit mono PCM WAV Blob URL.
 * Used as a lightweight audio-focus anchor on mobile PWAs so the OS keeps the
 * MediaSession lock-screen controls & background audio alive.
 */
export function createSilentWavBlobUrl(): string | null {
  if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return null;
  }
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

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

let keepAliveAudio: HTMLAudioElement | null = null;
let keepAliveUrl: string | null = null;

function getKeepAliveAudio(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  if (!keepAliveAudio) {
    keepAliveUrl = createSilentWavBlobUrl();
    if (!keepAliveUrl) return null;
    keepAliveAudio = new Audio(keepAliveUrl);
    keepAliveAudio.loop = true;
    keepAliveAudio.volume = 0.01;
    keepAliveAudio.setAttribute('playsinline', 'true');
  }
  return keepAliveAudio;
}

/**
 * Unlocks mobile audio session synchronously inside a user tap/click gesture.
 */
export function unlockAudioKeepAlive(): void {
  const audio = getKeepAliveAudio();
  if (!audio) return;
  try {
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {});
    }
  } catch {
    // ignore autoplay restriction if not triggered by gesture
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
