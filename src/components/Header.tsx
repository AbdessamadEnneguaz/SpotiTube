import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, X, Moon, Music2, Shield, History, ArrowUpRight } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentView: string;
  searchQuery: string;
  recentSearches: string[];
  onSearchChange: (q: string) => void;
  onSubmitSearch?: (q: string) => void;
  onSelectRecentSearch?: (q: string) => void;
  onRemoveRecentSearch?: (q: string) => void;
  onClearRecentSearches?: () => void;
  selectedGenre: string;
  onGenreSelect: (genre: string) => void;
  onOpenLegal: (tab?: 'privacy' | 'terms' | 'dmca' | 'cookies') => void;
  onOpenSleepTimer: () => void;
  onBack: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  currentView,
  searchQuery,
  recentSearches,
  onSearchChange,
  onSubmitSearch,
  onSelectRecentSearch,
  onRemoveRecentSearch,
  onClearRecentSearches,
  selectedGenre,
  onGenreSelect,
  onOpenLegal,
  onOpenSleepTimer,
  onBack
}) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setIsHistoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const genres = [
    { id: 'all', label: 'All Music' },
    { id: 'chaabi', label: 'Moroccan Chaabi' },
    { id: 'rai', label: 'Rai Classics' },
    { id: 'rap', label: 'Maghreb Rap & Drill' },
    { id: 'global', label: 'Global Hits' }
  ];

  const filteredHistory = searchQuery.trim()
    ? recentSearches.filter(term => term.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : recentSearches;

  const showMobileBack = currentView === 'playlist' || currentView === 'search';

  return (
    <header className="sticky top-0 z-30 bg-[#121212]/95 backdrop-blur-md px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 flex flex-col gap-2 sm:gap-2.5 md:gap-3 border-b border-neutral-800/40">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        {/* Mobile Top Row */}
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

          <div className="flex items-center gap-1.5 shrink-0">
            <PWAInstallButton />
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
              title="Privacy Policy, Terms & DMCA"
              aria-label="Privacy and Legal documentation"
              className="flex items-center gap-1 px-2.5 h-8 rounded-full text-[11px] font-semibold bg-neutral-800/80 border border-neutral-700 text-neutral-200 hover:bg-neutral-700 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-[#1db954]" />
              <span>Legal</span>
            </button>
          </div>
        </div>

        {/* Navigation Arrows & Search Input with Search History Dropdown */}
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

          {/* Search Bar + History Dropdown */}
          <div ref={searchWrapperRef} className="relative flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsHistoryOpen(true)}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setIsHistoryOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    onSubmitSearch?.(searchQuery.trim());
                    setIsHistoryOpen(false);
                  } else if (e.key === 'Escape') {
                    setIsHistoryOpen(false);
                  }
                }}
                placeholder="Search songs, artists, Chaabi, Rai, Rap..."
                aria-label="Search music"
                className="w-full bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] text-white text-sm pl-9 pr-9 py-2 rounded-full border border-transparent focus:border-neutral-500 focus:outline-none transition-all placeholder:text-neutral-500 shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    setIsHistoryOpen(true);
                  }}
                  aria-label="Clear search query"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search History Dropdown */}
            {isHistoryOpen && filteredHistory.length > 0 && (
              <div
                role="listbox"
                aria-label="Search history suggestions"
                className="animate-dropdown-reveal absolute left-0 right-0 top-full mt-2 bg-[#1c1c1c] border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden z-50"
              >
                <div className="flex items-center justify-between px-3.5 py-2 border-b border-neutral-800/80 bg-black/20">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#1db954]" />
                    <span>Search History</span>
                  </span>
                  {onClearRecentSearches && (
                    <button
                      type="button"
                      onClick={() => onClearRecentSearches()}
                      className="text-[11px] font-semibold text-neutral-400 hover:text-white cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-neutral-800/40">
                  {filteredHistory.slice(0, 7).map((term) => (
                    <div
                      key={term}
                      className="flex items-center justify-between px-3.5 py-2 hover:bg-neutral-800/70 transition-colors group"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectRecentSearch?.(term);
                          setIsHistoryOpen(false);
                        }}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left text-xs sm:text-sm text-neutral-200 hover:text-white cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5 text-neutral-500 group-hover:text-[#1db954] shrink-0" />
                        <span className="truncate font-medium">{term}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-neutral-300 shrink-0 ml-auto mr-1" />
                      </button>

                      {onRemoveRecentSearch && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveRecentSearch(term);
                          }}
                          aria-label={`Remove "${term}" from search history`}
                          className="p-1 rounded-full text-neutral-500 hover:text-white hover:bg-neutral-700 transition-colors cursor-pointer shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Right Action buttons */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <PWAInstallButton />
          <button
            type="button"
            onClick={onOpenSleepTimer}
            title="Sleep Timer"
            aria-label="Sleep timer settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-800/80 border border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-all cursor-pointer"
          >
            <Moon className="w-3.5 h-3.5 text-purple-400" />
            <span>Sleep Timer</span>
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
