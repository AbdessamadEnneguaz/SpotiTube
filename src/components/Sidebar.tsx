import React from 'react';
import { Home, Search, Library, Plus, Heart, ChevronRight } from 'lucide-react';
import { AppView, Playlist } from '../types/music';
import { CoverImage } from './CoverImage';
import { KiddwaveLogo } from './KiddwaveLogo';
import { DEFAULT_FAVORITES_COVER } from '../data/curatedTracks';

interface SidebarProps {
  currentView: AppView;
  selectedPlaylistId: string | null;
  customPlaylists: Playlist[];
  likedCount: number;
  onNavigate: (view: AppView) => void;
  onSelectPlaylist: (playlistId: string) => void;
  onOpenLegal: (tab?: 'privacy' | 'terms' | 'dmca' | 'cookies') => void;
  onOpenCreatePlaylist: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  currentView,
  selectedPlaylistId,
  customPlaylists,
  likedCount,
  onNavigate,
  onSelectPlaylist,
  onOpenLegal,
  onOpenCreatePlaylist
}) => {
  const isHomeSection =
    currentView === 'home' ||
    currentView === 'countries' ||
    currentView === 'mixes' ||
    currentView === 'charts' ||
    currentView === 'recent';

  return (
    <aside className="hidden md:flex w-60 bg-gradient-to-b from-[#0E0B0C] to-[#080708] border-r border-white/[0.08] flex-col h-full shrink-0 text-[#A39E9F] text-sm shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)]">
      {/* Brand Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.07]">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 text-left group cursor-pointer"
        >
          <KiddwaveLogo
            size={38}
            className="shrink-0 drop-shadow-[0_6px_16px_rgba(239,68,68,0.38)] transition-transform duration-200 group-hover:scale-105"
          />
          <span className="font-display font-extrabold text-xl tracking-tight text-white whitespace-nowrap shrink-0">
            Kidd<span className="text-[#EF4444]">wave</span>
          </span>
        </button>
      </div>

      {/* Minimal 3-Item Primary Menu */}
      <div className="px-3 pt-4 pb-3">
        <nav className="flex flex-col gap-1.5" aria-label="Main Navigation">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer whitespace-nowrap border ${
              isHomeSection && !selectedPlaylistId
                ? 'frame-3d-crimson text-white font-semibold'
                : 'text-[#D0CBCC] hover:text-white hover:bg-white/[0.05] border-transparent'
            }`}
          >
            <Home className={`w-4 h-4 shrink-0 ${isHomeSection && !selectedPlaylistId ? 'text-[#EF4444]' : ''}`} />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('search')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer whitespace-nowrap border ${
              currentView === 'search'
                ? 'frame-3d-crimson text-white font-semibold'
                : 'text-[#D0CBCC] hover:text-white hover:bg-white/[0.05] border-transparent'
            }`}
          >
            <Search className={`w-4 h-4 shrink-0 ${currentView === 'search' ? 'text-[#EF4444]' : ''}`} />
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('library')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer whitespace-nowrap border ${
              currentView === 'library'
                ? 'frame-3d-crimson text-white font-semibold'
                : 'text-[#D0CBCC] hover:text-white hover:bg-white/[0.05] border-transparent'
            }`}
          >
            <Library className={`w-4 h-4 shrink-0 ${currentView === 'library' ? 'text-[#EF4444]' : ''}`} />
            <span>Library</span>
          </button>
        </nav>
      </div>

      <div className="h-px bg-white/[0.07] mx-4" />

      {/* Compact Personal Vault & Custom Mixes */}
      <div className="flex-1 flex flex-col overflow-hidden px-3 pt-4 pb-2">
        <div className="flex items-center justify-between px-2.5 pb-2.5">
          <span className="text-xs font-semibold text-[#A39E9F]">
            Your Collection
          </span>
          <button
            type="button"
            onClick={onOpenCreatePlaylist}
            title="New Playlist"
            aria-label="Create Playlist"
            className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-[#EF2323] hover:text-white text-[#D0CBCC] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-[#272022]">
          <button
            type="button"
            onClick={() => onSelectPlaylist('liked')}
            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-colors text-left cursor-pointer border ${
              selectedPlaylistId === 'liked'
                ? 'bg-[#EF2323]/14 text-white border-[#EF2323]/40'
                : 'border-transparent hover:bg-white/[0.05] text-[#D0CBCC]'
            }`}
          >
            <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-[#171213]">
              <CoverImage
                src={DEFAULT_FAVORITES_COVER}
                alt="Saved Favorites"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                <Heart className="w-3.5 h-3.5 text-[#FF443A] fill-current" />
              </div>
            </div>
            <div className="truncate flex-1">
              <div className="text-[13px] font-semibold truncate text-[#F4F1F1]">Saved Favorites</div>
              <div className="text-[11px] text-[#A39E9F] tabular-nums truncate">
                {likedCount} {likedCount === 1 ? 'track' : 'tracks'}
              </div>
            </div>
          </button>

          {customPlaylists.map((playlist) => {
            const isSelected = selectedPlaylistId === playlist.id;
            return (
              <button
                type="button"
                key={playlist.id}
                onClick={() => onSelectPlaylist(playlist.id)}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-colors text-left cursor-pointer border group ${
                  isSelected
                    ? 'bg-[#EF2323]/14 text-white border-[#EF2323]/40'
                    : 'border-transparent hover:bg-white/[0.05] text-[#A39E9F] hover:text-white'
                }`}
              >
                <CoverImage
                  src={playlist.coverImage}
                  alt={playlist.name}
                  youtubeId={playlist.tracks[0]?.youtubeId}
                  className="w-9 h-9 rounded-lg object-cover shrink-0 bg-[#171213]"
                />
                <div className="truncate flex-1">
                  <div className="text-[13px] truncate font-medium text-[#E5E0E1] group-hover:text-white">
                    {playlist.name}
                  </div>
                  <div className="text-[11px] text-[#6F6A6B] truncate tabular-nums">
                    Custom · {playlist.tracks.length} tracks
                  </div>
                </div>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onNavigate('mixes')}
            className="w-full flex items-center justify-between px-3 py-2.5 mt-2 rounded-xl text-xs font-semibold text-[#FF443A] hover:bg-[#EF2323]/10 transition-colors cursor-pointer"
          >
            <span>Browse World Mixes</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quiet Legal Footer */}
        <div className="pt-3 mt-2 border-t border-white/[0.07] px-2 flex items-center flex-wrap gap-x-2 gap-y-1 text-[11px] text-[#6F6A6B]">
          <button type="button" onClick={() => onOpenLegal('privacy')} className="hover:text-white transition-colors cursor-pointer">
            Privacy
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => onOpenLegal('terms')} className="hover:text-white transition-colors cursor-pointer">
            Terms
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => onOpenLegal('dmca')} className="hover:text-white transition-colors cursor-pointer">
            DMCA
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => onOpenLegal('cookies')} className="hover:text-white transition-colors cursor-pointer">
            Cookies
          </button>
        </div>
      </div>
    </aside>
  );
});
