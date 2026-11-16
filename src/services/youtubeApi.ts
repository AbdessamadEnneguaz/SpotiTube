import { Track } from '../types/music';
import { parseYouTubeTitle, filterTracks } from '../utils/formatters';
import { CURATED_TRACKS } from '../data/curatedTracks';

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
    .filter((item: any) => item && (item.id || item.youtubeId))
    .map((item: any) => {
      const videoId = String(item.youtubeId || item.id);
      const { title, artist } = parseYouTubeTitle(item.title || '', item.channel || item.artist);
      return {
        id: `yt_${videoId}`,
        youtubeId: videoId,
        title,
        artist,
        album: 'YouTube Music',
        thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        durationSeconds: item.durationSeconds || 210,
        durationFormatted: item.durationFormatted || '3:30',
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
        const match = urlStr.match(/[?&]v=([^&]+)/) || urlStr.match(/\/watch\/([^?&#/]+)/);
        const videoId = match ? match[1] : '';
        if (!videoId) continue;

        const dur = typeof item.duration === 'number' && item.duration > 0 ? item.duration : 210;
        const mins = Math.floor(dur / 60);
        const secs = String(Math.floor(dur % 60)).padStart(2, '0');
        const { title, artist } = parseYouTubeTitle(item.title || '', item.uploaderName);

        mapped.push({
          id: `yt_${videoId}`,
          youtubeId: videoId,
          title,
          artist,
          album: 'YouTube Music',
          thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
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
 * Keyless YouTube Search (Connects to /api/search on Express or Vercel Serverless,
 * with browser-side CORS mirror and curated fallbacks).
 */
export async function searchYouTube(
  query: string
): Promise<{ tracks: Track[]; source: 'local_backend' | 'curated'; message?: string }> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { tracks: CURATED_TRACKS, source: 'curated' };
  }

  // 1. Try /api/search (works on both local Express server.ts and Vercel Python /api/search.py)
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
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
    console.warn('Backend search request failed, trying browser fallback:', err);
  }

  // 2. Client-side mirror fallback (helps if hosted statically or server IP blocked)
  try {
    const mirrorTracks = await searchClientMirrors(trimmed);
    if (mirrorTracks.length > 0) {
      return { tracks: mirrorTracks, source: 'local_backend' };
    }
  } catch {
    // ignore and fall back to curated catalog
  }

  // 3. Curated library search (covers Chaabi, Rai, Rap, Pop)
  const curatedResults = searchCuratedLibrary(trimmed);
  return {
    tracks: curatedResults,
    source: 'curated',
    message:
      curatedResults.length > 0
        ? `Found ${curatedResults.length} matching tracks`
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
