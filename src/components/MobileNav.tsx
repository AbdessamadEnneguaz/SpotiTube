import React from 'react';
import { Compass, Search, Library, PlusSquare } from 'lucide-react';

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
      className="md:hidden h-14 bg-[#161310]/95 backdrop-blur-xl border-t border-[#EAE0D0]/[0.09] px-2 grid grid-cols-4 items-center shrink-0 select-none z-40"
    >
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl transition-colors cursor-pointer ${
          currentView === 'home' ? 'text-[#DFCCB0] font-semibold' : 'text-[#9E9384] hover:text-[#E4DDD2]'
        }`}
      >
        <Compass className="w-5 h-5" />
        <span className="text-[10px] leading-tight whitespace-nowrap">Discover</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('search')}
        className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl transition-colors cursor-pointer ${
          currentView === 'search' ? 'text-[#DFCCB0] font-semibold' : 'text-[#9E9384] hover:text-[#E4DDD2]'
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
            ? 'text-[#DFCCB0] font-semibold'
            : 'text-[#9E9384] hover:text-[#E4DDD2]'
        }`}
      >
        <Library className="w-5 h-5" />
        <span className="text-[10px] leading-tight whitespace-nowrap">Library</span>
      </button>

      <button
        type="button"
        onClick={onOpenCreatePlaylist}
        className="flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl text-[#9E9384] hover:text-[#E4DDD2] transition-colors cursor-pointer"
      >
        <PlusSquare className="w-5 h-5" />
        <span className="text-[10px] leading-tight whitespace-nowrap">New Mix</span>
      </button>
    </nav>
  );
});
