import React, { useState } from 'react';
import {
  Heart,
  PlusSquare,
  History,
  HardDriveDownload,
  Play,
  Trash2,
  Pause,
} from 'lucide-react';
import { OfflineTrackMetadata, Playlist, Track } from '../types/music';
import { CoverImage } from '../components/CoverImage';
import { DEFAULT_FAVORITES_COVER } from '../data/curatedTracks';
import { OfflineStorageStats, formatStorageBytes } from '../utils/offlineDb';

interface LibraryPageProps {
  initialTab?: 'all' | 'offline';
  likedCount: number;
  cachedCount: number;
  playlists: Playlist[];
  offlineTracks: OfflineTrackMetadata[];
  offlineStorageStats: OfflineStorageStats;
  currentTrack: Track | null;
  isPlaying: boolean;
  onOpenPlaylist: (playlistId: string) => void;
  onOpenRecent: () => void;
  onOpenCreatePlaylist: () => void;
  onPlayTrack: (track: Track, list: Track[]) => void;
  onDeleteOfflineTrack: (youtubeId: string) => void;
  onClearAllOffline: () => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({
  initialTab = 'all',
  likedCount,
  cachedCount,
  playlists,
  offlineTracks,
  offlineStorageStats,
  currentTrack,
  isPlaying,
  onOpenPlaylist,
  onOpenRecent,
  onOpenCreatePlaylist,
  onPlayTrack,
  onDeleteOfflineTrack,
  onClearAllOffline,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'offline'>(initialTab);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const validOfflineTracks = offlineTracks.filter((item) => Boolean(item?.track?.id));
  const offlineTrackList = validOfflineTracks.map((item) => item.track);
  const usedBytes = offlineStorageStats.totalBytes;
  const quotaBytes = offlineStorageStats.quotaBytes;
  const usageRatioPct =
    quotaBytes && quotaBytes > 0
      ? Math.min(100, Math.max(usedBytes > 0 ? 2 : 0, (usedBytes / quotaBytes) * 100))
      : usedBytes > 0
        ? Math.min(100, Math.max(4, (usedBytes / (250 * 1024 * 1024)) * 100))
        : 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold text-white">
            Your Music Library
          </h1>
          <p className="text-xs text-[#A39E9F] mt-0.5 tabular-nums">
            {playlists.length} playlists · {offlineTracks.length} downloaded for offline listening
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreatePlaylist}
          className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-[#EF2323] hover:bg-[#FF3830] text-white font-bold text-xs transition-colors cursor-pointer shrink-0 whitespace-nowrap shadow-[0_4px_14px_rgba(239,35,35,0.3)]"
        >
          <PlusSquare className="w-4 h-4" />
          <span>Create Playlist</span>
        </button>
      </div>

      {/* Library Filter Tabs: All Collection | Offline Library */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-[#EF4444] text-white border-[#F87171]/50 font-bold shadow-[0_6px_16px_rgba(239,68,68,0.3)]'
              : 'frame-3d text-[#D0CBCC] hover:text-white hover:border-[#EF4444]/40'
          }`}
        >
          All Collection
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('offline')}
          className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'offline'
              ? 'bg-[#EF4444] text-white border-[#F87171]/50 font-bold shadow-[0_6px_16px_rgba(239,68,68,0.3)]'
              : 'frame-3d text-[#D0CBCC] hover:text-white hover:border-[#EF4444]/40'
          }`}
        >
          <HardDriveDownload className="w-3.5 h-3.5" />
          <span>Offline Library</span>
          <span className="font-mono tabular-nums text-[11px] opacity-90">
            ({offlineTracks.length})
          </span>
        </button>
      </div>

      {activeTab === 'offline' ? (
        <div className="space-y-5">
          {/* Offline Storage Usage Panel */}
          <section className="frame-3d-crimson rounded-2xl p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#EF4444]/18 border border-[#EF4444]/40 flex items-center justify-center text-[#FF443A] shrink-0">
                  <HardDriveDownload className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-white">
                    Offline Audio Storage
                  </h2>
                  <p className="text-xs text-[#D0CBCC] tabular-nums">
                    {formatStorageBytes(usedBytes)} used across {offlineTracks.length}{' '}
                    {offlineTracks.length === 1 ? 'track' : 'tracks'}
                    {quotaBytes ? ` · ${formatStorageBytes(quotaBytes)} browser quota` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {offlineTrackList.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => onPlayTrack(offlineTrackList[0], offlineTrackList)}
                      className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Play Offline</span>
                    </button>
                    <button
                      type="button"
                      onClick={onClearAllOffline}
                      className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-rose-950/60 text-[#D0CBCC] hover:text-rose-200 border border-white/10 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="w-full h-2 rounded-full bg-black/45 overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-[#DC2626] to-[#FF443A] rounded-full transition-[width] duration-300"
                  style={{ width: `${usageRatioPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[#A39E9F] tabular-nums">
                <span>Stored locally in IndexedDB</span>
                <span>100% playable with zero internet</span>
              </div>
            </div>
          </section>

          {validOfflineTracks.length === 0 ? (
            <div className="frame-3d rounded-2xl p-8 text-center space-y-2">
              <p className="font-display text-base font-bold text-white">
                No offline audio saved yet
              </p>
              <p className="text-xs sm:text-sm text-[#A39E9F] max-w-md mx-auto">
                Click the download icon on any track or &ldquo;Save Playlist Offline&rdquo; on a collection to store full audio tracks on this device.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {validOfflineTracks.map((entry) => {
                const isCurrent =
                  currentTrack?.id === entry.track.id ||
                  currentTrack?.youtubeId === entry.youtubeId;
                return (
                  <div
                    key={entry.youtubeId}
                    className={`group flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-xl border transition-colors ${
                      isCurrent
                        ? 'bg-[#EF2323]/14 border-[#EF2323]/40 text-white'
                        : 'frame-3d border-white/[0.06] text-[#D0CBCC] hover:border-[#EF4444]/35'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onPlayTrack(entry.track, offlineTrackList)}
                      aria-label={`Play offline track ${entry.track.title}`}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-[#171213] border border-white/10">
                        <CoverImage
                          src={entry.track.thumbnail}
                          alt={entry.track.title}
                          youtubeId={entry.youtubeId}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {isCurrent && isPlaying ? (
                            <Pause className="w-4 h-4 text-white fill-current" />
                          ) : (
                            <Play className="w-4 h-4 text-white fill-current" />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-semibold truncate ${isCurrent ? 'text-[#FF443A]' : 'text-white'}`}>
                          {entry.track.title}
                        </div>
                        <div className="text-xs text-[#A39E9F] truncate flex items-center gap-1.5">
                          <span className="truncate">{entry.track.artist}</span>
                          <span className="text-[#6F6A6B] font-mono tabular-nums shrink-0">
                            · {formatStorageBytes(entry.sizeBytes + entry.coverSizeBytes)}
                          </span>
                        </div>
                      </div>
                    </button>

                    <span className="hidden sm:inline-block text-xs font-mono tabular-nums text-[#A39E9F] shrink-0">
                      {entry.track.durationFormatted}
                    </span>

                    <button
                      type="button"
                      onClick={() => onDeleteOfflineTrack(entry.youtubeId)}
                      aria-label={`Delete ${entry.track.title} from offline library`}
                      title="Remove from offline library"
                      className="min-w-[40px] min-h-[40px] rounded-xl text-[#A39E9F] hover:text-[#FF443A] hover:bg-white/[0.06] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          <div
            onClick={() => onOpenPlaylist('liked')}
            className="frame-3d-crimson card-interactive p-5 rounded-2xl cursor-pointer flex items-center gap-4"
          >
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 border border-white/12">
              <CoverImage
                src={DEFAULT_FAVORITES_COVER}
                alt="Saved Favorites"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                <Heart className="w-7 h-7 fill-[#EF4444] text-[#EF4444]" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                Saved Favorites
              </h2>
              <p className="text-xs text-[#A39E9F] mt-1 tabular-nums">
                {likedCount} tracks saved locally
              </p>
              <span className="text-xs font-semibold text-[#EF4444] mt-2 inline-block">
                Open collection
              </span>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('offline')}
            className="frame-3d card-interactive p-5 rounded-2xl cursor-pointer flex items-center gap-4"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-[#EF4444]/12 border border-[#EF4444]/30 flex items-center justify-center shrink-0 text-[#EF4444]">
              <HardDriveDownload className="w-8 h-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                Offline Library
              </h2>
              <p className="text-xs text-[#A39E9F] mt-1 tabular-nums">
                {offlineTracks.length} downloaded · {formatStorageBytes(usedBytes)}
              </p>
              <span className="text-xs font-semibold text-[#EF4444] mt-2 inline-block">
                Manage offline storage
              </span>
            </div>
          </div>

          <div
            onClick={onOpenRecent}
            className="frame-3d card-interactive p-5 rounded-2xl cursor-pointer flex items-center gap-4"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-[#EF4444]/12 border border-[#EF4444]/30 flex items-center justify-center shrink-0 text-[#EF4444]">
              <History className="w-8 h-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                Recent &amp; Cached
              </h2>
              <p className="text-xs text-[#A39E9F] mt-1 tabular-nums">
                {cachedCount} tracks ready offline
              </p>
              <span className="text-xs font-semibold text-[#EF4444] mt-2 inline-block">
                Open history
              </span>
            </div>
          </div>

          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => onOpenPlaylist(pl.id)}
              className="frame-3d card-interactive p-3.5 sm:p-4 rounded-2xl cursor-pointer flex items-center gap-3.5"
            >
              <CoverImage
                src={pl.coverImage}
                alt={pl.name}
                youtubeId={pl.tracks[0]?.youtubeId}
                loading="lazy"
                className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl object-cover shrink-0 bg-[#070607] border border-white/10"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-sm sm:text-base font-bold text-white truncate">
                  {pl.name}
                </h3>
                <p className="text-xs text-[#A39E9F] line-clamp-2 mt-1">
                  {pl.description}
                </p>
                <span className="text-xs text-[#EF4444] mt-2 block font-medium tabular-nums">
                  {pl.isCustom ? 'Custom · ' : pl.regionLabel ? `${pl.regionLabel} · ` : ''}
                  {pl.tracks.length} tracks
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LibraryPage;
