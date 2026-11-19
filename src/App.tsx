import React, { Suspense, lazy, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Header } from './components/Header';
import { PlayerBar } from './components/PlayerBar';
import { YouTubePlayerEmbed } from './components/YouTubePlayerEmbed';
import { OfflineIndicator } from './components/OfflineIndicator';
import { HomePage } from './pages/HomePage';
import {
  CURATED_TRACKS,
  PLAYLISTS,
  WORLD_COUNTRY_PRESETS,
  DEFAULT_FAVORITES_COVER,
  WorldCountryPreset
} from './data/curatedTracks';
import { AppView, Track, Playlist, RepeatMode } from './types/music';
import { searchYouTube } from './services/youtubeApi';
import {
  getNextIndex,
  getPreviousIndex,
  addToQueue,
  removeFromQueue,
  reorderQueue,
  generateShuffledIndices
} from './utils/playerQueue';
import {
  addSearchTerm,
  removeSearchTerm,
  clearSearchTerms,
  loadRecentSearches,
  saveRecentSearches
} from './utils/recentSearches';
import {
  CachedTrackEntry,
  loadCachedTrackEntries,
  saveCachedTrackEntries,
  recordTrackPlay,
  getFrequentTracks,
  syncTrackToServiceWorkerCache,
  warmCuratedCoversCache
} from './utils/trackCache';
import {
  getCachedYoutubeIdSet,
  isTrackPlayableOffline,
  filterTracksForOffline
} from './utils/offlineMode';
import {
  shouldAutoPromptPermissionsOnEntry,
  loadPermissionsPrompted,
  getNotificationPermissionState
} from './utils/backgroundPermission';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { safeParseJson, sanitizeMediaUrl, sanitizeClientText } from './utils/security';
import { unlockAudioKeepAlive } from './utils/backgroundAudio';
import {
  INITIAL_ROUTE,
  RouteEntry,
  pushRoute,
  popRoute,
  canGoBackFromRoute
} from './utils/navigation';

// Lazy-loaded pages (code-split chunks keep initial load light & fast on phones)
const CountriesPage = lazy(() => import('./pages/CountriesPage'));
const MixesPage = lazy(() => import('./pages/MixesPage'));
const ChartsPage = lazy(() => import('./pages/ChartsPage'));
const RecentPage = lazy(() => import('./pages/RecentPage'));
const PlaylistPage = lazy(() => import('./pages/PlaylistPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const LibraryPage = lazy(() => import('./pages/LibraryPage'));

// Lazy-loaded heavy modals & drawers (mounted only when opened)
const QueueDrawer = lazy(() =>
  import('./components/QueueDrawer').then((m) => ({ default: m.QueueDrawer }))
);
const ExpandedCoverModal = lazy(() =>
  import('./components/ExpandedCoverModal').then((m) => ({ default: m.ExpandedCoverModal }))
);
const SleepTimerModal = lazy(() =>
  import('./components/SleepTimerModal').then((m) => ({ default: m.SleepTimerModal }))
);
const CreatePlaylistModal = lazy(() =>
  import('./components/CreatePlaylistModal').then((m) => ({ default: m.CreatePlaylistModal }))
);
const LegalModal = lazy(() =>
  import('./components/LegalModal').then((m) => ({ default: m.LegalModal }))
);
const BackgroundPermissionModal = lazy(() =>
  import('./components/BackgroundPermissionModal').then((m) => ({
    default: m.BackgroundPermissionModal
  }))
);

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center py-20 text-[#A39E9F] gap-3">
    <div className="w-5 h-5 border-2 border-[#EF2323] border-t-transparent rounded-full animate-spin" />
    <span className="text-xs font-medium text-[#D0CBCC]">Loading page...</span>
  </div>
);

export default function App() {
  // Multi-page Navigation & History Stack
  const [currentRoute, setCurrentRoute] = useState<RouteEntry>(INITIAL_ROUTE);
  const [navHistory, setNavHistory] = useState<RouteEntry[]>([]);
  const currentView = currentRoute.view;
  const selectedPlaylistId = currentRoute.playlistId;

  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Track[]>(CURATED_TRACKS);
  const [searchStatusMsg, setSearchStatusMsg] = useState<string | null>(null);

  // Recent Searches State (persisted in localStorage)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches());

  // Frequently Played Track Metadata Cache (persisted in localStorage & SW Cache Storage)
  const [cachedTrackEntries, setCachedTrackEntries] = useState<CachedTrackEntry[]>(() =>
    loadCachedTrackEntries()
  );

  // Automatic Offline Detection
  const isOnline = useOnlineStatus();
  const isOfflineMode = !isOnline;
  const wasOnlineRef = useRef(isOnline);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);

  useEffect(() => {
    saveCachedTrackEntries(cachedTrackEntries);
  }, [cachedTrackEntries]);

  useEffect(() => {
    if (wasOnlineRef.current === isOnline) return;
    wasOnlineRef.current = isOnline;
    setOfflineNotice(
      isOnline
        ? 'Connection restored — live search & streaming active'
        : `Offline mode — ${cachedTrackEntries.length} cached ${cachedTrackEntries.length === 1 ? 'track' : 'tracks'} ready`
    );
  }, [isOnline, cachedTrackEntries.length]);

  useEffect(() => {
    if (!offlineNotice) return;
    const t = setTimeout(() => setOfflineNotice(null), 3500);
    return () => clearTimeout(t);
  }, [offlineNotice]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void warmCuratedCoversCache(CURATED_TRACKS);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const frequentTracks = useMemo(() => {
    return getFrequentTracks(cachedTrackEntries, 5);
  }, [cachedTrackEntries]);

  const cachedYoutubeIds = useMemo(() => {
    return getCachedYoutubeIdSet(cachedTrackEntries);
  }, [cachedTrackEntries]);

  const cachedTracksList = useMemo(() => {
    return cachedTrackEntries.map((entry) => entry.track);
  }, [cachedTrackEntries]);

  useEffect(() => {
    saveRecentSearches(recentSearches);
  }, [recentSearches]);

  // Modals & Panels State
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isExpandedCoverOpen, setIsExpandedCoverOpen] = useState(false);
  const [isSleepTimerOpen, setIsSleepTimerOpen] = useState(false);
  const [isBgPermissionOpen, setIsBgPermissionOpen] = useState<boolean>(() =>
    shouldAutoPromptPermissionsOnEntry({
      alreadyPrompted: loadPermissionsPrompted(),
      notificationPermission: getNotificationPermissionState(),
      isNativeAndroid:
        typeof window !== 'undefined' &&
        Boolean((window as unknown as { SpotiTubeAndroid?: unknown }).SpotiTubeAndroid)
    })
  );
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms' | 'dmca' | 'cookies'>('privacy');

  // Sleep Timer state
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [, setSleepTimerSecondsLeft] = useState<number | null>(null);

  // Custom User Playlists
  const [customPlaylists, setCustomPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem('spotitube_custom_playlists');
      const parsed = safeParseJson<Playlist[]>(
        saved,
        [],
        (val): val is Playlist[] => Array.isArray(val)
      );
      return parsed
        .filter((pl) => pl && typeof pl.id === 'string' && typeof pl.name === 'string')
        .map((pl) => ({
          ...pl,
          name: sanitizeClientText(pl.name, 80) || 'Custom Playlist',
          description: sanitizeClientText(pl.description || '', 200),
          coverImage: sanitizeMediaUrl(pl.coverImage, DEFAULT_FAVORITES_COVER),
          tracks: Array.isArray(pl.tracks) ? pl.tracks : []
        }));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('spotitube_custom_playlists', JSON.stringify(customPlaylists));
    } catch {
      // storage error
    }
  }, [customPlaylists]);

  const allPlaylists = useMemo(() => {
    return [...PLAYLISTS, ...customPlaylists];
  }, [customPlaylists]);

  // Player State
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(85);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isShuffle, setIsShuffle] = useState(false);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);

  // Queue & History
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const failedFallbackIdsRef = useRef<Set<string>>(new Set());

  // Navigation helpers
  const routeRef = useRef(currentRoute);
  const historyRef = useRef(navHistory);
  routeRef.current = currentRoute;
  historyRef.current = navHistory;

  const searchFocusTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (searchFocusTimerRef.current !== null) {
        window.clearTimeout(searchFocusTimerRef.current);
      }
    };
  }, []);

  const triggerSearchKeyboardFocus = useCallback(() => {
    if (searchFocusTimerRef.current !== null) {
      window.clearTimeout(searchFocusTimerRef.current);
      searchFocusTimerRef.current = null;
    }
    const focusAndShowKeyboard = () => {
      const input = document.getElementById('spotitube-search-input') as HTMLInputElement | null;
      if (input) {
        input.focus({ preventScroll: true });
      }
      try {
        (window as unknown as {
          SpotiTubeAndroid?: { showKeyboard?: () => void };
        }).SpotiTubeAndroid?.showKeyboard?.();
      } catch {
        // ignore outside native wrapper
      }
    };

    // Focus synchronously inside user gesture, then reinforce after page transition
    focusAndShowKeyboard();
    searchFocusTimerRef.current = window.setTimeout(() => {
      focusAndShowKeyboard();
      searchFocusTimerRef.current = null;
    }, 140);
  }, []);

  const navigateTo = useCallback(
    (view: AppView, playlistId: string | null = null, options?: { focusSearch?: boolean }) => {
      const transition = pushRoute(historyRef.current, routeRef.current, { view, playlistId });
      setNavHistory(transition.history);
      setCurrentRoute(transition.current);
      if (view === 'search' && options?.focusSearch) {
        triggerSearchKeyboardFocus();
      }
    },
    [triggerSearchKeyboardFocus]
  );

  const handleNavigate = useCallback(
    (view: AppView) => {
      navigateTo(view, null, { focusSearch: view === 'search' });
    },
    [navigateTo]
  );

  const handleOpenPlaylist = useCallback(
    (playlistId: string) => {
      navigateTo('playlist', playlistId);
    },
    [navigateTo]
  );

  const handleBack = useCallback(() => {
    const transition = popRoute(historyRef.current, routeRef.current);
    setNavHistory(transition.history);
    setCurrentRoute(transition.current);
  }, []);

  const hasOpenModalOrDrawer =
    isExpandedCoverOpen ||
    isQueueOpen ||
    isLegalOpen ||
    isSleepTimerOpen ||
    isCreatePlaylistOpen ||
    isBgPermissionOpen;

  const canGoBack = canGoBackFromRoute(navHistory, currentRoute);

  // Sync Android hardware Back button with SPA history stack and open modals
  useEffect(() => {
    const shouldInterceptBack = canGoBack || hasOpenModalOrDrawer;
    try {
      (window as unknown as {
        SpotiTubeAndroid?: { setCanGoBack?: (val: boolean) => void };
      }).SpotiTubeAndroid?.setCanGoBack?.(shouldInterceptBack);
    } catch {
      // ignore outside native wrapper
    }

    const win = window as unknown as { __spotitubeBack?: () => void };
    win.__spotitubeBack = () => {
      if (isExpandedCoverOpen) {
        setIsExpandedCoverOpen(false);
      } else if (isQueueOpen) {
        setIsQueueOpen(false);
      } else if (isLegalOpen) {
        setIsLegalOpen(false);
      } else if (isSleepTimerOpen) {
        setIsSleepTimerOpen(false);
      } else if (isCreatePlaylistOpen) {
        setIsCreatePlaylistOpen(false);
      } else if (isBgPermissionOpen) {
        setIsBgPermissionOpen(false);
      } else {
        handleBack();
      }
    };

    return () => {
      delete win.__spotitubeBack;
    };
  }, [
    canGoBack,
    hasOpenModalOrDrawer,
    isExpandedCoverOpen,
    isQueueOpen,
    isLegalOpen,
    isSleepTimerOpen,
    isCreatePlaylistOpen,
    isBgPermissionOpen,
    handleBack
  ]);

  const handleSelectRecentSearch = useCallback(
    (term: string) => {
      setSearchQuery(term);
      navigateTo('search');
      setRecentSearches((prev) => addSearchTerm(prev, term));
    },
    [navigateTo]
  );

  const handleSelectCountry = useCallback(
    (country: WorldCountryPreset) => {
      handleSelectRecentSearch(country.query);
    },
    [handleSelectRecentSearch]
  );

  const handleRemoveRecentSearch = useCallback((term: string) => {
    setRecentSearches((prev) => removeSearchTerm(prev, term));
  }, []);

  const handleClearAllRecentSearches = useCallback(() => {
    setRecentSearches(clearSearchTerms());
  }, []);

  const handleAddRecentSearch = useCallback((term: string) => {
    if (term.trim()) {
      setRecentSearches((prev) => addSearchTerm(prev, term));
    }
  }, []);

  // User Liked Songs
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('spotitube_liked_ids');
      const parsed = safeParseJson<string[]>(
        saved,
        ['global_1', 'africa_burna', 'asia_bts'],
        (val): val is string[] => Array.isArray(val) && val.every((x) => typeof x === 'string')
      );
      return new Set(parsed.slice(0, 500));
    } catch {
      return new Set(['global_1', 'africa_burna', 'asia_bts']);
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('spotitube_liked_ids', JSON.stringify(Array.from(likedTrackIds)));
    } catch {
      // storage error
    }
  }, [likedTrackIds]);

  useEffect(() => {
    if (sleepTimerMinutes === null || sleepTimerMinutes === -1) {
      setSleepTimerSecondsLeft(null);
      return;
    }

    setSleepTimerSecondsLeft(sleepTimerMinutes * 60);

    const interval = setInterval(() => {
      setSleepTimerSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setIsPlaying(false);
          setSleepTimerMinutes(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerMinutes]);

  useEffect(() => {
    if (isShuffle) {
      setShuffledIndices(generateShuffledIndices(queue.length, queueIndex));
    }
  }, [isShuffle, queue.length]);

  const likedTracks = useMemo(() => {
    return CURATED_TRACKS.filter((t) => likedTrackIds.has(t.id));
  }, [likedTrackIds]);

  const chartTracks = useMemo(() => {
    if (selectedRegion === 'all') return CURATED_TRACKS;
    if (selectedRegion === 'global') return CURATED_TRACKS.slice(0, 12);
    return CURATED_TRACKS.filter((t) => t.region === selectedRegion || t.genre === selectedRegion);
  }, [selectedRegion]);

  const mainContentRef = useRef<HTMLElement>(null);

  const viewKey = useMemo(() => {
    if (currentView === 'playlist') {
      return `playlist-${selectedPlaylistId || 'default'}`;
    }
    return currentView;
  }, [currentView, selectedPlaylistId]);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [viewKey]);

  const activePlaylist = useMemo<Playlist | null>(() => {
    if (selectedPlaylistId === 'liked') {
      return {
        id: 'liked',
        name: 'Saved Favorites',
        description: 'Your personal collection of tracks across all countries.',
        regionLabel: 'Personal Vault',
        coverImage: DEFAULT_FAVORITES_COVER,
        tracks: likedTracks
      };
    }
    return allPlaylists.find((p) => p.id === selectedPlaylistId) || null;
  }, [selectedPlaylistId, likedTracks, allPlaylists]);

  // Search effect with debounce
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      if (isOfflineMode) {
        setSearchResults(cachedTracksList);
        setSearchStatusMsg(
          cachedTracksList.length > 0
            ? `Offline Mode · showing ${cachedTracksList.length} cached ${cachedTracksList.length === 1 ? 'track' : 'tracks'}`
            : 'Offline Mode · no cached tracks saved yet'
        );
      } else {
        setSearchResults(CURATED_TRACKS);
        setSearchStatusMsg(null);
      }
      setIsSearching(false);
      return;
    }

    if (isOfflineMode) {
      let cancelled = false;
      setIsSearching(false);
      void searchYouTube(searchQuery, { offlineOnly: true }).then((res) => {
        if (cancelled) return;
        setSearchResults(res.tracks);
        setSearchStatusMsg(res.message || 'Offline Mode · cached search');
      });
      return () => {
        cancelled = true;
      };
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchYouTube(searchQuery, { offlineOnly: false });
      setSearchResults(res.tracks);
      setIsSearching(false);
      if (res.source === 'local_backend') {
        setSearchStatusMsg(`Live catalog · ${res.tracks.length} tracks`);
      } else {
        setSearchStatusMsg(res.message || `Catalog · ${res.tracks.length} tracks`);
      }

      if (trimmed.length >= 2 && res.tracks.length > 0) {
        setRecentSearches((prev) => addSearchTerm(prev, trimmed));
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, isOfflineMode, cachedTracksList]);

  const handleCacheTrack = useCallback((track: Track) => {
    setCachedTrackEntries((prev) => {
      const updated = recordTrackPlay(prev, track);
      saveCachedTrackEntries(updated);
      return updated;
    });
    void syncTrackToServiceWorkerCache(track);
    setOfflineNotice(`Cached "${track.title}" for offline playback`);
  }, []);

  const handlePlayTrack = useCallback(
    (track: Track, contextList?: Track[]) => {
      if (!isTrackPlayableOffline(track, cachedYoutubeIds, isOfflineMode)) {
        setOfflineNotice(`"${track.title}" requires an internet connection.`);
        return;
      }

      unlockAudioKeepAlive();
      const rawList = contextList || (currentView === 'search' ? searchResults : chartTracks);
      const activeList = filterTracksForOffline(rawList, cachedYoutubeIds, isOfflineMode);
      const foundIndex = activeList.findIndex(
        (t) => t.id === track.id || t.youtubeId === track.youtubeId
      );

      if (foundIndex >= 0) {
        setQueue(activeList);
        setQueueIndex(foundIndex);
      } else {
        const updatedQueue = [
          ...filterTracksForOffline(queue, cachedYoutubeIds, isOfflineMode),
          track
        ];
        setQueue(updatedQueue);
        setQueueIndex(updatedQueue.length - 1);
      }

      setCurrentTrack(track);
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(track.durationSeconds || 210);

      setCachedTrackEntries((prev) => {
        const updated = recordTrackPlay(prev, track);
        saveCachedTrackEntries(updated);
        return updated;
      });
      void syncTrackToServiceWorkerCache(track);
    },
    [currentView, searchResults, chartTracks, queue, cachedYoutubeIds, isOfflineMode]
  );

  const handleInspectTrack = useCallback(
    (track: Track, contextList?: Track[]) => {
      if (!isTrackPlayableOffline(track, cachedYoutubeIds, isOfflineMode)) {
        setOfflineNotice(`"${track.title}" requires an internet connection.`);
        return;
      }
      if (!(currentTrack?.id === track.id || currentTrack?.youtubeId === track.youtubeId)) {
        handlePlayTrack(track, contextList);
      }
      setIsExpandedCoverOpen(true);
    },
    [currentTrack, handlePlayTrack, cachedYoutubeIds, isOfflineMode]
  );

  const handlePlayPause = useCallback(() => {
    unlockAudioKeepAlive();
    if (!currentTrack) {
      if (queue.length > 0) {
        const firstPlayable = filterTracksForOffline(queue, cachedYoutubeIds, isOfflineMode)[0];
        if (firstPlayable) {
          handlePlayTrack(firstPlayable);
        }
      }
      return;
    }
    if (!isPlaying && !isTrackPlayableOffline(currentTrack, cachedYoutubeIds, isOfflineMode)) {
      setOfflineNotice(`"${currentTrack.title}" is unavailable while offline.`);
      return;
    }
    setIsPlaying((prev) => !prev);
  }, [currentTrack, isPlaying, queue, cachedYoutubeIds, isOfflineMode, handlePlayTrack]);

  const handlePlayToggleTrack = useCallback(
    (track: Track, contextList: Track[]) => {
      const isCurrent =
        currentTrack?.id === track.id || currentTrack?.youtubeId === track.youtubeId;
      if (isCurrent) {
        handlePlayPause();
      } else {
        handlePlayTrack(track, contextList);
      }
    },
    [currentTrack, handlePlayPause, handlePlayTrack]
  );

  const handlePlayWorldRotation = useCallback(() => {
    const playable = filterTracksForOffline(CURATED_TRACKS, cachedYoutubeIds, isOfflineMode);
    const first = playable[0] || CURATED_TRACKS[0];
    if (first) handlePlayTrack(first, CURATED_TRACKS);
  }, [cachedYoutubeIds, isOfflineMode, handlePlayTrack]);

  const handleNext = useCallback(() => {
    if (sleepTimerMinutes === -1) {
      setIsPlaying(false);
      setSleepTimerMinutes(null);
      return;
    }

    const nextIdx = getNextIndex(queue.length, queueIndex, repeatMode, isShuffle, shuffledIndices);
    if (nextIdx !== null && nextIdx >= 0 && nextIdx < queue.length) {
      const nextTrack = queue[nextIdx];
      if (!isTrackPlayableOffline(nextTrack, cachedYoutubeIds, isOfflineMode)) {
        const fallbackIdx = queue.findIndex((t) =>
          isTrackPlayableOffline(t, cachedYoutubeIds, isOfflineMode)
        );
        if (fallbackIdx < 0) {
          setIsPlaying(false);
          setOfflineNotice('No more cached tracks in queue while offline.');
          return;
        }
        const fallbackTrack = queue[fallbackIdx];
        setQueueIndex(fallbackIdx);
        setCurrentTrack(fallbackTrack);
        setIsPlaying(true);
        setCurrentTime(0);
        setDuration(fallbackTrack.durationSeconds || 210);
        return;
      }
      setQueueIndex(nextIdx);
      setCurrentTrack(nextTrack);
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(nextTrack.durationSeconds || 210);
    } else {
      setIsPlaying(false);
    }
  }, [
    queue,
    queueIndex,
    repeatMode,
    isShuffle,
    shuffledIndices,
    sleepTimerMinutes,
    cachedYoutubeIds,
    isOfflineMode
  ]);

  const handlePrevious = useCallback(() => {
    if (currentTime > 3) {
      setSeekTarget(0);
      setCurrentTime(0);
      return;
    }
    const prevIdx = getPreviousIndex(queue.length, queueIndex, isShuffle, shuffledIndices);
    if (prevIdx !== null && prevIdx >= 0 && prevIdx < queue.length) {
      const prevTrack = queue[prevIdx];
      if (!isTrackPlayableOffline(prevTrack, cachedYoutubeIds, isOfflineMode)) {
        setOfflineNotice('Previous track requires internet connection.');
        return;
      }
      setQueueIndex(prevIdx);
      setCurrentTrack(prevTrack);
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(prevTrack.durationSeconds || 210);
    }
  }, [currentTime, queue, queueIndex, isShuffle, shuffledIndices, cachedYoutubeIds, isOfflineMode]);

  const handleSeek = useCallback((seconds: number) => {
    setSeekTarget(seconds);
    setCurrentTime(seconds);
  }, []);

  const handleToggleLike = useCallback((track: Track) => {
    setLikedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(track.id)) {
        next.delete(track.id);
      } else {
        next.add(track.id);
      }
      return next;
    });
  }, []);

  const handleAddToQueue = useCallback((track: Track) => {
    setQueue((prev) => addToQueue(prev, track, false));
  }, []);

  const handlePlayNext = useCallback(
    (track: Track) => {
      setQueue((prev) => addToQueue(prev, track, true, queueIndex));
    },
    [queueIndex]
  );

  const handleRemoveFromQueue = useCallback(
    (indexToRemove: number) => {
      setQueue((prev) => removeFromQueue(prev, indexToRemove));
      if (indexToRemove < queueIndex) {
        setQueueIndex((prev) => prev - 1);
      }
    },
    [queueIndex]
  );

  const handleMoveTrack = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((prev) => reorderQueue(prev, fromIndex, toIndex));
  }, []);

  const handleClearUpcomingQueue = useCallback(() => {
    setQueue((prev) => prev.slice(0, queueIndex + 1));
  }, [queueIndex]);

  const handleCreatePlaylist = useCallback(
    (newPlaylist: Playlist) => {
      setCustomPlaylists((prev) => [...prev, newPlaylist]);
      navigateTo('playlist', newPlaylist.id);
    },
    [navigateTo]
  );

  const handleAddToPlaylist = useCallback((playlistId: string, track: Track) => {
    setCustomPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          const exists = pl.tracks.some(
            (t) => t.id === track.id || t.youtubeId === track.youtubeId
          );
          if (exists) return pl;
          return {
            ...pl,
            tracks: [...pl.tracks, track]
          };
        }
        return pl;
      })
    );
  }, []);

  const handlePlayerStateChange = useCallback(
    (state: 'playing' | 'paused' | 'ended' | 'buffering') => {
      if (state === 'playing') {
        setIsPlaying(true);
      } else if (state === 'paused') {
        setIsPlaying(false);
      } else if (state === 'ended') {
        if (repeatMode === 'one') {
          setSeekTarget(0);
          setCurrentTime(0);
          setIsPlaying(true);
        } else {
          handleNext();
        }
      }
    },
    [handleNext, repeatMode]
  );

  const fallbackAttemptsRef = useRef<Record<string, number>>({});

  const handleTrackError = useCallback(
    async (failedTrack: Track, errorCode: number) => {
      if ((errorCode === 100 || errorCode === 101 || errorCode === 150) && !isOfflineMode) {
        failedFallbackIdsRef.current.add(failedTrack.youtubeId);
        const attempts = fallbackAttemptsRef.current[failedTrack.id] || 0;
        if (attempts < 1) {
          fallbackAttemptsRef.current[failedTrack.id] = attempts + 1;
          try {
            const res = await searchYouTube(`${failedTrack.title} ${failedTrack.artist} audio`, {
              offlineOnly: false
            });
            const alternative = res.tracks.find(
              (t) => t.youtubeId && !failedFallbackIdsRef.current.has(t.youtubeId)
            );
            if (alternative) {
              setCurrentTrack((prev) =>
                prev && prev.id === failedTrack.id
                  ? { ...prev, youtubeId: alternative.youtubeId, thumbnail: alternative.thumbnail }
                  : prev
              );
              setIsPlaying(true);
              return;
            }
          } catch {
            // ignore fallback search errors
          }
        }
      }
      setIsPlaying(false);
    },
    [isOfflineMode]
  );

  const lastTimeRef = useRef(0);
  const handleTimeUpdate = useCallback(
    (curr: number, dur: number) => {
      if (
        Math.abs(curr - lastTimeRef.current) >= 0.18 ||
        Math.abs(curr - lastTimeRef.current) > 1.5
      ) {
        lastTimeRef.current = curr;
        setCurrentTime(curr);
      }
      if (dur > 0 && Math.abs(duration - dur) > 2) {
        setDuration(dur);
      }
    },
    [duration]
  );

  const featuredHomeTracks = useMemo(() => CURATED_TRACKS.slice(0, 4), []);

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-[#070607] text-[#F4F1F1] font-sans antialiased">
      {/* Application Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Minimal Left Navigation Rail */}
        <Sidebar
          currentView={currentView}
          selectedPlaylistId={selectedPlaylistId}
          customPlaylists={customPlaylists}
          likedCount={likedTrackIds.size}
          onNavigate={handleNavigate}
          onSelectPlaylist={handleOpenPlaylist}
          onOpenLegal={(tab) => {
            setLegalTab(tab || 'privacy');
            setIsLegalOpen(true);
          }}
          onOpenCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
        />

        {/* Central Content Viewport */}
        <div className="flex-1 flex flex-col bg-[#070607] overflow-hidden relative">
          <Header
            currentView={currentView}
            canGoBack={canGoBack}
            searchQuery={searchQuery}
            recentSearches={recentSearches}
            isOfflineMode={isOfflineMode}
            onSearchChange={(q) => {
              setSearchQuery(q);
              if (currentView !== 'search' && q.trim()) {
                navigateTo('search');
              }
            }}
            onSubmitSearch={(term) => {
              handleAddRecentSearch(term);
            }}
            onSelectRecentSearch={handleSelectRecentSearch}
            onRemoveRecentSearch={handleRemoveRecentSearch}
            onClearRecentSearches={handleClearAllRecentSearches}
            onOpenLegal={(tab) => {
              setLegalTab(tab || 'privacy');
              setIsLegalOpen(true);
            }}
            onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
            onBack={handleBack}
          />

          <main
            ref={mainContentRef}
            className="flex-1 overflow-y-auto px-3 sm:px-5 md:px-7 py-4 sm:py-6 scrollbar-thin"
          >
            <div key={viewKey} className="animate-view-fade-slide w-full max-w-7xl mx-auto min-h-full">
              {currentView === 'home' && (
                <HomePage
                  featuredTracks={featuredHomeTracks}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  cachedYoutubeIds={cachedYoutubeIds}
                  isOfflineMode={isOfflineMode}
                  cachedCount={cachedTrackEntries.length}
                  mixesCount={allPlaylists.length}
                  countriesCount={WORLD_COUNTRY_PRESETS.length}
                  onPlayRotation={handlePlayWorldRotation}
                  onNavigatePage={handleNavigate}
                  onInspectTrack={handleInspectTrack}
                  onPlayToggleTrack={handlePlayToggleTrack}
                />
              )}

              {currentView !== 'home' && (
                <Suspense fallback={<PageLoader />}>
                  {currentView === 'countries' && (
                    <CountriesPage onSelectCountry={handleSelectCountry} />
                  )}

                  {currentView === 'mixes' && (
                    <MixesPage
                      playlists={allPlaylists}
                      cachedYoutubeIds={cachedYoutubeIds}
                      isOfflineMode={isOfflineMode}
                      onOpenPlaylist={handleOpenPlaylist}
                      onPlayPlaylist={handlePlayTrack}
                    />
                  )}

                  {currentView === 'charts' && (
                    <ChartsPage
                      selectedRegion={selectedRegion}
                      onSelectRegion={setSelectedRegion}
                      tracks={chartTracks}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      likedTrackIds={likedTrackIds}
                      cachedYoutubeIds={cachedYoutubeIds}
                      isOfflineMode={isOfflineMode}
                      customPlaylists={customPlaylists}
                      onPlayTrack={handlePlayTrack}
                      onInspectTrack={handleInspectTrack}
                      onToggleLike={handleToggleLike}
                      onAddToQueue={handleAddToQueue}
                      onPlayNext={handlePlayNext}
                      onAddToPlaylist={handleAddToPlaylist}
                      onCacheTrack={handleCacheTrack}
                    />
                  )}

                  {currentView === 'recent' && (
                    <RecentPage
                      frequentTracks={frequentTracks}
                      cachedTracksList={cachedTracksList}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      likedTrackIds={likedTrackIds}
                      cachedYoutubeIds={cachedYoutubeIds}
                      isOfflineMode={isOfflineMode}
                      customPlaylists={customPlaylists}
                      onPlayTrack={handlePlayTrack}
                      onInspectTrack={handleInspectTrack}
                      onToggleLike={handleToggleLike}
                      onAddToQueue={handleAddToQueue}
                      onPlayNext={handlePlayNext}
                      onAddToPlaylist={handleAddToPlaylist}
                      onCacheTrack={handleCacheTrack}
                    />
                  )}

                  {currentView === 'playlist' && activePlaylist && (
                    <PlaylistPage
                      playlist={activePlaylist}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      likedTrackIds={likedTrackIds}
                      cachedYoutubeIds={cachedYoutubeIds}
                      isOfflineMode={isOfflineMode}
                      customPlaylists={customPlaylists}
                      onPlayTrack={handlePlayTrack}
                      onInspectTrack={handleInspectTrack}
                      onToggleLike={handleToggleLike}
                      onAddToQueue={handleAddToQueue}
                      onPlayNext={handlePlayNext}
                      onAddToPlaylist={handleAddToPlaylist}
                      onCacheTrack={handleCacheTrack}
                    />
                  )}

                  {currentView === 'search' && (
                    <SearchPage
                      searchQuery={searchQuery}
                      searchStatusMsg={searchStatusMsg}
                      isSearching={isSearching}
                      searchResults={searchResults}
                      recentSearches={recentSearches}
                      cachedTracksList={cachedTracksList}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      likedTrackIds={likedTrackIds}
                      cachedYoutubeIds={cachedYoutubeIds}
                      isOfflineMode={isOfflineMode}
                      customPlaylists={customPlaylists}
                      onSelectSearch={handleSelectRecentSearch}
                      onRemoveSearch={handleRemoveRecentSearch}
                      onClearAllSearches={handleClearAllRecentSearches}
                      onAddRecentSearch={handleAddRecentSearch}
                      onPlayTrack={handlePlayTrack}
                      onInspectTrack={handleInspectTrack}
                      onToggleLike={handleToggleLike}
                      onAddToQueue={handleAddToQueue}
                      onPlayNext={handlePlayNext}
                      onAddToPlaylist={handleAddToPlaylist}
                      onCacheTrack={handleCacheTrack}
                    />
                  )}

                  {currentView === 'library' && (
                    <LibraryPage
                      likedCount={likedTrackIds.size}
                      cachedCount={cachedTrackEntries.length}
                      playlists={allPlaylists}
                      onOpenPlaylist={handleOpenPlaylist}
                      onOpenRecent={() => navigateTo('recent')}
                      onOpenCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
                    />
                  )}
                </Suspense>
              )}
            </div>
          </main>
        </div>

        {/* Lazy Dynamic Queue Side Drawer */}
        {isQueueOpen && (
          <Suspense fallback={null}>
            <QueueDrawer
              isOpen={isQueueOpen}
              onClose={() => setIsQueueOpen(false)}
              currentTrack={currentTrack}
              queue={queue}
              queueIndex={queueIndex}
              onPlayTrackAt={(idx) => {
                if (idx >= 0 && idx < queue.length) {
                  const track = queue[idx];
                  if (!isTrackPlayableOffline(track, cachedYoutubeIds, isOfflineMode)) {
                    setOfflineNotice(`"${track.title}" requires an internet connection.`);
                    return;
                  }
                  unlockAudioKeepAlive();
                  setQueueIndex(idx);
                  setCurrentTrack(track);
                  setIsPlaying(true);
                  setCurrentTime(0);
                  setDuration(track.durationSeconds || 210);
                }
              }}
              onRemoveTrackAt={handleRemoveFromQueue}
              onMoveTrack={handleMoveTrack}
              onClearQueue={handleClearUpcomingQueue}
            />
          </Suspense>
        )}
      </div>

      {/* Lazy Modals (only downloaded/mounted on demand) */}
      {isExpandedCoverOpen && (
        <Suspense fallback={null}>
          <ExpandedCoverModal
            isOpen={isExpandedCoverOpen}
            onClose={() => setIsExpandedCoverOpen(false)}
            track={currentTrack}
            catalog={CURATED_TRACKS}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            repeatMode={repeatMode}
            isShuffle={isShuffle}
            isLiked={currentTrack ? likedTrackIds.has(currentTrack.id) : false}
            onPlayPause={handlePlayPause}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSeek={handleSeek}
            onToggleRepeat={() => {
              setRepeatMode((prev) => {
                if (prev === 'off') return 'all';
                if (prev === 'all') return 'one';
                return 'off';
              });
            }}
            onToggleShuffle={() => setIsShuffle((prev) => !prev)}
            onToggleLike={(track) => handleToggleLike(track)}
            onPlayTrack={handlePlayTrack}
            onSearchArtist={handleSelectRecentSearch}
          />
        </Suspense>
      )}

      {isSleepTimerOpen && (
        <Suspense fallback={null}>
          <SleepTimerModal
            isOpen={isSleepTimerOpen}
            onClose={() => setIsSleepTimerOpen(false)}
            activeTimerMinutes={sleepTimerMinutes}
            onSetTimer={setSleepTimerMinutes}
          />
        </Suspense>
      )}

      {isCreatePlaylistOpen && (
        <Suspense fallback={null}>
          <CreatePlaylistModal
            isOpen={isCreatePlaylistOpen}
            onClose={() => setIsCreatePlaylistOpen(false)}
            onCreatePlaylist={handleCreatePlaylist}
          />
        </Suspense>
      )}

      <YouTubePlayerEmbed
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        volume={volume}
        isMuted={isMuted}
        seekTarget={seekTarget}
        onClearSeek={() => setSeekTarget(null)}
        onTimeUpdate={handleTimeUpdate}
        onPlayerStateChange={handlePlayerStateChange}
        onTrackError={handleTrackError}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSeek={handleSeek}
      />

      <PlayerBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        repeatMode={repeatMode}
        isShuffle={isShuffle}
        isLiked={currentTrack ? likedTrackIds.has(currentTrack.id) : false}
        isQueueOpen={isQueueOpen}
        activeSleepTimer={sleepTimerMinutes}
        queueCount={queue.length > 0 ? Math.max(0, queue.length - queueIndex - 1) : 0}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSeek={handleSeek}
        onVolumeChange={(val) => {
          setVolume(val);
          if (val > 0 && isMuted) setIsMuted(false);
        }}
        onToggleMute={() => setIsMuted((prev) => !prev)}
        onToggleShuffle={() => setIsShuffle((prev) => !prev)}
        onToggleRepeat={() => {
          setRepeatMode((prev) => {
            if (prev === 'off') return 'all';
            if (prev === 'all') return 'one';
            return 'off';
          });
        }}
        onToggleLike={(track) => handleToggleLike(track)}
        onToggleQueue={() => setIsQueueOpen((prev) => !prev)}
        onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
        onOpenExpandedCover={() => setIsExpandedCoverOpen(true)}
      />

      <MobileNav
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
      />

      {isBgPermissionOpen && (
        <Suspense fallback={null}>
          <BackgroundPermissionModal
            isOpen={isBgPermissionOpen}
            onClose={() => setIsBgPermissionOpen(false)}
            onPermissionGranted={() => {
              setOfflineNotice('All permissions allowed — background & offline mode ready');
            }}
          />
        </Suspense>
      )}

      {offlineNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-40 md:bottom-28 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-[#110E0F]/95 border border-[#EF2323]/45 px-4 py-2 text-xs font-semibold text-white shadow-2xl whitespace-nowrap max-w-[92vw] truncate"
        >
          {offlineNotice}
        </div>
      )}

      <OfflineIndicator cachedTrackCount={cachedTrackEntries.length} />

      {isLegalOpen && (
        <Suspense fallback={null}>
          <LegalModal
            isOpen={isLegalOpen}
            onClose={() => setIsLegalOpen(false)}
            initialTab={legalTab}
          />
        </Suspense>
      )}
    </div>
  );
}
