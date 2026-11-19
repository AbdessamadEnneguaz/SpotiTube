import React from 'react';
import { History, Play, Clock } from 'lucide-react';
import { Track, Playlist } from '../types/music';
import { TrackRow } from '../components/TrackRow';

interface RecentPageProps {
  frequentTracks: Track[];
  cachedTracksList: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  likedTrackIds: Set<string>;
  cachedYoutubeIds: Set<string>;
  isOfflineMode: boolean;
  customPlaylists: Playlist[];
  onPlayTrack: (track: Track, list: Track[]) => void;
  onInspectTrack: (track: Track, list: Track[]) => void;
  onToggleLike: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onPlayNext: (track: Track) => void;
  onAddToPlaylist: (playlistId: string, track: Track) => void;
  onCacheTrack: (track: Track) => void;
}

export const RecentPage: React.FC<RecentPageProps> = ({
  frequentTracks,
  cachedTracksList,
  currentTrack,
  isPlaying,
  likedTrackIds,
  cachedYoutubeIds,
  isOfflineMode,
  customPlaylists,
  onPlayTrack,
  onInspectTrack,
  onToggleLike,
  onAddToQueue,
  onPlayNext,
  onAddToPlaylist,
  onCacheTrack
}) => {
  const tracksToShow = cachedTracksList.length > 0 ? cachedTracksList : frequentTracks;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-[#FF443A] flex items-center gap-1.5 mb-1">
            <History className="w-3.5 h-3.5" />
            <span>Offline Vault &amp; History</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Recently Played &amp; Cached
          </h1>
          <p className="text-xs sm:text-sm text-[#A39E9F] mt-1">
            Tracks you play are cached locally for instant playback &amp; offline access
          </p>
        </div>

        {tracksToShow.length > 0 && (
          <button
            type="button"
            onClick={() => onPlayTrack(tracksToShow[0], tracksToShow)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-xs transition-colors cursor-pointer shrink-0 self-start sm:self-auto border border-[#F87171]/40 shadow-[0_4px_14px_rgba(239,68,68,0.35)]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play Cached ({tracksToShow.length})</span>
          </button>
        )}
      </div>

      {tracksToShow.length === 0 ? (
        <div className="frame-3d rounded-2xl p-8 text-center space-y-2">
          <p className="font-display text-base font-bold text-white">No cached tracks yet</p>
          <p className="text-xs sm:text-sm text-[#A39E9F]">
            Play any track from Countries, Mixes, or Search to save it here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 sm:gap-4 px-2.5 sm:px-4 py-2 text-xs font-semibold text-[#A39E9F] border-b border-white/[0.08]">
            <span className="w-6 text-center shrink-0">#</span>
            <span className="flex-1 min-w-0">Title</span>
            <span className="hidden md:block w-1/4">Album</span>
            <span className="hidden sm:block w-24 shrink-0" aria-hidden="true" />
            <span className="w-12 text-right shrink-0">
              <Clock className="w-3.5 h-3.5 ml-auto" />
            </span>
          </div>
          {tracksToShow.map((track, idx) => {
            const isCached = cachedYoutubeIds.has(track.youtubeId);
            return (
              <TrackRow
                key={`recent-${track.youtubeId}-${idx}`}
                track={track}
                index={idx}
                isCurrent={currentTrack?.id === track.id || currentTrack?.youtubeId === track.youtubeId}
                isPlaying={isPlaying}
                isLiked={likedTrackIds.has(track.id)}
                isCached={isCached}
                isOfflineDisabled={isOfflineMode && !isCached}
                customPlaylists={customPlaylists}
                onPlay={(t) => onPlayTrack(t, tracksToShow)}
                onInspectTrack={(t) => onInspectTrack(t, tracksToShow)}
                onToggleLike={onToggleLike}
                onAddToQueue={onAddToQueue}
                onPlayNext={onPlayNext}
                onAddToPlaylist={onAddToPlaylist}
                onCacheTrack={onCacheTrack}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentPage;
