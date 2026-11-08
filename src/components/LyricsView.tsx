import React, { useEffect, useRef, useState } from 'react';
import { X, Mic2, Maximize2, Minimize2, Sparkles, Music, SlidersHorizontal, RotateCcw, Plus, Minus } from 'lucide-react';
import { Track, LyricLine } from '../types/music';

interface LyricsViewProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  lyrics: LyricLine[];
  currentTime: number;
  onSeek: (seconds: number) => void;
}

export const LyricsView: React.FC<LyricsViewProps> = ({
  isOpen,
  onClose,
  track,
  lyrics,
  currentTime,
  onSeek
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLParagraphElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [syncOffset, setSyncOffset] = useState<number>(0);
  const [showSyncControls, setShowSyncControls] = useState(false);

  // Reset offset when track changes
  useEffect(() => {
    setSyncOffset(0);
  }, [track?.id]);

  // Calibrated effective time (seconds) with user offset calibration
  const effectiveTime = Math.max(0, currentTime + syncOffset);

  // Optimized binary search O(log N) to instantly locate current line
  let activeIndex = -1;
  let low = 0;
  let high = lyrics.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lyrics[mid].time <= effectiveTime) {
      activeIndex = mid;
      low = mid + 1; // search right for latest matching line
    } else {
      high = mid - 1;
    }
  }

  // Auto-scroll to center the active line smoothly
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  const formatLyricTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className={`fixed z-40 bg-[#121212]/95 backdrop-blur-2xl border-l border-neutral-800 flex flex-col transition-all duration-300 shadow-2xl select-none ${
        isFullScreen
          ? 'inset-0 pb-24 z-50'
          : 'top-0 right-0 bottom-24 w-full sm:w-[450px] md:w-[500px]'
      }`}
    >
      {/* Top Header */}
      <div className="p-4 border-b border-neutral-800/80 bg-black/40 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1db954]/20 text-[#1db954] flex items-center justify-center">
              <Mic2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-white font-bold text-sm tracking-tight">Lyrics & Captions</h2>
                <span className="text-[10px] bg-[#1db954] text-black font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 truncate max-w-[200px] sm:max-w-[260px]">
                {track ? `${track.title} • ${track.artist}` : 'Karaoke Synchronized'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Sync calibration toggle button */}
            <button
              onClick={() => setShowSyncControls(prev => !prev)}
              aria-label="Toggle Sync Calibration"
              title="Calibrate Timing Offset (Nudge if lyrics are ahead/behind)"
              className={`px-2 py-1.5 rounded text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                showSyncControls || syncOffset !== 0
                  ? 'bg-[#1db954]/20 text-[#1db954] border border-[#1db954]/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="text-[11px] font-mono">
                {syncOffset === 0 ? 'Sync ±' : `${syncOffset > 0 ? '+' : ''}${syncOffset.toFixed(1)}s`}
              </span>
            </button>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              aria-label={isFullScreen ? 'Exit Fullscreen' : 'Fullscreen Lyrics'}
              className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              aria-label="Close Lyrics View"
              className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sync Calibration Controls Bar (Allows users to nudge audio/vocal timing to perfection) */}
        {(showSyncControls || syncOffset !== 0) && (
          <div className="flex flex-col gap-1.5 bg-neutral-900/90 border border-neutral-800 px-3 py-2 rounded-lg text-xs mt-1 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400 text-[11px]">Sync Timing:</span>
                <span className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded border ${
                  syncOffset < 0
                    ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50'
                    : syncOffset > 0
                    ? 'text-amber-400 bg-amber-950/40 border-amber-800/50'
                    : 'text-white bg-black/60 border-neutral-800'
                }`}>
                  {syncOffset === 0 ? '0.0s (Exact)' : `${syncOffset > 0 ? '+' : ''}${syncOffset.toFixed(1)}s ${syncOffset < 0 ? '(Delayed)' : '(Advanced)'}`}
                </span>
              </div>

              {syncOffset !== 0 && (
                <button
                  onClick={() => setSyncOffset(0)}
                  title="Reset Sync Offset to 0.0s"
                  className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-red-900/40 text-neutral-400 hover:text-red-300 cursor-pointer transition-colors text-[10px] flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Quick 1-click Preset Buttons for Instant Calibration */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-neutral-800/60">
              <span className="text-[10px] text-neutral-400 font-medium">Delay text:</span>
              <button
                onClick={() => setSyncOffset(-7)}
                title="Delay lyrics by 7s (Fixes 8s to 15s intro gap)"
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                  syncOffset === -7 ? 'bg-[#1db954] text-black' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                }`}
              >
                -7s
              </button>
              <button
                onClick={() => setSyncOffset(-4)}
                title="Delay lyrics by 4s (if text appears before vocals)"
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                  syncOffset === -4 ? 'bg-[#1db954] text-black' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                }`}
              >
                -4s
              </button>
              <button
                onClick={() => setSyncOffset(-2)}
                title="Delay lyrics by 2s"
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                  syncOffset === -2 ? 'bg-[#1db954] text-black' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                }`}
              >
                -2s
              </button>
              <button
                onClick={() => setSyncOffset(prev => Math.round((prev - 0.5) * 10) / 10)}
                title="Delay lyrics by 0.5s"
                className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-mono font-bold cursor-pointer"
              >
                -0.5s
              </button>
              <button
                onClick={() => setSyncOffset(prev => Math.round((prev + 0.5) * 10) / 10)}
                title="Advance lyrics by 0.5s"
                className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-mono font-bold cursor-pointer"
              >
                +0.5s
              </button>
              <button
                onClick={() => setSyncOffset(2)}
                title="Advance lyrics by 2s"
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                  syncOffset === 2 ? 'bg-[#1db954] text-black' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                }`}
              >
                +2s
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Synchronized Lyrics Scroll Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 py-12 space-y-7 scrollbar-thin scrollbar-thumb-neutral-800 text-center will-change-scroll"
      >
        {lyrics.length === 0 ? (
          <div className="text-neutral-500 py-16 flex flex-col items-center gap-3">
            <Music className="w-8 h-8 text-neutral-600" />
            <p className="text-sm">No captions available for this track.</p>
          </div>
        ) : (
          lyrics.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex;

            return (
              <div
                key={idx}
                ref={isActive ? (activeLineRef as any) : null}
                onClick={() => onSeek(Math.max(0, line.time - syncOffset))}
                className={`group transition-all duration-200 cursor-pointer py-1 ${
                  isActive ? 'scale-105' : 'hover:scale-[1.02]'
                }`}
              >
                <p
                  className={`font-extrabold leading-relaxed transition-colors duration-200 ${
                    isActive
                      ? 'text-[#1db954] text-2xl md:text-3xl drop-shadow-[0_2px_12px_rgba(29,185,84,0.4)]'
                      : isPast
                      ? 'text-neutral-400 text-lg md:text-xl group-hover:text-neutral-200'
                      : 'text-neutral-600 text-lg md:text-xl group-hover:text-neutral-300'
                  }`}
                >
                  {line.text}
                </p>
                <span
                  className={`text-[10px] font-mono transition-opacity duration-200 ${
                    isActive
                      ? 'text-[#1db954]/70 opacity-100'
                      : 'text-neutral-600 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {formatLyricTime(line.time)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom hint banner */}
      <div className="p-3 bg-black/60 border-t border-neutral-800/60 text-center text-[11px] text-neutral-400 flex items-center justify-between px-4">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#1db954]" />
          <span>Tap any lyric line to jump directly to that part!</span>
        </div>
        <span className="font-mono text-neutral-500 text-[10px]">
          {formatLyricTime(effectiveTime)}
        </span>
      </div>
    </div>
  );
};
