import React from 'react';
import { Play, Heart, Plus, MoreHorizontal, Check, FolderPlus, UserRound } from 'lucide-react';
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
  onInspectTrack?: (track: Track) => void;
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
  onInspectTrack,
  onToggleLike,
  onAddToQueue,
  onPlayNext,
  onAddToPlaylist,
  onCacheTrack
}) => {
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <div
      className={`group flex items-center gap-2.5 sm:gap-4 px-2.5 sm:px-4 py-2.5 rounded-xl transition-colors text-sm border ${
        isOfflineDisabled
          ? 'opacity-45 text-[#8F8476] border-transparent cursor-not-allowed'
          : isCurrent
            ? 'bg-[#D8C3A5]/[0.10] border-[#D8C3A5]/25 text-[#F5F0E8]'
            : 'border-transparent text-[#9E9384] hover:bg-[#EAE0D0]/[0.05] hover:border-[#EAE0D0]/[0.08]'
      }`}
    >
      {/* Index or Play Indicator */}
      <div className="w-6 flex items-center justify-center shrink-0">
        {isCurrent && isPlaying ? (
          <button
            type="button"
            onClick={() => onPlay(track)}
            aria-label={`Pause ${track.title}`}
            className="w-5 h-5 flex items-center justify-center text-[#D8C3A5] cursor-pointer"
          >
            <div className="flex items-end gap-0.5 h-3.5">
              <span className="w-0.5 bg-[#D8C3A5] animate-pulse h-3.5 rounded-full" />
              <span className="w-0.5 bg-[#D8C3A5] animate-pulse h-2 delay-75 rounded-full" />
              <span className="w-0.5 bg-[#D8C3A5] animate-pulse h-3 delay-150 rounded-full" />
            </div>
          </button>
        ) : (
          <>
            <span className={`${isOfflineDisabled ? '' : 'group-hover:hidden'} text-xs font-mono tabular-nums text-[#8F8476]`}>
              {isCurrent ? (
                <span className="text-[#D8C3A5] font-bold">▶</span>
              ) : (
                String(index + 1).padStart(2, '0')
              )}
            </span>
            {!isOfflineDisabled && (
              <button
                type="button"
                onClick={() => onPlay(track)}
                aria-label={`Play ${track.title} by ${track.artist}`}
                className="hidden group-hover:flex items-center justify-center text-[#DFCCB0] hover:scale-110 transition-transform cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Artwork, Title & Artist */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <CoverImage
          src={track.thumbnail}
          alt={track.title}
          youtubeId={track.youtubeId}
          onClick={() => {
            if (!isOfflineDisabled) onPlay(track);
          }}
          className={`w-10 h-10 rounded-lg object-cover shrink-0 bg-[#24201B] ${
            isOfflineDisabled ? 'grayscale' : 'cursor-pointer'
          }`}
        />
        <div className="truncate min-w-0 flex-1">
          <div
            onClick={() => {
              if (!isOfflineDisabled) {
                if (onInspectTrack) onInspectTrack(track);
                else onPlay(track);
              }
            }}
            className={`font-medium truncate ${
              isOfflineDisabled
                ? 'text-[#9E9384]'
                : isCurrent
                  ? 'text-[#DFCCB0] font-semibold cursor-pointer hover:underline'
                  : 'text-[#F5F0E8] cursor-pointer hover:underline'
            }`}
          >
            {track.title}
          </div>
          <div className="text-xs text-[#9E9384] truncate flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (!isOfflineDisabled) {
                  if (onInspectTrack) onInspectTrack(track);
                  else onPlay(track);
                }
              }}
              className="truncate hover:text-[#DFCCB0] transition-colors cursor-pointer text-left"
            >
              {track.artist}
            </button>
            {track.country && (
              <span className="text-[#8F8476] shrink-0 hidden sm:inline">
                · {track.country}
              </span>
            )}
            {isCached && (
              <span className="text-[11px] font-medium text-[#DFCCB0] shrink-0">
                · Cached
              </span>
            )}
            {isOfflineDisabled && (
              <span className="text-[11px] font-medium text-[#8F8476] shrink-0">
                · Online only
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Album / Collection */}
      <div className="hidden md:block w-1/4 truncate text-xs text-[#9E9384]">
        {track.album || track.country || 'Single'}
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onToggleLike(track)}
          aria-label={isLiked ? "Unlike" : "Like"}
          className={`hidden sm:inline-flex p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer ${
            isLiked ? 'text-[#D8C3A5] opacity-100' : 'text-[#9E9384] hover:text-[#F5F0E8]'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
        </button>

        <button
          type="button"
          onClick={() => onAddToQueue(track)}
          title="Add to Queue"
          aria-label="Add to Queue"
          className="hidden sm:inline-flex p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-[#9E9384] hover:text-[#F5F0E8] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="More options"
            className="p-2 sm:p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-[#9E9384] hover:text-[#F5F0E8] transition-opacity cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-[#221E1A] border border-[#EAE0D0]/14 rounded-xl shadow-2xl py-1.5 z-50 text-xs">
              {onInspectTrack && (
                <button
                  type="button"
                  onClick={() => {
                    onInspectTrack(track);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-[#DFCCB0] hover:bg-[#EAE0D0]/[0.07] hover:text-[#F5F0E8] flex items-center gap-2 cursor-pointer font-medium"
                >
                  <UserRound className="w-3.5 h-3.5" />
                  <span>About Artist &amp; Track</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onPlayNext(track);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3.5 py-2 text-[#E4DDD2] hover:bg-[#EAE0D0]/[0.07] hover:text-[#F5F0E8] flex items-center gap-2 cursor-pointer"
              >
                <span>Play Next in Queue</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddToQueue(track);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3.5 py-2 text-[#E4DDD2] hover:bg-[#EAE0D0]/[0.07] hover:text-[#F5F0E8] flex items-center gap-2 cursor-pointer"
              >
                <span>Add to Queue</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleLike(track);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3.5 py-2 text-[#E4DDD2] hover:bg-[#EAE0D0]/[0.07] hover:text-[#F5F0E8] flex items-center gap-2 cursor-pointer"
              >
                <span>{isLiked ? 'Remove from Favorites' : 'Save to Favorites'}</span>
              </button>
              {onCacheTrack && (
                <button
                  type="button"
                  onClick={() => {
                    onCacheTrack(track);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-[#DFCCB0] hover:bg-[#EAE0D0]/[0.07] hover:text-[#F5F0E8] flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isCached ? 'Cached for Offline' : 'Cache for Offline'}</span>
                </button>
              )}

              {customPlaylists.length > 0 && onAddToPlaylist && (
                <div className="border-t border-[#EAE0D0]/[0.08] mt-1 pt-1">
                  <div className="px-3.5 py-1 text-[10px] text-[#9E9384] font-semibold">
                    Add to Playlist
                  </div>
                  {customPlaylists.map(pl => (
                    <button
                      type="button"
                      key={pl.id}
                      onClick={() => {
                        onAddToPlaylist(pl.id, track);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-[#C8BEB0] hover:bg-[#EAE0D0]/[0.07] hover:text-[#F5F0E8] truncate cursor-pointer flex items-center gap-1.5"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-[#D8C3A5] shrink-0" />
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
      <div className="w-12 text-right text-xs font-mono tabular-nums text-[#9E9384] shrink-0">
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
