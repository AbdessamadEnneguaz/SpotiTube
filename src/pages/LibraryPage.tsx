import React from 'react';
import { Heart, PlusSquare, History } from 'lucide-react';
import { Playlist } from '../types/music';
import { CoverImage } from '../components/CoverImage';
import { DEFAULT_FAVORITES_COVER } from '../data/curatedTracks';

interface LibraryPageProps {
  likedCount: number;
  cachedCount: number;
  playlists: Playlist[];
  onOpenPlaylist: (playlistId: string) => void;
  onOpenRecent: () => void;
  onOpenCreatePlaylist: () => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({
  likedCount,
  cachedCount,
  playlists,
  onOpenPlaylist,
  onOpenRecent,
  onOpenCreatePlaylist
}) => {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-xl sm:text-2xl font-bold text-[#F5F0E8]">
          Your Music Library
        </h1>
        <button
          type="button"
          onClick={onOpenCreatePlaylist}
          className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-[#D8C3A5] hover:bg-[#E4D3BA] text-[#12100E] font-bold text-xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        >
          <PlusSquare className="w-4 h-4" />
          <span>Create Playlist</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div
          onClick={() => onOpenPlaylist('liked')}
          className="card-interactive p-5 rounded-2xl bg-[#1B1815] hover:bg-[#24201B] border border-[#D8C3A5]/30 cursor-pointer flex items-center gap-4"
        >
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0">
            <CoverImage
              src={DEFAULT_FAVORITES_COVER}
              alt="Saved Favorites"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
              <Heart className="w-7 h-7 fill-[#D8C3A5] text-[#D8C3A5]" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#F5F0E8]">
              Saved Favorites
            </h2>
            <p className="text-xs text-[#9E9384] mt-1 tabular-nums">
              {likedCount} tracks saved locally
            </p>
            <span className="text-xs font-semibold text-[#DFCCB0] mt-2 inline-block">
              Open collection
            </span>
          </div>
        </div>

        <div
          onClick={onOpenRecent}
          className="card-interactive p-5 rounded-2xl bg-[#1B1815] hover:bg-[#24201B] border border-[#EAE0D0]/[0.08] hover:border-[#D8C3A5]/35 cursor-pointer flex items-center gap-4"
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-[#D8C3A5]/12 border border-[#D8C3A5]/25 flex items-center justify-center shrink-0 text-[#DFCCB0]">
            <History className="w-8 h-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#F5F0E8]">
              Recent &amp; Cached
            </h2>
            <p className="text-xs text-[#9E9384] mt-1 tabular-nums">
              {cachedCount} tracks ready offline
            </p>
            <span className="text-xs font-semibold text-[#DFCCB0] mt-2 inline-block">
              Open history
            </span>
          </div>
        </div>

        {playlists.map((pl) => (
          <div
            key={pl.id}
            onClick={() => onOpenPlaylist(pl.id)}
            className="card-interactive p-3.5 sm:p-4 rounded-2xl bg-[#1B1815] hover:bg-[#24201B] cursor-pointer border border-[#EAE0D0]/[0.08] flex items-center gap-3.5"
          >
            <CoverImage
              src={pl.coverImage}
              alt={pl.name}
              youtubeId={pl.tracks[0]?.youtubeId}
              loading="lazy"
              className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl object-cover shrink-0 bg-[#12100E]"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-sm sm:text-base font-bold text-[#F5F0E8] truncate">
                {pl.name}
              </h3>
              <p className="text-xs text-[#9E9384] line-clamp-2 mt-1">
                {pl.description}
              </p>
              <span className="text-xs text-[#DFCCB0] mt-2 block font-medium tabular-nums">
                {pl.isCustom ? 'Custom · ' : pl.regionLabel ? `${pl.regionLabel} · ` : ''}
                {pl.tracks.length} tracks
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LibraryPage;
