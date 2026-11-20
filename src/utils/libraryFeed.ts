import { Playlist, Track } from '../types/music';
import { CachedTrackEntry } from './trackCache';

export type SidebarFilter = 'all' | 'playlists' | 'artists' | 'offline';

export interface ArtistProfile {
  name: string;
  image: string;
  youtubeId: string;
  topTrack: Track;
  tracks: Track[];
  playCount: number;
}

export interface QuickAccessItem {
  id: string;
  kind: 'favorites' | 'offline' | 'track' | 'playlist';
  title: string;
  subtitle: string;
  image?: string;
  youtubeId?: string;
  track?: Track;
  playlist?: Playlist;
}

/**
 * Extracts primary display artist name for grouping (e.g. "Daft Punk ft. Pharrell" -> "Daft Punk").
 */
export function normalizePrimaryArtist(artist: string): string {
  const cleaned = artist
    .split(/\s+(?:ft\.?|feat\.?|featuring)\s+|\s+x\s+|\s*&\s*|\s*,\s*/i)[0]
    ?.trim();
  return cleaned || artist.trim() || 'Unknown Artist';
}

/**
 * Returns distinct recently played tracks ordered strictly by most recent timestamp.
 */
export function getRecentTracksFeed(
  cachedEntries: CachedTrackEntry[],
  limit = 6
): Track[] {
  const seen = new Set<string>();
  const sorted = [...cachedEntries].sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
  const result: Track[] = [];

  for (const entry of sorted) {
    const t = entry.track;
    if (!t || !t.youtubeId || seen.has(t.youtubeId)) continue;
    seen.add(t.youtubeId);
    result.push(t);
    if (result.length >= limit) break;
  }

  return result;
}

/**
 * Builds the 6-tile (2x3) Spotify Quick-Access Grid for Home:
 * 1. Saved Favorites
 * 2. Offline Vault
 * 3-6. Up to 4 most recently played tracks (falling back cleanly to curated mix/tracks for new users).
 */
export function buildQuickAccessItems(params: {
  cachedEntries: CachedTrackEntry[];
  curatedTracks: Track[];
  playlists: Playlist[];
  likedCount: number;
  offlineCount: number;
}): QuickAccessItem[] {
  const { cachedEntries, curatedTracks, playlists, likedCount, offlineCount } = params;

  const items: QuickAccessItem[] = [
    {
      id: 'qa-favorites',
      kind: 'favorites',
      title: 'Saved Favorites',
      subtitle: `${likedCount} ${likedCount === 1 ? 'track' : 'tracks'}`,
    },
    {
      id: 'qa-offline',
      kind: 'offline',
      title: 'Offline Vault',
      subtitle: `${offlineCount} downloaded`,
    },
  ];

  const recentTracks = getRecentTracksFeed(cachedEntries, 4);
  const usedTrackIds = new Set<string>();

  for (const track of recentTracks) {
    usedTrackIds.add(track.youtubeId);
    items.push({
      id: `qa-track-${track.youtubeId}`,
      kind: 'track',
      title: track.title,
      subtitle: track.artist,
      image: track.thumbnail,
      youtubeId: track.youtubeId,
      track,
    });
  }

  // Fill remaining slots up to 6 with flagship Global Mix & curated tracks so the 2x3 grid is complete
  if (items.length < 6 && playlists.length > 0) {
    const topMix = playlists[0];
    items.push({
      id: `qa-playlist-${topMix.id}`,
      kind: 'playlist',
      title: topMix.name,
      subtitle: `${topMix.tracks.length} tracks`,
      image: topMix.coverImage,
      youtubeId: topMix.tracks[0]?.youtubeId,
      playlist: topMix,
    });
  }

  for (const track of curatedTracks) {
    if (items.length >= 6) break;
    if (!track.youtubeId || usedTrackIds.has(track.youtubeId)) continue;
    usedTrackIds.add(track.youtubeId);
    items.push({
      id: `qa-curated-${track.youtubeId}`,
      kind: 'track',
      title: track.title,
      subtitle: track.artist,
      image: track.thumbnail,
      youtubeId: track.youtubeId,
      track,
    });
  }

  return items.slice(0, 6);
}

/**
 * Aggregates unique artists ordered by user play frequency first, then curated catalog popularity.
 */
export function extractPopularArtists(
  cachedEntries: CachedTrackEntry[],
  catalogTracks: Track[],
  limit = 6
): ArtistProfile[] {
  const artistMap = new Map<string, ArtistProfile>();

  const upsertTrack = (track: Track, playDelta: number) => {
    if (!track?.artist || !track?.youtubeId) return;
    const displayName = normalizePrimaryArtist(track.artist);
    const key = displayName.toLowerCase();
    const existing = artistMap.get(key);

    if (!existing) {
      artistMap.set(key, {
        name: displayName,
        image: track.thumbnail,
        youtubeId: track.youtubeId,
        topTrack: track,
        tracks: [track],
        playCount: playDelta,
      });
      return;
    }

    existing.playCount += playDelta;
    if (!existing.tracks.some((t) => t.youtubeId === track.youtubeId)) {
      existing.tracks.push(track);
    }
  };

  for (const entry of cachedEntries) {
    upsertTrack(entry.track, Math.max(1, entry.playCount || 1));
  }

  for (const track of catalogTracks) {
    upsertTrack(track, 0);
  }

  return Array.from(artistMap.values())
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, limit);
}

export function isNewLibraryUser(params: {
  cachedCount: number;
  customPlaylistCount: number;
  offlineCount: number;
}): boolean {
  return (
    params.cachedCount === 0 &&
    params.customPlaylistCount === 0 &&
    params.offlineCount === 0
  );
}
