import React from 'react';
import { Home, Search, Library, PlusSquare } from 'lucide-react';

interface MobileNavProps {
  currentView: 'home' | 'search' | 'library' | 'playlist';
  onNavigate: (view: 'home' | 'search' | 'library') => void;
  onOpenCreatePlaylist: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = React.memo(({
  currentView,
  onNavigate,
  onOpenCreatePlaylist
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden h-14 bg-black/95 backdrop-blur-lg border-t border-neutral-800/80 px-2 flex items-center justify-around shrink-0 select-none z-40"
    >
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
          currentView === 'home' ? 'text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <Home className={`w-5 h-5 ${currentView === 'home' ? 'text-[#1db954]' : ''}`} />
        <span className="text-[10px] leading-tight">Home</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('search')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
          currentView === 'search' ? 'text-white font-semibold' : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <Search className={`w-5 h-5 ${currentView === 'search' ? 'text-[#1db954]' : ''}`} />
        <span className="text-[10px] leading-tight">Search</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('library')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
          currentView === 'library' || currentView === 'playlist'
            ? 'text-white font-semibold'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <Library
          className={`w-5 h-5 ${
            currentView === 'library' || currentView === 'playlist' ? 'text-[#1db954]' : ''
          }`}
        />
        <span className="text-[10px] leading-tight">Library</span>
      </button>

      <button
        type="button"
        onClick={onOpenCreatePlaylist}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
      >
        <PlusSquare className="w-5 h-5" />
        <span className="text-[10px] leading-tight">Create</span>
      </button>
    </nav>
  );
});
