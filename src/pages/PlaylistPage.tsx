import React from 'react';
import { Play, Clock } from 'lucide-react';
import { Playlist, Track } from '../types/music';
import { CoverImage } from '../components/CoverImage';
import { TrackRow } from '../components/TrackRow';
import { filterTracksForOffline } from '../utils/offlineMode';

interface PlaylistPageProps {
  playlist: Playlist;
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

export const PlaylistPage: React.FC<PlaylistPageProps> = ({
  playlist,
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
  return (
    <div className="space-y-6">
      <div className="frame-3d-crimson flex flex-col md:flex-row items-center md:items-end text-center md:text-left gap-5 p-5 sm:p-6 rounded-2xl">
        <CoverImage
          src={playlist.coverImage}
          alt={playlist.name}
          youtubeId={playlist.tracks[0]?.youtubeId}
          loading="eager"
          className="w-36 h-36 sm:w-44 sm:h-44 rounded-xl object-cover shadow-2xl border border-white/14 shrink-0"
        />
        <div className="flex-1 space-y-2 min-w-0 w-full">
          <div className="text-xs font-semibold text-[#EF4444]">
            {playlist.isCustom ? 'Custom Mix' : playlist.regionLabel || 'Curated Collection'}
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-white tracking-tight text-balance">
            {playlist.name}
          </h1>
          <p className="text-xs sm:text-sm text-[#D0CBCC] max-w-2xl mx-auto md:mx-0">
            {playlist.description}
          </p>
          <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-[#A39E9F] pt-1 tabular-nums">
            <span>{playlist.tracks.length} tracks</span>
            <span aria-hidden="true">·</span>
            <span>Kiddwave Soundstage</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            const playable = filterTracksForOffline(playlist.tracks, cachedYoutubeIds, isOfflineMode);
            const first = playable[0] || playlist.tracks[0];
            if (first) onPlayTrack(first, playlist.tracks);
          }}
          aria-label={`Play ${playlist.name}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer border border-[#F87171]/40 shadow-[0_6px_18px_rgba(239,68,68,0.38)]"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Play Collection</span>
        </button>
      </div>

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

        {playlist.tracks.length === 0 ? (
          <div className="text-center py-12 text-[#A39E9F] text-sm space-y-2">
            <p>No tracks in this playlist yet.</p>
            <p className="text-xs text-[#6F6A6B]">
              Search for any song worldwide, then open options on a track to add it here.
            </p>
          </div>
        ) : (
          playlist.tracks.map((track, idx) => {
            const isCached = cachedYoutubeIds.has(track.youtubeId);
            return (
              <TrackRow
                key={`${track.id}-${idx}`}
                track={track}
                index={idx}
                isCurrent={currentTrack?.id === track.id || currentTrack?.youtubeId === track.youtubeId}
                isPlaying={isPlaying}
                isLiked={likedTrackIds.has(track.id)}
                isCached={isCached}
                isOfflineDisabled={isOfflineMode && !isCached}
                customPlaylists={customPlaylists}
                onPlay={(t) => onPlayTrack(t, playlist.tracks)}
                onInspectTrack={(t) => onInspectTrack(t, playlist.tracks)}
                onToggleLike={onToggleLike}
                onAddToQueue={onAddToQueue}
                onPlayNext={onPlayNext}
                onAddToPlaylist={onAddToPlaylist}
                onCacheTrack={onCacheTrack}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default PlaylistPage;
