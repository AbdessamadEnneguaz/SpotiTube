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
    <section className="space-y-3.5" aria-label="Search History">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#1db954]" />
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            Search History
          </h2>
          <span className="text-[11px] font-mono bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full">
            {searches.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer px-2.5 py-1 rounded-full hover:bg-neutral-800"
        >
          Clear history
        </button>
      </div>

      {/* Responsive Search History Pills */}
      <div className="flex flex-wrap gap-2">
        {searches.map((term) => (
          <div
            key={term}
            onClick={() => onSelectSearch(term)}
            className="card-interactive group flex items-center gap-2 bg-[#222222] hover:bg-[#2d2d2d] text-white pl-3 pr-2 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold cursor-pointer border border-neutral-800 hover:border-neutral-600 shadow-sm"
          >
            <Search className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#1db954] transition-colors shrink-0" />
            <span className="truncate max-w-[180px] sm:max-w-[260px]">{term}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveSearch(term);
              }}
              aria-label={`Remove "${term}" from recent searches`}
              className="w-5 h-5 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
