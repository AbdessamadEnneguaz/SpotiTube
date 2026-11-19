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
      className={`card-interactive group bg-[#110E0F] hover:bg-[#171213] p-3 rounded-2xl border transition-colors flex flex-col relative ${
        isOfflineDisabled
          ? 'opacity-45 cursor-not-allowed border-white/[0.04]'
          : 'cursor-pointer border-white/[0.08] hover:border-[#EF2323]/45'
      } ${isCurrent && isPlaying ? 'border-[#EF2323]/60 bg-[#171213]' : ''}`}
    >
      <div className="relative mb-3 aspect-video sm:aspect-[4/3] rounded-xl overflow-hidden bg-[#070607]">
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
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isCurrent
                  ? 'bg-[#EF2323] text-white shadow-[0_4px_12px_rgba(239,35,35,0.45)]'
                  : 'bg-black/75 text-white hover:bg-[#EF2323] hover:text-white'
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
      <div className={`font-semibold text-xs sm:text-sm truncate ${isCurrent ? 'text-[#FF443A]' : 'text-[#F4F1F1]'}`}>
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
