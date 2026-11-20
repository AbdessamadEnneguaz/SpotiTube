import React from 'react';
import {
  Play,
  Heart,
  Plus,
  MoreHorizontal,
  Check,
  FolderPlus,
  UserRound,
  Download,
  Trash2,
} from 'lucide-react';
import { Track, Playlist } from '../types/music';
import { CoverImage } from './CoverImage';

interface TrackRowProps {
  track: Track;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  isLiked: boolean;
  isCached?: boolean;
  isSavedOffline?: boolean;
  downloadProgress?: number | null;
  isOfflineDisabled?: boolean;
  customPlaylists?: Playlist[];
  onPlay: (track: Track) => void;
  onInspectTrack?: (track: Track) => void;
  onToggleLike: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onPlayNext: (track: Track) => void;
  onAddToPlaylist?: (playlistId: string, track: Track) => void;
  onCacheTrack?: (track: Track) => void;
  onSaveOffline?: (track: Track) => void;
  onDeleteOffline?: (youtubeId: string) => void;
}

export const TrackRow: React.FC<TrackRowProps> = React.memo(({
  track,
  index,
  isCurrent,
  isPlaying,
  isLiked,
  isCached = false,
  isSavedOffline = false,
  downloadProgress = null,
  isOfflineDisabled = false,
  customPlaylists = [],
  onPlay,
  onInspectTrack,
  onToggleLike,
  onAddToQueue,
  onPlayNext,
  onAddToPlaylist,
  onCacheTrack,
  onSaveOffline,
  onDeleteOffline,
}) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const isDownloading = typeof downloadProgress === 'number' && downloadProgress >= 0 && downloadProgress < 100;

  return (
    <div
      className={`group flex items-center gap-2.5 sm:gap-4 px-2.5 sm:px-4 py-2.5 rounded-xl transition-colors text-sm border ${
        isOfflineDisabled
          ? 'opacity-45 text-[#6F6A6B] border-transparent cursor-not-allowed'
          : isCurrent
            ? 'bg-[#EF2323]/12 border-[#EF2323]/40 text-white'
            : 'border-transparent text-[#A39E9F] hover:bg-white/[0.04] hover:border-white/[0.08]'
      }`}
    >
      {/* Index or Play Indicator */}
      <div className="w-6 flex items-center justify-center shrink-0">
        {isCurrent && isPlaying ? (
          <button
            type="button"
            onClick={() => onPlay(track)}
            aria-label={`Pause ${track.title}`}
            className="w-5 h-5 flex items-center justify-center text-[#EF2323] cursor-pointer"
          >
            <div className="flex items-end gap-0.5 h-3.5">
              <span className="w-0.5 bg-[#EF2323] h-3.5 rounded-sm" />
              <span className="w-0.5 bg-[#FF443A] h-2 rounded-sm" />
              <span className="w-0.5 bg-[#EF2323] h-3 rounded-sm" />
            </div>
          </button>
        ) : (
          <>
            <span className={`${isOfflineDisabled ? '' : 'group-hover:hidden'} text-xs font-mono tabular-nums text-[#6F6A6B]`}>
              {isCurrent ? (
                <span className="text-[#EF2323] font-bold">▶</span>
              ) : (
                String(index + 1).padStart(2, '0')
              )}
            </span>
            {!isOfflineDisabled && (
              <button
                type="button"
                onClick={() => onPlay(track)}
                aria-label={`Play ${track.title} by ${track.artist}`}
                className="hidden group-hover:flex items-center justify-center text-[#FF443A] hover:scale-110 transition-transform cursor-pointer"
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
          className={`w-10 h-10 rounded-lg object-cover shrink-0 bg-[#171213] ${
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
                ? 'text-[#A39E9F]'
                : isCurrent
                  ? 'text-[#FF443A] font-semibold cursor-pointer hover:underline'
                  : 'text-[#F4F1F1] cursor-pointer hover:underline'
            }`}
          >
            {track.title}
          </div>
          <div className="text-xs text-[#A39E9F] truncate flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (!isOfflineDisabled) {
                  if (onInspectTrack) onInspectTrack(track);
                  else onPlay(track);
                }
              }}
              className="truncate hover:text-[#FF443A] transition-colors cursor-pointer text-left"
            >
              {track.artist}
            </button>
            {track.country && (
              <span className="text-[#6F6A6B] shrink-0 hidden sm:inline">
                · {track.country}
              </span>
            )}
            {isSavedOffline ? (
              <span className="text-[11px] font-semibold text-[#FF443A] shrink-0">
                · Offline
              </span>
            ) : isCached ? (
              <span className="text-[11px] font-medium text-[#A39E9F] shrink-0">
                · Recent
              </span>
            ) : null}
            {isDownloading && (
              <span className="text-[11px] font-mono tabular-nums text-[#FF443A] shrink-0">
                · Saving {downloadProgress}%
              </span>
            )}
            {isOfflineDisabled && (
              <span className="text-[11px] font-medium text-[#6F6A6B] shrink-0">
                · Online only
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Album / Collection */}
      <div className="hidden md:block w-1/4 truncate text-xs text-[#A39E9F]">
        {track.album || track.country || 'Single'}
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {onSaveOffline && (
          <button
            type="button"
            onClick={() => {
              if (isSavedOffline && onDeleteOffline) {
                onDeleteOffline(track.youtubeId);
              } else if (!isDownloading) {
                onSaveOffline(track);
              }
            }}
            disabled={isOfflineDisabled || isDownloading}
            title={
              isSavedOffline
                ? 'Saved offline (click to remove)'
                : isDownloading
                  ? `Saving offline (${downloadProgress}%)`
                  : 'Save track offline'
            }
            aria-label={isSavedOffline ? `Remove ${track.title} from offline library` : `Save ${track.title} offline`}
            className={`hidden sm:inline-flex p-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-40 ${
              isSavedOffline
                ? 'text-[#FF443A] opacity-100'
                : isDownloading
                  ? 'text-[#FF443A] opacity-100'
                  : 'opacity-0 group-hover:opacity-100 text-[#A39E9F] hover:text-white'
            }`}
          >
            {isDownloading ? (
              <div className="w-4 h-4 border-2 border-[#FF443A] border-t-transparent rounded-full animate-spin" />
            ) : isSavedOffline ? (
              <Check className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => onToggleLike(track)}
          aria-label={isLiked ? 'Unlike' : 'Like'}
          className={`hidden sm:inline-flex p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer ${
            isLiked ? 'text-[#FF443A] opacity-100' : 'text-[#A39E9F] hover:text-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
        </button>

        <button
          type="button"
          onClick={() => onAddToQueue(track)}
          title="Add to Queue"
          aria-label="Add to Queue"
          className="hidden sm:inline-flex p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-[#A39E9F] hover:text-white transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="More options"
            className="p-2 sm:p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-[#A39E9F] hover:text-white transition-opacity cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-[#171213] border border-white/14 rounded-xl shadow-2xl py-1.5 z-50 text-xs">
              {onInspectTrack && (
                <button
                  type="button"
                  onClick={() => {
                    onInspectTrack(track);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-[#FF443A] hover:bg-white/[0.06] hover:text-white flex items-center gap-2 cursor-pointer font-medium"
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
                className="w-full text-left px-3.5 py-2 text-[#D0CBCC] hover:bg-white/[0.06] hover:text-white flex items-center gap-2 cursor-pointer"
              >
                <span>Play Next in Queue</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddToQueue(track);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3.5 py-2 text-[#D0CBCC] hover:bg-white/[0.06] hover:text-white flex items-center gap-2 cursor-pointer"
              >
                <span>Add to Queue</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleLike(track);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3.5 py-2 text-[#D0CBCC] hover:bg-white/[0.06] hover:text-white flex items-center gap-2 cursor-pointer"
              >
                <span>{isLiked ? 'Remove from Favorites' : 'Save to Favorites'}</span>
              </button>
              {onSaveOffline && (
                <button
                  type="button"
                  onClick={() => {
                    if (isSavedOffline && onDeleteOffline) {
                      onDeleteOffline(track.youtubeId);
                    } else if (!isDownloading) {
                      onSaveOffline(track);
                    }
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-[#FF443A] hover:bg-white/[0.06] hover:text-white flex items-center gap-2 cursor-pointer font-medium"
                >
                  {isSavedOffline ? (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Offline Audio</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>{isDownloading ? `Saving (${downloadProgress}%)` : 'Save Offline'}</span>
                    </>
                  )}
                </button>
              )}
              {!onSaveOffline && onCacheTrack && (
                <button
                  type="button"
                  onClick={() => {
                    onCacheTrack(track);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-[#FF443A] hover:bg-white/[0.06] hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isCached ? 'Cached for Offline' : 'Cache for Offline'}</span>
                </button>
              )}

              {customPlaylists.length > 0 && onAddToPlaylist && (
                <div className="border-t border-white/[0.08] mt-1 pt-1">
                  <div className="px-3.5 py-1 text-[10px] text-[#A39E9F] font-semibold">
                    Add to Playlist
                  </div>
                  {customPlaylists.map((pl) => (
                    <button
                      type="button"
                      key={pl.id}
                      onClick={() => {
                        onAddToPlaylist(pl.id, track);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-[#D0CBCC] hover:bg-white/[0.06] hover:text-white truncate cursor-pointer flex items-center gap-1.5"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-[#EF2323] shrink-0" />
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
      <div className="w-12 text-right text-xs font-mono tabular-nums text-[#A39E9F] shrink-0">
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
    prevProps.isSavedOffline === nextProps.isSavedOffline &&
    prevProps.downloadProgress === nextProps.downloadProgress &&
    prevProps.isOfflineDisabled === nextProps.isOfflineDisabled &&
    prevProps.index === nextProps.index &&
    (prevProps.customPlaylists?.length ?? 0) === (nextProps.customPlaylists?.length ?? 0)
  );
});
