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
      className={`card-interactive group bg-[#1B1815] hover:bg-[#24201B] p-3 rounded-2xl border transition-colors flex flex-col relative ${
        isOfflineDisabled
          ? 'opacity-45 cursor-not-allowed border-[#EAE0D0]/[0.04]'
          : 'cursor-pointer border-[#EAE0D0]/[0.07] hover:border-[#EAE0D0]/16'
      } ${isCurrent && isPlaying ? 'border-[#D8C3A5]/50 bg-[#24201B]' : ''}`}
    >
      <div className="relative mb-3 aspect-video sm:aspect-[4/3] rounded-xl overflow-hidden bg-[#12100E]">
        <CoverImage
          src={track.thumbnail}
          alt={track.title}
          youtubeId={track.youtubeId}
          loading={priorityLoad ? 'eager' : 'lazy'}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
            isOfflineDisabled ? 'grayscale' : ''
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-[#E4DDD2] truncate">
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
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isCurrent
                  ? 'bg-[#D8C3A5] text-[#12100E]'
                  : 'bg-black/75 text-[#F5F0E8] hover:bg-[#D8C3A5] hover:text-[#12100E]'
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
      <div className={`font-semibold text-xs sm:text-sm truncate ${isCurrent ? 'text-[#EDE0CC]' : 'text-[#F5F0E8]'}`}>
        {track.title}
      </div>
      <div className="text-[11px] sm:text-xs text-[#9E9384] truncate mt-0.5 tabular-nums">
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
