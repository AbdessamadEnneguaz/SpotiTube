import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  SlidersHorizontal,
  RotateCcw,
  Music,
} from 'lucide-react';
import { Track, LyricsData } from '../types/music';
import { findActiveLyricIndex } from '../utils/lrcParser';
import { formatDuration } from '../utils/formatters';
import { useAlbumColor } from '../utils/useAlbumColor';
import { CoverImage } from './CoverImage';

interface LyricsViewProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  lyricsData: LyricsData;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
}

export const LyricsView: React.FC<LyricsViewProps> = ({
  isOpen,
  onClose,
  track,
  lyricsData,
  isLoading,
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  onSeek,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLButtonElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [syncOffset, setSyncOffset] = useState<number>(0);
  const [showSyncPopover, setShowSyncPopover] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  const palette = useAlbumColor(track?.thumbnail, track?.youtubeId);

  // Reset calibration & popover when track switches
  useEffect(() => {
    setSyncOffset(0);
    setShowSyncPopover(false);
  }, [track?.youtubeId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSyncPopover) {
          setShowSyncPopover(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, showSyncPopover]);

  const syncedLines = lyricsData.syncedLines;
  const effectiveTime = Math.max(0, currentTime + syncOffset);
  const activeIndex = findActiveLyricIndex(syncedLines, effectiveTime);

  // Smooth auto-scroll centering the active lyric line
  useEffect(() => {
    if (isOpen && activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, isOpen]);

  if (!isOpen) return null;

  const hasSynced = syncedLines.length > 0;
  const plainLines = lyricsData.plainText
    ? lyricsData.plainText.split(/\r?\n/)
    : [];

  const effectiveDuration =
    duration > 0 ? duration : track?.durationSeconds || 0;
  const displayTime = isSeeking ? seekValue : currentTime;
  const progressPercent =
    effectiveDuration > 0
      ? Math.min(100, Math.max(0, (displayTime / effectiveDuration) * 100))
      : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={track ? `Lyrics for ${track.title}` : 'Live Synced Lyrics'}
      style={{
        background: `linear-gradient(180deg, ${palette.baseHex} 0%, ${palette.cardHex} 56%, ${palette.darkHex} 100%)`,
      }}
      className={`fixed z-[60] flex flex-col transition-all duration-700 shadow-[0_28px_80px_rgba(0,0,0,0.95)] select-none text-white ${
        isFullScreen
          ? 'inset-0'
          : 'top-0 right-0 bottom-0 sm:bottom-[84px] w-full sm:w-[460px] md:w-[520px] border-l border-white/10'
      }`}
    >
      {/* Top Spotify-Style Header */}
      <header className="relative px-4 sm:px-7 pt-[max(0.875rem,env(safe-area-inset-top))] pb-3.5 flex items-center justify-between gap-3 bg-gradient-to-b from-black/35 to-transparent shrink-0">
        {/* Compact Cover + Track Title & Artist */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {track ? (
            <CoverImage
              src={track.thumbnail}
              alt={track.title}
              youtubeId={track.youtubeId}
              loading="eager"
              className="w-10 h-10 rounded-lg object-cover shrink-0 bg-black/30 border border-white/15 shadow-md"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <Music className="w-4 h-4 text-white/80" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="font-sans text-sm sm:text-base font-bold text-white truncate">
              {track ? track.title : 'Live Synced Lyrics'}
            </h2>
            <p className="text-xs text-white/75 font-medium truncate">
              {track ? track.artist : 'Select a track'}
            </p>
          </div>
        </div>

        {/* Right Header Controls: Sync Calibration Popover Trigger, Dock/Fullscreen, ChevronDown */}
        <div className="flex items-center gap-1.5 shrink-0">
          {hasSynced && (
            <button
              type="button"
              onClick={() => setShowSyncPopover((prev) => !prev)}
              aria-label="Toggle Sync Calibration"
              aria-expanded={showSyncPopover}
              title="Lyrics sync timing"
              className={`min-h-[36px] px-2.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                showSyncPopover || syncOffset !== 0
                  ? 'bg-white text-black border-white'
                  : 'bg-black/25 text-white/90 border-white/15 hover:bg-black/45'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums text-[11px]">
                {syncOffset === 0
                  ? 'Sync'
                  : `${syncOffset > 0 ? '+' : ''}${syncOffset.toFixed(1)}s`}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsFullScreen((prev) => !prev)}
            aria-label={isFullScreen ? 'Dock Lyrics Drawer' : 'Fullscreen Lyrics'}
            title={isFullScreen ? 'Dock side drawer' : 'Expand fullscreen'}
            className="hidden sm:flex w-10 h-10 rounded-full bg-black/25 hover:bg-black/45 text-white/85 hover:text-white items-center justify-center transition-colors cursor-pointer"
          >
            {isFullScreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Lyrics View"
            title="Close Lyrics"
            className="w-10 h-10 rounded-full bg-black/25 hover:bg-black/45 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* Floating Sync-Offset Pill Popover */}
        {hasSynced && showSyncPopover && (
          <div
            role="region"
            aria-label="Lyrics sync calibration"
            className="absolute right-4 sm:right-7 top-full mt-1 z-20 w-64 rounded-2xl bg-[#121011]/95 backdrop-blur-xl border border-white/15 p-3.5 shadow-[0_18px_40px_rgba(0,0,0,0.85)] space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white/80">
                Timing Offset
              </span>
              <span className="font-mono font-bold text-xs text-white tabular-nums">
                {syncOffset === 0
                  ? '0.0s'
                  : `${syncOffset > 0 ? '+' : ''}${syncOffset.toFixed(1)}s`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSyncOffset((prev) => Math.round((prev - 0.5) * 10) / 10)
                }
                className="flex-1 min-h-[38px] rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold cursor-pointer transition-colors"
              >
                -0.5s
              </button>
              <button
                type="button"
                onClick={() =>
                  setSyncOffset((prev) => Math.round((prev + 0.5) * 10) / 10)
                }
                className="flex-1 min-h-[38px] rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold cursor-pointer transition-colors"
              >
                +0.5s
              </button>
              {syncOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setSyncOffset(0)}
                  aria-label="Reset sync offset"
                  className="min-w-[38px] min-h-[38px] rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Scrollable Spotify Lyrics Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 sm:px-10 py-10 sm:py-14 scrollbar-thin"
      >
        <div
          className={`mx-auto ${
            isFullScreen ? 'max-w-3xl' : 'max-w-md'
          } space-y-5`}
        >
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-white/80">
              <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold">Loading synced lyrics...</p>
            </div>
          ) : hasSynced ? (
            syncedLines.map((line, idx) => {
              const isActive = idx === activeIndex;
              const isPast = idx < activeIndex;

              return (
                <button
                  type="button"
                  key={`${line.time}-${idx}`}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => onSeek(Math.max(0, line.time - syncOffset))}
                  className={`block w-full text-left font-sans text-2xl md:text-4xl font-extrabold leading-snug tracking-tight origin-left transition-all duration-300 cursor-pointer focus:outline-none focus-visible:underline ${
                    isActive
                      ? 'text-white opacity-100 scale-[1.02]'
                      : isPast
                        ? 'text-white/35 hover:text-white/80'
                        : 'text-white/60 hover:text-white'
                  }`}
                >
                  {line.text}
                </button>
              );
            })
          ) : plainLines.length > 0 ? (
            <div className="space-y-4">
              {plainLines.map((line, idx) => (
                <p
                  key={idx}
                  className={`font-sans text-xl md:text-3xl font-extrabold leading-snug tracking-tight text-white/90 ${
                    line.trim() === '' ? 'h-4' : ''
                  }`}
                >
                  {line}
                </p>
              ))}
            </div>
          ) : (
            <div className="text-white/80 py-24 flex flex-col items-center text-center gap-3 px-4">
              <div className="w-12 h-12 rounded-2xl bg-black/25 border border-white/15 flex items-center justify-center text-white">
                <Music className="w-6 h-6" />
              </div>
              <p className="text-lg font-bold text-white">
                No lyrics found for this track
              </p>
              <p className="text-sm text-white/65 max-w-sm leading-relaxed">
                Instrumental recordings, live mixes, or regional releases may not have lyrics indexed on LRCLIB yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Floating Translucent Glass Mini-Controls */}
      <div className="bg-black/35 backdrop-blur-2xl border-t border-white/10 px-5 sm:px-8 pt-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0">
        <div className="max-w-2xl mx-auto space-y-2.5">
          {/* Interactive Progress Scrubber */}
          <div className="space-y-1">
            <div className="relative h-5 flex items-center group cursor-pointer">
              <div className="w-full h-1.5 rounded-full bg-white/25 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-[width] duration-100"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md transition-transform group-hover:scale-125"
                style={{
                  left: `calc(${progressPercent}% - ${(progressPercent / 100) * 14}px)`,
                }}
              />
              <input
                type="range"
                min={0}
                max={effectiveDuration > 0 ? effectiveDuration : 100}
                step={1}
                value={displayTime}
                disabled={!track}
                onMouseDown={() => {
                  setIsSeeking(true);
                  setSeekValue(currentTime);
                }}
                onTouchStart={() => {
                  setIsSeeking(true);
                  setSeekValue(currentTime);
                }}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (Number.isFinite(val)) {
                    setSeekValue(val);
                    if (!isSeeking) onSeek(val);
                  }
                }}
                onMouseUp={() => {
                  setIsSeeking(false);
                  onSeek(seekValue);
                }}
                onTouchEnd={() => {
                  setIsSeeking(false);
                  onSeek(seekValue);
                }}
                aria-label="Lyrics view track progress seekbar"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-white/75">
              <span>{formatDuration(displayTime)}</span>
              <span className="font-sans text-[10px] font-semibold tracking-wide text-white/60 uppercase">
                {hasSynced ? 'Synced · LRCLIB' : lyricsData.plainText ? 'Lyrics · LRCLIB' : 'LRCLIB'}
              </span>
              <span>{formatDuration(effectiveDuration)}</span>
            </div>
          </div>

          {/* Centered Play / Pause Circular White Spotify Button */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={onPlayPause}
              disabled={!track}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-12 h-12 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-transform shadow-[0_8px_24px_rgba(0,0,0,0.45)] flex items-center justify-center cursor-pointer disabled:opacity-40"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current translate-x-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
