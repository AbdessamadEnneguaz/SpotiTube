import { LyricsData, Track } from '../types/music';
import {
  cleanArtistForLyrics,
  cleanTrackTitleForLyrics,
  parseLrcLyrics,
} from '../utils/lrcParser';
import { safeParseJson } from '../utils/security';

const LYRICS_CACHE_STORAGE_KEY = 'kiddwave_lyrics_cache_v1';
const MAX_CACHED_LYRICS = 30;

interface LrcLibRecord {
  id?: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

const memoryLyricsCache = new Map<string, LyricsData>();

function readPersistedCache(): Record<string, LyricsData> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(LYRICS_CACHE_STORAGE_KEY);
    if (!raw) return {};
    return safeParseJson<Record<string, LyricsData>>(raw, {});
  } catch {
    return {};
  }
}

function writePersistedCache(youtubeId: string, data: LyricsData): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const current = readPersistedCache();
    const entries = Object.entries(current).filter(([k]) => k !== youtubeId);
    entries.unshift([youtubeId, data]);
    const trimmed = Object.fromEntries(entries.slice(0, MAX_CACHED_LYRICS));
    localStorage.setItem(LYRICS_CACHE_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore storage quota errors
  }
}

function mapLrcLibRecord(record: LrcLibRecord | null | undefined): LyricsData | null {
  if (!record) return null;
  const syncedLines = parseLrcLyrics(record.syncedLyrics);
  const plainText =
    typeof record.plainLyrics === 'string' && record.plainLyrics.trim().length > 0
      ? record.plainLyrics.trim()
      : null;

  if (syncedLines.length > 0) {
    return {
      syncedLines,
      plainText,
      source: 'lrclib_synced',
      matchedTitle: record.trackName,
      matchedArtist: record.artistName,
    };
  }
  if (plainText) {
    return {
      syncedLines: [],
      plainText,
      source: 'lrclib_plain',
      matchedTitle: record.trackName,
      matchedArtist: record.artistName,
    };
  }
  return null;
}

function pickBestSearchMatch(records: LrcLibRecord[], targetDuration: number): LrcLibRecord | null {
  if (!Array.isArray(records) || records.length === 0) return null;

  const scored = records
    .filter((r) => Boolean(r.syncedLyrics || r.plainLyrics))
    .map((r) => {
      let score = r.syncedLyrics ? 100 : 20;
      if (targetDuration > 0 && typeof r.duration === 'number') {
        const diff = Math.abs(r.duration - targetDuration);
        score -= Math.min(40, diff);
      }
      return { record: r, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.record || null;
}

export async function fetchTrackLyrics(track: Track): Promise<LyricsData> {
  if (!track || !track.youtubeId) {
    return { syncedLines: [], plainText: null, source: 'none' };
  }

  // Inline track lyrics always take instant priority if present
  if (Array.isArray(track.lyrics) && track.lyrics.length > 0) {
    return {
      syncedLines: track.lyrics,
      plainText: track.lyrics.map((l) => l.text).join('\n'),
      source: 'lrclib_synced',
      matchedTitle: track.title,
      matchedArtist: track.artist,
    };
  }

  const cachedMem = memoryLyricsCache.get(track.youtubeId);
  if (cachedMem) return cachedMem;

  const persisted = readPersistedCache()[track.youtubeId];
  if (persisted && persisted.source !== 'none') {
    memoryLyricsCache.set(track.youtubeId, persisted);
    return persisted;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { syncedLines: [], plainText: null, source: 'none' };
  }

  const cleanTitle = cleanTrackTitleForLyrics(track.title) || track.title;
  const cleanArtist = cleanArtistForLyrics(track.artist) || track.artist;

  try {
    // 1. Exact /api/get lookup
    const getParams = new URLSearchParams({
      track_name: cleanTitle,
      artist_name: cleanArtist,
    });
    if (track.album && track.album !== 'Studio Single') {
      getParams.set('album_name', track.album);
    }
    if (track.durationSeconds > 15) {
      getParams.set('duration', String(Math.round(track.durationSeconds)));
    }

    const getRes = await fetch(`https://lrclib.net/api/get?${getParams.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4500),
    });

    if (getRes.ok) {
      const record = (await getRes.json()) as LrcLibRecord;
      const mapped = mapLrcLibRecord(record);
      if (mapped) {
        memoryLyricsCache.set(track.youtubeId, mapped);
        writePersistedCache(track.youtubeId, mapped);
        return mapped;
      }
    }
  } catch {
    // Proceed cleanly to fuzzy search endpoint
  }

  try {
    // 2. Fuzzy /api/search fallback
    const searchParams = new URLSearchParams({
      q: `${cleanArtist} ${cleanTitle}`.trim(),
    });
    const searchRes = await fetch(`https://lrclib.net/api/search?${searchParams.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4500),
    });

    if (searchRes.ok) {
      const list = (await searchRes.json()) as LrcLibRecord[];
      const best = pickBestSearchMatch(list, track.durationSeconds);
      const mapped = mapLrcLibRecord(best);
      if (mapped) {
        memoryLyricsCache.set(track.youtubeId, mapped);
        writePersistedCache(track.youtubeId, mapped);
        return mapped;
      }
    }
  } catch {
    // Network or timeout failure
  }

  const empty: LyricsData = { syncedLines: [], plainText: null, source: 'none' };
  memoryLyricsCache.set(track.youtubeId, empty);
  return empty;
}
