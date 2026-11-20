import React from 'react';
import { BarChart3, Clock } from 'lucide-react';
import { Track, Playlist } from '../types/music';
import { TrackRow } from '../components/TrackRow';

interface ChartsPageProps {
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  likedTrackIds: Set<string>;
  cachedYoutubeIds: Set<string>;
  offlineSavedIds: Set<string>;
  downloadProgressMap: Record<string, number>;
  isOfflineMode: boolean;
  customPlaylists: Playlist[];
  onPlayTrack: (track: Track, list: Track[]) => void;
  onInspectTrack: (track: Track, list: Track[]) => void;
  onToggleLike: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onPlayNext: (track: Track) => void;
  onAddToPlaylist: (playlistId: string, track: Track) => void;
  onCacheTrack: (track: Track) => void;
  onSaveOffline: (track: Track) => void;
  onDeleteOffline: (youtubeId: string) => void;
}

const REGIONS = [
  { id: 'all', label: 'All Regions' },
  { id: 'americas', label: 'Americas' },
  { id: 'europe', label: 'Europe' },
  { id: 'africa', label: 'Africa' },
  { id: 'asia', label: 'Asia' },
  { id: 'global', label: 'World Top 12' }
];

export const ChartsPage: React.FC<ChartsPageProps> = ({
  selectedRegion,
  onSelectRegion,
  tracks,
  currentTrack,
  isPlaying,
  likedTrackIds,
  cachedYoutubeIds,
  offlineSavedIds,
  downloadProgressMap,
  isOfflineMode,
  customPlaylists,
  onPlayTrack,
  onInspectTrack,
  onToggleLike,
  onAddToQueue,
  onPlayNext,
  onAddToPlaylist,
  onCacheTrack,
  onSaveOffline,
  onDeleteOffline
}) => {
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-[#FF443A] flex items-center gap-1.5 mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Global Charts</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {selectedRegion === 'all'
              ? 'All Regional Charts'
              : selectedRegion === 'global'
                ? 'World Top 12'
                : `${selectedRegion.charAt(0).toUpperCase()}${selectedRegion.slice(1)} Selection`}
          </h1>
        </div>
        <span className="text-xs font-mono tabular-nums text-[#A39E9F]">
          {tracks.length} tracks
        </span>
      </div>

      {/* Region Selector Tabs inside Charts Page */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {REGIONS.map((region) => {
          const isActive = selectedRegion === region.id;
          return (
            <button
              type="button"
              key={region.id}
              onClick={() => onSelectRegion(region.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer border ${
                isActive
                  ? 'bg-[#EF4444] text-white border-[#F87171]/50 font-bold shadow-[0_6px_16px_rgba(239,68,68,0.35)]'
                  : 'frame-3d text-[#D0CBCC] hover:text-white hover:border-[#EF4444]/40'
              }`}
            >
              {region.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2.5 sm:gap-4 px-2.5 sm:px-4 py-2 text-xs font-semibold text-[#A39E9F] border-b border-white/[0.08]">
          <span className="w-6 text-center shrink-0">#</span>
          <span className="flex-1 min-w-0">Title</span>
          <span className="hidden md:block w-1/4">Album</span>
          <span className="hidden sm:block w-24 shrink-0" aria-hidden="true" />
          <span className="w-12 text-right shrink-0">
            <Clock className="w-3.5 h-3.5 ml-auto" />
          </span>
        </div>

        {tracks.map((track, idx) => {
          const isCached = cachedYoutubeIds.has(track.youtubeId);
          return (
            <TrackRow
              key={track.id}
              track={track}
              index={idx}
              isCurrent={currentTrack?.id === track.id || currentTrack?.youtubeId === track.youtubeId}
              isPlaying={isPlaying}
              isLiked={likedTrackIds.has(track.id)}
              isCached={isCached}
              isSavedOffline={offlineSavedIds.has(track.youtubeId)}
              downloadProgress={downloadProgressMap[track.youtubeId] ?? null}
              isOfflineDisabled={isOfflineMode && !isCached}
              customPlaylists={customPlaylists}
              onPlay={(t) => onPlayTrack(t, tracks)}
              onInspectTrack={(t) => onInspectTrack(t, tracks)}
              onToggleLike={onToggleLike}
              onAddToQueue={onAddToQueue}
              onPlayNext={onPlayNext}
              onAddToPlaylist={onAddToPlaylist}
              onCacheTrack={onCacheTrack}
              onSaveOffline={onSaveOffline}
              onDeleteOffline={onDeleteOffline}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ChartsPage;
