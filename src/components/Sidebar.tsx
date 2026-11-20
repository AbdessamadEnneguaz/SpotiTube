import React, { useMemo, useState } from 'react';
import {
  Library,
  Plus,
  Heart,
  HardDriveDownload,
  Pin,
  Play,
} from 'lucide-react';
import { AppView, OfflineTrackMetadata, Playlist, Track } from '../types/music';
import { CoverImage } from './CoverImage';
import { CURATED_TRACKS, DEFAULT_FAVORITES_COVER } from '../data/curatedTracks';
import { CachedTrackEntry } from '../utils/trackCache';
import { formatStorageBytes } from '../utils/offlineDb';
import {
  SidebarFilter,
  extractPopularArtists,
  getRecentTracksFeed,
  isNewLibraryUser,
} from '../utils/libraryFeed';

interface SidebarProps {
  currentView: AppView;
  selectedPlaylistId: string | null;
  customPlaylists: Playlist[];
  likedCount: number;
  offlineTracks: OfflineTrackMetadata[];
  cachedTrackEntries: CachedTrackEntry[];
  currentTrack: Track | null;
  onNavigate: (view: AppView) => void;
  onOpenOfflineVault: () => void;
  onSelectPlaylist: (playlistId: string) => void;
  onPlayTrack: (track: Track, list?: Track[]) => void;
  onSelectArtist: (artistName: string) => void;
  onOpenLegal: (tab?: 'privacy' | 'terms' | 'dmca' | 'cookies') => void;
  onOpenCreatePlaylist: () => void;
}

const FILTER_OPTIONS: Array<{ id: SidebarFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'artists', label: 'Artists' },
  { id: 'offline', label: 'Offline' },
];

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  currentView,
  selectedPlaylistId,
  customPlaylists,
  likedCount,
  offlineTracks,
  cachedTrackEntries,
  currentTrack,
  onNavigate,
  onOpenOfflineVault,
  onSelectPlaylist,
  onPlayTrack,
  onSelectArtist,
  onOpenLegal,
  onOpenCreatePlaylist,
}) => {
  const [activeFilter, setActiveFilter] = useState<SidebarFilter>('all');

  const isBrandNewUser = useMemo(
    () =>
      isNewLibraryUser({
        cachedCount: cachedTrackEntries.length,
        customPlaylistCount: customPlaylists.length,
        offlineCount: offlineTracks.length,
      }),
    [cachedTrackEntries.length, customPlaylists.length, offlineTracks.length]
  );

  const recentTracks = useMemo(
    () => getRecentTracksFeed(cachedTrackEntries, 8),
    [cachedTrackEntries]
  );

  const sidebarArtists = useMemo(() => {
    // Under 'all', show user's frequently played artists; under 'artists' pill, also suggest curated artists if empty
    if (cachedTrackEntries.length === 0) {
      return activeFilter === 'artists'
        ? extractPopularArtists([], CURATED_TRACKS, 6)
        : [];
    }
    return extractPopularArtists(cachedTrackEntries, [], 6);
  }, [cachedTrackEntries, activeFilter]);

  const validOfflineTracks = useMemo(
    () => offlineTracks.filter((item) => Boolean(item?.track?.youtubeId)),
    [offlineTracks]
  );

  const offlineTrackList = useMemo(
    () => validOfflineTracks.map((item) => item.track),
    [validOfflineTracks]
  );

  const showPlaylists = activeFilter === 'all' || activeFilter === 'playlists';
  const showArtists = activeFilter === 'all' || activeFilter === 'artists';
  const showOffline = activeFilter === 'all' || activeFilter === 'offline';

  return (
    <aside className="hidden md:flex w-72 lg:w-80 bg-zinc-950/90 border border-white/5 rounded-xl flex-col h-full shrink-0 text-zinc-400 text-sm overflow-hidden">
      {/* Your Library Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onNavigate('library')}
          className={`flex items-center gap-2.5 text-left transition-colors cursor-pointer group ${
            currentView === 'library' ? 'text-white' : 'text-zinc-300 hover:text-white'
          }`}
        >
          <Library className="w-5 h-5 shrink-0 text-zinc-300 group-hover:text-white" />
          <span className="font-display font-bold text-base tracking-tight">
            Your Library
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenCreatePlaylist}
          title="Create Playlist"
          aria-label="Create Playlist"
          className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/[0.06]"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive Filter Pills */}
      <div className="px-4 pb-3 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        {FILTER_OPTIONS.map((pill) => {
          const isSelected = activeFilter === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => setActiveFilter(pill.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isSelected
                  ? 'bg-white text-zinc-950'
                  : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Dynamic Per-User Library Feed */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
        {/* Pinned: Saved Favorites */}
        {showPlaylists && (
          <button
            type="button"
            onClick={() => onSelectPlaylist('liked')}
            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors text-left cursor-pointer group ${
              selectedPlaylistId === 'liked'
                ? 'bg-white/[0.1] text-white'
                : 'hover:bg-white/[0.06] text-zinc-200'
            }`}
          >
            <div className="relative w-11 h-11 rounded-md overflow-hidden shrink-0 bg-gradient-to-br from-[#EF4444] via-[#B91C1C] to-[#29080A]">
              <CoverImage
                src={DEFAULT_FAVORITES_COVER}
                alt="Saved Favorites"
                className="w-full h-full object-cover opacity-55 mix-blend-luminosity"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Heart className="w-4 h-4 text-white fill-current drop-shadow" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold truncate text-white">
                Saved Favorites
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 truncate tabular-nums">
                <Pin className="w-3 h-3 text-[#EF4444] shrink-0 fill-current" />
                <span>Playlist · {likedCount} {likedCount === 1 ? 'track' : 'tracks'}</span>
              </div>
            </div>
          </button>
        )}

        {/* Pinned: Offline Vault */}
        {showOffline && (
          <button
            type="button"
            onClick={onOpenOfflineVault}
            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors text-left cursor-pointer group ${
              currentView === 'library'
                ? 'bg-white/[0.1] text-white'
                : 'hover:bg-white/[0.06] text-zinc-200'
            }`}
          >
            <div className="w-11 h-11 rounded-md shrink-0 bg-gradient-to-br from-[#2B0A0D] to-[#110C0D] border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444]">
              <HardDriveDownload className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold truncate text-white">
                Offline Vault
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 truncate tabular-nums">
                <Pin className="w-3 h-3 text-[#EF4444] shrink-0 fill-current" />
                <span>
                  Offline · {validOfflineTracks.length}{' '}
                  {validOfflineTracks.length === 1 ? 'track' : 'tracks'}
                </span>
              </div>
            </div>
          </button>
        )}

        {/* Custom User Playlists */}
        {showPlaylists &&
          customPlaylists.map((playlist) => {
            const isSelected = selectedPlaylistId === playlist.id;
            return (
              <button
                type="button"
                key={playlist.id}
                onClick={() => onSelectPlaylist(playlist.id)}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors text-left cursor-pointer group ${
                  isSelected
                    ? 'bg-white/[0.1] text-white'
                    : 'hover:bg-white/[0.06] text-zinc-200'
                }`}
              >
                <CoverImage
                  src={playlist.coverImage}
                  alt={playlist.name}
                  youtubeId={playlist.tracks[0]?.youtubeId}
                  className="w-11 h-11 rounded-md object-cover shrink-0 bg-zinc-900"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold truncate text-white">
                    {playlist.name}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate tabular-nums">
                    Playlist · {playlist.tracks.length} tracks
                  </div>
                </div>
              </button>
            );
          })}

        {/* Offline Tracks List when Offline Pill is Selected */}
        {activeFilter === 'offline' && (
          <div className="pt-2 space-y-1">
            {validOfflineTracks.length === 0 ? (
              <div className="mx-1.5 mt-2 rounded-xl bg-zinc-900/90 border border-white/[0.05] p-3.5 space-y-2.5">
                <div className="text-xs font-bold text-white">No offline tracks yet</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Download songs using the save icon in the player to listen anywhere with zero connection.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('charts')}
                  className="px-3.5 py-1.5 rounded-full bg-white text-zinc-950 text-[11px] font-bold hover:scale-[1.02] transition-transform cursor-pointer"
                >
                  Browse Charts
                </button>
              </div>
            ) : (
              validOfflineTracks.map((entry) => {
                const isActive = currentTrack?.youtubeId === entry.youtubeId;
                return (
                  <button
                    key={entry.youtubeId}
                    type="button"
                    onClick={() => onPlayTrack(entry.track, offlineTrackList)}
                    className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors text-left cursor-pointer group ${
                      isActive ? 'bg-white/[0.09] text-[#EF4444]' : 'hover:bg-white/[0.06] text-zinc-200'
                    }`}
                  >
                    <CoverImage
                      src={entry.track.thumbnail}
                      alt={entry.track.title}
                      youtubeId={entry.youtubeId}
                      className="w-10 h-10 rounded-md object-cover shrink-0 bg-zinc-900"
                    />
                    <div className="min-w-0 flex-1">
                      <div className={`text-[13px] font-medium truncate ${isActive ? 'text-[#EF4444]' : 'text-white'}`}>
                        {entry.track.title}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate tabular-nums">
                        {entry.track.artist} · {formatStorageBytes(entry.sizeBytes + entry.coverSizeBytes)}
                      </div>
                    </div>
                    <Play className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 shrink-0 fill-current" />
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Frequently Played Artists (Circular Avatars) */}
        {showArtists && sidebarArtists.length > 0 && (
          <div className="pt-1 space-y-1">
            {activeFilter === 'artists' && (
              <div className="px-2.5 pb-1 text-[11px] font-semibold text-zinc-500">
                {cachedTrackEntries.length > 0 ? 'Frequent Artists' : 'Popular Artists'}
              </div>
            )}
            {sidebarArtists.map((artist) => (
              <button
                key={artist.name}
                type="button"
                onClick={() => onSelectArtist(artist.name)}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-white/[0.06] transition-colors text-left cursor-pointer group"
              >
                <CoverImage
                  src={artist.image}
                  alt={artist.name}
                  youtubeId={artist.youtubeId}
                  className="w-11 h-11 rounded-full object-cover shrink-0 bg-zinc-900 border border-white/[0.08]"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold truncate text-white group-hover:text-white">
                    {artist.name}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    Artist{artist.playCount > 0 ? ` · ${artist.playCount} plays` : ''}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Recently Played Tracks (when user has history under 'All') */}
        {activeFilter === 'all' && recentTracks.length > 0 && (
          <div className="pt-2 space-y-1">
            <div className="px-2.5 pb-1 text-[11px] font-semibold text-zinc-500">
              Recently Played
            </div>
            {recentTracks.map((track) => {
              const isActive = currentTrack?.youtubeId === track.youtubeId;
              return (
                <button
                  key={track.youtubeId}
                  type="button"
                  onClick={() => onPlayTrack(track, recentTracks)}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors text-left cursor-pointer group ${
                    isActive ? 'bg-white/[0.09]' : 'hover:bg-white/[0.06]'
                  }`}
                >
                  <CoverImage
                    src={track.thumbnail}
                    alt={track.title}
                    youtubeId={track.youtubeId}
                    className="w-11 h-11 rounded-md object-cover shrink-0 bg-zinc-900"
                  />
                  <div className="min-w-0 flex-1">
                    <div className={`text-[13px] font-medium truncate ${isActive ? 'text-[#EF4444]' : 'text-white'}`}>
                      {track.title}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      Track · {track.artist}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Brand-New User Starter Cards */}
        {isBrandNewUser && (activeFilter === 'all' || activeFilter === 'playlists') && (
          <div className="pt-2 px-1 space-y-2.5">
            <div className="rounded-xl bg-zinc-900/90 border border-white/[0.05] p-3.5 space-y-2">
              <div className="text-[13px] font-bold text-white">
                Create your first playlist
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                It&apos;s easy, we&apos;ll help you build your custom mix.
              </p>
              <button
                type="button"
                onClick={onOpenCreatePlaylist}
                className="px-3.5 py-1.5 rounded-full bg-white text-zinc-950 text-xs font-bold hover:scale-[1.03] transition-transform cursor-pointer"
              >
                Create playlist
              </button>
            </div>

            <div className="rounded-xl bg-zinc-900/90 border border-white/[0.05] p-3.5 space-y-2">
              <div className="text-[13px] font-bold text-white">
                Explore World Mixes
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Stream global playlists across 10+ countries and scenes.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('mixes')}
                className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Browse mixes
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quiet Legal Footer */}
      <div className="px-4 py-3 border-t border-white/[0.06] flex items-center flex-wrap gap-x-2 gap-y-1 text-[11px] text-zinc-500 shrink-0">
        <button type="button" onClick={() => onOpenLegal('privacy')} className="hover:text-zinc-200 transition-colors cursor-pointer">
          Privacy
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" onClick={() => onOpenLegal('terms')} className="hover:text-zinc-200 transition-colors cursor-pointer">
          Terms
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" onClick={() => onOpenLegal('dmca')} className="hover:text-zinc-200 transition-colors cursor-pointer">
          DMCA
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" onClick={() => onOpenLegal('cookies')} className="hover:text-zinc-200 transition-colors cursor-pointer">
          Cookies
        </button>
      </div>
    </aside>
  );
});
