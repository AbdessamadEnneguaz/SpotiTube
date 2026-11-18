import React from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import { Track, Playlist } from '../types/music';
import { TrackRow } from '../components/TrackRow';
import { RecentSearches } from '../components/RecentSearches';
import { WORLD_COUNTRY_PRESETS } from '../data/curatedTracks';

interface SearchPageProps {
  searchQuery: string;
  searchStatusMsg: string | null;
  isSearching: boolean;
  searchResults: Track[];
  recentSearches: string[];
  cachedTracksList: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  likedTrackIds: Set<string>;
  cachedYoutubeIds: Set<string>;
  isOfflineMode: boolean;
  customPlaylists: Playlist[];
  onSelectSearch: (term: string) => void;
  onRemoveSearch: (term: string) => void;
  onClearAllSearches: () => void;
  onAddRecentSearch: (term: string) => void;
  onPlayTrack: (track: Track, list: Track[]) => void;
  onInspectTrack: (track: Track, list: Track[]) => void;
  onToggleLike: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onPlayNext: (track: Track) => void;
  onAddToPlaylist: (playlistId: string, track: Track) => void;
  onCacheTrack: (track: Track) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  searchQuery,
  searchStatusMsg,
  isSearching,
  searchResults,
  recentSearches,
  cachedTracksList,
  currentTrack,
  isPlaying,
  likedTrackIds,
  cachedYoutubeIds,
  isOfflineMode,
  customPlaylists,
  onSelectSearch,
  onRemoveSearch,
  onClearAllSearches,
  onAddRecentSearch,
  onPlayTrack,
  onInspectTrack,
  onToggleLike,
  onAddToQueue,
  onPlayNext,
  onAddToPlaylist,
  onCacheTrack
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-[#F5F0E8] break-words">
          {searchQuery ? `Results for "${searchQuery}"` : 'Search Music Worldwide'}
        </h1>
        {searchStatusMsg && searchQuery && (
          <p className="text-xs text-[#DFCCB0] mt-1 font-mono tabular-nums">
            {searchStatusMsg}
          </p>
        )}
      </div>

      {!searchQuery.trim() ? (
        <div className="space-y-7">
          {isOfflineMode && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-[#F5F0E8]">
                  Cached Tracks (Offline)
                </h2>
                <span className="text-xs font-mono tabular-nums text-[#DFCCB0]">
                  {cachedTracksList.length} saved
                </span>
              </div>
              {cachedTracksList.length === 0 ? (
                <div className="rounded-xl bg-[#1B1815] border border-[#EAE0D0]/[0.08] p-5 text-sm text-[#C8BEB0]">
                  No cached tracks yet. Play any track while online to save it automatically.
                </div>
              ) : (
                <div className="space-y-1">
                  {cachedTracksList.map((track, idx) => (
                    <TrackRow
                      key={`cached-${track.youtubeId}-${idx}`}
                      track={track}
                      index={idx}
                      isCurrent={currentTrack?.id === track.id || currentTrack?.youtubeId === track.youtubeId}
                      isPlaying={isPlaying}
                      isLiked={likedTrackIds.has(track.id)}
                      isCached
                      isOfflineDisabled={false}
                      customPlaylists={customPlaylists}
                      onPlay={(t) => onPlayTrack(t, cachedTracksList)}
                      onInspectTrack={(t) => onInspectTrack(t, cachedTracksList)}
                      onToggleLike={onToggleLike}
                      onAddToQueue={onAddToQueue}
                      onPlayNext={onPlayNext}
                      onAddToPlaylist={onAddToPlaylist}
                      onCacheTrack={onCacheTrack}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {recentSearches.length > 0 && (
            <RecentSearches
              searches={recentSearches}
              onSelectSearch={onSelectSearch}
              onRemoveSearch={onRemoveSearch}
              onClearAll={onClearAllSearches}
            />
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg sm:text-xl font-bold text-[#F5F0E8]">
                Quick Country Picks
              </h2>
              <span className="text-xs text-[#9E9384]">Tap any country to search</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
              {WORLD_COUNTRY_PRESETS.slice(0, 5).map((country) => (
                <button
                  type="button"
                  key={country.id}
                  onClick={() => onSelectSearch(country.query)}
                  className="card-interactive text-left p-3.5 rounded-xl bg-[#1B1815] hover:bg-[#24201B] border border-[#EAE0D0]/[0.08] hover:border-[#D8C3A5]/45 cursor-pointer flex flex-col justify-between min-h-[78px]"
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span className="font-display font-bold text-sm text-[#F5F0E8] truncate">
                      {country.name}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#DFCCB0] shrink-0" />
                  </div>
                  <span className="text-[11px] text-[#9E9384] truncate mt-2">
                    {country.styleHint}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          {recentSearches.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs text-[#9E9384]">
              <span className="font-semibold text-[#8F8476] text-[11px] shrink-0">Recent:</span>
              {recentSearches.map((term) => (
                <button
                  type="button"
                  key={term}
                  onClick={() => onSelectSearch(term)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer border ${
                    searchQuery.toLowerCase() === term.toLowerCase()
                      ? 'bg-[#D8C3A5] text-[#12100E] border-[#D8C3A5] font-bold'
                      : 'bg-[#1B1815] text-[#C8BEB0] border-[#EAE0D0]/10 hover:bg-[#24201B] hover:text-[#F5F0E8]'
                  }`}
                >
                  {term}
                </button>
              ))}
            </div>
          )}

          {isSearching ? (
            <div className="flex items-center justify-center py-16 text-[#9E9384] gap-3">
              <div className="w-5 h-5 border-2 border-[#D8C3A5] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Searching global music catalog...</span>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-16 text-[#9E9384] space-y-2">
              <p className="text-lg font-bold text-[#F5F0E8]">No results found for &ldquo;{searchQuery}&rdquo;</p>
              <p className="text-sm">
                {isOfflineMode
                  ? 'You are offline. Only cached tracks are searchable until your connection returns.'
                  : 'Try another song, artist, country, or genre.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 sm:gap-4 px-2.5 sm:px-4 py-2 text-xs font-semibold text-[#9E9384] border-b border-[#EAE0D0]/[0.07]">
                <span className="w-6 text-center shrink-0">#</span>
                <span className="flex-1 min-w-0">Title</span>
                <span className="hidden md:block w-1/4">Release</span>
                <span className="hidden sm:block w-24 shrink-0" aria-hidden="true" />
                <span className="w-12 text-right shrink-0">
                  <Clock className="w-3.5 h-3.5 ml-auto" />
                </span>
              </div>

              {searchResults.map((track, idx) => {
                const isCached = cachedYoutubeIds.has(track.youtubeId);
                return (
                  <TrackRow
                    key={`${track.id}-${idx}`}
                    track={track}
                    index={idx}
                    isCurrent={currentTrack?.id === track.id || currentTrack?.youtubeId === track.youtubeId}
                    isPlaying={isPlaying}
                    isLiked={likedTrackIds.has(track.id)}
                    isCached={isCached}
                    isOfflineDisabled={isOfflineMode && !isCached}
                    customPlaylists={customPlaylists}
                    onPlay={(t) => {
                      onAddRecentSearch(searchQuery);
                      onPlayTrack(t, searchResults);
                    }}
                    onInspectTrack={(t) => {
                      onAddRecentSearch(searchQuery);
                      onInspectTrack(t, searchResults);
                    }}
                    onToggleLike={onToggleLike}
                    onAddToQueue={onAddToQueue}
                    onPlayNext={onPlayNext}
                    onAddToPlaylist={onAddToPlaylist}
                    onCacheTrack={onCacheTrack}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
