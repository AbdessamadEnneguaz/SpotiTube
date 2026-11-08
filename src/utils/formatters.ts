import { Track } from '../types/music';

/**
 * Format duration in seconds to M:SS or H:MM:SS
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const paddedSecs = secs.toString().padStart(2, '0');

  if (hrs > 0) {
    const paddedMins = mins.toString().padStart(2, '0');
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }
  return `${mins}:${paddedSecs}`;
}

/**
 * Parse YouTube video titles that often come as "Artist - Title (Official Video)"
 */
export function parseYouTubeTitle(rawTitle: string, channelTitle?: string): { title: string; artist: string } {
  if (!rawTitle) return { title: 'Unknown Title', artist: channelTitle || 'Unknown Artist' };

  // Decode common HTML entities
  const decoded = rawTitle
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  // Clean out common video suffixes (e.g. (Official Music Video), [Clip Officiel], (Audio HQ), (Lyrics))
  const cleaned = decoded
    .replace(/\s*[\(\[][^\)\]]*(official|video|audio|clip|lyric|lyrics|hq|hd|4k|remaster|prod|live)[^\)\]]*[\)\]]/gi, '')
    .trim();

  // Look for delimiter like " - " or " – " or " — "
  const splitDash = cleaned.split(/\s*[-–—]\s*/);
  if (splitDash.length >= 2) {
    const artist = splitDash[0].trim();
    const title = splitDash.slice(1).join(' - ').trim();
    return { title: title || cleaned, artist: artist || (channelTitle || 'Unknown Artist') };
  }

  // Fallback
  return {
    title: cleaned,
    artist: channelTitle ? channelTitle.replace(/\s*-\s*Topic$/i, '').trim() : 'Unknown Artist'
  };
}

/**
 * Filter tracks by search query across title, artist, genre
 */
export function filterTracks(tracks: Track[], query: string): Track[] {
  if (!query || !query.trim()) return tracks;
  const q = query.toLowerCase().trim();
  return tracks.filter(t => 
    t.title.toLowerCase().includes(q) ||
    t.artist.toLowerCase().includes(q) ||
    (t.album && t.album.toLowerCase().includes(q)) ||
    t.genre.toLowerCase().includes(q)
  );
}
