export interface SearchResultItem {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  artist: string;
  thumbnail: string;
  durationSeconds: number;
  durationFormatted: string;
}

const YOUTUBE_ID_RE = /^[0-9A-Za-z_-]{11}$/;

function isValidVideoId(id: string): boolean {
  return YOUTUBE_ID_RE.test(id);
}

function safeHttpsThumbnail(url: unknown, videoId: string): string {
  if (typeof url === 'string' && url.startsWith('https://')) {
    return url;
  }
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

// Helper to convert MM:SS or HH:MM:SS to seconds
export function parseLengthToSeconds(lengthStr: string): number {
  if (!lengthStr) return 210;
  const parts = lengthStr.split(':').map(Number);
  if (parts.some(isNaN)) return 210;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 210;
}

export function formatSeconds(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '3:30';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function sanitizeSearchQuery(raw: string): string {
  let query = (raw || '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!query) return '';
  if (query.length > 100) {
    query = query.slice(0, 100);
  }
  return query.replace(/[<>{}\\"'`]/g, '').replace(/\s+/g, ' ').trim();
}

// Bounded In-Memory Rate Limiter + Global Burst Protection (OOM / DDoS safe)
interface RateLimitRecord {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}
const searchRateLimits = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_SEARCH_REQUESTS_PER_IP = 40;
const COOLDOWN_MS = 60 * 1000;
const MAX_TRACKED_IPS = 4000;

let globalWindowResetAt = Date.now() + RATE_LIMIT_WINDOW_MS;
let globalRequestCount = 0;
const MAX_GLOBAL_SEARCH_REQUESTS_PER_MIN = 300;

function pruneExpiredRateLimits(now: number): void {
  for (const [ip, rec] of searchRateLimits.entries()) {
    if (now > rec.resetAt && (!rec.blockedUntil || now > rec.blockedUntil)) {
      searchRateLimits.delete(ip);
    }
  }
  // If still above cap under spoofed-IP flood, evict oldest entries
  while (searchRateLimits.size >= MAX_TRACKED_IPS) {
    const oldestKey = searchRateLimits.keys().next().value;
    if (oldestKey === undefined) break;
    searchRateLimits.delete(oldestKey);
  }
}

export function isSearchRateLimited(clientIp: string): boolean {
  const now = Date.now();

  // Global burst guard against distributed / spoofed-IP floods
  if (now > globalWindowResetAt) {
    globalWindowResetAt = now + RATE_LIMIT_WINDOW_MS;
    globalRequestCount = 1;
  } else {
    globalRequestCount += 1;
    if (globalRequestCount > MAX_GLOBAL_SEARCH_REQUESTS_PER_MIN) {
      return true;
    }
  }

  const normalizedIp = (clientIp || 'unknown').slice(0, 64);
  const record = searchRateLimits.get(normalizedIp);

  if (record?.blockedUntil && now < record.blockedUntil) {
    return true;
  }

  if (!record || now > record.resetAt) {
    if (searchRateLimits.size >= MAX_TRACKED_IPS) {
      pruneExpiredRateLimits(now);
    }
    searchRateLimits.set(normalizedIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= MAX_SEARCH_REQUESTS_PER_IP) {
    record.blockedUntil = now + COOLDOWN_MS;
    return true;
  }

  record.count += 1;
  return false;
}

// In-Memory Search Result Cache + In-Flight Deduplication (stops Cache Stampede / DoS)
interface CachedSearchResult {
  items: SearchResultItem[];
  expiresAt: number;
}
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHED_QUERIES = 200;
const searchResultCache = new Map<string, CachedSearchResult>();
const inFlightSearches = new Map<string, Promise<SearchResultItem[]>>();

// Extract video items from YouTube twoColumnSearchResultsRenderer JSON structure
function extractVideosFromYouTubeJson(data: any): SearchResultItem[] {
  const contents =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
  const results: SearchResultItem[] = [];
  const seenIds = new Set<string>();

  for (const section of contents) {
    const items = section?.itemSectionRenderer?.contents || [];
    for (const item of items) {
      if (item.videoRenderer?.videoId) {
        const v = item.videoRenderer;
        const id = String(v.videoId);
        if (!isValidVideoId(id) || seenIds.has(id)) continue;
        seenIds.add(id);

        const title =
          v.title?.runs?.map((r: any) => r.text).join('') ||
          v.title?.simpleText ||
          'Unknown Title';
        const channel =
          v.ownerText?.runs?.map((r: any) => r.text).join('') ||
          v.longBylineText?.runs?.map((r: any) => r.text).join('') ||
          'Global Artist';
        const length = v.lengthText?.simpleText || '';
        const rawThumb = v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url;

        results.push({
          id,
          youtubeId: id,
          title: String(title).slice(0, 200),
          channel: String(channel).slice(0, 120),
          artist: String(channel).slice(0, 120),
          thumbnail: safeHttpsThumbnail(rawThumb, id),
          durationSeconds: parseLengthToSeconds(length || '3:30'),
          durationFormatted: length || '3:30'
        });

        if (results.length >= 20) break;
      }
    }
    if (results.length >= 20) break;
  }

  return results;
}

const INVIDIOUS_MIRRORS = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://yewtu.be'
];

class UpstreamRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UpstreamRateLimitError';
  }
}

let youtubeSearchCooldownUntil = 0;

function isYoutubeSearchCooledDown(): boolean {
  return Date.now() < youtubeSearchCooldownUntil;
}

function markYoutubeSearchCooldown(ms = 60_000): void {
  youtubeSearchCooldownUntil = Math.max(youtubeSearchCooldownUntil, Date.now() + ms);
}

// Layer 1: YouTube InnerTube JSON API (Keyless)
async function searchViaInnerTube(query: string): Promise<SearchResultItem[]> {
  const res = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://www.youtube.com',
      'Referer': 'https://www.youtube.com/',
      'Cookie': 'CONSENT=YES+cb; SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg'
    },
    body: JSON.stringify({
      context: {
        client: {
          hl: 'en',
          gl: 'US',
          clientName: 'WEB',
          clientVersion: '2.20241101.00.00'
        }
      },
      query
    }),
    signal: AbortSignal.timeout(6500)
  });

  if (res.status === 429 || res.status === 403) {
    throw new UpstreamRateLimitError(`InnerTube HTTP ${res.status}`);
  }
  if (!res.ok) return [];
  const data = await res.json();
  return extractVideosFromYouTubeJson(data);
}

// Layer 2: YouTube Web HTML fallback with Consent cookies
async function searchViaYouTubeHtml(query: string): Promise<SearchResultItem[]> {
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cookie': 'CONSENT=YES+cb; SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg'
    },
    signal: AbortSignal.timeout(6500)
  });

  if (response.status === 429 || response.status === 403) {
    throw new UpstreamRateLimitError(`YouTube HTML HTTP ${response.status}`);
  }
  if (!response.ok) return [];
  const html = await response.text();
  const match =
    html.match(/var ytInitialData = ({.*?});<\/script>/) ||
    html.match(/ytInitialData = ({.*?});/);
  if (!match) return [];

  const data = JSON.parse(match[1]);
  return extractVideosFromYouTubeJson(data);
}

// Layer 3: Public Piped API fallback
async function searchViaPublicMirrors(query: string): Promise<SearchResultItem[]> {
  const pipedMirrors = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://api.piped.private.coffee'
  ];
  let sawRateLimit = false;

  for (const base of pipedMirrors) {
    try {
      const res = await fetch(`${base}/search?q=${encodeURIComponent(query)}&filter=videos`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3500)
      });
      if (res.status === 429 || res.status === 403) {
        sawRateLimit = true;
        continue;
      }
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) continue;

      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      const results: SearchResultItem[] = [];

      for (const item of items) {
        const urlStr = String(item.url || '');
        const match = urlStr.match(/[?&]v=([^&]+)/) || urlStr.match(/\/watch\/([^?&#/]+)/);
        const id = match ? match[1] : '';
        if (!isValidVideoId(id)) continue;

        const dur = typeof item.duration === 'number' && item.duration > 0 ? item.duration : 210;
        results.push({
          id,
          youtubeId: id,
          title: String(item.title || 'Unknown Title').slice(0, 200),
          channel: String(item.uploaderName || 'Global Artist').slice(0, 120),
          artist: String(item.uploaderName || 'Global Artist').slice(0, 120),
          thumbnail: safeHttpsThumbnail(item.thumbnail, id),
          durationSeconds: dur,
          durationFormatted: formatSeconds(dur)
        });

        if (results.length >= 20) break;
      }

      if (results.length > 0) return results;
    } catch {
      // try next mirror
    }
  }

  if (sawRateLimit) {
    throw new UpstreamRateLimitError('Piped search mirrors rate-limited');
  }
  return [];
}

// Layer 4: Public Invidious API fallback
async function searchViaInvidiousMirrors(query: string): Promise<SearchResultItem[]> {
  let sawRateLimit = false;
  for (const base of INVIDIOUS_MIRRORS) {
    try {
      const res = await fetch(`${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3500)
      });
      if (res.status === 429 || res.status === 403) {
        sawRateLimit = true;
        continue;
      }
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) continue;

      const items = await res.json();
      if (!Array.isArray(items)) continue;
      const results: SearchResultItem[] = [];
      const seen = new Set<string>();

      for (const item of items) {
        const id = String(item?.videoId || '');
        if (!isValidVideoId(id) || seen.has(id)) continue;
        seen.add(id);

        const dur = typeof item?.lengthSeconds === 'number' && item.lengthSeconds > 0 ? item.lengthSeconds : 210;
        const rawThumb = Array.isArray(item?.videoThumbnails) ? item.videoThumbnails[0]?.url : undefined;
        const author = String(item?.author || 'Global Artist').slice(0, 120);

        results.push({
          id,
          youtubeId: id,
          title: String(item?.title || 'Unknown Title').slice(0, 200),
          channel: author,
          artist: author,
          thumbnail: safeHttpsThumbnail(rawThumb, id),
          durationSeconds: dur,
          durationFormatted: formatSeconds(dur)
        });

        if (results.length >= 20) break;
      }

      if (results.length > 0) return results;
    } catch {
      // try next mirror
    }
  }
  if (sawRateLimit) {
    throw new UpstreamRateLimitError('Invidious search mirrors rate-limited');
  }
  return [];
}

export interface SearchPipelineResult {
  items: SearchResultItem[];
  rateLimited: boolean;
}

const inFlightSearchesWithStatus = new Map<string, Promise<SearchPipelineResult>>();

async function runSearchPipelineWithStatus(cleanQuery: string): Promise<SearchPipelineResult> {
  let sawRateLimit = false;

  if (!isYoutubeSearchCooledDown()) {
    try {
      const innerTubeResults = await searchViaInnerTube(cleanQuery);
      if (innerTubeResults.length > 0) return { items: innerTubeResults, rateLimited: false };
    } catch (err) {
      if (err instanceof UpstreamRateLimitError) {
        sawRateLimit = true;
        markYoutubeSearchCooldown();
      }
      console.warn('[Search] InnerTube notice:', (err as Error)?.message);
    }

    if (!isYoutubeSearchCooledDown()) {
      try {
        const htmlResults = await searchViaYouTubeHtml(cleanQuery);
        if (htmlResults.length > 0) return { items: htmlResults, rateLimited: false };
      } catch (err) {
        if (err instanceof UpstreamRateLimitError) {
          sawRateLimit = true;
          markYoutubeSearchCooldown();
        }
        console.warn('[Search] HTML search notice:', (err as Error)?.message);
      }
    }
  } else {
    sawRateLimit = true;
  }

  try {
    const mirrorResults = await searchViaPublicMirrors(cleanQuery);
    if (mirrorResults.length > 0) return { items: mirrorResults, rateLimited: false };
  } catch (err) {
    if (err instanceof UpstreamRateLimitError) sawRateLimit = true;
    console.warn('[Search] Piped mirror search notice:', (err as Error)?.message);
  }

  try {
    const invidiousResults = await searchViaInvidiousMirrors(cleanQuery);
    if (invidiousResults.length > 0) return { items: invidiousResults, rateLimited: false };
  } catch (err) {
    if (err instanceof UpstreamRateLimitError) sawRateLimit = true;
    console.warn('[Search] Invidious mirror search notice:', (err as Error)?.message);
  }

  return { items: [], rateLimited: sawRateLimit };
}

export async function searchYouTubeTracksWithStatus(query: string): Promise<SearchPipelineResult> {
  const cleanQuery = sanitizeSearchQuery(query);
  if (!cleanQuery) return { items: [], rateLimited: false };

  const cacheKey = cleanQuery.toLowerCase();
  const now = Date.now();
  const cached = searchResultCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return { items: cached.items, rateLimited: false };
  }

  const existingPromise = inFlightSearchesWithStatus.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = runSearchPipelineWithStatus(cleanQuery)
    .then((result) => {
      if (result.items.length > 0) {
        if (searchResultCache.size >= MAX_CACHED_QUERIES) {
          const oldestKey = searchResultCache.keys().next().value;
          if (oldestKey !== undefined) searchResultCache.delete(oldestKey);
        }
        searchResultCache.set(cacheKey, {
          items: result.items,
          expiresAt: Date.now() + SEARCH_CACHE_TTL_MS
        });
      }
      return result;
    })
    .finally(() => {
      inFlightSearchesWithStatus.delete(cacheKey);
    });

  inFlightSearchesWithStatus.set(cacheKey, promise);
  return promise;
}

export async function searchYouTubeTracks(query: string): Promise<SearchResultItem[]> {
  const res = await searchYouTubeTracksWithStatus(query);
  return res.items;
}
