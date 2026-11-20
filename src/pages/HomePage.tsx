import React, { useMemo } from 'react';
import {
  Play,
  Pause,
  Heart,
  HardDriveDownload,
  Globe2,
} from 'lucide-react';
import { AppView, OfflineTrackMetadata, Playlist, Track } from '../types/music';
import { CoverImage } from '../components/CoverImage';
import {
  CURATED_TRACKS,
  DEFAULT_FAVORITES_COVER,
  PLAYLISTS,
} from '../data/curatedTracks';
import { CachedTrackEntry } from '../utils/trackCache';
import {
  buildQuickAccessItems,
  extractPopularArtists,
  QuickAccessItem,
} from '../utils/libraryFeed';

interface HomePageProps {
  featuredTracks: Track[];
  cachedTrackEntries: CachedTrackEntry[];
  offlineTracks: OfflineTrackMetadata[];
  likedCount: number;
  currentTrack: Track | null;
  isPlaying: boolean;
  cachedYoutubeIds: Set<string>;
  isOfflineMode: boolean;
  countriesCount: number;
  onNavigatePage: (view: AppView) => void;
  onOpenPlaylist: (playlistId: string) => void;
  onOpenOfflineVault: () => void;
  onSelectArtist: (artistName: string) => void;
  onInspectTrack: (track: Track, list: Track[]) => void;
  onPlayToggleTrack: (track: Track, list: Track[]) => void;
}

export const HomePage: React.FC<HomePageProps> = React.memo(({
  featuredTracks,
  cachedTrackEntries,
  offlineTracks,
  likedCount,
  currentTrack,
  isPlaying,
  cachedYoutubeIds,
  isOfflineMode,
  countriesCount,
  onNavigatePage,
  onOpenPlaylist,
  onOpenOfflineVault,
  onSelectArtist,
  onInspectTrack,
  onPlayToggleTrack,
}) => {
  const quickAccessItems = useMemo(
    () =>
      buildQuickAccessItems({
        cachedEntries: cachedTrackEntries,
        curatedTracks: CURATED_TRACKS,
        playlists: PLAYLISTS,
        likedCount,
        offlineCount: offlineTracks.length,
      }),
    [cachedTrackEntries, likedCount, offlineTracks.length]
  );

  const trendingTracks = useMemo(
    () => (featuredTracks.length >= 6 ? featuredTracks : CURATED_TRACKS).slice(0, 6),
    [featuredTracks]
  );

  const popularArtists = useMemo(
    () => extractPopularArtists(cachedTrackEntries, CURATED_TRACKS, 6),
    [cachedTrackEntries]
  );

  const offlineTrackList = useMemo(
    () => offlineTracks.map((o) => o.track).filter(Boolean),
    [offlineTracks]
  );

  const handleQuickTileClick = (item: QuickAccessItem) => {
    if (item.kind === 'favorites') {
      onOpenPlaylist('liked');
      return;
    }
    if (item.kind === 'offline') {
      onOpenOfflineVault();
      return;
    }
    if (item.kind === 'playlist' && item.playlist) {
      onOpenPlaylist(item.playlist.id);
      return;
    }
    if (item.kind === 'track' && item.track) {
      onInspectTrack(item.track, CURATED_TRACKS);
    }
  };

  const handleQuickTilePlay = (
    e: React.MouseEvent,
    item: QuickAccessItem
  ) => {
    e.stopPropagation();
    if (item.kind === 'favorites') {
      onOpenPlaylist('liked');
      return;
    }
    if (item.kind === 'offline') {
      if (offlineTrackList.length > 0) {
        onPlayToggleTrack(offlineTrackList[0], offlineTrackList);
      } else {
        onOpenOfflineVault();
      }
      return;
    }
    if (item.kind === 'playlist' && item.playlist?.tracks[0]) {
      onPlayToggleTrack(item.playlist.tracks[0], item.playlist.tracks);
      return;
    }
    if (item.kind === 'track' && item.track) {
      onPlayToggleTrack(item.track, CURATED_TRACKS);
    }
  };

  return (
    <div className="space-y-7 pb-4">
      {/* Top Section: Quick-Access 2x3 Grid (Spotify-Style Compact Tiles) */}
      <section aria-label="Quick Access">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          {quickAccessItems.map((item) => {
            const isTrackActive = Boolean(
              item.track &&
                (currentTrack?.id === item.track.id ||
                  currentTrack?.youtubeId === item.track.youtubeId)
            );
            const isOfflineLocked = Boolean(
              isOfflineMode &&
                item.kind === 'track' &&
                item.track &&
                !cachedYoutubeIds.has(item.track.youtubeId)
            );

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => handleQuickTileClick(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleQuickTileClick(item);
                  }
                }}
                className={`group relative h-12 sm:h-16 rounded-md overflow-hidden bg-white/[0.07] hover:bg-white/[0.14] flex items-center gap-2 sm:gap-3 pr-2 sm:pr-12 transition-colors cursor-pointer select-none border border-white/[0.04] ${
                  isOfflineLocked ? 'opacity-50' : ''
                }`}
              >
                {/* Left Square Cover / Emblem */}
                {item.kind === 'favorites' ? (
                  <div className="relative w-12 sm:w-16 h-full shrink-0 bg-gradient-to-br from-[#EF4444] via-[#B91C1C] to-[#2B0709] flex items-center justify-center">
                    <CoverImage
                      src={DEFAULT_FAVORITES_COVER}
                      alt="Saved Favorites"
                      className="w-full h-full object-cover opacity-50 mix-blend-luminosity"
                    />
                    <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-current absolute" />
                  </div>
                ) : item.kind === 'offline' ? (
                  <div className="w-12 sm:w-16 h-full shrink-0 bg-gradient-to-br from-[#2B0A0D] to-[#110C0D] border-r border-white/[0.06] flex items-center justify-center text-[#EF4444]">
                    <HardDriveDownload className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                ) : (
                  <CoverImage
                    src={item.image || ''}
                    alt={item.title}
                    youtubeId={item.youtubeId}
                    loading="eager"
                    className="w-12 sm:w-16 h-full object-cover shrink-0 bg-zinc-900"
                  />
                )}

                {/* Title & Quiet Subtitle */}
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-[11px] sm:text-sm font-bold leading-tight line-clamp-2 sm:line-clamp-none sm:truncate ${
                      isTrackActive ? 'text-[#EF4444]' : 'text-white'
                    }`}
                  >
                    {item.title}
                  </div>
                  <div className="hidden sm:block text-[11px] text-zinc-400 truncate mt-0.5">
                    {item.subtitle}
                  </div>
                </div>

                {/* Hover Crimson Circular Play Button (Desktop / Tablet) */}
                {!isOfflineLocked && (
                  <button
                    type="button"
                    onClick={(e) => handleQuickTilePlay(e, item)}
                    aria-label={`Play ${item.title}`}
                    className={`hidden sm:flex absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#EF4444] hover:bg-[#DC2626] hover:scale-105 text-white items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.65)] transition-all cursor-pointer ${
                      isTrackActive && isPlaying
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                    }`}
                  >
                    {isTrackActive && isPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Row 1 — Trending Tracks Shelf */}
      <section className="space-y-3" aria-label="Trending Tracks">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg sm:text-2xl font-extrabold text-white tracking-tight">
            Trending Tracks
          </h2>
          <button
            type="button"
            onClick={() => onNavigatePage('charts')}
            className="text-xs font-bold text-zinc-400 hover:text-white hover:underline transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Show all
          </button>
        </div>

        <div className="flex overflow-x-auto gap-3 pb-1 scrollbar-none md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-4 md:overflow-visible">
          {trendingTracks.map((track, idx) => {
            const isCurrent =
              currentTrack?.id === track.id ||
              currentTrack?.youtubeId === track.youtubeId;
            const isCached = cachedYoutubeIds.has(track.youtubeId);
            const isDisabled = isOfflineMode && !isCached;

            return (
              <div
                key={track.id}
                role="button"
                tabIndex={0}
                onClick={() => onInspectTrack(track, trendingTracks)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onInspectTrack(track, trendingTracks);
                  }
                }}
                className={`group w-[148px] sm:w-[168px] md:w-auto shrink-0 p-2.5 sm:p-3 rounded-xl bg-zinc-900/40 hover:bg-zinc-800/75 transition-colors cursor-pointer flex flex-col ${
                  isDisabled ? 'opacity-45' : ''
                }`}
              >
                <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-zinc-900 mb-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.55)]">
                  <CoverImage
                    src={track.thumbnail}
                    alt={track.title}
                    youtubeId={track.youtubeId}
                    loading={idx < 3 ? 'eager' : 'lazy'}
                    className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                      isDisabled ? 'grayscale' : ''
                    }`}
                  />

                  {!isDisabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayToggleTrack(track, trendingTracks);
                      }}
                      aria-label={
                        isCurrent && isPlaying
                          ? `Pause ${track.title}`
                          : `Play ${track.title}`
                      }
                      className={`absolute bottom-2 right-2 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#EF4444] hover:bg-[#DC2626] hover:scale-105 text-white flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.65)] transition-all duration-200 cursor-pointer ${
                        isCurrent && isPlaying
                          ? 'opacity-100 translate-y-0'
                          : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0'
                      }`}
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current translate-x-0.5" />
                      )}
                    </button>
                  )}
                </div>

                <div
                  className={`text-sm font-semibold truncate ${
                    isCurrent ? 'text-[#EF4444]' : 'text-white'
                  }`}
                >
                  {track.title}
                </div>
                <div className="text-xs text-zinc-400 truncate mt-0.5">
                  {track.artist}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Row 2 — Popular Artists Shelf (Circular Portraits) */}
      <section className="space-y-3" aria-label="Popular Artists">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg sm:text-2xl font-extrabold text-white tracking-tight">
            Popular Artists
          </h2>
          <button
            type="button"
            onClick={() => onNavigatePage('charts')}
            className="text-xs font-bold text-zinc-400 hover:text-white hover:underline transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Show all
          </button>
        </div>

        <div className="flex overflow-x-auto gap-3 pb-1 scrollbar-none md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-4 md:overflow-visible">
          {popularArtists.map((artist, idx) => {
            const isArtistCurrent = Boolean(
              currentTrack &&
                artist.tracks.some(
                  (t) =>
                    t.youtubeId === currentTrack.youtubeId ||
                    t.id === currentTrack.id
                )
            );
            const isDisabled =
              isOfflineMode &&
              !artist.tracks.some((t) => cachedYoutubeIds.has(t.youtubeId));

            return (
              <div
                key={artist.name}
                role="button"
                tabIndex={0}
                onClick={() => onSelectArtist(artist.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectArtist(artist.name);
                  }
                }}
                className={`group w-[144px] sm:w-[164px] md:w-auto shrink-0 p-2.5 sm:p-3 rounded-xl bg-zinc-900/40 hover:bg-zinc-800/75 transition-colors cursor-pointer flex flex-col ${
                  isDisabled ? 'opacity-45' : ''
                }`}
              >
                <div className="relative aspect-square w-full mb-2.5">
                  <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
                    <CoverImage
                      src={artist.image}
                      alt={artist.name}
                      youtubeId={artist.youtubeId}
                      loading={idx < 3 ? 'eager' : 'lazy'}
                      className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                        isDisabled ? 'grayscale' : ''
                      }`}
                    />
                  </div>

                  {!isDisabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayToggleTrack(artist.topTrack, artist.tracks);
                      }}
                      aria-label={`Play ${artist.name}`}
                      className={`absolute bottom-1 right-1 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#EF4444] hover:bg-[#DC2626] hover:scale-105 text-white flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.65)] transition-all duration-200 cursor-pointer ${
                        isArtistCurrent && isPlaying
                          ? 'opacity-100 translate-y-0'
                          : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0'
                      }`}
                    >
                      {isArtistCurrent && isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current translate-x-0.5" />
                      )}
                    </button>
                  )}
                </div>

                <div
                  className={`text-sm font-semibold truncate ${
                    isArtistCurrent ? 'text-[#EF4444]' : 'text-white'
                  }`}
                >
                  {artist.name}
                </div>
                <div className="text-xs text-zinc-400 truncate mt-0.5">
                  Artist
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Row 3 — Explore Countries & World Mixes */}
      <section className="space-y-3" aria-label="Explore Countries and World Mixes">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg sm:text-2xl font-extrabold text-white tracking-tight">
            Explore Countries &amp; World Mixes
          </h2>
          <button
            type="button"
            onClick={() => onNavigatePage('mixes')}
            className="text-xs font-bold text-zinc-400 hover:text-white hover:underline transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Show all
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PLAYLISTS.slice(0, 3).map((playlist: Playlist) => (
            <div
              key={playlist.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenPlaylist(playlist.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenPlaylist(playlist.id);
                }
              }}
              className="group p-3 rounded-xl bg-zinc-900/55 hover:bg-zinc-800/80 border border-white/[0.04] flex items-center gap-3 transition-colors cursor-pointer"
            >
              <CoverImage
                src={playlist.coverImage}
                alt={playlist.name}
                youtubeId={playlist.tracks[0]?.youtubeId}
                className="w-14 h-14 rounded-lg object-cover shrink-0 bg-zinc-900"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white truncate">
                  {playlist.name}
                </div>
                <div className="text-xs text-zinc-400 truncate mt-0.5">
                  {playlist.regionLabel || 'Global'} · {playlist.tracks.length} tracks
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (playlist.tracks[0]) {
                    onPlayToggleTrack(playlist.tracks[0], playlist.tracks);
                  }
                }}
                aria-label={`Play ${playlist.name}`}
                className="w-9 h-9 rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer shrink-0 shadow-lg"
              >
                <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
              </button>
            </div>
          ))}

          {/* Direct Country Scenes Discovery Card */}
          <button
            type="button"
            onClick={() => onNavigatePage('countries')}
            className="group p-3 rounded-xl bg-gradient-to-br from-[#2B0A0D] to-zinc-900/90 hover:from-[#3A0E13] hover:to-zinc-800/90 border border-[#EF4444]/25 flex items-center gap-3 text-left transition-colors cursor-pointer"
          >
            <div className="w-14 h-14 rounded-lg bg-[#EF4444]/18 border border-[#EF4444]/35 flex items-center justify-center text-[#EF4444] shrink-0">
              <Globe2 className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-white truncate">
                Browse Countries
              </div>
              <div className="text-xs text-zinc-300 truncate mt-0.5 tabular-nums">
                {countriesCount} global music scenes
              </div>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
});
