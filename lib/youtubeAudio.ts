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

const PIPED_AUDIO_MIRRORS = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.private.coffee'
];

const INVIDIOUS_AUDIO_MIRRORS = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://yewtu.be'
];

let youtubeAudioCooldownUntil = 0;

function isYoutubeAudioCooledDown(): boolean {
  return Date.now() < youtubeAudioCooldownUntil;
}

export function markYoutubeAudioCooldown(ms = 60_000): void {
  youtubeAudioCooldownUntil = Math.max(youtubeAudioCooldownUntil, Date.now() + ms);
}

class AudioRateLimitError extends Error {}

function isAllowedStreamHost(rawUrl: unknown): boolean {
  if (isSafeGoogleVideoUrl(rawUrl)) return true;
  if (typeof rawUrl !== 'string' || !rawUrl.startsWith('https://') || rawUrl.length > 2048) {
    return false;
  }
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'inv.nadeko.net' ||
      host === 'invidious.nerdvpn.de' ||
      host === 'yewtu.be' ||
      host === 'pipedapi.kavin.rocks' ||
      host === 'pipedapi.adminforge.de' ||
      host === 'api.piped.private.coffee'
    ) {
      return true;
    }
    return (
      /^[a-z0-9-]+proxy[a-z0-9-]*\.[a-z0-9.-]+$/.test(host) &&
      (host.endsWith('.kavin.rocks') ||
        host.endsWith('.adminforge.de') ||
        host.endsWith('.private.coffee'))
    );
  } catch {
    return false;
  }
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

    if (res.status === 429 || res.status === 403) {
      throw new AudioRateLimitError(`InnerTube audio HTTP ${res.status}`);
    }
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.playabilityStatus?.status !== 'OK') {
      const reason = String(data?.playabilityStatus?.reason || '').toLowerCase();
      if (reason.includes('sign in') || reason.includes('429') || reason.includes('rate')) {
        throw new AudioRateLimitError('InnerTube verification triggered');
      }
      return null;
    }

    const adaptiveFormats = Array.isArray(data?.streamingData?.adaptiveFormats)
      ? data.streamingData.adaptiveFormats
      : [];

    const mp4Audios = adaptiveFormats.filter(
      (f: any) =>
        typeof f?.mimeType === 'string' &&
        f.mimeType.includes('audio/mp4') &&
        isAllowedStreamHost(f?.url)
    );
    const anyAudios = adaptiveFormats.filter(
      (f: any) =>
        typeof f?.mimeType === 'string' &&
        f.mimeType.startsWith('audio/') &&
        isAllowedStreamHost(f?.url)
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
  } catch (err) {
    if (err instanceof AudioRateLimitError) throw err;
    return null;
  }
}

async function fetchAudioStreamFromPiped(videoId: string): Promise<CachedAudioStream | null> {
  let sawRateLimit = false;
  for (const base of PIPED_AUDIO_MIRRORS) {
    try {
      const res = await fetch(`${base}/streams/${encodeURIComponent(videoId)}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      if (res.status === 429 || res.status === 403) {
        sawRateLimit = true;
        continue;
      }
      if (!res.ok) continue;
      const data = await res.json();
      const streams = Array.isArray(data?.audioStreams) ? data.audioStreams : [];
      const valid = streams.filter((s: any) => isAllowedStreamHost(s?.url));
      if (valid.length === 0) continue;
      const mp4s = valid.filter((s: any) => String(s?.mimeType || '').includes('audio/mp4'));
      const pool = mp4s.length > 0 ? mp4s : valid;
      pool.sort((a: any, b: any) => (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0));
      const best = pool[0];
      const parsedLen = Number.parseInt(String(best.contentLength || ''), 10);
      return {
        url: String(best.url),
        mimeType: String(best.mimeType || 'audio/mp4').split(';')[0] || 'audio/mp4',
        contentLength: Number.isFinite(parsedLen) && parsedLen > 0 ? parsedLen : null,
        expiresAt: Date.now() + AUDIO_CACHE_TTL_MS
      };
    } catch {
      // try next mirror
    }
  }
  if (sawRateLimit) throw new AudioRateLimitError('Piped audio rate-limited');
  return null;
}

async function fetchAudioStreamFromInvidious(videoId: string): Promise<CachedAudioStream | null> {
  let sawRateLimit = false;
  for (const base of INVIDIOUS_AUDIO_MIRRORS) {
    try {
      const res = await fetch(`${base}/api/v1/videos/${encodeURIComponent(videoId)}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      if (res.status === 429 || res.status === 403) {
        sawRateLimit = true;
        continue;
      }
      if (!res.ok) continue;
      const data = await res.json();
      const formats = Array.isArray(data?.adaptiveFormats) ? data.adaptiveFormats : [];
      const valid = formats.filter(
        (f: any) =>
          typeof f?.type === 'string' && f.type.startsWith('audio/') && isAllowedStreamHost(f?.url)
      );
      if (valid.length === 0) continue;
      const mp4s = valid.filter((f: any) => String(f.type).includes('audio/mp4'));
      const pool = mp4s.length > 0 ? mp4s : valid;
      pool.sort((a: any, b: any) => (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0));
      const best = pool[0];
      const parsedLen = Number.parseInt(String(best.clen || ''), 10);
      return {
        url: String(best.url),
        mimeType: String(best.type).split(';')[0] || 'audio/mp4',
        contentLength: Number.isFinite(parsedLen) && parsedLen > 0 ? parsedLen : null,
        expiresAt: Date.now() + AUDIO_CACHE_TTL_MS
      };
    } catch {
      // try next mirror
    }
  }
  if (sawRateLimit) throw new AudioRateLimitError('Invidious audio rate-limited');
  return null;
}

export interface AudioResolutionResult {
  stream: CachedAudioStream | null;
  rateLimited: boolean;
}

const inFlightAudioWithStatus = new Map<string, Promise<AudioResolutionResult>>();

export async function resolveAudioStreamWithStatus(videoId: string): Promise<AudioResolutionResult> {
  if (!isValidAudioVideoId(videoId)) return { stream: null, rateLimited: false };

  const now = Date.now();
  const cached = audioUrlCache.get(videoId);
  if (cached && now < cached.expiresAt) {
    return { stream: cached, rateLimited: false };
  }

  const existing = inFlightAudioWithStatus.get(videoId);
  if (existing) return existing;

  const lookup = (async (): Promise<AudioResolutionResult> => {
    let sawRateLimit = false;
    let stream: CachedAudioStream | null = null;

    if (!isYoutubeAudioCooledDown()) {
      try {
        stream = await fetchAudioStreamFromInnerTube(videoId);
      } catch (err) {
        if (err instanceof AudioRateLimitError) {
          sawRateLimit = true;
          markYoutubeAudioCooldown();
        }
      }
    } else {
      sawRateLimit = true;
    }

    if (!stream) {
      try {
        stream = await fetchAudioStreamFromPiped(videoId);
      } catch (err) {
        if (err instanceof AudioRateLimitError) sawRateLimit = true;
      }
    }

    if (!stream) {
      try {
        stream = await fetchAudioStreamFromInvidious(videoId);
      } catch (err) {
        if (err instanceof AudioRateLimitError) sawRateLimit = true;
      }
    }

    if (stream) {
      if (audioUrlCache.size >= MAX_AUDIO_CACHE) {
        const oldest = audioUrlCache.keys().next().value;
        if (oldest !== undefined) audioUrlCache.delete(oldest);
      }
      audioUrlCache.set(videoId, stream);
      return { stream, rateLimited: false };
    }

    return { stream: null, rateLimited: sawRateLimit };
  })().finally(() => {
    inFlightAudioWithStatus.delete(videoId);
  });

  inFlightAudioWithStatus.set(videoId, lookup);
  return lookup;
}

export async function resolveAudioStream(videoId: string): Promise<CachedAudioStream | null> {
  const res = await resolveAudioStreamWithStatus(videoId);
  return res.stream;
}

export function invalidateAudioStreamCache(videoId: string): void {
  audioUrlCache.delete(videoId);
}
