import { Track } from '../types/music';
import { CachedTrackEntry } from './trackCache';

export function getCachedYoutubeIdSet(entries: CachedTrackEntry[]): Set<string> {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (entry?.track?.youtubeId) {
      ids.add(entry.track.youtubeId);
    }
  }
  return ids;
}

export function isTrackPlayableOffline(
  track: Track | null | undefined,
  cachedIds: Set<string>,
  isAutoOffline: boolean
): boolean {
  if (!track || !track.youtubeId) return false;
  if (!isAutoOffline) return true;
  return cachedIds.has(track.youtubeId);
}

export function filterTracksForOffline(
  tracks: Track[],
  cachedIds: Set<string>,
  isAutoOffline: boolean
): Track[] {
  if (!isAutoOffline) return tracks;
  return tracks.filter((track) => cachedIds.has(track.youtubeId));
}
