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
  let query = (raw || '').trim();
  if (!query) return '';
  if (query.length > 120) {
    query = query.slice(0, 120);
  }
  return query.replace(/[<>{}\\]/g, '').trim();
}

// Simple In-Memory Rate Limiter
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const searchRateLimits = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_SEARCH_REQUESTS = 60;

export function isSearchRateLimited(clientIp: string): boolean {
  const now = Date.now();
  const record = searchRateLimits.get(clientIp);

  if (!record || now > record.resetAt) {
    searchRateLimits.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= MAX_SEARCH_REQUESTS) {
    return true;
  }

  record.count += 1;
  return false;
}

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
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);

        const title =
          v.title?.runs?.map((r: any) => r.text).join('') ||
          v.title?.simpleText ||
          'Unknown Title';
        const channel =
          v.ownerText?.runs?.map((r: any) => r.text).join('') ||
          v.longBylineText?.runs?.map((r: any) => r.text).join('') ||
          'YouTube Artist';
        const length = v.lengthText?.simpleText || '';

        // Skip livestreams with no duration if better results exist, or default to 3:30
        const thumb =
          v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url ||
          `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

        results.push({
          id,
          youtubeId: id,
          title,
          channel,
          artist: channel,
          thumbnail: thumb,
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

// Layer 1: YouTube InnerTube JSON API (Keyless, works reliably without HTML scraping)
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

  if (!res.ok) return [];
  const data = await res.json();
  return extractVideosFromYouTubeJson(data);
}

// Layer 3: YouTube Web HTML fallback with Consent cookies
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

  if (!response.ok) return [];
  const html = await response.text();
  const match =
    html.match(/var ytInitialData = ({.*?});<\/script>/) ||
    html.match(/ytInitialData = ({.*?});/);
  if (!match) return [];

  const data = JSON.parse(match[1]);
  return extractVideosFromYouTubeJson(data);
}

// Layer 4: Public Piped / Invidious API fallback (protects against datacenter IP blocks on Vercel)
async function searchViaPublicMirrors(query: string): Promise<SearchResultItem[]> {
  const pipedMirrors = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://api.piped.private.coffee'
  ];

  for (const base of pipedMirrors) {
    try {
      const res = await fetch(`${base}/search?q=${encodeURIComponent(query)}&filter=videos`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3500)
      });
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
        if (!id) continue;

        const dur = typeof item.duration === 'number' && item.duration > 0 ? item.duration : 210;
        results.push({
          id,
          youtubeId: id,
          title: item.title || 'Unknown Title',
          channel: item.uploaderName || 'YouTube Artist',
          artist: item.uploaderName || 'YouTube Artist',
          thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
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

  return [];
}

export async function searchYouTubeTracks(query: string): Promise<SearchResultItem[]> {
  const cleanQuery = sanitizeSearchQuery(query);
  if (!cleanQuery) return [];

  // Layer 1: YouTube InnerTube JSON API (Keyless)
  try {
    const innerTubeResults = await searchViaInnerTube(cleanQuery);
    if (innerTubeResults.length > 0) return innerTubeResults;
  } catch (err) {
    console.warn('[Search] InnerTube notice:', (err as Error)?.message);
  }

  // Layer 2: YouTube Web HTML scraping with Consent cookies
  try {
    const htmlResults = await searchViaYouTubeHtml(cleanQuery);
    if (htmlResults.length > 0) return htmlResults;
  } catch (err) {
    console.warn('[Search] HTML search notice:', (err as Error)?.message);
  }

  // Layer 3: Public Piped mirrors (for datacenter fallback)
  try {
    const mirrorResults = await searchViaPublicMirrors(cleanQuery);
    if (mirrorResults.length > 0) return mirrorResults;
  } catch (err) {
    console.warn('[Search] Mirror search notice:', (err as Error)?.message);
  }

  return [];
}
