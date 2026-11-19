import React from 'react';
import { Play, Pause } from 'lucide-react';
import { Track } from '../types/music';
import { CoverImage } from './CoverImage';

interface TrackCardProps {
  track: Track;
  isCurrent: boolean;
  isPlaying: boolean;
  isCached: boolean;
  isOfflineDisabled: boolean;
  priorityLoad?: boolean;
  onInspect: (track: Track) => void;
  onPlayToggle: (track: Track) => void;
}

export const TrackCard: React.FC<TrackCardProps> = React.memo(({
  track,
  isCurrent,
  isPlaying,
  isCached,
  isOfflineDisabled,
  priorityLoad = false,
  onInspect,
  onPlayToggle
}) => {
  return (
    <div
      onClick={() => onInspect(track)}
      className={`frame-3d card-interactive group p-3 rounded-2xl flex flex-col relative ${
        isOfflineDisabled
          ? 'opacity-45 cursor-not-allowed'
          : 'cursor-pointer'
      } ${isCurrent && isPlaying ? 'border-[#EF4444]/65 shadow-[0_0_24px_-6px_rgba(239,68,68,0.3)]' : ''}`}
    >
      <div className="relative mb-3 aspect-video sm:aspect-[4/3] rounded-xl overflow-hidden bg-[#070607] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <CoverImage
          src={track.thumbnail}
          alt={track.title}
          youtubeId={track.youtubeId}
          loading={priorityLoad ? 'eager' : 'lazy'}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
            isOfflineDisabled ? 'grayscale' : ''
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-[#D0CBCC] truncate">
            {track.country || 'World'}
          </span>
          {!isOfflineDisabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlayToggle(track);
              }}
              aria-label={`Play ${track.title}`}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 border ${
                isCurrent
                  ? 'bg-[#EF4444] border-[#F87171]/50 text-white shadow-[0_4px_14px_rgba(239,68,68,0.45)]'
                  : 'bg-black/75 border-white/15 text-white hover:bg-[#EF4444] hover:border-[#F87171]/50'
              }`}
            >
              {isCurrent && isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current translate-x-0.2" />
              )}
            </button>
          )}
        </div>
      </div>
      <div className={`font-semibold text-xs sm:text-sm truncate ${isCurrent ? 'text-[#EF4444]' : 'text-[#F4F1F1]'}`}>
        {track.title}
      </div>
      <div className="text-[11px] sm:text-xs text-[#A39E9F] truncate mt-0.5 tabular-nums">
        {track.artist} · {track.durationFormatted}
        {isOfflineDisabled ? ' · Online only' : isCached ? ' · Cached' : ''}
      </div>
    </div>
  );
}, (prev, next) => (
  prev.track.id === next.track.id &&
  prev.track.youtubeId === next.track.youtubeId &&
  prev.isCurrent === next.isCurrent &&
  prev.isPlaying === next.isPlaying &&
  prev.isCached === next.isCached &&
  prev.isOfflineDisabled === next.isOfflineDisabled &&
  prev.priorityLoad === next.priorityLoad
));
