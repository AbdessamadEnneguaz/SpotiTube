import React, { useState } from 'react';
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
  Disc3,
  Heart,
  Moon,
  UserRound
} from 'lucide-react';
import { Track, RepeatMode } from '../types/music';
import { formatDuration } from '../utils/formatters';
import { CoverImage } from './CoverImage';

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

  const displayTime = isSeeking ? seekValue : currentTime;
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (displayTime / duration) * 100)) : 0;
  const volumePercent = isMuted ? 0 : volume;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeekValue(parseFloat(e.target.value));
  };

  const handleSeekMouseDown = () => {
    setIsSeeking(true);
    setSeekValue(currentTime);
  };

  const handleSeekMouseUp = () => {
    setIsSeeking(false);
    onSeek(seekValue);
  };

  return (
    <footer className="bg-[#161310]/95 backdrop-blur-xl border-t border-[#EAE0D0]/[0.09] text-[#9E9384] select-none z-40 relative shrink-0">
      {/* Top Edge Scrubber Line (Both Mobile & Desktop Studio Silhouette) */}
      <div className="relative w-full h-1 bg-[#EAE0D0]/10 group cursor-pointer">
        <div
          className="h-full bg-[#D8C3A5] transition-all duration-150"
          style={{ width: `${progressPercent}%` }}
        />
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={1}
          value={displayTime}
          onChange={handleSeekChange}
          onMouseDown={handleSeekMouseDown}
          onMouseUp={handleSeekMouseUp}
          onTouchStart={handleSeekMouseDown}
          onTouchEnd={handleSeekMouseUp}
          disabled={!currentTrack}
          aria-label="Track progress seekbar"
          className="absolute -top-2 inset-x-0 w-full h-5 opacity-0 cursor-pointer disabled:cursor-not-allowed"
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
                className="w-10 h-10 rounded-lg object-cover bg-[#24201B] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-[#F5F0E8] text-xs font-semibold truncate">
                  {currentTrack.title}
                </div>
                <div className="text-[#9E9384] text-[11px] truncate flex items-center gap-1.5">
                  <span className="truncate">{currentTrack.artist}</span>
                  {duration > 0 && (
                    <span className="text-[10px] font-mono tabular-nums text-[#8F8476] shrink-0">
                      · {formatDuration(displayTime)}/{formatDuration(duration)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-[#1B1815] border border-[#EAE0D0]/[0.08] flex items-center justify-center shrink-0">
                <Disc3 className="w-4 h-4 text-[#D8C3A5]/75" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-[#E4DDD2] truncate">Ready to stream</span>
                <span className="block text-[11px] text-[#8F8476] truncate">Select a global track</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {currentTrack && (
            <button
              type="button"
              onClick={() => onToggleLike(currentTrack)}
              aria-label={isLiked ? "Unlike track" : "Like track"}
              className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                isLiked ? 'text-[#D8C3A5]' : 'text-[#9E9384] hover:text-[#F5F0E8]'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          )}

          <button
            type="button"
            onClick={onToggleQueue}
            aria-label="Open playback queue"
            className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg transition-colors cursor-pointer relative ${
              isQueueOpen ? 'text-[#D8C3A5]' : 'text-[#9E9384] hover:text-[#F5F0E8]'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            {queueCount > 0 && (
              <span className="absolute top-1 right-1 text-[9px] font-mono tabular-nums font-bold bg-[#D8C3A5] text-[#12100E] min-w-[14px] h-3.5 px-0.5 rounded flex items-center justify-center">
                {queueCount > 9 ? '9+' : queueCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            aria-label="Next track"
            disabled={!currentTrack}
            className="min-w-[38px] min-h-[40px] flex items-center justify-center text-[#C8BEB0] hover:text-[#F5F0E8] disabled:opacity-35 cursor-pointer"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          <button
            type="button"
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            disabled={!currentTrack}
            className="w-9 h-9 rounded-xl bg-[#D8C3A5] hover:bg-[#E4D3BA] text-[#12100E] flex items-center justify-center active:scale-95 transition-all disabled:opacity-35 cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current translate-x-0.2" />
            )}
          </button>
        </div>
      </div>

      {/* DESKTOP / TABLET STUDIO CONSOLE BAR (sm+) */}
      <div className="hidden sm:flex h-20 px-5 items-center justify-between gap-4">
        {/* LEFT: Track Artwork & Studio Info */}
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
                  className="w-12 h-12 rounded-lg object-cover bg-[#24201B] border border-[#EAE0D0]/12 transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[#F5F0E8] transition-opacity rounded-lg">
                  <Maximize2 className="w-4 h-4" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={onOpenExpandedCover}
                  className="text-[#F5F0E8] text-sm font-semibold truncate hover:text-[#DFCCB0] transition-colors cursor-pointer block text-left w-full"
                >
                  {currentTrack.title}
                </button>
                <div className="text-xs text-[#9E9384] truncate flex items-center gap-1.5 mt-0.5">
                  <span className="truncate">{currentTrack.artist}</span>
                  {currentTrack.country && (
                    <span className="text-[#8F8476] shrink-0 hidden lg:inline">· {currentTrack.country}</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleLike(currentTrack)}
                aria-label={isLiked ? "Unlike track" : "Like track"}
                className={`p-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
                  isLiked ? 'text-[#D8C3A5] bg-[#D8C3A5]/12' : 'text-[#9E9384] hover:text-[#F5F0E8] hover:bg-[#EAE0D0]/[0.06]'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 text-[#8F8476]">
              <div className="w-12 h-12 rounded-lg bg-[#1B1815] border border-[#EAE0D0]/[0.08] flex items-center justify-center shrink-0">
                <Disc3 className="w-5 h-5 text-[#D8C3A5]/75" />
              </div>
              <div className="text-xs truncate">
                <span className="block text-[#E4DDD2] font-semibold truncate">Ready to listen</span>
                <span className="block text-[#8F8476] truncate">Choose any country or track</span>
              </div>
            </div>
          )}
        </div>

        {/* CENTER: Studio Transport Controls & Tabular Clock */}
        <div className="flex items-center justify-center gap-4 flex-1 max-w-lg">
          <span className="hidden md:inline-block text-xs font-mono tabular-nums text-[#9E9384] w-11 text-right">
            {formatDuration(displayTime)}
          </span>

          <div className="flex items-center gap-2 sm:gap-3 bg-[#1E1A16] border border-[#EAE0D0]/[0.08] rounded-2xl px-3 py-1.5">
            <button
              type="button"
              onClick={onToggleShuffle}
              title={isShuffle ? "Shuffle Active" : "Shuffle"}
              aria-label="Toggle shuffle"
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isShuffle ? 'text-[#D8C3A5] bg-[#D8C3A5]/12' : 'text-[#9E9384] hover:text-[#F5F0E8]'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onPrevious}
              aria-label="Previous track"
              disabled={!currentTrack}
              className="p-2 text-[#C8BEB0] hover:text-[#F5F0E8] disabled:opacity-35 transition-colors cursor-pointer"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={onPlayPause}
              aria-label={isPlaying ? "Pause" : "Play"}
              disabled={!currentTrack}
              className="w-10 h-10 rounded-xl bg-[#D8C3A5] hover:bg-[#E4D3BA] text-[#12100E] flex items-center justify-center hover:scale-[1.03] active:scale-95 transition-all shadow-md disabled:opacity-40 cursor-pointer"
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
              className="p-2 text-[#C8BEB0] hover:text-[#F5F0E8] disabled:opacity-35 transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={onToggleRepeat}
              aria-label={`Toggle repeat (currently ${repeatMode})`}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                repeatMode !== 'off' ? 'text-[#D8C3A5] bg-[#D8C3A5]/12' : 'text-[#9E9384] hover:text-[#F5F0E8]'
              }`}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>
          </div>

          <span className="hidden md:inline-block text-xs font-mono tabular-nums text-[#8F8476] w-11 text-left">
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
            className="p-2 rounded-lg text-[#9E9384] hover:text-[#DFCCB0] hover:bg-[#EAE0D0]/[0.06] disabled:opacity-35 transition-colors cursor-pointer"
          >
            <UserRound className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenSleepTimer}
            title={activeSleepTimer ? `Sleep Timer: ${activeSleepTimer}m` : "Sleep Timer"}
            aria-label="Sleep timer"
            className={`p-2 rounded-lg transition-colors cursor-pointer relative ${
              activeSleepTimer ? 'text-[#D8C3A5] bg-[#D8C3A5]/12' : 'text-[#9E9384] hover:text-[#F5F0E8] hover:bg-[#EAE0D0]/[0.06]'
            }`}
          >
            <Moon className="w-4 h-4" />
            {activeSleepTimer && (
              <span className="absolute -top-1 -right-1 text-[9px] bg-[#D8C3A5] text-[#12100E] font-mono font-bold px-1 rounded tabular-nums">
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
              isQueueOpen ? 'text-[#D8C3A5] bg-[#D8C3A5]/12' : 'text-[#9E9384] hover:text-[#F5F0E8] hover:bg-[#EAE0D0]/[0.06]'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            {queueCount > 0 && (
              <span className="absolute -top-1 -right-1 text-[9px] font-mono font-bold bg-[#D8C3A5] text-[#12100E] min-w-[16px] h-4 px-1 rounded flex items-center justify-center tabular-nums">
                {queueCount > 9 ? '9+' : queueCount}
              </span>
            )}
          </button>

          <div className="hidden lg:flex items-center gap-2 w-24 group pl-1">
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
              className="text-[#9E9384] hover:text-[#F5F0E8] transition-colors cursor-pointer"
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
              <div className="w-full h-1.5 bg-[#EAE0D0]/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C8BEB0] group-hover:bg-[#D8C3A5] rounded-full transition-colors"
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
