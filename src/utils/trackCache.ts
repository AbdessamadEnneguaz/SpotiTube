import { Track } from '../types/music';

export const TRACK_CACHE_STORAGE_KEY = 'spotitube_cached_tracks_v1';
export const TRACK_METADATA_CACHE_NAME = 'track-metadata-cache-v1';
export const TRACK_THUMBNAILS_CACHE_NAME = 'track-thumbnails-cache-v1';

export interface CachedTrackEntry {
  track: Track;
  playCount: number;
  lastPlayedAt: number;
}

/**
 * Pure helper: records a track play, increments its play frequency,
 * keeps the list sorted by frequency (playCount desc, then lastPlayedAt desc),
 * and caps the cache at maxEntries.
 */
export function recordTrackPlay(
  entries: CachedTrackEntry[],
  track: Track,
  maxEntries = 50,
  now = Date.now()
): CachedTrackEntry[] {
  if (!track || !track.youtubeId) return entries;

  const existing = entries.find(
    (item) => item.track.youtubeId === track.youtubeId || item.track.id === track.id
  );

  const updatedEntry: CachedTrackEntry = existing
    ? {
        track: { ...existing.track, ...track },
        playCount: existing.playCount + 1,
        lastPlayedAt: now,
      }
    : {
        track,
        playCount: 1,
        lastPlayedAt: now,
      };

  const remaining = entries.filter(
    (item) => item.track.youtubeId !== track.youtubeId && item.track.id !== track.id
  );

  const next = [updatedEntry, ...remaining].sort((a, b) => {
    if (b.playCount !== a.playCount) return b.playCount - a.playCount;
    return b.lastPlayedAt - a.lastPlayedAt;
  });

  return next.slice(0, maxEntries);
}

/**
 * Pure helper: returns the top frequently played tracks.
 */
export function getFrequentTracks(entries: CachedTrackEntry[], limit = 10): Track[] {
  return [...entries]
    .sort((a, b) => {
      if (b.playCount !== a.playCount) return b.playCount - a.playCount;
      return b.lastPlayedAt - a.lastPlayedAt;
    })
    .slice(0, limit)
    .map((entry) => entry.track);
}

/**
 * Pure helper: searches cached track metadata cleanly offline.
 */
export function searchCachedTracks(entries: CachedTrackEntry[], query: string): Track[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return getFrequentTracks(entries, 20);

  const words = trimmed.split(/\s+/).filter(Boolean);
  return entries
    .filter((entry) => {
      const hay = `${entry.track.title} ${entry.track.artist} ${entry.track.album || ''} ${entry.track.genre}`.toLowerCase();
      return words.every((w) => hay.includes(w)) || words.some((w) => hay.includes(w));
    })
    .sort((a, b) => b.playCount - a.playCount)
    .map((entry) => entry.track);
}

export function loadCachedTrackEntries(): CachedTrackEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(TRACK_CACHE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCachedTrackEntries(entries: CachedTrackEntry[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(TRACK_CACHE_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage quota errors
  }
}

function buildMetadataCacheUrl(youtubeId: string): string {
  return `/offline-cache/track-metadata/${encodeURIComponent(youtubeId)}.json`;
}

/**
 * Persists track metadata JSON into Cache Storage (matching SW CacheFirst route)
 * and pre-warms its thumbnail into track-thumbnails-cache-v1 if not already cached.
 */
export async function syncTrackToServiceWorkerCache(track: Track): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window) || !track?.youtubeId) {
    return;
  }

  try {
    const metadataCache = await window.caches.open(TRACK_METADATA_CACHE_NAME);
    const metadataUrl = buildMetadataCacheUrl(track.youtubeId);
    const metadataResponse = new Response(JSON.stringify(track), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache-Source': 'spotitube-metadata-cache',
      },
    });
    await metadataCache.put(metadataUrl, metadataResponse);
  } catch {
    // Cache Storage unavailable
  }

  // Pre-warm thumbnail using Cache-First check
  const thumbUrls = [
    track.thumbnail,
    `https://i.ytimg.com/vi/${track.youtubeId}/mqdefault.jpg`,
  ].filter(Boolean);

  try {
    const thumbCache = await window.caches.open(TRACK_THUMBNAILS_CACHE_NAME);
    for (const url of Array.from(new Set(thumbUrls))) {
      const existing = await thumbCache.match(url);
      if (existing) continue;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) continue;

      const req = new Request(url, { mode: 'no-cors' });
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) {
        await thumbCache.put(req, res.clone());
      }
    }
  } catch {
    // Ignore transient network failures while warming thumbnails
  }
}

/**
 * Cache-First lookup for a track's metadata from Service Worker Cache Storage,
 * falling back to localStorage entries.
 */
export async function getTrackMetadataCacheFirst(youtubeId: string): Promise<Track | null> {
  if (typeof window !== 'undefined' && 'caches' in window && youtubeId) {
    try {
      const metadataCache = await window.caches.open(TRACK_METADATA_CACHE_NAME);
      const cached = await metadataCache.match(buildMetadataCacheUrl(youtubeId));
      if (cached) {
        return (await cached.json()) as Track;
      }
    } catch {
      // ignore Cache API error
    }
  }

  const entries = loadCachedTrackEntries();
  const match = entries.find((e) => e.track.youtubeId === youtubeId);
  return match ? match.track : null;
}

/**
 * Idle pre-warming for initial curated thumbnails so core UI covers survive flaky networks.
 */
export async function warmCuratedCoversCache(tracks: Track[]): Promise<void> {
  if (
    typeof window === 'undefined' ||
    !('caches' in window) ||
    (typeof navigator !== 'undefined' && navigator.onLine === false)
  ) {
    return;
  }

  try {
    const thumbCache = await window.caches.open(TRACK_THUMBNAILS_CACHE_NAME);
    for (const track of tracks.slice(0, 12)) {
      if (!track.thumbnail) continue;
      const hit = await thumbCache.match(track.thumbnail);
      if (hit) continue;
      try {
        const req = new Request(track.thumbnail, { mode: 'no-cors' });
        const res = await fetch(req);
        if (res && (res.ok || res.type === 'opaque')) {
          await thumbCache.put(req, res.clone());
        }
      } catch {
        // skip single failure
      }
    }
  } catch {
    // ignore Cache Storage errors
  }
}
