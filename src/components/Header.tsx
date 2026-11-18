import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Search, X, Moon, Disc3, Shield, History, ArrowUpRight } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentView: string;
  searchQuery: string;
  recentSearches: string[];
  isOfflineMode?: boolean;
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
  isOfflineMode = false,
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: PointerEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setIsHistoryOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const input = searchInputRef.current;
    if (!input || e.target === input) return;
    input.focus({ preventScroll: true });
    try {
      (window as unknown as {
        SpotiTubeAndroid?: { showKeyboard?: () => void };
      }).SpotiTubeAndroid?.showKeyboard?.();
    } catch {
      // ignore outside native wrapper
    }
  };

  const regions = [
    { id: 'all', label: 'All Countries' },
    { id: 'americas', label: 'Americas' },
    { id: 'europe', label: 'Europe' },
    { id: 'africa', label: 'Africa' },
    { id: 'asia', label: 'Asia' },
    { id: 'global', label: 'World Charts' }
  ];

  const filteredHistory = searchQuery.trim()
    ? recentSearches.filter(term => term.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : recentSearches;

  const showMobileBack = currentView === 'playlist' || currentView === 'search';

  return (
    <header className="sticky top-0 z-30 bg-[#12100E]/92 backdrop-blur-xl px-3 sm:px-5 md:px-7 py-2 sm:py-3 flex flex-col gap-2 border-b border-[#EAE0D0]/[0.08]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        {/* Mobile Top Row */}
        <div className="flex items-center justify-between sm:hidden">
          {showMobileBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex items-center gap-1 px-2.5 h-8 rounded-lg bg-[#1B1815] border border-[#EAE0D0]/12 text-[#E4DDD2] hover:text-[#F5F0E8] text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-[#F5F0E8]">
              <div className="w-7 h-7 rounded-lg bg-[#D8C3A5] flex items-center justify-center text-[#12100E]">
                <Disc3 className="w-4 h-4" />
              </div>
              <span className="font-display font-bold text-base tracking-tight text-[#F5F0E8] whitespace-nowrap">
                SpotiTube
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={onOpenSleepTimer}
              title="Sleep Timer"
              aria-label="Sleep timer settings"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1B1815] border border-[#EAE0D0]/12 text-[#E4DDD2] hover:border-[#D8C3A5]/50 cursor-pointer"
            >
              <Moon className="w-3.5 h-3.5 text-[#DFCCB0]" />
            </button>

            <button
              type="button"
              onClick={() => onOpenLegal('privacy')}
              title="Privacy Policy, Terms & DMCA"
              aria-label="Privacy and Legal documentation"
              className="flex items-center gap-1 px-2.5 h-8 rounded-lg text-[11px] font-semibold bg-[#1B1815] border border-[#EAE0D0]/12 text-[#E4DDD2] hover:border-[#D8C3A5]/50 cursor-pointer whitespace-nowrap"
            >
              <Shield className="w-3.5 h-3.5 text-[#D8C3A5]" />
              <span>Legal</span>
            </button>
          </div>
        </div>

        {/* Navigation Back & Global Search Command Field */}
        <div className="flex items-center gap-2.5 flex-1 sm:max-w-2xl">
          {showMobileBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="hidden sm:flex w-9 h-9 rounded-xl bg-[#1B1815] border border-[#EAE0D0]/12 hover:border-[#EAE0D0]/25 text-[#C8BEB0] hover:text-[#F5F0E8] items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div ref={searchWrapperRef} className="relative flex-1">
            <div className="relative" onClick={handleWrapperClick}>
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9E9384]">
                <Search className="w-4 h-4" />
              </div>
              <input
                ref={searchInputRef}
                id="spotitube-search-input"
                type="text"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
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
                placeholder={
                  isOfflineMode
                    ? 'Search cached tracks only (Offline)...'
                    : 'Search global tracks, artists, countries, genres...'
                }
                aria-label="Search music"
                className="w-full bg-[#1B1815] hover:bg-[#231F1B] focus:bg-[#231F1B] text-[#F5F0E8] text-sm pl-10 pr-9 py-2 rounded-xl border border-[#EAE0D0]/12 focus:border-[#D8C3A5] focus:outline-none transition-colors placeholder:text-[#8F8476] select-text"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSearchChange('');
                    setIsHistoryOpen(true);
                    searchInputRef.current?.focus({ preventScroll: true });
                  }}
                  aria-label="Clear search query"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9E9384] hover:text-[#F5F0E8] cursor-pointer"
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
                className="animate-dropdown-reveal absolute left-0 right-0 top-full mt-2 bg-[#1B1815] border border-[#EAE0D0]/14 rounded-xl shadow-2xl overflow-hidden z-50"
              >
                <div className="flex items-center justify-between px-3.5 py-2 border-b border-[#EAE0D0]/[0.07] bg-black/25">
                  <span className="text-[11px] font-semibold text-[#9E9384] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#D8C3A5]" />
                    <span>Recent Searches</span>
                  </span>
                  {onClearRecentSearches && (
                    <button
                      type="button"
                      onClick={() => onClearRecentSearches()}
                      className="text-[11px] font-semibold text-[#9E9384] hover:text-[#F5F0E8] cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-[#EAE0D0]/[0.06]">
                  {filteredHistory.slice(0, 7).map((term) => (
                    <div
                      key={term}
                      className="flex items-center justify-between px-3.5 py-2 hover:bg-[#EAE0D0]/[0.06] transition-colors group"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectRecentSearch?.(term);
                          setIsHistoryOpen(false);
                        }}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left text-xs sm:text-sm text-[#E4DDD2] hover:text-[#F5F0E8] cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5 text-[#8F8476] group-hover:text-[#D8C3A5] shrink-0" />
                        <span className="truncate font-medium">{term}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#7A7064] group-hover:text-[#C8BEB0] shrink-0 ml-auto mr-1" />
                      </button>

                      {onRemoveRecentSearch && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveRecentSearch(term);
                          }}
                          aria-label={`Remove "${term}" from search history`}
                          className="p-1 rounded-lg text-[#8F8476] hover:text-[#F5F0E8] hover:bg-[#EAE0D0]/10 transition-colors cursor-pointer shrink-0"
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#1B1815] border border-[#EAE0D0]/12 text-[#C8BEB0] hover:border-[#EAE0D0]/25 hover:text-[#F5F0E8] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Moon className="w-3.5 h-3.5 text-[#DFCCB0]" />
            <span className="hidden lg:inline">Sleep Timer</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenLegal('privacy')}
            title="Privacy Policy, Terms of Service & Copyright"
            aria-label="Privacy and Legal documentation"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#1B1815] border border-[#EAE0D0]/12 hover:border-[#EAE0D0]/25 text-[#C8BEB0] hover:text-[#F5F0E8] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Shield className="w-3.5 h-3.5 text-[#D8C3A5]" />
            <span className="hidden lg:inline">Privacy &amp; Legal</span>
            <span className="lg:hidden">Legal</span>
          </button>
        </div>
      </div>

      {/* Interactive World Region Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {regions.map((region) => {
          const isActive = selectedGenre === region.id;
          return (
            <button
              type="button"
              key={region.id}
              onClick={() => onGenreSelect(region.id)}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer border ${
                isActive
                  ? 'bg-[#D8C3A5] text-[#12100E] border-[#D8C3A5] font-bold'
                  : 'bg-[#1B1815] text-[#C8BEB0] border-[#EAE0D0]/[0.08] hover:bg-[#24201B] hover:text-[#F5F0E8]'
              }`}
            >
              {region.label}
            </button>
          );
        })}
      </div>
    </header>
  );
});
