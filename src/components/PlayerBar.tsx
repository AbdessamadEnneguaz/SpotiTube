import React, { useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  ListMusic,
  Maximize2,
  Heart,
  Mic2,
  SlidersHorizontal,
  ArrowDownCircle,
  CheckCircle2,
} from 'lucide-react';
import { Track, RepeatMode } from '../types/music';
import { formatDuration } from '../utils/formatters';
import { computeSeekProgress } from '../utils/backgroundAudio';
import { CoverImage } from './CoverImage';
import { KiddwaveLogo } from './KiddwaveLogo';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  isLiked: boolean;
  isSavedOffline?: boolean;
  downloadProgress?: number | null;
  isQueueOpen: boolean;
  isLyricsOpen: boolean;
  isEqCustomized?: boolean;
  queueCount: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: (track: Track) => void;
  onSaveOffline?: (track: Track) => void;
  onDeleteOffline?: (youtubeId: string) => void;
  onToggleQueue: () => void;
  onToggleLyrics: () => void;
  onOpenAudioSettings: () => void;
  onOpenExpandedCover?: () => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  repeatMode,
  isShuffle,
  isLiked,
  isSavedOffline = false,
  downloadProgress = null,
  isQueueOpen,
  isLyricsOpen,
  isEqCustomized = false,
  queueCount,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
  onSaveOffline,
  onDeleteOffline,
  onToggleQueue,
  onToggleLyrics,
  onOpenAudioSettings,
  onOpenExpandedCover,
}) => {
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const seekValueRef = useRef(0);
  const isSeekingRef = useRef(false);

  const displayTime = isSeeking ? seekValue : currentTime;
  const { percent: progressPercent } = computeSeekProgress(displayTime, duration);
  const volumePercent = isMuted ? 0 : volume;

  const handleSeekStart = () => {
    if (!currentTrack) return;
    isSeekingRef.current = true;
    seekValueRef.current = currentTime;
    setIsSeeking(true);
    setSeekValue(currentTime);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = parseFloat(e.target.value);
    if (!Number.isFinite(nextVal)) return;
    seekValueRef.current = nextVal;
    setSeekValue(nextVal);
    if (!isSeekingRef.current) {
      onSeek(nextVal);
    }
  };

  const handleSeekCommit = () => {
    if (!isSeekingRef.current) return;
    isSeekingRef.current = false;
    setIsSeeking(false);
    onSeek(seekValueRef.current);
  };

  const handleOfflineClick = () => {
    if (!currentTrack) return;
    if (isSavedOffline) {
      onDeleteOffline?.(currentTrack.youtubeId);
    } else if (downloadProgress === null) {
      onSaveOffline?.(currentTrack);
    }
  };

  return (
    <footer className="frame-3d-console backdrop-blur-xl text-[#A39E9F] select-none z-40 relative shrink-0 md:pb-[env(safe-area-inset-bottom)]">
      {/* MOBILE MINI-PLAYER (< sm): Top-edge interactive scrubber + compact bar */}
      <div className="sm:hidden">
        <div className="relative w-full h-1.5 bg-white/15 group cursor-pointer">
          <div
            className={`h-full bg-gradient-to-r from-[#DC2626] to-[#FF443A] ${
              isSeeking ? 'transition-none' : 'transition-[width] duration-150'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
          <div
            data-testid="player-seek-thumb"
            aria-hidden="true"
            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full transition-transform ${
              currentTrack
                ? isSeeking
                  ? 'w-4 h-4 bg-white border-2 border-[#EF4444] shadow-[0_0_14px_rgba(239,68,68,0.95)] scale-110'
                  : 'w-3 h-3 bg-white border-2 border-[#EF4444] shadow-[0_0_10px_rgba(239,68,68,0.75)]'
                : 'w-2 h-2 bg-white/45 border border-white/30'
            }`}
            style={{
              left: `calc(${progressPercent}% - ${(progressPercent / 100) * (isSeeking ? 16 : currentTrack ? 12 : 8)}px)`,
            }}
          />
          <input
            type="range"
            min={0}
            max={duration > 0 ? duration : 100}
            step={1}
            value={displayTime}
            onChange={handleSeekChange}
            onPointerDown={handleSeekStart}
            onPointerUp={handleSeekCommit}
            onPointerCancel={handleSeekCommit}
            onMouseDown={handleSeekStart}
            onMouseUp={handleSeekCommit}
            onTouchStart={handleSeekStart}
            onTouchEnd={handleSeekCommit}
            onBlur={handleSeekCommit}
            disabled={!currentTrack}
            aria-label="Mobile track progress seekbar"
            className="absolute -top-3 inset-x-0 w-full h-7 opacity-0 cursor-pointer disabled:cursor-not-allowed touch-none z-10"
          />
        </div>

        <div className="h-14 px-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {currentTrack ? (
              <button
                type="button"
                onClick={onOpenExpandedCover}
                className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                aria-label={`Open player for ${currentTrack.title}`}
              >
                <CoverImage
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  youtubeId={currentTrack.youtubeId}
                  loading="eager"
                  className="w-10 h-10 rounded-lg object-cover bg-[#171213] border border-white/10 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[#F4F1F1] text-xs font-semibold truncate">
                    {currentTrack.title}
                  </div>
                  <div className="text-[#A39E9F] text-[11px] truncate flex items-center gap-1.5">
                    <span className="truncate">{currentTrack.artist}</span>
                    {duration > 0 && (
                      <span className="text-[10px] font-mono tabular-nums text-[#6F6A6B] shrink-0">
                        · {formatDuration(displayTime)}/{formatDuration(duration)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <KiddwaveLogo size={24} className="shrink-0 drop-shadow-[0_2px_8px_rgba(239,68,68,0.35)]" />
                <div className="min-w-0">
                  <span className="block text-xs font-semibold text-[#F4F1F1] truncate">
                    Ready to stream
                  </span>
                  <span className="block text-[11px] text-[#6F6A6B] truncate">
                    Select a global track
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {currentTrack && (
              <button
                type="button"
                onClick={() => onToggleLike(currentTrack)}
                aria-label={isLiked ? 'Unlike track' : 'Like track'}
                className={`min-w-[42px] min-h-[42px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                  isLiked ? 'text-[#EF4444]' : 'text-[#A39E9F] hover:text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </button>
            )}

            <button
              type="button"
              onClick={onToggleQueue}
              aria-label="Open playback queue"
              className={`min-w-[42px] min-h-[42px] flex items-center justify-center rounded-lg transition-colors cursor-pointer relative ${
                isQueueOpen ? 'text-[#EF4444]' : 'text-[#A39E9F] hover:text-white'
              }`}
            >
              <ListMusic className="w-4 h-4" />
              {queueCount > 0 && (
                <span className="absolute top-1 right-1 text-[9px] font-mono tabular-nums font-bold bg-[#EF4444] text-white min-w-[14px] h-3.5 px-0.5 rounded flex items-center justify-center">
                  {queueCount > 9 ? '9+' : queueCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onNext}
              aria-label="Next track"
              disabled={!currentTrack}
              className="min-w-[38px] min-h-[42px] flex items-center justify-center text-[#D0CBCC] hover:text-white disabled:opacity-35 cursor-pointer"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={onPlayPause}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              disabled={!currentTrack}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center active:scale-95 transition-all disabled:opacity-35 cursor-pointer shadow-md"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current translate-x-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* DESKTOP / TABLET SPOTIFY-LAYOUT CONSOLE BAR (sm+) */}
      <div className="hidden sm:flex h-[84px] px-4 lg:px-5 items-center justify-between gap-4">
        {/* LEFT: Cover Art, Title/Artist, Favorite & Compact Offline Download Badge */}
        <div className="flex items-center gap-3 w-[30%] min-w-[220px] max-w-[360px]">
          {currentTrack ? (
            <>
              <button
                type="button"
                onClick={onOpenExpandedCover}
                title="Expand Now Playing"
                aria-label={`Expand ${currentTrack.title}`}
                className="relative group shrink-0 cursor-pointer rounded-lg overflow-hidden"
              >
                <CoverImage
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  youtubeId={currentTrack.youtubeId}
                  loading="eager"
                  className="w-14 h-14 rounded-lg object-cover bg-[#171213] border border-white/12 shadow-[0_6px_14px_rgba(0,0,0,0.6)] transition-transform group-hover:scale-105"
                />
              </button>

              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={onOpenExpandedCover}
                  className="text-white text-sm font-semibold truncate hover:underline cursor-pointer block text-left w-full"
                >
                  {currentTrack.title}
                </button>
                <div className="text-xs text-[#A39E9F] truncate flex items-center gap-1.5 mt-0.5">
                  <span className="truncate">{currentTrack.artist}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleLike(currentTrack)}
                  aria-label={isLiked ? 'Unlike track' : 'Like track'}
                  title={isLiked ? 'Remove from Favorites' : 'Save to Favorites'}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    isLiked
                      ? 'text-[#EF4444]'
                      : 'text-[#A39E9F] hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={handleOfflineClick}
                  aria-label={
                    isSavedOffline
                      ? 'Saved offline — click to remove'
                      : 'Download for offline listening'
                  }
                  title={
                    typeof downloadProgress === 'number' && downloadProgress < 100
                      ? `Downloading ${downloadProgress}%`
                      : isSavedOffline
                        ? 'Downloaded offline (click to remove)'
                        : 'Save offline to device'
                  }
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    isSavedOffline
                      ? 'text-[#22C55E] hover:text-[#4ADE80]'
                      : 'text-[#A39E9F] hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {typeof downloadProgress === 'number' && downloadProgress < 100 ? (
                    <span className="w-4 h-4 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin block" />
                  ) : isSavedOffline ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <ArrowDownCircle className="w-4 h-4" />
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 text-[#6F6A6B]">
              <KiddwaveLogo size={28} className="shrink-0 drop-shadow-[0_4px_10px_rgba(239,68,68,0.35)]" />
              <div className="text-xs truncate">
                <span className="block text-[#F4F1F1] font-semibold truncate">
                  Ready to listen
                </span>
                <span className="block text-[#6F6A6B] truncate">
                  Space to play · Arrows ±5s
                </span>
              </div>
            </div>
          )}
        </div>

        {/* CENTER: Stacked Shuffle/Prev/Play/Next/Repeat + Interactive Progress Bar */}
        <div className="flex flex-col items-center justify-center gap-1.5 flex-1 max-w-[560px]">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onToggleShuffle}
              title={isShuffle ? 'Shuffle Active' : 'Shuffle'}
              aria-label="Toggle shuffle"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isShuffle ? 'text-[#EF4444]' : 'text-[#A39E9F] hover:text-white'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onPrevious}
              aria-label="Previous track"
              disabled={!currentTrack}
              className="p-1.5 text-[#D0CBCC] hover:text-white disabled:opacity-35 transition-colors cursor-pointer"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={onPlayPause}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              disabled={!currentTrack}
              className="w-9 h-9 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center transition-all shadow-[0_4px_14px_rgba(0,0,0,0.4)] disabled:opacity-35 cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current translate-x-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onNext}
              aria-label="Next track"
              disabled={!currentTrack}
              className="p-1.5 text-[#D0CBCC] hover:text-white disabled:opacity-35 transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={onToggleRepeat}
              aria-label={`Toggle repeat (currently ${repeatMode})`}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer relative ${
                repeatMode !== 'off' ? 'text-[#EF4444]' : 'text-[#A39E9F] hover:text-white'
              }`}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Interactive Progress Scrubber Row */}
          <div className="w-full flex items-center gap-2.5">
            <span className="text-[11px] font-mono tabular-nums text-[#A39E9F] w-9 text-right shrink-0">
              {formatDuration(displayTime)}
            </span>

            <div className="relative flex-1 h-4 flex items-center group cursor-pointer">
              <div className="w-full h-1 rounded-full bg-white/18 overflow-hidden group-hover:h-1.5 transition-[height]">
                <div
                  className={`h-full bg-white group-hover:bg-[#EF4444] rounded-full ${
                    isSeeking ? 'transition-none' : 'transition-[width,background-color] duration-150'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {currentTrack && isSeeking && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-7 px-2 py-0.5 rounded-md bg-[#161112] border border-[#EF4444]/60 text-[10px] font-mono font-semibold text-white shadow-lg tabular-nums whitespace-nowrap -translate-x-1/2"
                  style={{
                    left: `clamp(16px, ${progressPercent}%, calc(100% - 16px))`,
                  }}
                >
                  {formatDuration(displayTime)}
                </div>
              )}

              <div
                data-testid="player-seek-thumb-desktop"
                aria-hidden="true"
                className={`pointer-events-none absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow transition-opacity ${
                  currentTrack
                    ? 'opacity-0 group-hover:opacity-100'
                    : 'opacity-0'
                }`}
                style={{
                  left: `calc(${progressPercent}% - ${(progressPercent / 100) * 12}px)`,
                }}
              />

              <input
                type="range"
                min={0}
                max={duration > 0 ? duration : 100}
                step={1}
                value={displayTime}
                onChange={handleSeekChange}
                onPointerDown={handleSeekStart}
                onPointerUp={handleSeekCommit}
                onPointerCancel={handleSeekCommit}
                onMouseDown={handleSeekStart}
                onMouseUp={handleSeekCommit}
                onTouchStart={handleSeekStart}
                onTouchEnd={handleSeekCommit}
                onBlur={handleSeekCommit}
                disabled={!currentTrack}
                aria-label="Track progress seekbar"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed touch-none z-10"
              />
            </div>

            <span className="text-[11px] font-mono tabular-nums text-[#6F6A6B] w-9 text-left shrink-0">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* RIGHT (Exact Spotify Order): Lyrics -> Queue -> Equalizer -> Volume Slider -> Full Screen */}
        <div className="flex items-center justify-end gap-1.5 w-[30%] min-w-[230px]">
          <button
            type="button"
            onClick={onToggleLyrics}
            disabled={!currentTrack}
            title="Lyrics"
            aria-label="Open live synced lyrics"
            className={`p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-35 ${
              isLyricsOpen
                ? 'text-[#EF4444] bg-[#EF4444]/12'
                : 'text-[#A39E9F] hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Mic2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleQueue}
            title="Queue"
            aria-label="Open playback queue"
            className={`p-2 rounded-lg transition-colors cursor-pointer relative ${
              isQueueOpen
                ? 'text-[#EF4444] bg-[#EF4444]/12'
                : 'text-[#A39E9F] hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            {queueCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 text-[9px] font-mono font-bold bg-[#EF4444] text-white min-w-[15px] h-3.5 px-1 rounded flex items-center justify-center tabular-nums">
                {queueCount > 9 ? '9+' : queueCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenAudioSettings}
            title="Audio Engine & Equalizer"
            aria-label="Open audio engine and equalizer"
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isEqCustomized
                ? 'text-[#EF4444] bg-[#EF4444]/12'
                : 'text-[#A39E9F] hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <div className="hidden lg:flex items-center gap-2 w-24 group px-1">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              className="text-[#A39E9F] hover:text-white transition-colors cursor-pointer"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : volume < 50 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <div className="relative flex-1 flex items-center">
              <div className="w-full h-1 bg-white/18 rounded-full overflow-hidden group-hover:h-1.5 transition-[height]">
                <div
                  className="h-full bg-white group-hover:bg-[#EF4444] rounded-full transition-colors"
                  style={{ width: `${volumePercent}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={volumePercent}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                aria-label="Audio volume"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenExpandedCover}
            disabled={!currentTrack}
            title="Full screen player"
            aria-label="Open full screen player"
            className="p-2 rounded-lg text-[#A39E9F] hover:text-white hover:bg-white/[0.06] disabled:opacity-35 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
};
