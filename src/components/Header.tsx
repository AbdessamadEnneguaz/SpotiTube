import React from 'react';
import { ChevronLeft, ChevronRight, Search, X, Sliders, Moon, Music2, Shield } from 'lucide-react';

interface HeaderProps {
  currentView: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSubmitSearch?: (q: string) => void;
  selectedGenre: string;
  onGenreSelect: (genre: string) => void;
  onOpenLegal: (tab?: 'privacy' | 'terms' | 'dmca' | 'cookies') => void;
  onOpenEqualizer: () => void;
  onOpenSleepTimer: () => void;
  onBack: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  currentView,
  searchQuery,
  onSearchChange,
  onSubmitSearch,
  selectedGenre,
  onGenreSelect,
  onOpenLegal,
  onOpenEqualizer,
  onOpenSleepTimer,
  onBack
}) => {
  const genres = [
    { id: 'all', label: 'All Music' },
    { id: 'chaabi', label: 'Moroccan Chaabi' },
    { id: 'rai', label: 'Rai Classics' },
    { id: 'rap', label: 'Maghreb Rap & Drill' },
    { id: 'global', label: 'Global Hits' }
  ];

  const showMobileBack = currentView === 'playlist' || currentView === 'search';

  return (
    <header className="sticky top-0 z-30 bg-[#121212]/95 backdrop-blur-md px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 flex flex-col gap-2 sm:gap-2.5 md:gap-3 border-b border-neutral-800/40">
      {/* Row 1 on mobile: Brand / Back + compact action icons; Desktop: single row with search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        {/* Top bar (Mobile Brand/Back + Desktop Arrows + Actions) */}
        <div className="flex items-center justify-between sm:hidden">
          {showMobileBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white text-xs font-semibold cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-white">
              <div className="w-7 h-7 rounded-full bg-[#1db954] flex items-center justify-center text-black shadow-[0_0_12px_rgba(29,185,84,0.35)]">
                <Music2 className="w-4 h-4 fill-current" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">SpotiTube</span>
            </div>
          )}

          {/* Mobile compact utility buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenEqualizer}
              title="Audio Quality & 5-Band Equalizer"
              aria-label="Audio Equalizer"
              className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-800/80 border border-neutral-700 text-neutral-200 hover:bg-neutral-700 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#1db954]" />
            </button>

            <button
              type="button"
              onClick={onOpenSleepTimer}
              title="Sleep Timer"
              aria-label="Sleep timer settings"
              className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-800/80 border border-neutral-700 text-neutral-200 hover:bg-neutral-700 cursor-pointer"
            >
              <Moon className="w-3.5 h-3.5 text-purple-400" />
            </button>

            <button
              type="button"
              onClick={() => onOpenLegal('privacy')}
              title="Privacy Policy, Terms of Service & Copyright"
              aria-label="Privacy and Legal documentation"
              className="flex items-center gap-1 px-2.5 h-8 rounded-full text-[11px] font-semibold bg-neutral-800/80 border border-neutral-700 text-neutral-200 hover:bg-neutral-700 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-[#1db954]" />
              <span>Legal</span>
            </button>
          </div>
        </div>

        {/* Navigation Arrows & Search Input (Full width on mobile, left group on sm+) */}
        <div className="flex items-center gap-2 md:gap-4 flex-1 sm:max-w-2xl">
          <div className="hidden sm:flex items-center gap-2 text-neutral-400 shrink-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="w-8 h-8 rounded-full bg-black/60 hover:bg-neutral-800 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Forward"
              disabled
              className="w-8 h-8 rounded-full bg-black/30 text-neutral-600 flex items-center justify-center cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  onSubmitSearch?.(searchQuery.trim());
                }
              }}
              placeholder="Search tracks, Chaabi, Rai, Rap, Pop..."
              aria-label="Search music"
              className="w-full bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] text-white text-sm pl-9 pr-9 py-2 rounded-full border border-transparent focus:border-neutral-500 focus:outline-none transition-all placeholder:text-neutral-500 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search query"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Desktop Right Action buttons */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenEqualizer}
            title="Audio Quality & 5-Band Equalizer"
            aria-label="Audio Equalizer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-800/80 border border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-all cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-[#1db954]" />
            <span>Equalizer</span>
          </button>

          <button
            type="button"
            onClick={onOpenSleepTimer}
            title="Sleep Timer"
            aria-label="Sleep timer settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-800/80 border border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-all cursor-pointer"
          >
            <Moon className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">Timer</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenLegal('privacy')}
            title="Privacy Policy, Terms of Service & Copyright"
            aria-label="Privacy and Legal documentation"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-800/80 border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white transition-all cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-[#1db954]" />
            <span>Privacy & Legal</span>
          </button>
        </div>
      </div>

      {/* Filter Category Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {genres.map((g) => {
          const isActive = selectedGenre === g.id;
          return (
            <button
              type="button"
              key={g.id}
              onClick={() => onGenreSelect(g.id)}
              className={`px-3 sm:px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-black font-bold shadow'
                  : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              {g.label}
            </button>
          );
        })}
      </div>
    </header>
  );
});
