import React from 'react';
import { History, X, Search, Sparkles, Compass } from 'lucide-react';

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
    <section className="space-y-4" aria-label="Recent Searches">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#1db954]" />
          <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            Recent searches
          </h2>
        </div>
        <button
          onClick={onClearAll}
          className="text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer px-2 py-1 rounded hover:bg-neutral-800"
        >
          Clear all
        </button>
      </div>

      {/* Grid of Recent Search Chips / Cards */}
      <div className="flex flex-wrap gap-2.5">
        {searches.map((term) => (
          <div
            key={term}
            onClick={() => onSelectSearch(term)}
            className="group flex items-center gap-2.5 bg-[#242424] hover:bg-[#2e2e2e] text-white pl-3.5 pr-2 py-2 rounded-full text-sm font-semibold transition-all duration-150 cursor-pointer border border-transparent hover:border-neutral-700 shadow-sm"
          >
            <Search className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#1db954] transition-colors shrink-0" />
            <span className="truncate max-w-[200px] sm:max-w-[260px]">{term}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveSearch(term);
              }}
              aria-label={`Remove "${term}" from recent searches`}
              className="w-5 h-5 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors ml-1 cursor-pointer shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
