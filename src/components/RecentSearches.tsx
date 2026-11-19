import React from 'react';
import { History, X, Search } from 'lucide-react';

interface RecentSearchesProps {
  searches: string[];
  onSelectSearch: (query: string) => void;
  onRemoveSearch: (query: string) => void;
  onClearAll: () => void;
}

export const RecentSearches: React.FC<RecentSearchesProps> = ({
  searches,
  onSelectSearch,
  onRemoveSearch,
  onClearAll
}) => {
  if (searches.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3" aria-label="Search History">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#FF443A]" />
          <h2 className="font-display text-base sm:text-lg font-bold text-white tracking-tight">
            Recent Searches
          </h2>
          <span className="text-xs font-mono tabular-nums text-[#6F6A6B]">
            · {searches.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-semibold text-[#A39E9F] hover:text-white transition-colors cursor-pointer px-2.5 py-1 rounded-lg hover:bg-white/[0.06]"
        >
          Clear all
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {searches.map((term) => (
          <div
            key={term}
            className="flex items-center gap-1.5 bg-[#110E0F] hover:bg-[#171213] text-white pl-3 pr-1.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium border border-white/12 transition-colors"
          >
            <button
              type="button"
              onClick={() => onSelectSearch(term)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-[#A39E9F] shrink-0" />
              <span className="truncate max-w-[180px] sm:max-w-[260px]">{term}</span>
            </button>
            <button
              type="button"
              onClick={() => onRemoveSearch(term)}
              aria-label={`Remove "${term}" from recent searches`}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[#A39E9F] hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
