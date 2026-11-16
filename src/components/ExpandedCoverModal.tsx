import React, { useEffect, useState } from 'react';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  ChevronDown
} from 'lucide-react';
import { Track, RepeatMode } from '../types/music';
import { formatDuration } from '../utils/formatters';

interface ExpandedCoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  isLiked: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (seconds: number) => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onToggleLike: (track: Track) => void;
}

export const ExpandedCoverModal: React.FC<ExpandedCoverModalProps> = ({
  isOpen,
  onClose,
  track,
  isPlaying,
  currentTime,
  duration,
  repeatMode,
  isShuffle,
  isLiked,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  onToggleRepeat,
  onToggleShuffle,
  onToggleLike
}) => {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekVal, setSeekVal] = useState(0);

  // Set high-res cover artwork with fallback on error
  useEffect(() => {
    if (track) {
      const highRes = `https://i.ytimg.com/vi/${track.youtubeId}/maxresdefault.jpg`;
      setImgSrc(highRes);
    }
  }, [track?.youtubeId, track?.thumbnail]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !track) return null;

  const displayTime = isSeeking ? seekVal : currentTime;
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (displayTime / duration) * 100)) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Expanded Album Artwork"
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto bg-black/95 text-white animate-in fade-in duration-200"
    >
      {/* Blurred Ambient Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <img
          src={imgSrc || track.thumbnail}
          alt=""
          className="w-full h-full object-cover blur-3xl scale-125 opacity-30 saturate-150 transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/80" />
      </div>

      {/* Top Bar with Dismiss Button */}
      <div className="p-3 sm:p-6 flex items-center justify-between shrink-0">
        <button
          onClick={onClose}
          aria-label="Close expanded artwork view"
          className="w-10 h-10 rounded-full bg-black/40 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
            Playing From Playlist
          </span>
          <span className="text-xs font-semibold text-white truncate max-w-[180px] sm:max-w-md">
            {track.album || 'SpotiTube Collection'}
          </span>
        </div>

        <button
          onClick={onClose}
          aria-label="Close"
          className="w-10 h-10 rounded-full bg-black/40 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Center Artwork & Track Details */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6 py-2 max-w-lg mx-auto w-full">
        {/* Album Artwork Card */}
        <div className="relative group aspect-square w-full max-w-[260px] sm:max-w-[380px] md:max-w-[420px] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] border border-white/10 mb-5 sm:mb-6 bg-neutral-900">
          <img
            src={imgSrc}
            onError={() => {
              if (track) setImgSrc(track.thumbnail);
            }}
            alt={track.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Track Title, Artist & Like */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="truncate pr-4 flex-1">
            <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight truncate">
              {track.title}
            </h1>
            <p className="text-sm sm:text-lg text-neutral-400 font-semibold truncate mt-0.5">
              {track.artist}
            </p>
          </div>

          <button
            onClick={() => onToggleLike(track)}
            aria-label={isLiked ? "Unlike track" : "Like track"}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer shrink-0 ${
              isLiked ? 'text-[#1db954]' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Heart className={`w-7 h-7 ${isLiked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Seekbar */}
        <div className="w-full space-y-1.5 mb-4">
          <div className="relative w-full group flex items-center">
            <div className="w-full h-1.5 bg-neutral-700/80 rounded-full overflow-hidden group-hover:h-2 transition-all">
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
              onChange={(e) => setSeekVal(parseFloat(e.target.value))}
              onMouseDown={() => {
                setIsSeeking(true);
                setSeekVal(currentTime);
              }}
              onMouseUp={() => {
                setIsSeeking(false);
                onSeek(seekVal);
              }}
              onTouchStart={() => {
                setIsSeeking(true);
                setSeekVal(currentTime);
              }}
              onTouchEnd={() => {
                setIsSeeking(false);
                onSeek(seekVal);
              }}
              aria-label="Track progress seekbar"
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-xs font-mono text-neutral-400">
            <span>{formatDuration(displayTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Playback Controls (Shuffle, Prev, Play, Next, 3-State Repeat) */}
        <div className="w-full flex items-center justify-between px-2">
          {/* Smart Shuffle */}
          <button
            onClick={onToggleShuffle}
            aria-label="Toggle shuffle"
            className={`p-2 transition-colors cursor-pointer relative ${
              isShuffle ? 'text-[#1db954]' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Shuffle className="w-5 h-5" />
            {isShuffle && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1db954] rounded-full" />
            )}
          </button>

          {/* Previous Track */}
          <button
            onClick={onPrevious}
            aria-label="Previous track"
            className="text-neutral-300 hover:text-white transition-colors cursor-pointer p-2"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          {/* Large Circular Play/Pause Button */}
          <button
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-2xl cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-current text-black" />
            ) : (
              <Play className="w-8 h-8 fill-current text-black translate-x-0.5" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={onNext}
            aria-label="Next track"
            className="text-neutral-300 hover:text-white transition-colors cursor-pointer p-2"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          {/* 3-State Repeat Toggle */}
          <button
            onClick={onToggleRepeat}
            aria-label={`Toggle repeat (currently ${repeatMode})`}
            className={`p-2 transition-colors cursor-pointer relative ${
              repeatMode !== 'off' ? 'text-[#1db954]' : 'text-neutral-400 hover:text-white'
            }`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
            {repeatMode !== 'off' && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1db954] rounded-full" />
            )}
          </button>
        </div>
      </div>
      <div className="pb-4" />
    </div>
  );
};
