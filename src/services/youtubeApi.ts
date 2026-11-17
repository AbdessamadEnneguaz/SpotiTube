import { Track } from '../types/music';
import { parseYouTubeTitle, filterTracks } from '../utils/formatters';
import { CURATED_TRACKS } from '../data/curatedTracks';
import { loadCachedTrackEntries, searchCachedTracks } from '../utils/trackCache';
import { isValidYouTubeId, sanitizeMediaUrl, sanitizeClientText } from '../utils/security';

let isScriptLoading = false;
let isScriptLoaded = false;
const readyCallbacks: Array<() => void> = [];

export function loadYouTubeIFrameAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      isScriptLoaded = true;
      resolve();
      return;
    }

    readyCallbacks.push(resolve);

    if (isScriptLoaded) {
      readyCallbacks.forEach(cb => cb());
      readyCallbacks.length = 0;
      return;
    }
    if (isScriptLoading) return;

    isScriptLoading = true;

    const flushCallbacks = () => {
      isScriptLoaded = true;
      isScriptLoading = false;
      readyCallbacks.forEach(cb => cb());
      readyCallbacks.length = 0;
    };

    const prevOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevOnReady) prevOnReady();
      flushCallbacks();
    };

    // Inject YouTube IFrame API script tag if not already present
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    // Fallback poll in case window.YT initialized before callback hooked
    const poll = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(poll);
        flushCallbacks();
      }
    }, 150);
    setTimeout(() => clearInterval(poll), 10000);
  });
}

function mapRawSearchItems(items: any[]): Track[] {
  return items
    .filter((item: any) => item && isValidYouTubeId(item.youtubeId || item.id))
    .map((item: any) => {
      const videoId = String(item.youtubeId || item.id);
      const { title, artist } = parseYouTubeTitle(
        sanitizeClientText(item.title || '', 160),
        sanitizeClientText(item.channel || item.artist || '', 100)
      );
      const defaultThumb = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
      return {
        id: `yt_${videoId}`,
        youtubeId: videoId,
        title,
        artist,
        album: 'YouTube Music',
        thumbnail: sanitizeMediaUrl(item.thumbnail, defaultThumb),
        durationSeconds: typeof item.durationSeconds === 'number' && item.durationSeconds > 0 ? item.durationSeconds : 210,
        durationFormatted: sanitizeClientText(item.durationFormatted || '3:30', 16) || '3:30',
        genre: detectGenre(title, artist),
        views: 'Popular'
      };
    });
}

async function searchClientMirrors(query: string): Promise<Track[]> {
  const mirrors = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://api.piped.private.coffee'
  ];

  for (const base of mirrors) {
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
      const mapped: Track[] = [];

      for (const item of items) {
        const urlStr = String(item.url || '');
        const match = urlStr.match(/[?&]v=([0-9A-Za-z_-]{11})/) || urlStr.match(/\/watch\/([0-9A-Za-z_-]{11})/);
        const videoId = match ? match[1] : '';
        if (!isValidYouTubeId(videoId)) continue;

        const dur = typeof item.duration === 'number' && item.duration > 0 ? item.duration : 210;
        const mins = Math.floor(dur / 60);
        const secs = String(Math.floor(dur % 60)).padStart(2, '0');
        const { title, artist } = parseYouTubeTitle(
          sanitizeClientText(item.title || '', 160),
          sanitizeClientText(item.uploaderName || '', 100)
        );
        const defaultThumb = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

        mapped.push({
          id: `yt_${videoId}`,
          youtubeId: videoId,
          title,
          artist,
          album: 'YouTube Music',
          thumbnail: sanitizeMediaUrl(item.thumbnail, defaultThumb),
          durationSeconds: dur,
          durationFormatted: `${mins}:${secs}`,
          genre: detectGenre(title, artist),
          views: 'Popular'
        });

        if (mapped.length >= 20) break;
      }

      if (mapped.length > 0) return mapped;
    } catch {
      // try next mirror
    }
  }
  return [];
}

/**
 * Keyless YouTube Search (Served Cache-First by Service Worker for repeated queries,
 * falling back to cached frequently played metadata + curated catalog during offline/intermittent connectivity).
 */
export async function searchYouTube(
  query: string,
  options?: { offlineOnly?: boolean }
): Promise<{ tracks: Track[]; source: 'local_backend' | 'curated'; message?: string }> {
  const trimmed = query.trim();
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  const offlineOnly = Boolean(options?.offlineOnly) || !isOnline;

  if (offlineOnly) {
    const cachedMatches = searchCachedTracks(loadCachedTrackEntries(), trimmed);
    return {
      tracks: cachedMatches,
      source: 'curated',
      message:
        cachedMatches.length > 0
          ? `Offline (Auto) — showing ${cachedMatches.length} cached ${cachedMatches.length === 1 ? 'track' : 'tracks'} only`
          : 'Offline (Auto) — no matching cached tracks found'
    };
  }

  if (!trimmed) {
    return { tracks: CURATED_TRACKS, source: 'curated' };
  }

  const searchApiUrl = `/api/search?q=${encodeURIComponent(trimmed)}`;

  // 1. Try /api/search (CacheFirst via Service Worker; when offline check Cache Storage directly first)
  if (!isOnline && typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cachedRes = await window.caches.match(searchApiUrl);
      if (cachedRes && cachedRes.ok) {
        const data = await cachedRes.json();
        const items = Array.isArray(data) ? data : (data.tracks || []);
        if (items.length > 0) {
          return { tracks: mapRawSearchItems(items), source: 'local_backend' };
        }
      }
    } catch {
      // fall through to cached played tracks + curated catalog
    }
  } else {
    try {
      const res = await fetch(searchApiUrl, {
        headers: { Accept: 'application/json' }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.tracks || []);
        if (items.length > 0) {
          return { tracks: mapRawSearchItems(items), source: 'local_backend' };
        }
      }
    } catch (err) {
      console.warn('Backend search request failed, using cached/local fallback:', err);
    }
  }

  // 2. Client-side mirror fallback (only when browser reports online)
  if (isOnline) {
    try {
      const mirrorTracks = await searchClientMirrors(trimmed);
      if (mirrorTracks.length > 0) {
        return { tracks: mirrorTracks, source: 'local_backend' };
      }
    } catch {
      // ignore and fall back to cached + curated metadata
    }
  }

  // 3. Offline / intermittent fallback: Cached frequently played track metadata + curated catalog
  const cachedPlayedMatches = searchCachedTracks(loadCachedTrackEntries(), trimmed);
  const curatedResults = searchCuratedLibrary(trimmed);
  const merged: Track[] = [];
  const seenIds = new Set<string>();

  for (const track of [...cachedPlayedMatches, ...curatedResults]) {
    if (!seenIds.has(track.youtubeId)) {
      seenIds.add(track.youtubeId);
      merged.push(track);
    }
  }

  return {
    tracks: merged,
    source: 'curated',
    message:
      merged.length > 0
        ? `${isOnline ? 'Catalog' : 'Offline cached'} matches (${merged.length} tracks)`
        : 'No matching tracks found — try another search query'
  };
}

function detectGenre(title: string, artist: string, desc: string = ''): Track['genre'] {
  const combined = `${title} ${artist} ${desc}`.toLowerCase();
  if (combined.includes('chaabi') || combined.includes('daoudi') || combined.includes('senhaji') || combined.includes('stati') || combined.includes('tahour') || combined.includes('aatabou')) return 'chaabi';
  if (combined.includes('rai') || combined.includes('khaled') || combined.includes('mami') || combined.includes('hasni') || combined.includes('bilal') || combined.includes('taha')) return 'rai';
  if (combined.includes('rap') || combined.includes('trap') || combined.includes('drill') || combined.includes('toto') || combined.includes('morad') || combined.includes('7elmet') || combined.includes('dizzy') || combined.includes('soolking') || combined.includes('tagne') || combined.includes('kouz1')) return 'rap';
  return 'global';
}

function searchCuratedLibrary(query: string): Track[] {
  const matched = filterTracks(CURATED_TRACKS, query);
  if (matched.length > 0) return matched;

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return CURATED_TRACKS.filter(track => {
    const text = `${track.title} ${track.artist} ${track.album || ''} ${track.genre}`.toLowerCase();
    return words.some(w => text.includes(w));
  });
}
