import React, { useEffect, useRef, useState } from 'react';
import { X, Mic2, Maximize2, Minimize2, Sparkles, Music, SlidersHorizontal, RotateCcw } from 'lucide-react';
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
      className={`fixed z-40 bg-[#161310]/96 backdrop-blur-2xl border-l border-[#EAE0D0]/10 flex flex-col transition-all duration-300 shadow-2xl select-none ${
        isFullScreen
          ? 'inset-0 pb-24 z-50'
          : 'top-0 right-0 bottom-24 w-full sm:w-[450px] md:w-[500px]'
      }`}
    >
      {/* Top Header */}
      <div className="p-4 border-b border-[#EAE0D0]/[0.08] bg-[#12100E]/60 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D8C3A5]/15 text-[#DFCCB0] flex items-center justify-center">
              <Mic2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-display text-[#F5F0E8] font-bold text-sm tracking-tight">Lyrics &amp; Captions</h2>
                <span className="text-[10px] bg-[#D8C3A5] text-[#12100E] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-[#9E9384] truncate max-w-[200px] sm:max-w-[260px]">
                {track ? `${track.title} · ${track.artist}` : 'Synchronized Lyrics'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Sync calibration toggle button */}
            <button
              type="button"
              onClick={() => setShowSyncControls(prev => !prev)}
              aria-label="Toggle Sync Calibration"
              title="Calibrate Timing Offset (Nudge if lyrics are ahead/behind)"
              className={`px-2 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                showSyncControls || syncOffset !== 0
                  ? 'bg-[#D8C3A5]/20 text-[#DFCCB0] border border-[#D8C3A5]/30'
                  : 'text-[#9E9384] hover:text-[#F5F0E8] hover:bg-[#24201B]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="text-[11px] font-mono">
                {syncOffset === 0 ? 'Sync ±' : `${syncOffset > 0 ? '+' : ''}${syncOffset.toFixed(1)}s`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              aria-label={isFullScreen ? 'Exit Fullscreen' : 'Fullscreen Lyrics'}
              className="p-1.5 text-[#9E9384] hover:text-[#F5F0E8] rounded-lg hover:bg-[#24201B] transition-colors cursor-pointer"
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Lyrics View"
              className="p-1.5 text-[#9E9384] hover:text-[#F5F0E8] rounded-lg hover:bg-[#24201B] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sync Calibration Controls Bar */}
        {(showSyncControls || syncOffset !== 0) && (
          <div className="flex flex-col gap-1.5 bg-[#1B1815] border border-[#EAE0D0]/10 px-3 py-2 rounded-xl text-xs mt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[#9E9384] text-[11px]">Sync Timing:</span>
                <span className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded border ${
                  syncOffset !== 0
                    ? 'text-[#DFCCB0] bg-[#D8C3A5]/15 border-[#D8C3A5]/30'
                    : 'text-[#F5F0E8] bg-[#12100E]/70 border-[#EAE0D0]/10'
                }`}>
                  {syncOffset === 0 ? '0.0s (Exact)' : `${syncOffset > 0 ? '+' : ''}${syncOffset.toFixed(1)}s ${syncOffset < 0 ? '(Delayed)' : '(Advanced)'}`}
                </span>
              </div>

              {syncOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setSyncOffset(0)}
                  title="Reset Sync Offset to 0.0s"
                  className="px-1.5 py-0.5 rounded bg-[#24201B] hover:bg-rose-900/40 text-[#9E9384] hover:text-rose-300 cursor-pointer transition-colors text-[10px] flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Quick 1-click Preset Buttons for Instant Calibration */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#EAE0D0]/[0.07]">
              <span className="text-[10px] text-[#9E9384] font-medium">Delay text:</span>
              <button
                type="button"
                onClick={() => setSyncOffset(-7)}
                title="Delay lyrics by 7s"
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                  syncOffset === -7 ? 'bg-[#D8C3A5] text-[#12100E]' : 'bg-[#24201B] hover:bg-[#2F2A24] text-[#E4DDD2]'
                }`}
              >
                -7s
              </button>
              <button
                type="button"
                onClick={() => setSyncOffset(-4)}
                title="Delay lyrics by 4s"
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                  syncOffset === -4 ? 'bg-[#D8C3A5] text-[#12100E]' : 'bg-[#24201B] hover:bg-[#2F2A24] text-[#E4DDD2]'
                }`}
              >
                -4s
              </button>
              <button
                type="button"
                onClick={() => setSyncOffset(-2)}
                title="Delay lyrics by 2s"
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                  syncOffset === -2 ? 'bg-[#D8C3A5] text-[#12100E]' : 'bg-[#24201B] hover:bg-[#2F2A24] text-[#E4DDD2]'
                }`}
              >
                -2s
              </button>
              <button
                type="button"
                onClick={() => setSyncOffset(prev => Math.round((prev - 0.5) * 10) / 10)}
                title="Delay lyrics by 0.5s"
                className="px-1.5 py-0.5 rounded bg-[#24201B] hover:bg-[#2F2A24] text-[#E4DDD2] text-[11px] font-mono font-bold cursor-pointer"
              >
                -0.5s
              </button>
              <button
                type="button"
                onClick={() => setSyncOffset(prev => Math.round((prev + 0.5) * 10) / 10)}
                title="Advance lyrics by 0.5s"
                className="px-1.5 py-0.5 rounded bg-[#24201B] hover:bg-[#2F2A24] text-[#E4DDD2] text-[11px] font-mono font-bold cursor-pointer"
              >
                +0.5s
              </button>
              <button
                type="button"
                onClick={() => setSyncOffset(2)}
                title="Advance lyrics by 2s"
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                  syncOffset === 2 ? 'bg-[#D8C3A5] text-[#12100E]' : 'bg-[#24201B] hover:bg-[#2F2A24] text-[#E4DDD2]'
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
        className="flex-1 overflow-y-auto px-6 py-12 space-y-7 scrollbar-thin text-center will-change-scroll"
      >
        {lyrics.length === 0 ? (
          <div className="text-[#8F8476] py-16 flex flex-col items-center gap-3">
            <Music className="w-8 h-8 text-[#8F8476]" />
            <p className="text-sm">No captions available for this track.</p>
          </div>
        ) : (
          lyrics.map((line, idx) => {
            const isActive = idx === activeIndex;
            const isPast = idx < activeIndex;

            return (
              <div
                key={idx}
                ref={isActive ? (activeLineRef as React.RefObject<HTMLDivElement>) : null}
                onClick={() => onSeek(Math.max(0, line.time - syncOffset))}
                className={`group transition-all duration-200 cursor-pointer py-1 ${
                  isActive ? 'scale-105' : 'hover:scale-[1.02]'
                }`}
              >
                <p
                  className={`font-display font-bold leading-relaxed transition-colors duration-200 ${
                    isActive
                      ? 'text-[#DFCCB0] text-2xl md:text-3xl drop-shadow-[0_2px_14px_rgba(216,195,165,0.28)]'
                      : isPast
                      ? 'text-[#9E9384] text-lg md:text-xl group-hover:text-[#E4DDD2]'
                      : 'text-[#6E655A] text-lg md:text-xl group-hover:text-[#C8BEB0]'
                  }`}
                >
                  {line.text}
                </p>
                <span
                  className={`text-[10px] font-mono transition-opacity duration-200 ${
                    isActive
                      ? 'text-[#DFCCB0]/80 opacity-100'
                      : 'text-[#8F8476] opacity-0 group-hover:opacity-100'
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
      <div className="p-3 bg-[#12100E]/75 border-t border-[#EAE0D0]/[0.07] text-center text-[11px] text-[#9E9384] flex items-center justify-between px-4">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#DFCCB0]" />
          <span>Tap any lyric line to jump directly to that part</span>
        </div>
        <span className="font-mono text-[#8F8476] text-[10px]">
          {formatLyricTime(effectiveTime)}
        </span>
      </div>
    </div>
  );
};
