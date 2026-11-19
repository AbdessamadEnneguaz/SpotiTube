import React from 'react';
import { Home, Search, Library, PlusSquare } from 'lucide-react';
import { AppView } from '../types/music';

interface MobileNavProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenCreatePlaylist: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = React.memo(({
  currentView,
  onNavigate,
  onOpenCreatePlaylist
}) => {
  const isHomeTab =
    currentView === 'home' ||
    currentView === 'countries' ||
    currentView === 'mixes' ||
    currentView === 'charts' ||
    currentView === 'recent';

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden h-14 bg-[#0B0A0B]/95 backdrop-blur-xl border-t border-white/[0.09] px-2 grid grid-cols-4 items-center shrink-0 select-none z-40"
    >
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl transition-colors cursor-pointer ${
          isHomeTab ? 'text-[#FF443A] font-semibold' : 'text-[#A39E9F] hover:text-white'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] leading-tight whitespace-nowrap">Home</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('search')}
        className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl transition-colors cursor-pointer ${
          currentView === 'search' ? 'text-[#FF443A] font-semibold' : 'text-[#A39E9F] hover:text-white'
        }`}
      >
        <Search className="w-5 h-5" />
        <span className="text-[10px] leading-tight whitespace-nowrap">Search</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('library')}
        className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl transition-colors cursor-pointer ${
          currentView === 'library' || currentView === 'playlist'
            ? 'text-[#FF443A] font-semibold'
            : 'text-[#A39E9F] hover:text-white'
        }`}
      >
        <Library className="w-5 h-5" />
        <span className="text-[10px] leading-tight whitespace-nowrap">Library</span>
      </button>

      <button
        type="button"
        onClick={onOpenCreatePlaylist}
        className="flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl text-[#A39E9F] hover:text-white transition-colors cursor-pointer"
      >
        <PlusSquare className="w-5 h-5" />
        <span className="text-[10px] leading-tight whitespace-nowrap">New Mix</span>
      </button>
    </nav>
  );
});
