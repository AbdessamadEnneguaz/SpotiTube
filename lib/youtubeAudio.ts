const YOUTUBE_ID_RE = /^[0-9A-Za-z_-]{11}$/;
const AUDIO_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_AUDIO_CACHE = 100;
export const AUDIO_CHUNK_BYTES = 524_288; // 512KB per Range chunk (safe for Express & Vercel limits)

interface CachedAudioStream {
  url: string;
  mimeType: string;
  contentLength: number | null;
  expiresAt: number;
}

const audioUrlCache = new Map<string, CachedAudioStream>();
const inFlightAudioLookups = new Map<string, Promise<CachedAudioStream | null>>();

export function isValidAudioVideoId(id: unknown): id is string {
  return typeof id === 'string' && YOUTUBE_ID_RE.test(id);
}

/**
 * SSRF Guard: ensures extracted audio stream URL strictly points to HTTPS *.googlevideo.com
 */
export function isSafeGoogleVideoUrl(rawUrl: unknown): boolean {
  if (typeof rawUrl !== 'string' || !rawUrl.startsWith('https://')) return false;
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.googlevideo.com');
  } catch {
    return false;
  }
}

export function clampByteRange(
  rangeHeader: string | undefined,
  totalLength: number | null,
  maxChunkBytes: number = AUDIO_CHUNK_BYTES
): { start: number; end: number } {
  let start = 0;
  let requestedEnd: number | null = null;

  if (rangeHeader) {
    const match = /^bytes=(\d+)-(\d*)$/i.exec(rangeHeader.trim());
    if (match) {
      start = Math.max(0, Number.parseInt(match[1], 10) || 0);
      if (match[2]) {
        const parsedEnd = Number.parseInt(match[2], 10);
        if (!Number.isNaN(parsedEnd) && parsedEnd >= start) {
          requestedEnd = parsedEnd;
        }
      }
    }
  }

  let end = start + maxChunkBytes - 1;
  if (requestedEnd !== null) {
    end = Math.min(end, requestedEnd);
  }
  if (totalLength !== null && totalLength > 0) {
    if (start >= totalLength) {
      start = Math.max(0, totalLength - 1);
    }
    end = Math.min(end, totalLength - 1);
  }
  return { start, end: Math.max(start, end) };
}

async function fetchAudioStreamFromInnerTube(videoId: string): Promise<CachedAudioStream | null> {
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: 'ANDROID_VR',
            clientVersion: '1.59.24',
            hl: 'en',
            gl: 'US'
          }
        }
      }),
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data?.playabilityStatus?.status !== 'OK') return null;

    const adaptiveFormats = Array.isArray(data?.streamingData?.adaptiveFormats)
      ? data.streamingData.adaptiveFormats
      : [];

    // Prefer MP4 AAC audio (universal support across iOS Safari, Android Chrome, and Desktop)
    const mp4Audios = adaptiveFormats.filter(
      (f: any) =>
        typeof f?.mimeType === 'string' &&
        f.mimeType.includes('audio/mp4') &&
        isSafeGoogleVideoUrl(f?.url)
    );
    const anyAudios = adaptiveFormats.filter(
      (f: any) =>
        typeof f?.mimeType === 'string' &&
        f.mimeType.startsWith('audio/') &&
        isSafeGoogleVideoUrl(f?.url)
    );

    const pool = mp4Audios.length > 0 ? mp4Audios : anyAudios;
    if (pool.length === 0) return null;

    pool.sort((a: any, b: any) => (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0));
    const best = pool[0];
    const parsedLen = Number.parseInt(String(best.contentLength || ''), 10);

    return {
      url: String(best.url),
      mimeType: String(best.mimeType).split(';')[0] || 'audio/mp4',
      contentLength: Number.isFinite(parsedLen) && parsedLen > 0 ? parsedLen : null,
      expiresAt: Date.now() + AUDIO_CACHE_TTL_MS
    };
  } catch {
    return null;
  }
}

export async function resolveAudioStream(videoId: string): Promise<CachedAudioStream | null> {
  if (!isValidAudioVideoId(videoId)) return null;

  const now = Date.now();
  const cached = audioUrlCache.get(videoId);
  if (cached && now < cached.expiresAt) {
    return cached;
  }

  const existing = inFlightAudioLookups.get(videoId);
  if (existing) return existing;

  const lookup = fetchAudioStreamFromInnerTube(videoId)
    .then((result) => {
      if (result) {
        if (audioUrlCache.size >= MAX_AUDIO_CACHE) {
          const oldest = audioUrlCache.keys().next().value;
          if (oldest !== undefined) audioUrlCache.delete(oldest);
        }
        audioUrlCache.set(videoId, result);
      }
      return result;
    })
    .finally(() => {
      inFlightAudioLookups.delete(videoId);
    });

  inFlightAudioLookups.set(videoId, lookup);
  return lookup;
}

export function invalidateAudioStreamCache(videoId: string): void {
  audioUrlCache.delete(videoId);
}
