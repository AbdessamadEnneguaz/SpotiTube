import { isValidYouTubeId } from './security';

export interface ResolvedAudioCandidate {
  url: string;
  mimeType: string;
  bitrate: number;
}

export type CanPlayAudioFn = (mimeType: string) => boolean;

const MIRROR_CACHE_TTL_MS = 10 * 60 * 1000;
const mirrorAudioCache = new Map<string, { candidate: ResolvedAudioCandidate; expiresAt: number }>();
const inFlightMirrorLookups = new Map<string, Promise<ResolvedAudioCandidate | null>>();

// Verified CORS-enabled Piped endpoint (avoids dead DNS/SSL/CORS console errors)
const PIPED_MIRRORS = ['https://api.piped.private.coffee'];

export function isSafeHttpsStreamUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string' || !raw.startsWith('https://')) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function selectBestAudioCandidate(
  candidates: ResolvedAudioCandidate[],
  canPlay?: CanPlayAudioFn
): ResolvedAudioCandidate | null {
  const playable = candidates.filter((c) => {
    if (!isSafeHttpsStreamUrl(c.url)) return false;
    const lowerMime = c.mimeType.toLowerCase();
    if (!lowerMime.startsWith('audio/') && !lowerMime.startsWith('video/mp4')) return false;
    if (canPlay) {
      return canPlay(c.mimeType);
    }
    return true;
  });

  if (playable.length === 0) return null;

  // Prefer audio-only MP4/AAC first, then audio-only streams, then muxed MP4 fallback
  const audioMp4 = playable.filter((c) => c.mimeType.toLowerCase().includes('audio/mp4'));
  const audioAny = playable.filter((c) => c.mimeType.toLowerCase().startsWith('audio/'));
  const pool = audioMp4.length > 0 ? audioMp4 : audioAny.length > 0 ? audioAny : playable;

  const sorted = [...pool].sort((a, b) => b.bitrate - a.bitrate);
  return sorted[0] || null;
}

export function extractAudioFromPipedPayload(
  data: unknown,
  canPlay?: CanPlayAudioFn
): ResolvedAudioCandidate | null {
  if (!data || typeof data !== 'object') return null;
  const payload = data as { audioStreams?: unknown; videoStreams?: unknown };
  const streams = Array.isArray(payload.audioStreams) ? payload.audioStreams : [];

  const candidates: ResolvedAudioCandidate[] = [];
  for (const s of streams) {
    if (!s || typeof s !== 'object') continue;
    const item = s as Record<string, unknown>;
    const url = item.url;
    const rawMime = typeof item.mimeType === 'string' ? item.mimeType : '';
    const mimeBase = rawMime.split(';')[0].trim().toLowerCase();
    const bitrate = typeof item.bitrate === 'number' && Number.isFinite(item.bitrate) ? item.bitrate : 0;

    if (isSafeHttpsStreamUrl(url) && mimeBase.startsWith('audio/')) {
      candidates.push({ url, mimeType: rawMime || mimeBase, bitrate });
    }
  }

  // Fallback to muxed (videoOnly === false) MP4 streams if audioStreams is empty
  if (candidates.length === 0 && Array.isArray(payload.videoStreams)) {
    for (const v of payload.videoStreams) {
      if (!v || typeof v !== 'object') continue;
      const item = v as Record<string, unknown>;
      const url = item.url;
      const videoOnly = Boolean(item.videoOnly);
      const rawMime = typeof item.mimeType === 'string' ? item.mimeType : '';
      const mimeBase = rawMime.split(';')[0].trim().toLowerCase();
      const bitrate = typeof item.bitrate === 'number' && Number.isFinite(item.bitrate) ? item.bitrate : 0;

      if (!videoOnly && isSafeHttpsStreamUrl(url) && mimeBase === 'video/mp4') {
        candidates.push({ url, mimeType: rawMime || mimeBase, bitrate });
      }
    }
  }

  return selectBestAudioCandidate(candidates, canPlay);
}

export function extractAudioFromInvidiousPayload(
  data: unknown,
  canPlay?: CanPlayAudioFn
): ResolvedAudioCandidate | null {
  if (!data || typeof data !== 'object') return null;
  const formats = (data as { adaptiveFormats?: unknown }).adaptiveFormats;
  if (!Array.isArray(formats)) return null;

  const candidates: ResolvedAudioCandidate[] = [];
  for (const f of formats) {
    if (!f || typeof f !== 'object') continue;
    const item = f as Record<string, unknown>;
    const url = item.url;
    const rawType = typeof item.type === 'string' ? item.type : '';
    const mimeBase = rawType.split(';')[0].trim().toLowerCase();
    const bitrate = Number.parseInt(String(item.bitrate || '0'), 10) || 0;

    if (isSafeHttpsStreamUrl(url) && mimeBase.startsWith('audio/')) {
      candidates.push({ url, mimeType: rawType || mimeBase, bitrate });
    }
  }

  return selectBestAudioCandidate(candidates, canPlay);
}

async function queryPipedMirror(
  base: string,
  videoId: string,
  canPlay?: CanPlayAudioFn
): Promise<ResolvedAudioCandidate | null> {
  try {
    const res = await fetch(`${base}/streams/${encodeURIComponent(videoId)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(2600)
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    const data = await res.json();
    return extractAudioFromPipedPayload(data, canPlay);
  } catch {
    return null;
  }
}

export function clearClientMirrorCache(): void {
  mirrorAudioCache.clear();
  inFlightMirrorLookups.clear();
}

/**
 * Resolves a direct HTTPS HTML5 audio stream from the user's own browser IP via
 * CORS-enabled Piped mirror endpoints.
 */
export async function resolveClientMirrorAudio(
  videoId: string,
  canPlay?: CanPlayAudioFn
): Promise<ResolvedAudioCandidate | null> {
  if (!isValidYouTubeId(videoId)) return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;

  const now = Date.now();
  const cached = mirrorAudioCache.get(videoId);
  if (cached && now < cached.expiresAt) {
    return cached.candidate;
  }

  const existing = inFlightMirrorLookups.get(videoId);
  if (existing) return existing;

  const lookup = (async (): Promise<ResolvedAudioCandidate | null> => {
    for (const base of PIPED_MIRRORS) {
      const winner = await queryPipedMirror(base, videoId, canPlay);
      if (winner) {
        mirrorAudioCache.set(videoId, {
          candidate: winner,
          expiresAt: Date.now() + MIRROR_CACHE_TTL_MS
        });
        return winner;
      }
    }
    return null;
  })().finally(() => {
    inFlightMirrorLookups.delete(videoId);
  });

  inFlightMirrorLookups.set(videoId, lookup);
  return lookup;
}
