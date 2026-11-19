import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Search, X, Moon, Shield, History, ArrowUpRight } from 'lucide-react';
import { AppView } from '../types/music';
import { PWAInstallButton } from './PWAInstallButton';
import { KiddwaveLogo } from './KiddwaveLogo';

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

  const filteredHistory = searchQuery.trim()
    ? recentSearches.filter(term => term.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : recentSearches;

  const showBack = currentView !== 'home';

  return (
    <header className="sticky top-0 z-30 bg-[#070607]/92 backdrop-blur-xl px-3 sm:px-5 md:px-7 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2.5 sm:py-3 flex flex-col gap-2 border-b border-white/[0.08]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        {/* Mobile Top Row */}
        <div className="flex items-center justify-between sm:hidden">
          {showBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="frame-3d flex items-center gap-1 px-2.5 h-9 rounded-lg text-[#D0CBCC] hover:text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              <ChevronLeft className="w-4 h-4 text-[#EF4444]" />
              <span>Back</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5 text-white">
              <KiddwaveLogo size={30} className="shrink-0 drop-shadow-[0_4px_10px_rgba(239,68,68,0.35)]" />
              <span className="font-display font-extrabold text-base tracking-tight text-white whitespace-nowrap">
                Kidd<span className="text-[#EF4444]">wave</span>
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
              className="frame-3d w-9 h-9 rounded-lg flex items-center justify-center text-[#D0CBCC] hover:border-[#EF4444]/50 cursor-pointer"
            >
              <Moon className="w-3.5 h-3.5 text-[#EF4444]" />
            </button>

            <button
              type="button"
              onClick={() => onOpenLegal('privacy')}
              title="Privacy Policy, Terms & DMCA"
              aria-label="Privacy and Legal documentation"
              className="frame-3d flex items-center gap-1 px-2.5 h-9 rounded-lg text-[11px] font-semibold text-[#D0CBCC] hover:border-[#EF4444]/50 cursor-pointer whitespace-nowrap"
            >
              <Shield className="w-3.5 h-3.5 text-[#EF4444]" />
              <span>Legal</span>
            </button>
          </div>
        </div>

        {/* Navigation Back & Global Search Command Field */}
        <div className="flex items-center gap-2.5 flex-1 sm:max-w-2xl">
          {showBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="frame-3d hidden sm:inline-flex items-center gap-1 px-3 h-9 rounded-xl hover:border-[#EF4444]/50 text-[#D0CBCC] hover:text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <ChevronLeft className="w-4 h-4 text-[#EF4444]" />
              <span>Back</span>
            </button>
          )}

          <div ref={searchWrapperRef} className="relative flex-1">
            <div className="relative" onClick={handleWrapperClick}>
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A39E9F]">
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
                    : 'Search songs, artists, countries, genres...'
                }
                aria-label="Search music"
                className="w-full bg-[#120E10] hover:bg-[#181214] focus:bg-[#181214] text-[#F4F1F1] text-sm pl-10 pr-9 py-2 rounded-xl border border-white/12 shadow-[inset_0_2px_6px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.05)] focus:border-[#EF4444] focus:outline-none transition-colors placeholder:text-[#6F6A6B] select-text"
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
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A39E9F] hover:text-white cursor-pointer"
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
                className="animate-dropdown-reveal absolute left-0 right-0 top-full mt-2 bg-[#110E0F] border border-white/14 rounded-xl shadow-2xl overflow-hidden z-50"
              >
                <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/[0.08] bg-black/35">
                  <span className="text-[11px] font-semibold text-[#A39E9F] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#FF443A]" />
                    <span>Recent Searches</span>
                  </span>
                  {onClearRecentSearches && (
                    <button
                      type="button"
                      onClick={() => onClearRecentSearches()}
                      className="text-[11px] font-semibold text-[#A39E9F] hover:text-white cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-white/[0.06]">
                  {filteredHistory.slice(0, 7).map((term) => (
                    <div
                      key={term}
                      className="flex items-center justify-between px-3.5 py-2 hover:bg-white/[0.05] transition-colors group"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectRecentSearch?.(term);
                          setIsHistoryOpen(false);
                        }}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left text-xs sm:text-sm text-[#D0CBCC] hover:text-white cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5 text-[#6F6A6B] group-hover:text-[#FF443A] shrink-0" />
                        <span className="truncate font-medium">{term}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#6F6A6B] group-hover:text-[#D0CBCC] shrink-0 ml-auto mr-1" />
                      </button>

                      {onRemoveRecentSearch && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveRecentSearch(term);
                          }}
                          aria-label={`Remove "${term}" from search history`}
                          className="p-1 rounded-lg text-[#6F6A6B] hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#110E0F] border border-white/12 text-[#D0CBCC] hover:border-[#EF2323]/45 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <Moon className="w-3.5 h-3.5 text-[#FF443A]" />
            <span className="hidden lg:inline">Sleep Timer</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenLegal('privacy')}
            title="Privacy Policy, Terms of Service & Copyright"
            aria-label="Privacy and Legal documentation"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#110E0F] border border-white/12 hover:border-[#EF2323]/45 text-[#D0CBCC] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <Shield className="w-3.5 h-3.5 text-[#FF443A]" />
            <span className="hidden lg:inline">Privacy &amp; Legal</span>
            <span className="lg:hidden">Legal</span>
          </button>
        </div>
      </div>
    </header>
  );
});
