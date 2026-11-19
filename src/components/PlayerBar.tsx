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
  Moon,
  UserRound
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
  isQueueOpen: boolean;
  activeSleepTimer: number | null;
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
  onToggleQueue: () => void;
  onOpenSleepTimer: () => void;
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
  isQueueOpen,
  activeSleepTimer,
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
  onToggleQueue,
  onOpenSleepTimer,
  onOpenExpandedCover
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
    // Support instant single-click / keyboard step changes when pointer isn't mid-drag
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

  return (
    <footer className="frame-3d-console backdrop-blur-xl text-[#A39E9F] select-none z-40 relative shrink-0 md:pb-[env(safe-area-inset-bottom)]">
      {/* Top Edge Scrubber Line with Interactive Leading Circle */}
      <div className="relative w-full h-1.5 bg-white/15 group cursor-pointer">
        <div
          className={`h-full bg-gradient-to-r from-[#DC2626] to-[#FF443A] ${
            isSeeking ? 'transition-none' : 'transition-[width] duration-150'
          }`}
          style={{ width: `${progressPercent}%` }}
        />

        {/* Live Seek Tooltip While Dragging */}
        {currentTrack && isSeeking && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-8 px-2 py-0.5 rounded-md bg-[#161112] border border-[#EF4444]/60 text-[10px] font-mono font-semibold text-white shadow-[0_6px_16px_rgba(0,0,0,0.85)] tabular-nums whitespace-nowrap -translate-x-1/2"
            style={{
              left: `clamp(24px, ${progressPercent}%, calc(100% - 24px))`
            }}
          >
            {formatDuration(displayTime)}
          </div>
        )}

        {/* Draggable Seek Circle Thumb ("Daira") at Leading Edge */}
        <div
          data-testid="player-seek-thumb"
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full transition-transform ${
            currentTrack
              ? isSeeking
                ? 'w-4 h-4 bg-white border-2 border-[#EF4444] shadow-[0_0_14px_rgba(239,68,68,0.95)] scale-110'
                : 'w-3.5 h-3.5 bg-white border-2 border-[#EF4444] shadow-[0_0_10px_rgba(239,68,68,0.75)] group-hover:scale-125'
              : 'w-2.5 h-2.5 bg-white/45 border border-white/30'
          }`}
          style={{
            left: `calc(${progressPercent}% - ${(progressPercent / 100) * (isSeeking ? 16 : currentTrack ? 14 : 10)}px)`
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
          className="absolute -top-3 inset-x-0 w-full h-7 opacity-0 cursor-pointer disabled:cursor-not-allowed touch-none z-10"
        />
      </div>

      {/* MOBILE MINI-PLAYER (< sm) */}
      <div className="sm:hidden h-14 px-3 flex items-center justify-between gap-2">
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
              <KiddwaveLogo size={38} className="shrink-0" />
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-[#F4F1F1] truncate">Ready to stream</span>
                <span className="block text-[11px] text-[#6F6A6B] truncate">Select a global track</span>
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
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
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
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors cursor-pointer relative ${
              isQueueOpen ? 'text-[#EF4444]' : 'text-[#A39E9F] hover:text-white'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            {queueCount > 0 && (
              <span className="absolute top-1.5 right-1.5 text-[9px] font-mono tabular-nums font-bold bg-[#EF4444] text-white min-w-[14px] h-3.5 px-0.5 rounded flex items-center justify-center">
                {queueCount > 9 ? '9+' : queueCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            aria-label="Next track"
            disabled={!currentTrack}
            className="min-w-[40px] min-h-[44px] flex items-center justify-center text-[#D0CBCC] hover:text-white disabled:opacity-35 cursor-pointer"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          <button
            type="button"
            onClick={onPlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            disabled={!currentTrack}
            className="w-10 h-10 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white flex items-center justify-center active:scale-95 transition-all disabled:opacity-35 cursor-pointer border border-[#F87171]/40 shadow-[0_4px_14px_rgba(239,68,68,0.4)]"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current translate-x-0.2" />
            )}
          </button>
        </div>
      </div>

      {/* DESKTOP / TABLET CONSOLE BAR (sm+) */}
      <div className="hidden sm:flex h-20 px-5 items-center justify-between gap-4">
        {/* LEFT: Track Artwork & Info */}
        <div className="flex items-center gap-3.5 w-[30%] min-w-[210px] max-w-[340px]">
          {currentTrack ? (
            <>
              <div
                className="relative group shrink-0 cursor-pointer"
                onClick={onOpenExpandedCover}
                title="Expand Cover Artwork"
              >
                <CoverImage
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  youtubeId={currentTrack.youtubeId}
                  loading="eager"
                  className="w-12 h-12 rounded-xl object-cover bg-[#171213] border border-white/14 shadow-[0_6px_14px_rgba(0,0,0,0.6)] transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity rounded-xl">
                  <Maximize2 className="w-4 h-4" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={onOpenExpandedCover}
                  className="text-white text-sm font-semibold truncate hover:text-[#EF4444] transition-colors cursor-pointer block text-left w-full"
                >
                  {currentTrack.title}
                </button>
                <div className="text-xs text-[#A39E9F] truncate flex items-center gap-1.5 mt-0.5">
                  <span className="truncate">{currentTrack.artist}</span>
                  {currentTrack.country && (
                    <span className="text-[#6F6A6B] shrink-0 hidden lg:inline">· {currentTrack.country}</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleLike(currentTrack)}
                aria-label={isLiked ? 'Unlike track' : 'Like track'}
                className={`p-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
                  isLiked ? 'text-[#EF4444] bg-[#EF4444]/14' : 'text-[#A39E9F] hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 text-[#6F6A6B]">
              <KiddwaveLogo size={44} className="shrink-0" />
              <div className="text-xs truncate">
                <span className="block text-[#F4F1F1] font-semibold truncate">Ready to listen</span>
                <span className="block text-[#6F6A6B] truncate">Space to play · Arrows ±5s</span>
              </div>
            </div>
          )}
        </div>

        {/* CENTER: Transport Controls & Tabular Clock */}
        <div className="flex items-center justify-center gap-4 flex-1 max-w-lg">
          <span className="hidden md:inline-block text-xs font-mono tabular-nums text-[#A39E9F] w-11 text-right">
            {formatDuration(displayTime)}
          </span>

          <div className="frame-3d flex items-center gap-2 sm:gap-3 rounded-2xl px-3 py-1.5">
            <button
              type="button"
              onClick={onToggleShuffle}
              title={isShuffle ? 'Shuffle Active' : 'Shuffle'}
              aria-label="Toggle shuffle"
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isShuffle ? 'text-[#FF443A] bg-[#EF2323]/14' : 'text-[#A39E9F] hover:text-white'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onPrevious}
              aria-label="Previous track"
              disabled={!currentTrack}
              className="p-2 text-[#D0CBCC] hover:text-white disabled:opacity-35 transition-colors cursor-pointer"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={onPlayPause}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              disabled={!currentTrack}
              className="w-10 h-10 rounded-xl bg-[#EF2323] hover:bg-[#FF3830] text-white flex items-center justify-center hover:scale-[1.03] active:scale-95 transition-all shadow-[0_6px_18px_rgba(239,35,35,0.35)] disabled:opacity-40 cursor-pointer"
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
              className="p-2 text-[#D0CBCC] hover:text-white disabled:opacity-35 transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={onToggleRepeat}
              aria-label={`Toggle repeat (currently ${repeatMode})`}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                repeatMode !== 'off' ? 'text-[#FF443A] bg-[#EF2323]/14' : 'text-[#A39E9F] hover:text-white'
              }`}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>
          </div>

          <span className="hidden md:inline-block text-xs font-mono tabular-nums text-[#6F6A6B] w-11 text-left">
            {formatDuration(duration)}
          </span>
        </div>

        {/* RIGHT: Artist Info, Sleep Timer, Queue & Volume */}
        <div className="flex items-center justify-end gap-2 w-[30%] min-w-[200px]">
          <button
            type="button"
            onClick={onOpenExpandedCover}
            disabled={!currentTrack}
            title="Track & Artist Info"
            aria-label="Open track and artist details"
            className="p-2 rounded-lg text-[#A39E9F] hover:text-[#FF443A] hover:bg-white/[0.06] disabled:opacity-35 transition-colors cursor-pointer"
          >
            <UserRound className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenSleepTimer}
            title={activeSleepTimer ? `Sleep Timer: ${activeSleepTimer}m` : 'Sleep Timer'}
            aria-label="Sleep timer"
            className={`p-2 rounded-lg transition-colors cursor-pointer relative ${
              activeSleepTimer ? 'text-[#FF443A] bg-[#EF2323]/14' : 'text-[#A39E9F] hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Moon className="w-4 h-4" />
            {activeSleepTimer && (
              <span className="absolute -top-1 -right-1 text-[9px] bg-[#EF2323] text-white font-mono font-bold px-1 rounded tabular-nums">
                {activeSleepTimer === -1 ? 'End' : `${activeSleepTimer}m`}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleQueue}
            title="Open Queue"
            aria-label="Open playback queue"
            className={`p-2 rounded-lg transition-colors cursor-pointer relative ${
              isQueueOpen ? 'text-[#FF443A] bg-[#EF2323]/14' : 'text-[#A39E9F] hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            {queueCount > 0 && (
              <span className="absolute -top-1 -right-1 text-[9px] font-mono font-bold bg-[#EF2323] text-white min-w-[16px] h-4 px-1 rounded flex items-center justify-center tabular-nums">
                {queueCount > 9 ? '9+' : queueCount}
              </span>
            )}
          </button>

          <div className="hidden lg:flex items-center gap-2 w-24 group pl-1">
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
              <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#D0CBCC] group-hover:bg-[#EF2323] rounded-full transition-colors"
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
        </div>
      </div>
    </footer>
  );
};
