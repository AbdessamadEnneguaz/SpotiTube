import React from 'react';
import { Play, Pause, Heart, Plus, MoreHorizontal, Check, FolderPlus, Sparkles } from 'lucide-react';
import { Track, Playlist } from '../types/music';
import { CoverImage } from './CoverImage';

interface TrackRowProps {
  track: Track;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  isLiked: boolean;
  isCached?: boolean;
  isOfflineDisabled?: boolean;
  customPlaylists?: Playlist[];
  onPlay: (track: Track) => void;
  onToggleLike: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onPlayNext: (track: Track) => void;
  onAddToPlaylist?: (playlistId: string, track: Track) => void;
  onCacheTrack?: (track: Track) => void;
}

export const TrackRow: React.FC<TrackRowProps> = React.memo(({
  track,
  index,
  isCurrent,
  isPlaying,
  isLiked,
  isCached = false,
  isOfflineDisabled = false,
  customPlaylists = [],
  onPlay,
  onToggleLike,
  onAddToQueue,
  onPlayNext,
  onAddToPlaylist,
  onCacheTrack
}) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const [showPlaylistsSubmenu, setShowPlaylistsSubmenu] = React.useState(false);

  return (
    <div
      className={`group flex items-center gap-2.5 sm:gap-4 px-2 sm:px-4 py-2.5 rounded-md transition-colors text-sm select-none ${
        isOfflineDisabled
          ? 'opacity-45 text-neutral-500 cursor-not-allowed'
          : isCurrent
            ? 'bg-neutral-800/40 text-white hover:bg-neutral-800/60'
            : 'text-neutral-400 hover:bg-neutral-800/60'
      }`}
    >
      {/* Index or Play / Pause Indicator */}
      <div className="w-5 sm:w-6 flex items-center justify-center shrink-0">
        {isCurrent && isPlaying ? (
          <button
            onClick={() => onPlay(track)}
            aria-label={`Pause ${track.title}`}
            className="w-4 h-4 flex items-center justify-center text-[#1db954] cursor-pointer"
          >
            <div className="flex items-end gap-0.5 h-3">
              <span className="w-1 bg-[#1db954] animate-pulse h-3" />
              <span className="w-1 bg-[#1db954] animate-pulse h-2 delay-75" />
              <span className="w-1 bg-[#1db954] animate-pulse h-3 delay-150" />
            </div>
          </button>
        ) : (
          <>
            <span className={`${isOfflineDisabled ? '' : 'group-hover:hidden'} text-xs font-mono`}>
              {isCurrent ? <span className="text-[#1db954] font-bold">▶</span> : index + 1}
            </span>
            {!isOfflineDisabled && (
              <button
                onClick={() => onPlay(track)}
                aria-label={`Play ${track.title} by ${track.artist}`}
                className="hidden group-hover:flex items-center justify-center text-white hover:scale-110 transition-transform cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current text-white" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Artwork, Title & Artist */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 flex-1 min-w-0">
        <CoverImage
          src={track.thumbnail}
          alt={track.title}
          youtubeId={track.youtubeId}
          onClick={() => {
            if (!isOfflineDisabled) onPlay(track);
          }}
          className={`w-10 h-10 rounded object-cover shrink-0 bg-neutral-800 ${
            isOfflineDisabled ? 'grayscale' : 'cursor-pointer'
          }`}
        />
        <div className="truncate min-w-0 flex-1">
          <div
            onClick={() => {
              if (!isOfflineDisabled) onPlay(track);
            }}
            className={`font-medium truncate ${
              isOfflineDisabled
                ? 'text-neutral-400'
                : isCurrent
                  ? 'text-[#1db954] font-bold cursor-pointer hover:underline'
                  : 'text-white cursor-pointer hover:underline'
            }`}
          >
            {track.title}
          </div>
          <div className="text-xs text-neutral-400 truncate flex items-center gap-1.5">
            <span className="truncate">{track.artist}</span>
            {isCached && (
              <span className="text-[10px] font-semibold text-emerald-400 shrink-0">
                • Cached
              </span>
            )}
            {isOfflineDisabled && (
              <span className="text-[10px] font-semibold text-amber-400/90 shrink-0">
                • Online only
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Album / Collection */}
      <div className="hidden md:block w-1/4 truncate text-xs text-neutral-400">
        {track.album || 'Single'}
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          onClick={() => onToggleLike(track)}
          aria-label={isLiked ? "Unlike" : "Like"}
          className={`hidden sm:inline-flex p-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer ${
            isLiked ? 'text-[#1db954] opacity-100' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={() => onAddToQueue(track)}
          title="Add to Queue"
          aria-label="Add to Queue"
          className="hidden sm:inline-flex p-1.5 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-white transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="relative">
          <button
            onClick={() => {
              setShowMenu(!showMenu);
              setShowPlaylistsSubmenu(false);
            }}
            aria-label="More options"
            className="p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-neutral-400 hover:text-white transition-opacity cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-[#282828] border border-neutral-700 rounded-md shadow-2xl py-1 z-50 text-xs">
              <button
                onClick={() => {
                  onPlayNext(track);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-neutral-200 hover:bg-neutral-700/80 hover:text-white flex items-center gap-2 cursor-pointer"
              >
                <span>Play Next in Queue</span>
              </button>
              <button
                onClick={() => {
                  onAddToQueue(track);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-neutral-200 hover:bg-neutral-700/80 hover:text-white flex items-center gap-2 cursor-pointer"
              >
                <span>Add to Queue</span>
              </button>
              <button
                onClick={() => {
                  onToggleLike(track);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-neutral-200 hover:bg-neutral-700/80 hover:text-white flex items-center gap-2 cursor-pointer"
              >
                <span>{isLiked ? 'Remove from Liked' : 'Save to Liked Songs'}</span>
              </button>
              {onCacheTrack && (
                <button
                  onClick={() => {
                    onCacheTrack(track);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-emerald-300 hover:bg-neutral-700/80 hover:text-emerald-200 flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isCached ? 'Cached for Offline' : 'Cache for Offline'}</span>
                </button>
              )}

              {customPlaylists.length > 0 && onAddToPlaylist && (
                <div className="border-t border-neutral-700/60 mt-1 pt-1">
                  <div className="px-3 py-1 text-[10px] text-neutral-400 uppercase font-bold">
                    Add to Custom Playlist
                  </div>
                  {customPlaylists.map(pl => (
                    <button
                      key={pl.id}
                      onClick={() => {
                        onAddToPlaylist(pl.id, track);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-neutral-300 hover:bg-neutral-700/80 hover:text-white truncate cursor-pointer flex items-center gap-1.5"
                    >
                      <FolderPlus className="w-3 h-3 text-[#1db954]" />
                      <span className="truncate">{pl.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Duration */}
      <div className="w-12 text-right text-xs font-mono text-neutral-400 shrink-0">
        {track.durationFormatted}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.track.id === nextProps.track.id &&
    prevProps.isCurrent === nextProps.isCurrent &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.isCached === nextProps.isCached &&
    prevProps.isOfflineDisabled === nextProps.isOfflineDisabled &&
    prevProps.index === nextProps.index &&
    (prevProps.customPlaylists?.length ?? 0) === (nextProps.customPlaylists?.length ?? 0)
  );
});
