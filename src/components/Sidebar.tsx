import React from 'react';
import { Compass, Search, Library, Plus, Heart, Disc3, Globe2 } from 'lucide-react';
import { Playlist } from '../types/music';
import { CoverImage } from './CoverImage';
import { DEFAULT_FAVORITES_COVER } from '../data/curatedTracks';

interface SidebarProps {
  currentView: 'home' | 'search' | 'library' | 'playlist';
  selectedPlaylistId: string | null;
  playlists: Playlist[];
  likedCount: number;
  onNavigate: (view: 'home' | 'search' | 'library') => void;
  onSelectPlaylist: (playlistId: string) => void;
  onOpenLegal: (tab?: 'privacy' | 'terms' | 'dmca' | 'cookies') => void;
  onOpenCreatePlaylist: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  currentView,
  selectedPlaylistId,
  playlists,
  likedCount,
  onNavigate,
  onSelectPlaylist,
  onOpenLegal,
  onOpenCreatePlaylist
}) => {
  return (
    <aside className="hidden md:flex w-64 bg-[#161310] border-r border-[#EAE0D0]/[0.08] flex-col h-full shrink-0 text-[#9E9384] text-sm">
      {/* Brand Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[#EAE0D0]/[0.07]">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-[#D8C3A5] text-[#12100E] flex items-center justify-center shadow-[0_6px_18px_rgba(216,195,165,0.18)] shrink-0">
            <Disc3 className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-[#F5F0E8] whitespace-nowrap shrink-0">
            SpotiTube
          </span>
        </button>
      </div>

      {/* Primary Studio Navigation */}
      <div className="px-3 pt-4 pb-3">
        <nav className="flex flex-col gap-1" aria-label="Main Navigation">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left cursor-pointer whitespace-nowrap ${
              currentView === 'home' && !selectedPlaylistId
                ? 'bg-[#D8C3A5]/14 text-[#EDE0CC] border border-[#D8C3A5]/25 font-semibold'
                : 'text-[#C8BEB0] hover:text-[#F5F0E8] hover:bg-[#EAE0D0]/[0.05] border border-transparent'
            }`}
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span>Discover World</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('search')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left cursor-pointer whitespace-nowrap ${
              currentView === 'search'
                ? 'bg-[#D8C3A5]/14 text-[#EDE0CC] border border-[#D8C3A5]/25 font-semibold'
                : 'text-[#C8BEB0] hover:text-[#F5F0E8] hover:bg-[#EAE0D0]/[0.05] border border-transparent'
            }`}
          >
            <Search className="w-4 h-4 shrink-0" />
            <span>Global Search</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('library')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left cursor-pointer whitespace-nowrap ${
              currentView === 'library'
                ? 'bg-[#D8C3A5]/14 text-[#EDE0CC] border border-[#D8C3A5]/25 font-semibold'
                : 'text-[#C8BEB0] hover:text-[#F5F0E8] hover:bg-[#EAE0D0]/[0.05] border border-transparent'
            }`}
          >
            <Library className="w-4 h-4 shrink-0" />
            <span>My Library</span>
          </button>
        </nav>
      </div>

      <div className="h-px bg-[#EAE0D0]/[0.07] mx-4" />

      {/* Collections & Playlists */}
      <div className="flex-1 flex flex-col overflow-hidden px-3 pt-4 pb-2">
        <div className="flex items-center justify-between px-2.5 pb-2.5">
          <span className="text-xs font-semibold text-[#9E9384] flex items-center gap-1.5">
            <Globe2 className="w-3.5 h-3.5 text-[#D8C3A5]/85" />
            <span>World Collections</span>
          </span>
          <button
            type="button"
            onClick={onOpenCreatePlaylist}
            title="New Playlist"
            aria-label="Create Playlist"
            className="w-7 h-7 rounded-lg bg-[#EAE0D0]/[0.06] hover:bg-[#D8C3A5] hover:text-[#12100E] text-[#C8BEB0] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-[#2E2923]">
          {/* Saved Favorites */}
          <button
            type="button"
            onClick={() => onSelectPlaylist('liked')}
            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-colors text-left cursor-pointer border ${
              selectedPlaylistId === 'liked'
                ? 'bg-[#D8C3A5]/14 text-[#F5F0E8] border-[#D8C3A5]/28'
                : 'border-transparent hover:bg-[#EAE0D0]/[0.05] text-[#C8BEB0]'
            }`}
          >
            <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-[#24201B]">
              <CoverImage
                src={DEFAULT_FAVORITES_COVER}
                alt="Saved Favorites"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                <Heart className="w-3.5 h-3.5 text-[#DFCCB0] fill-current" />
              </div>
            </div>
            <div className="truncate flex-1">
              <div className="text-[13px] font-semibold truncate text-[#F5F0E8]">Saved Favorites</div>
              <div className="text-[11px] text-[#9E9384] tabular-nums truncate">
                {likedCount} {likedCount === 1 ? 'track' : 'tracks'}
              </div>
            </div>
          </button>

          {playlists.map((playlist) => {
            const isSelected = selectedPlaylistId === playlist.id;
            return (
              <button
                type="button"
                key={playlist.id}
                onClick={() => onSelectPlaylist(playlist.id)}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-colors text-left cursor-pointer border group ${
                  isSelected
                    ? 'bg-[#D8C3A5]/14 text-[#F5F0E8] border-[#D8C3A5]/28'
                    : 'border-transparent hover:bg-[#EAE0D0]/[0.05] text-[#9E9384] hover:text-[#F5F0E8]'
                }`}
              >
                <CoverImage
                  src={playlist.coverImage}
                  alt={playlist.name}
                  youtubeId={playlist.tracks[0]?.youtubeId}
                  className="w-9 h-9 rounded-lg object-cover shrink-0 bg-[#24201B]"
                />
                <div className="truncate flex-1">
                  <div className="text-[13px] truncate font-medium text-[#E4DDD2] group-hover:text-[#F5F0E8]">
                    {playlist.name}
                  </div>
                  <div className="text-[11px] text-[#8F8476] truncate tabular-nums">
                    {playlist.isCustom ? 'Custom · ' : playlist.regionLabel ? `${playlist.regionLabel} · ` : ''}
                    {playlist.tracks.length} tracks
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quiet Legal Footer */}
        <div className="pt-3 mt-2 border-t border-[#EAE0D0]/[0.07] px-2 flex items-center flex-wrap gap-x-2 gap-y-1 text-[11px] text-[#8F8476]">
          <button type="button" onClick={() => onOpenLegal('privacy')} className="hover:text-[#F5F0E8] transition-colors cursor-pointer">
            Privacy
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => onOpenLegal('terms')} className="hover:text-[#F5F0E8] transition-colors cursor-pointer">
            Terms
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => onOpenLegal('dmca')} className="hover:text-[#F5F0E8] transition-colors cursor-pointer">
            DMCA
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => onOpenLegal('cookies')} className="hover:text-[#F5F0E8] transition-colors cursor-pointer">
            Cookies
          </button>
        </div>
      </div>
    </aside>
  );
});
