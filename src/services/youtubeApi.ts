import { Track } from '../types/music';
import { parseYouTubeTitle, filterTracks } from '../utils/formatters';
import { CURATED_TRACKS } from '../data/curatedTracks';

let isScriptLoading = false;
let isScriptLoaded = false;
const readyCallbacks: Array<() => void> = [];

export function loadYouTubeIFrameAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    readyCallbacks.push(resolve);

    if (isScriptLoaded) return;
    if (isScriptLoading) return;

    isScriptLoading = true;

    // Set callback
    const prevOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      isScriptLoaded = true;
      isScriptLoading = false;
      if (prevOnReady) prevOnReady();
      readyCallbacks.forEach(cb => cb());
      readyCallbacks.length = 0;
    };

    // Inject YouTube IFrame API script tag
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    const firstScriptTag = document.getElementsByTagName('script')[0];
    if (firstScriptTag && firstScriptTag.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
      document.head.appendChild(tag);
    }
  });
}

/**
 * Keyless YouTube Search (Connects to local yt-dlp app.py or curated search)
 * Zero API Key needed!
 */
export async function searchYouTube(
  query: string
): Promise<{ tracks: Track[]; source: 'local_backend' | 'curated'; message?: string }> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { tracks: CURATED_TRACKS, source: 'curated' };
  }

  // 1. Try local Python Flask backend (/api/search from app.py)
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
      headers: { Accept: 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.tracks || []);
      if (items.length > 0) {
        const tracks: Track[] = items.map((item: any) => {
          const videoId = item.id || item.youtubeId;
          const { title, artist } = parseYouTubeTitle(item.title || '', item.channel || item.artist);
          return {
            id: `yt_${videoId}`,
            youtubeId: videoId,
            title,
            artist,
            album: 'YouTube Music',
            thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            durationSeconds: item.durationSeconds || 210,
            durationFormatted: item.durationFormatted || '3:30',
            genre: detectGenre(title, artist),
            views: 'Popular'
          };
        });
        return { tracks, source: 'local_backend' };
      }
    }
  } catch (err) {
    console.warn('Backend search request failed, falling back:', err);
  }

  // 2. Curated library search (covers Chaabi, Rai, Rap, Pop)
  const curatedResults = searchCuratedLibrary(trimmed);
  return {
    tracks: curatedResults,
    source: 'curated',
    message: `Found ${curatedResults.length} matching tracks`
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

  // Fuzzy match on individual words
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return CURATED_TRACKS.filter(track => {
    const text = `${track.title} ${track.artist} ${track.album || ''} ${track.genre}`.toLowerCase();
    return words.some(w => text.includes(w));
  });
}
