import React from 'react';
import { Disc3, Play } from 'lucide-react';
import { Playlist, Track } from '../types/music';
import { CoverImage } from '../components/CoverImage';
import { filterTracksForOffline } from '../utils/offlineMode';

interface MixesPageProps {
  playlists: Playlist[];
  cachedYoutubeIds: Set<string>;
  isOfflineMode: boolean;
  onOpenPlaylist: (playlistId: string) => void;
  onPlayPlaylist: (firstTrack: Track, list: Track[]) => void;
}

export const MixesPage: React.FC<MixesPageProps> = ({
  playlists,
  cachedYoutubeIds,
  isOfflineMode,
  onOpenPlaylist,
  onPlayPlaylist
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <div className="text-xs font-medium text-[#DFCCB0] flex items-center gap-1.5 mb-1">
            <Disc3 className="w-3.5 h-3.5" />
            <span>Curated Soundstage</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F0E8] tracking-tight">
            World Mixes
          </h1>
          <p className="text-xs sm:text-sm text-[#9E9384] mt-1">
            Handpicked collections across Americas, Europe, Africa &amp; Asia
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-[#DFCCB0]">
          {playlists.length} collections
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {playlists.map((item) => (
          <div
            key={item.id}
            onClick={() => onOpenPlaylist(item.id)}
            className="card-interactive group flex items-center gap-3.5 bg-[#1B1815] hover:bg-[#24201B] border border-[#EAE0D0]/[0.08] hover:border-[#D8C3A5]/40 p-3 rounded-2xl cursor-pointer"
          >
            <CoverImage
              src={item.coverImage}
              alt={item.name}
              youtubeId={item.tracks[0]?.youtubeId}
              loading="lazy"
              className="w-20 h-20 rounded-xl object-cover shrink-0 bg-[#12100E]"
            />
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-sm sm:text-base text-[#F5F0E8] truncate">
                {item.name}
              </div>
              <p className="text-xs text-[#9E9384] line-clamp-2 mt-0.5">
                {item.description}
              </p>
              <div className="text-[11px] text-[#DFCCB0] mt-1.5 font-medium tabular-nums">
                {item.regionLabel || (item.isCustom ? 'Custom' : 'Global')} · {item.tracks.length} tracks
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const playable = filterTracksForOffline(item.tracks, cachedYoutubeIds, isOfflineMode);
                const first = playable[0] || item.tracks[0];
                if (first) onPlayPlaylist(first, item.tracks);
              }}
              aria-label={`Play ${item.name}`}
              className="w-10 h-10 rounded-xl bg-[#EAE0D0]/[0.06] group-hover:bg-[#D8C3A5] text-[#E4DDD2] group-hover:text-[#12100E] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current translate-x-0.2" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MixesPage;
