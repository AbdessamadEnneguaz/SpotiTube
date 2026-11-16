import React from 'react';
import { Home, Search, Library, PlusSquare, Heart, Music2, Shield, FileText } from 'lucide-react';
import { Playlist } from '../types/music';
import { CoverImage } from './CoverImage';

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
    <aside className="hidden md:flex w-64 bg-black flex-col h-full select-none shrink-0 p-2 gap-2 text-neutral-400 font-sans text-sm">
      {/* Top Box: Branding & Primary Nav */}
      <div className="bg-[#121212] rounded-lg p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-white">
            <div className="w-8 h-8 rounded-full bg-[#1db954] flex items-center justify-center text-black font-extrabold shadow-[0_0_15px_rgba(29,185,84,0.35)]">
              <Music2 className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white block leading-none">SpotiTube</span>
              <span className="text-[10px] text-neutral-400 font-mono tracking-wider">SOUND DISCOVERY</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 px-2.5 py-0.5 rounded-full text-[10px] text-[#1db954] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1db954] animate-pulse" />
            <span>LIVE</span>
          </div>
        </div>

        <nav className="flex flex-col gap-1 font-semibold">
          <button
            onClick={() => onNavigate('home')}
            className={`flex items-center gap-4 px-3 py-2.5 rounded-md transition-all duration-200 text-left cursor-pointer ${
              currentView === 'home' && !selectedPlaylistId
                ? 'text-white bg-neutral-800/60 font-bold'
                : 'hover:text-white hover:bg-neutral-900/50'
            }`}
          >
            <Home className="w-5 h-5 shrink-0" />
            <span>Home</span>
          </button>

          <button
            onClick={() => onNavigate('search')}
            className={`flex items-center gap-4 px-3 py-2.5 rounded-md transition-all duration-200 text-left cursor-pointer ${
              currentView === 'search'
                ? 'text-white bg-neutral-800/60 font-bold'
                : 'hover:text-white hover:bg-neutral-900/50'
            }`}
          >
            <Search className="w-5 h-5 shrink-0" />
            <span>Search</span>
          </button>
        </nav>
      </div>

      {/* Middle Box: Library, Create Playlist & Playlists */}
      <div className="bg-[#121212] rounded-lg p-3 flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 text-neutral-400">
          <button
            onClick={() => onNavigate('library')}
            className="flex items-center gap-3 font-bold text-sm hover:text-white transition-colors cursor-pointer"
          >
            <Library className="w-5 h-5" />
            <span>Your Library</span>
          </button>
          <button
            onClick={onOpenCreatePlaylist}
            title="Create Playlist"
            aria-label="Create Playlist"
            className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <PlusSquare className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Actions (New Playlist & Liked Songs) */}
        <div className="mt-1 space-y-1">
          <button
            onClick={onOpenCreatePlaylist}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-900/70 text-neutral-300 transition-all text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded bg-neutral-800 group-hover:bg-[#1db954] group-hover:text-black flex items-center justify-center text-white shrink-0 transition-colors">
              <PlusSquare className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-sm font-semibold truncate group-hover:text-white">New Playlist</div>
              <div className="text-[10px] text-neutral-400">Build your own mix</div>
            </div>
          </button>

          <button
            onClick={() => onSelectPlaylist('liked')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-left cursor-pointer ${
              selectedPlaylistId === 'liked'
                ? 'bg-neutral-800 text-white font-bold'
                : 'hover:bg-neutral-900/70 text-neutral-300'
            }`}
          >
            <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <div className="truncate">
              <div className="text-sm font-semibold truncate">Liked Songs</div>
              <div className="text-xs text-neutral-400">{likedCount} tracks</div>
            </div>
          </button>
        </div>

        {/* Separator */}
        <div className="h-px bg-neutral-800/80 my-2 mx-2" />

        {/* Playlists scroll area */}
        <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin scrollbar-thumb-neutral-700">
          <div className="px-3 py-1 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Curated & Custom
          </div>
          {playlists.map((playlist) => {
            const isSelected = selectedPlaylistId === playlist.id;
            return (
              <button
                key={playlist.id}
                onClick={() => onSelectPlaylist(playlist.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-left cursor-pointer group ${
                  isSelected
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'hover:bg-neutral-900/60 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <CoverImage
                  src={playlist.coverImage}
                  alt={playlist.name}
                  youtubeId={playlist.tracks[0]?.youtubeId}
                  className="w-8 h-8 rounded object-cover shrink-0 bg-neutral-800"
                />
                <div className="truncate flex-1">
                  <div className="text-sm truncate font-medium group-hover:text-white transition-colors flex items-center gap-1.5">
                    <span className="truncate">{playlist.name}</span>
                    {playlist.isCustom && (
                      <span className="text-[9px] bg-neutral-800 text-[#1db954] px-1 rounded shrink-0">Custom</span>
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-400 truncate">
                    {playlist.tracks.length} tracks
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Legal Compliance Utilities */}
        <div className="pt-2 mt-auto border-t border-neutral-800/80 space-y-1">
          <button
            onClick={() => onOpenLegal('privacy')}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:bg-neutral-900 hover:text-white transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#1db954]" />
              Privacy Policy
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-neutral-800 text-neutral-400">
              Local Only
            </span>
          </button>

          <button
            onClick={() => onOpenLegal('terms')}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:bg-neutral-900 hover:text-white transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-neutral-400" />
              Terms & DMCA
            </span>
          </button>

          <div className="pt-2 px-2 flex flex-wrap gap-x-2.5 gap-y-1 text-[11px] text-neutral-400 border-t border-neutral-800/60">
            <button onClick={() => onOpenLegal('privacy')} className="hover:text-neutral-300 hover:underline cursor-pointer">
              Privacy
            </button>
            <button onClick={() => onOpenLegal('terms')} className="hover:text-neutral-300 hover:underline cursor-pointer">
              Terms
            </button>
            <button onClick={() => onOpenLegal('dmca')} className="hover:text-neutral-300 hover:underline cursor-pointer">
              DMCA
            </button>
            <button onClick={() => onOpenLegal('cookies')} className="hover:text-neutral-300 hover:underline cursor-pointer">
              Cookies
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
});
