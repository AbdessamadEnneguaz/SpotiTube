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
  Music2,
  Heart,
  Sliders,
  Moon,
  Sparkles
} from 'lucide-react';
import { Track, RepeatMode } from '../types/music';
import { formatDuration } from '../utils/formatters';

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
  isVideoVisible: boolean;
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
  onToggleVideo: () => void;
  onOpenEqualizer: () => void;
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
  isVideoVisible,
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
  onToggleVideo,
  onOpenEqualizer,
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
    <footer className="h-20 sm:h-24 bg-[#181818] border-t border-neutral-800 px-3 sm:px-4 flex items-center justify-between text-neutral-400 select-none z-40 relative">
      {/* LEFT: Currently Playing Track Info */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 max-w-[200px] sm:w-1/4 sm:min-w-[200px] sm:max-w-[320px]">
        {currentTrack ? (
          <>
            <div
              className="relative group shrink-0 cursor-pointer"
              onClick={onOpenExpandedCover}
              title="Expand Album Cover Artwork"
            >
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-11 h-11 sm:w-14 sm:h-14 rounded object-cover shadow-md bg-neutral-800 transition-transform group-hover:scale-105"
              />
              <div
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity rounded"
              >
                <Maximize2 className="w-4 h-4" />
              </div>
            </div>

            {/* Dynamic Sound Wave Indicator & Music Badge */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Animated Equalizer Wave Sound Indicator */}
              <div
                className="flex items-end gap-[2px] h-3.5 px-1 py-0.5 rounded bg-black/60 border border-[#1db954]/30 shadow-[0_0_8px_rgba(29,185,84,0.15)] shrink-0"
                title={isPlaying ? "Playing Lossless HiFi Audio" : "Playback Paused"}
              >
                <span className={`w-[2px] rounded-full bg-[#1db954] transition-all duration-300 ${isPlaying ? 'animate-[bounce_0.8s_ease-in-out_infinite] h-3.5' : 'h-1.5'}`} />
                <span className={`w-[2px] rounded-full bg-[#1db954] transition-all duration-300 ${isPlaying ? 'animate-[bounce_0.6s_ease-in-out_infinite_0.15s] h-2.5' : 'h-2'}`} />
                <span className={`w-[2px] rounded-full bg-[#1db954] transition-all duration-300 ${isPlaying ? 'animate-[bounce_0.9s_ease-in-out_infinite_0.3s] h-3' : 'h-1'}`} />
                <span className={`w-[2px] rounded-full bg-[#1db954] transition-all duration-300 ${isPlaying ? 'animate-[bounce_0.7s_ease-in-out_infinite_0.45s] h-2' : 'h-2.5'}`} />
              </div>

              <div className="truncate flex-1 min-w-0">
                <button
                  type="button"
                  onClick={onOpenExpandedCover}
                  className="text-white text-xs sm:text-sm font-semibold truncate hover:underline cursor-pointer block text-left w-full"
                  title={`Expand album cover - ${currentTrack.title}`}
                >
                  {currentTrack.title}
                </button>
                <div className="flex items-center gap-1.5">
                  <div
                    className="text-neutral-400 text-[10px] sm:text-xs truncate hover:text-white hover:underline cursor-pointer"
                    title={currentTrack.artist}
                    onClick={onOpenExpandedCover}
                  >
                    {currentTrack.artist}
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-[#1db954]/10 border border-[#1db954]/30 text-[#1db954] text-[8.5px] font-mono font-bold tracking-wider shrink-0">
                    <span className="w-1 h-1 rounded-full bg-[#1db954] animate-pulse" />
                    Hi-Fi
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onToggleLike(currentTrack)}
              aria-label={isLiked ? "Unlike track" : "Like track"}
              className={`p-1 transition-colors cursor-pointer shrink-0 ${
                isLiked ? 'text-[#1db954]' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2.5 text-neutral-500">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded bg-neutral-800/60 flex items-center justify-center shrink-0">
              <Music2 className="w-4 h-4 text-neutral-500" />
            </div>
            <div className="text-xs truncate">
              <span className="block text-neutral-300 font-semibold truncate">SpotiTube</span>
              <span className="block text-neutral-500 text-[10px] sm:text-xs truncate">Choose a track to play</span>
            </div>
          </div>
        )}
      </div>

      {/* CENTER: Main Spotify Playback Controls & Seekbar */}
      <div className="flex flex-col items-center gap-1.5 sm:gap-2 flex-1 max-w-xl sm:w-2/4 px-2">
        {/* Buttons Row */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Smart Shuffle with Sparkle */}
          <button
            onClick={onToggleShuffle}
            title={isShuffle ? "Smart Shuffle (Active)" : "Smart Shuffle"}
            aria-label="Toggle shuffle"
            className={`p-1 sm:p-1.5 transition-colors cursor-pointer relative ${
              isShuffle ? 'text-[#1db954]' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <div className="relative">
              <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {isShuffle && (
                <Sparkles className="w-2.5 h-2.5 text-[#1db954] absolute -top-1 -right-1.5 animate-pulse" />
              )}
            </div>
            {isShuffle && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1db954] rounded-full" />
            )}
          </button>

          {/* Previous Track */}
          <button
            onClick={onPrevious}
            aria-label="Previous track"
            disabled={!currentTrack}
            className="text-neutral-400 hover:text-white disabled:opacity-40 disabled:hover:text-neutral-400 transition-colors cursor-pointer p-1"
          >
            <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </button>

          {/* Play / Pause Primary Green Button */}
          <button
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            disabled={!currentTrack}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white hover:bg-neutral-200 text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current text-black" />
            ) : (
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current text-black translate-x-0.5" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={onNext}
            aria-label="Next track"
            disabled={!currentTrack}
            className="text-neutral-400 hover:text-white disabled:opacity-40 disabled:hover:text-neutral-400 transition-colors cursor-pointer p-1"
          >
            <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={onToggleRepeat}
            aria-label={`Toggle repeat (currently ${repeatMode})`}
            className={`p-1 sm:p-1.5 transition-colors cursor-pointer relative ${
              repeatMode !== 'off' ? 'text-[#1db954]' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
            {repeatMode !== 'off' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1db954] rounded-full" />
            )}
          </button>
        </div>

        {/* Progress Seekbar Row */}
        <div className="w-full hidden sm:flex items-center gap-2 text-[11px] font-mono text-neutral-400">
          <span className="w-10 text-right">{formatDuration(displayTime)}</span>

          <div className="relative flex-1 group flex items-center">
            <div className="w-full h-1 bg-neutral-700/80 rounded-full overflow-hidden group-hover:h-1.5 transition-all">
              <div
                className="h-full bg-white group-hover:bg-[#1db954] rounded-full transition-colors"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
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
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
          </div>

          <span className="w-10 text-left">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* RIGHT: Equalizer, Sleep Timer, Queue & Volume */}
      <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 sm:w-1/4 sm:min-w-[200px]">
        {/* Equalizer & Audio Quality */}
        <button
          onClick={onOpenEqualizer}
          title="Equalizer & 320kbps Audio (Premium)"
          aria-label="Equalizer settings"
          className="p-1.5 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer hidden xs:block"
        >
          <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Sleep Timer */}
        <button
          onClick={onOpenSleepTimer}
          title={activeSleepTimer ? `Sleep Timer: ${activeSleepTimer}m` : "Sleep Timer"}
          aria-label="Sleep timer"
          className={`p-1.5 rounded transition-colors cursor-pointer relative hidden sm:block ${
            activeSleepTimer ? 'text-purple-400' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {activeSleepTimer && (
            <span className="absolute -top-1 -right-1 text-[8px] bg-purple-600 text-white font-mono px-1 rounded-full">
              {activeSleepTimer === -1 ? 'End' : `${activeSleepTimer}m`}
            </span>
          )}
        </button>


        {/* Queue Drawer Toggle */}
        <button
          onClick={onToggleQueue}
          title="Open Queue"
          aria-label="Open playback queue"
          className={`p-1.5 rounded transition-colors cursor-pointer relative ${
            isQueueOpen ? 'text-[#1db954]' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <ListMusic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          {queueCount > 0 && (
            <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-[#1db954] text-black w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center">
              {queueCount > 9 ? '9+' : queueCount}
            </span>
          )}
        </button>

        {/* Volume controls */}
        <div className="hidden lg:flex items-center gap-2 w-24 group">
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
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
            <div className="w-full h-1 bg-neutral-700/80 rounded-full overflow-hidden group-hover:h-1.5 transition-all">
              <div
                className="h-full bg-white group-hover:bg-[#1db954] rounded-full transition-colors"
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
    </footer>
  );
};
