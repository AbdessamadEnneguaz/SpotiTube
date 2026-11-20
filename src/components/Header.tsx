import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  Home,
  Search,
  X,
  Moon,
  Shield,
  History,
  ArrowUpRight,
  Compass,
} from 'lucide-react';
import { AppView } from '../types/music';
import { PWAInstallButton } from './PWAInstallButton';
import { KiddwaveLogo, KiddwaveWordmark } from './KiddwaveLogo';

interface HeaderProps {
  currentView: AppView;
  canGoBack: boolean;
  searchQuery: string;
  recentSearches: string[];
  isOfflineMode?: boolean;
  onSearchChange: (q: string) => void;
  onSubmitSearch?: (q: string) => void;
  onSelectRecentSearch?: (q: string) => void;
  onRemoveRecentSearch?: (q: string) => void;
  onClearRecentSearches?: () => void;
  onOpenLegal: (tab?: 'privacy' | 'terms' | 'dmca' | 'cookies') => void;
  onOpenSleepTimer: () => void;
  onNavigateHome: () => void;
  onOpenBrowse: () => void;
  onBack: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  currentView,
  canGoBack,
  searchQuery,
  recentSearches,
  isOfflineMode = false,
  onSearchChange,
  onSubmitSearch,
  onSelectRecentSearch,
  onRemoveRecentSearch,
  onClearRecentSearches,
  onOpenLegal,
  onOpenSleepTimer,
  onNavigateHome,
  onOpenBrowse,
  onBack,
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

  const handleWrapperClick = (e: React.MouseEvent<HTMLFormElement>) => {
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

  const filteredHistory = searchQuery.trim()
    ? recentSearches.filter((term) => term.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : recentSearches;

  const showBack = currentView !== 'home';
  const isBrowseActive =
    currentView === 'mixes' || currentView === 'countries' || currentView === 'charts';

  return (
    <header className="sticky top-0 z-30 bg-[#050506]/95 backdrop-blur-xl px-3 sm:px-4 md:px-5 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 sm:py-2.5 flex flex-col gap-2 shrink-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        {/* Mobile Row 1: Brand or Back + Compact Actions */}
        <div className="flex items-center justify-between sm:hidden">
          {showBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex items-center gap-1 px-2.5 h-8 rounded-full bg-zinc-900 border border-white/10 text-zinc-200 hover:text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              <ChevronLeft className="w-4 h-4 text-[#EF4444]" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onNavigateHome}
              className="flex items-center gap-2 text-white cursor-pointer"
              aria-label="Kiddwave Home"
            >
              <KiddwaveLogo size={22} className="shrink-0 drop-shadow-[0_4px_10px_rgba(239,68,68,0.38)]" />
              <KiddwaveWordmark className="text-base" />
            </button>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={onOpenSleepTimer}
              title="Sleep Timer"
              aria-label="Sleep timer settings"
              className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white hover:border-[#EF4444]/50 cursor-pointer"
            >
              <Moon className="w-3.5 h-3.5 text-[#EF4444]" />
            </button>

            <button
              type="button"
              onClick={() => onOpenLegal('privacy')}
              title="Privacy Policy, Terms & DMCA"
              aria-label="Privacy and Legal documentation"
              className="flex items-center gap-1 px-2.5 h-8 rounded-full bg-zinc-900 border border-white/10 text-[11px] font-semibold text-zinc-300 hover:text-white hover:border-[#EF4444]/50 cursor-pointer whitespace-nowrap"
            >
              <Shield className="w-3.5 h-3.5 text-[#EF4444]" />
              <span>Legal</span>
            </button>
          </div>
        </div>

        {/* Desktop Left Brand Zone */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onNavigateHome}
            aria-label="Kiddwave Home"
            className="flex items-center gap-2.5 text-left group cursor-pointer pr-1"
          >
            <KiddwaveLogo
              size={25}
              className="shrink-0 drop-shadow-[0_4px_12px_rgba(239,68,68,0.42)] transition-transform duration-200 group-hover:scale-105"
            />
            <KiddwaveWordmark className="text-lg shrink-0" />
          </button>
        </div>

        {/* Center-Left: Circular Home + Wide Pill Search Bar with Explore Icon */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-xl md:max-w-2xl">
          {showBack && canGoBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              title="Back"
              className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateHome}
            title="Home"
            aria-label="Home"
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 border ${
              currentView === 'home'
                ? 'bg-zinc-800 text-white border-[#EF4444]/45 shadow-[0_0_16px_rgba(239,68,68,0.22)]'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border-white/[0.08]'
            }`}
          >
            <Home className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${currentView === 'home' ? 'text-[#EF4444]' : ''}`} />
          </button>

          <div ref={searchWrapperRef} className="relative flex-1 min-w-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = searchQuery.trim();
                if (trimmed) {
                  onSubmitSearch?.(trimmed);
                }
                setIsHistoryOpen(false);
              }}
              onClick={handleWrapperClick}
              className="flex items-center h-9 sm:h-10 rounded-full bg-zinc-900 hover:bg-zinc-800/95 focus-within:bg-zinc-800 border border-white/[0.08] focus-within:border-white/25 transition-colors px-3 sm:px-3.5 gap-2"
            >
              <Search className="w-4 h-4 text-zinc-400 shrink-0 pointer-events-none" />

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
                  if (e.key === 'Escape') {
                    setIsHistoryOpen(false);
                  }
                }}
                placeholder={
                  isOfflineMode
                    ? 'Search cached tracks only...'
                    : 'What do you want to play?'
                }
                aria-label="Search music"
                className="flex-1 min-w-0 bg-transparent text-zinc-100 text-xs sm:text-sm focus:outline-none placeholder:text-zinc-400 select-text"
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
                  className="p-1 rounded-full text-zinc-400 hover:text-white cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <span aria-hidden="true" className="h-4 w-px bg-white/15 shrink-0" />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsHistoryOpen(false);
                  onOpenBrowse();
                }}
                title="Explore World Mixes & Countries"
                aria-label="Browse World Mixes and Countries"
                className={`p-1 rounded-full transition-colors cursor-pointer shrink-0 ${
                  isBrowseActive
                    ? 'text-[#EF4444]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Compass className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </button>
            </form>

            {/* Search History Dropdown */}
            {isHistoryOpen && filteredHistory.length > 0 && (
              <div
                role="listbox"
                aria-label="Search history suggestions"
                className="animate-dropdown-reveal absolute -left-11 right-0 sm:-left-4 sm:-right-4 top-full mt-2.5 bg-[#141416] border border-white/[0.12] rounded-2xl shadow-[0_24px_56px_rgba(0,0,0,0.92)] overflow-hidden z-50"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] bg-white/[0.02]">
                  <span className="text-xs font-bold tracking-wide text-zinc-300 flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-[#EF4444]" />
                    <span>Recent Searches</span>
                  </span>
                  {onClearRecentSearches && (
                    <button
                      type="button"
                      onClick={() => onClearRecentSearches()}
                      className="text-xs font-semibold text-zinc-400 hover:text-white px-2 py-1 rounded-full hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-[min(68vh,520px)] overflow-y-auto overscroll-contain scrollbar-none py-1">
                  {filteredHistory.slice(0, 8).map((term) => (
                    <div
                      key={term}
                      className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.06] transition-colors group"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectRecentSearch?.(term);
                          setIsHistoryOpen(false);
                        }}
                        className="flex items-center gap-3.5 flex-1 min-w-0 text-left text-base font-medium text-zinc-100 group-hover:text-white cursor-pointer"
                      >
                        <span className="w-9 h-9 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center shrink-0 transition-colors">
                          <History className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                        </span>
                        <span className="truncate">{term}</span>
                        <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200 shrink-0 ml-auto transition-colors" />
                      </button>

                      {onRemoveRecentSearch && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveRecentSearch(term);
                          }}
                          aria-label={`Remove "${term}" from search history`}
                          className="w-8 h-8 ml-1.5 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Right Action Pills */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <PWAInstallButton />
          <button
            type="button"
            onClick={onOpenSleepTimer}
            title="Sleep Timer"
            aria-label="Sleep timer settings"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-zinc-900 border border-white/10 text-zinc-200 hover:border-[#EF4444]/45 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <Moon className="w-3.5 h-3.5 text-[#EF4444]" />
            <span className="hidden lg:inline">Sleep Timer</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenLegal('privacy')}
            title="Privacy Policy, Terms of Service & Copyright"
            aria-label="Privacy and Legal documentation"
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-zinc-900 border border-white/10 hover:border-[#EF4444]/45 text-zinc-200 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <Shield className="w-3.5 h-3.5 text-[#EF4444]" />
            <span className="hidden lg:inline">Privacy &amp; Legal</span>
            <span className="lg:hidden">Legal</span>
          </button>
        </div>
      </div>
    </header>
  );
});
