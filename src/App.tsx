import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  Heart,
  Clock,
  Sparkles,
  Music2,
  ListMusic,
  Flame,
  Globe2,
  Compass,
  Radio,
  Search,
  Moon,
  PlusSquare
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Header } from './components/Header';
import { PlayerBar } from './components/PlayerBar';
import { TrackRow } from './components/TrackRow';
import { QueueDrawer } from './components/QueueDrawer';
import { RecentSearches } from './components/RecentSearches';
import { LegalModal } from './components/LegalModal';
import { ExpandedCoverModal } from './components/ExpandedCoverModal';
import { SleepTimerModal } from './components/SleepTimerModal';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { YouTubePlayerEmbed } from './components/YouTubePlayerEmbed';
import { CoverImage } from './components/CoverImage';
import { OfflineIndicator } from './components/OfflineIndicator';
import { BackgroundPermissionModal } from './components/BackgroundPermissionModal';
import { CURATED_TRACKS, PLAYLISTS } from './data/curatedTracks';
import { Track, Playlist, RepeatMode } from './types/music';
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
import { formatDuration } from './utils/formatters';
import { safeParseJson, sanitizeMediaUrl, sanitizeClientText } from './utils/security';
import { unlockAudioKeepAlive } from './utils/backgroundAudio';

export default function App() {
  // Navigation & View State
  const [currentView, setCurrentView] = useState<'home' | 'search' | 'library' | 'playlist'>('home');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
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

  // Automatic Offline Detection (no manual toggle — switches automatically on network loss/recovery)
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
        ? 'Internet restored — live search & full streaming enabled'
        : `Offline detected — playing ${cachedTrackEntries.length} cached ${cachedTrackEntries.length === 1 ? 'track' : 'tracks'} only`
    );
  }, [isOnline, cachedTrackEntries.length]);

  useEffect(() => {
    if (!offlineNotice) return;
    const t = setTimeout(() => setOfflineNotice(null), 3500);
    return () => clearTimeout(t);
  }, [offlineNotice]);

  useEffect(() => {
    // Pre-warm initial cover artwork thumbnails into Cache Storage on idle
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

  // Save recent searches to localStorage
  useEffect(() => {
    saveRecentSearches(recentSearches);
  }, [recentSearches]);

  const handleSelectRecentSearch = useCallback((term: string) => {
    setSearchQuery(term);
    setCurrentView('search');
    setRecentSearches(prev => addSearchTerm(prev, term));
  }, []);

  const handleRemoveRecentSearch = useCallback((term: string) => {
    setRecentSearches(prev => removeSearchTerm(prev, term));
  }, []);

  const handleClearAllRecentSearches = useCallback(() => {
    setRecentSearches(clearSearchTerms());
  }, []);

  const handleAddRecentSearch = useCallback((term: string) => {
    if (term.trim()) {
      setRecentSearches(prev => addSearchTerm(prev, term));
    }
  }, []);

  // Modals & Panels State
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [isExpandedCoverOpen, setIsExpandedCoverOpen] = useState(false);
  const [isSleepTimerOpen, setIsSleepTimerOpen] = useState(false);
  const [isBgPermissionOpen, setIsBgPermissionOpen] = useState<boolean>(() =>
    shouldAutoPromptPermissionsOnEntry({
      alreadyPrompted: loadPermissionsPrompted(),
      notificationPermission: getNotificationPermissionState()
    })
  );
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms' | 'dmca' | 'cookies'>('privacy');

  // Sleep Timer state
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerSecondsLeft, setSleepTimerSecondsLeft] = useState<number | null>(null);

  // Custom User Playlists
  const [customPlaylists, setCustomPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem('spotitube_custom_playlists');
      const parsed = safeParseJson<Playlist[]>(saved, [], (val): val is Playlist[] => Array.isArray(val));
      return parsed
        .filter((pl) => pl && typeof pl.id === 'string' && typeof pl.name === 'string')
        .map((pl) => ({
          ...pl,
          name: sanitizeClientText(pl.name, 80) || 'Custom Playlist',
          description: sanitizeClientText(pl.description || '', 200),
          coverImage: sanitizeMediaUrl(
            pl.coverImage,
            'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80'
          ),
          tracks: Array.isArray(pl.tracks) ? pl.tracks : []
        }));
    } catch {
      return [];
    }
  });

  // Save custom playlists to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('spotitube_custom_playlists', JSON.stringify(customPlaylists));
    } catch {
      // storage error
    }
  }, [customPlaylists]);

  // Combined playlists (built-in + user custom)
  const allPlaylists = useMemo(() => {
    return [...PLAYLISTS, ...customPlaylists];
  }, [customPlaylists]);

  // Player State (No default track — user chooses their own music)
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

  // User Liked Songs (Stored in localStorage)
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('spotitube_liked_ids');
      const parsed = safeParseJson<string[]>(
        saved,
        ['chaabi_1', 'rai_1', 'rap_1'],
        (val): val is string[] => Array.isArray(val) && val.every((x) => typeof x === 'string')
      );
      return new Set(parsed.slice(0, 500));
    } catch {
      return new Set(['chaabi_1', 'rai_1', 'rap_1']);
    }
  });

  // Save liked songs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('spotitube_liked_ids', JSON.stringify(Array.from(likedTrackIds)));
    } catch {
      // storage error
    }
  }, [likedTrackIds]);

  // Sleep Timer countdown ticker
  useEffect(() => {
    if (sleepTimerMinutes === null || sleepTimerMinutes === -1) {
      setSleepTimerSecondsLeft(null);
      return;
    }

    setSleepTimerSecondsLeft(sleepTimerMinutes * 60);

    const interval = setInterval(() => {
      setSleepTimerSecondsLeft(prev => {
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

  // Dynamic Time Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Update Shuffled Indices when queue or shuffle changes
  useEffect(() => {
    if (isShuffle) {
      setShuffledIndices(generateShuffledIndices(queue.length, queueIndex));
    }
  }, [isShuffle, queue.length]);

  // Liked Tracks list
  const likedTracks = useMemo(() => {
    return CURATED_TRACKS.filter(t => likedTrackIds.has(t.id));
  }, [likedTrackIds]);

  // Filtered tracks for the current view
  const displayedTracks = useMemo(() => {
    if (selectedGenre !== 'all') {
      return CURATED_TRACKS.filter(t => t.genre === selectedGenre);
    }
    return CURATED_TRACKS;
  }, [selectedGenre]);

  // Main scroll container ref for view transition resets
  const mainContentRef = useRef<HTMLElement>(null);

  // Dynamic view key to trigger CSS transition animation on view or playlist change
  const viewKey = useMemo(() => {
    if (currentView === 'playlist') {
      return `playlist-${selectedPlaylistId || 'default'}`;
    }
    return currentView;
  }, [currentView, selectedPlaylistId]);

  // Scroll to top on view transition for smooth feel
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [viewKey]);

  // Active playlist data if in playlist view
  const activePlaylist = useMemo(() => {
    if (selectedPlaylistId === 'liked') {
      return {
        id: 'liked',
        name: 'Liked Songs',
        description: 'Your favorite personal collection of tracks and anthems.',
        coverImage: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
        tracks: likedTracks
      };
    }
    return allPlaylists.find(p => p.id === selectedPlaylistId) || null;
  }, [selectedPlaylistId, likedTracks, allPlaylists]);

  // Search effect with debounce (strictly cached-only when offline is detected)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      if (isOfflineMode) {
        setSearchResults(cachedTracksList);
        setSearchStatusMsg(
          cachedTracksList.length > 0
            ? `Offline (Auto) — showing ${cachedTracksList.length} cached ${cachedTracksList.length === 1 ? 'track' : 'tracks'} only`
            : 'Offline (Auto) — no cached tracks saved yet'
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
        setSearchStatusMsg(res.message || 'Offline (Auto) — cached search only');
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
        setSearchStatusMsg(`Live results (${res.tracks.length} tracks)`);
      } else {
        setSearchStatusMsg(res.message || `Catalog matches (${res.tracks.length} tracks)`);
      }

      // Automatically persist successful searches to Recent Searches
      if (trimmed.length >= 2 && res.tracks.length > 0) {
        setRecentSearches(prev => addSearchTerm(prev, trimmed));
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, isOfflineMode, cachedTracksList]);

  const handleCacheTrack = useCallback((track: Track) => {
    setCachedTrackEntries(prev => {
      const updated = recordTrackPlay(prev, track);
      saveCachedTrackEntries(updated);
      return updated;
    });
    void syncTrackToServiceWorkerCache(track);
    setOfflineNotice(`Cached "${track.title}" for offline playback`);
  }, []);

  // Track playback handlers
  const handlePlayTrack = useCallback((track: Track, contextList?: Track[]) => {
    if (!isTrackPlayableOffline(track, cachedYoutubeIds, isOfflineMode)) {
      setOfflineNotice(`"${track.title}" requires an internet connection.`);
      return;
    }

    unlockAudioKeepAlive();
    const rawList = contextList || (currentView === 'search' ? searchResults : displayedTracks);
    const activeList = filterTracksForOffline(rawList, cachedYoutubeIds, isOfflineMode);
    const foundIndex = activeList.findIndex(t => t.id === track.id || t.youtubeId === track.youtubeId);

    if (foundIndex >= 0) {
      setQueue(activeList);
      setQueueIndex(foundIndex);
    } else {
      const updatedQueue = [...filterTracksForOffline(queue, cachedYoutubeIds, isOfflineMode), track];
      setQueue(updatedQueue);
      setQueueIndex(updatedQueue.length - 1);
    }

    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(track.durationSeconds || 210);

    // Cache track metadata & thumbnail for Cache-First offline/intermittent resilience
    setCachedTrackEntries(prev => {
      const updated = recordTrackPlay(prev, track);
      saveCachedTrackEntries(updated);
      return updated;
    });
    void syncTrackToServiceWorkerCache(track);
  }, [currentView, searchResults, displayedTracks, queue, cachedYoutubeIds, isOfflineMode]);

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
    setIsPlaying(prev => !prev);
  }, [currentTrack, isPlaying, queue, cachedYoutubeIds, isOfflineMode, handlePlayTrack]);

  const handleNext = useCallback(() => {
    // If sleep timer is set to "End of track", stop playback on completion
    if (sleepTimerMinutes === -1) {
      setIsPlaying(false);
      setSleepTimerMinutes(null);
      return;
    }

    const nextIdx = getNextIndex(queue.length, queueIndex, repeatMode, isShuffle, shuffledIndices);
    if (nextIdx !== null && nextIdx >= 0 && nextIdx < queue.length) {
      const nextTrack = queue[nextIdx];
      if (!isTrackPlayableOffline(nextTrack, cachedYoutubeIds, isOfflineMode)) {
        const fallbackIdx = queue.findIndex((t) => isTrackPlayableOffline(t, cachedYoutubeIds, isOfflineMode));
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
  }, [queue, queueIndex, repeatMode, isShuffle, shuffledIndices, sleepTimerMinutes, cachedYoutubeIds, isOfflineMode]);

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
    setLikedTrackIds(prev => {
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
    setQueue(prev => addToQueue(prev, track, false));
  }, []);

  const handlePlayNext = useCallback((track: Track) => {
    setQueue(prev => addToQueue(prev, track, true, queueIndex));
  }, [queueIndex]);

  const handleRemoveFromQueue = useCallback((indexToRemove: number) => {
    setQueue(prev => removeFromQueue(prev, indexToRemove));
    if (indexToRemove < queueIndex) {
      setQueueIndex(prev => prev - 1);
    }
  }, [queueIndex]);

  const handleMoveTrack = useCallback((fromIndex: number, toIndex: number) => {
    setQueue(prev => reorderQueue(prev, fromIndex, toIndex));
  }, []);

  const handleClearUpcomingQueue = useCallback(() => {
    setQueue(prev => prev.slice(0, queueIndex + 1));
  }, [queueIndex]);

  const handleCreatePlaylist = useCallback((newPlaylist: Playlist) => {
    setCustomPlaylists(prev => [...prev, newPlaylist]);
    setSelectedPlaylistId(newPlaylist.id);
    setCurrentView('playlist');
  }, []);

  const handleAddToPlaylist = useCallback((playlistId: string, track: Track) => {
    setCustomPlaylists(prev => {
      return prev.map(pl => {
        if (pl.id === playlistId) {
          const exists = pl.tracks.some(t => t.id === track.id || t.youtubeId === track.youtubeId);
          if (exists) return pl;
          return {
            ...pl,
            tracks: [...pl.tracks, track]
          };
        }
        return pl;
      });
    });
  }, []);

  const handlePlayerStateChange = useCallback((state: 'playing' | 'paused' | 'ended' | 'buffering') => {
    if (state === 'playing') {
      setIsPlaying(true);
    } else if (state === 'paused') {
      setIsPlaying(false);
    } else if (state === 'ended') {
      if (repeatMode === 'one') {
        // Repeat One Track: Replay immediately from beginning
        setSeekTarget(0);
        setCurrentTime(0);
        setIsPlaying(true);
      } else {
        // Repeat Queue or Off: Auto-play next song in queue
        handleNext();
      }
    }
  }, [handleNext, repeatMode]);

  const fallbackAttemptsRef = useRef<Record<string, number>>({});

  const handleTrackError = useCallback(async (failedTrack: Track, errorCode: number) => {
    // Codes 100, 101, 150 indicate video unavailable or embedding restricted by uploader
    if ((errorCode === 100 || errorCode === 101 || errorCode === 150) && !isOfflineMode) {
      failedFallbackIdsRef.current.add(failedTrack.youtubeId);
      const attempts = fallbackAttemptsRef.current[failedTrack.id] || 0;
      if (attempts < 1) {
        fallbackAttemptsRef.current[failedTrack.id] = attempts + 1;
        try {
          const res = await searchYouTube(`${failedTrack.title} ${failedTrack.artist} audio`, { offlineOnly: false });
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
  }, [isOfflineMode]);

  const lastTimeRef = useRef(0);
  const handleTimeUpdate = useCallback((curr: number, dur: number) => {
    // Only dispatch React state update if audio has progressed by at least 180ms or jumped
    if (Math.abs(curr - lastTimeRef.current) >= 0.18 || Math.abs(curr - lastTimeRef.current) > 1.5) {
      lastTimeRef.current = curr;
      setCurrentTime(curr);
    }
    if (dur > 0 && Math.abs(duration - dur) > 2) {
      setDuration(dur);
    }
  }, [duration]);

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-black text-white font-sans antialiased">
      {/* Top Application Body (Sidebar + Main Content + Side Panels) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Spotify-style Left Sidebar */}
        <Sidebar
          currentView={currentView}
          selectedPlaylistId={selectedPlaylistId}
          playlists={allPlaylists}
          likedCount={likedTrackIds.size}
          onNavigate={(view) => {
            setCurrentView(view);
            setSelectedPlaylistId(null);
            if (view === 'search') {
              setTimeout(() => {
                const input = document.getElementById('spotitube-search-input') as HTMLInputElement | null;
                input?.focus();
                (window as unknown as { SpotiTubeAndroid?: { showKeyboard?: () => void } }).SpotiTubeAndroid?.showKeyboard?.();
              }, 60);
            }
          }}
          onSelectPlaylist={(pId) => {
            setSelectedPlaylistId(pId);
            setCurrentView('playlist');
          }}
          onOpenLegal={(tab) => {
            setLegalTab(tab || 'privacy');
            setIsLegalOpen(true);
          }}
          onOpenCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
        />

        {/* Central Content Panel */}
        <div className="flex-1 flex flex-col bg-[#121212] overflow-hidden relative">
          {/* Top Sticky Header */}
          <Header
            currentView={currentView}
            searchQuery={searchQuery}
            recentSearches={recentSearches}
            isOfflineMode={isOfflineMode}
            onSearchChange={(q) => {
              setSearchQuery(q);
              if (currentView !== 'search' && q.trim()) {
                setCurrentView('search');
              }
            }}
            onSubmitSearch={(term) => {
              handleAddRecentSearch(term);
            }}
            onSelectRecentSearch={handleSelectRecentSearch}
            onRemoveRecentSearch={handleRemoveRecentSearch}
            onClearRecentSearches={handleClearAllRecentSearches}
            selectedGenre={selectedGenre}
            onGenreSelect={(genre) => {
              setSelectedGenre(genre);
              if (currentView !== 'home') {
                setCurrentView('home');
                setSelectedPlaylistId(null);
              }
            }}
            onOpenLegal={(tab) => {
              setLegalTab(tab || 'privacy');
              setIsLegalOpen(true);
            }}
            onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
            onBack={() => {
              if (selectedPlaylistId) {
                setSelectedPlaylistId(null);
                setCurrentView('home');
              } else if (currentView === 'search') {
                setCurrentView('home');
              }
            }}
          />

          {/* Scrollable View Area with CSS View Transition Animation */}
          <main
            ref={mainContentRef}
            className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 scrollbar-thin scrollbar-thumb-neutral-700"
          >
            <div
              key={viewKey}
              className="animate-view-fade-slide w-full min-h-full"
            >
              {/* VIEW 1: PLAYLIST OR LIKED SONGS VIEW */}
            {currentView === 'playlist' && activePlaylist && (
              <div className="space-y-5 sm:space-y-6">
                {/* Playlist Banner */}
                <div className="flex flex-col md:flex-row items-center md:items-end text-center md:text-left gap-4 sm:gap-6 bg-gradient-to-b from-neutral-800/80 to-[#121212] p-4 sm:p-6 rounded-2xl border border-neutral-800 shadow-xl">
                  <CoverImage
                    src={activePlaylist.coverImage}
                    alt={activePlaylist.name}
                    youtubeId={activePlaylist.tracks[0]?.youtubeId}
                    loading="eager"
                    className="w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 rounded-xl object-cover shadow-2xl shadow-black/80 shrink-0"
                  />
                  <div className="flex-1 space-y-2 min-w-0 w-full">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                        {activePlaylist.isCustom ? 'Custom Playlist' : 'Playlist'}
                      </span>
                      <span className="text-[10px] bg-[#1db954] text-black font-extrabold px-2 py-0.5 rounded-full">
                        {activePlaylist.isCustom ? 'CUSTOM MIX' : 'CURATED MIX'}
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white tracking-tight break-words">
                      {activePlaylist.name}
                    </h1>
                    <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl mx-auto md:mx-0">
                      {activePlaylist.description}
                    </p>
                    <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-neutral-400 pt-1">
                      <span className="font-semibold text-white">SpotiTube Collection</span>
                      <span>•</span>
                      <span>{activePlaylist.tracks.length} songs</span>
                    </div>
                  </div>
                </div>

                {/* Playlist Actions */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      const playable = filterTracksForOffline(activePlaylist.tracks, cachedYoutubeIds, isOfflineMode);
                      if (playable.length > 0) {
                        handlePlayTrack(playable[0], activePlaylist.tracks);
                      } else if (activePlaylist.tracks.length > 0) {
                        handlePlayTrack(activePlaylist.tracks[0], activePlaylist.tracks);
                      }
                    }}
                    aria-label={`Play ${activePlaylist.name}`}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#1db954] hover:bg-[#1ed760] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#1db954]/20 cursor-pointer"
                  >
                    <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current translate-x-0.5" />
                  </button>
                </div>

                {/* Track List */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 sm:gap-4 px-2 sm:px-4 py-2 text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                    <span className="w-5 sm:w-6 text-center">#</span>
                    <span className="flex-1">Title</span>
                    <span className="hidden md:block w-1/4">Album</span>
                    <span className="w-12 text-right"><Clock className="w-3.5 h-3.5 ml-auto" /></span>
                  </div>

                  {activePlaylist.tracks.length === 0 ? (
                    <div className="text-center py-12 text-neutral-400 text-sm space-y-2">
                      <p>No tracks in this playlist yet.</p>
                      <p className="text-xs text-neutral-500">
                        Search for any song or browse Home, then click "..." on any track to add it here!
                      </p>
                    </div>
                  ) : (
                    activePlaylist.tracks.map((track, idx) => {
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
                          onPlay={(t) => handlePlayTrack(t, activePlaylist.tracks)}
                          onToggleLike={handleToggleLike}
                          onAddToQueue={handleAddToQueue}
                          onPlayNext={handlePlayNext}
                          onAddToPlaylist={handleAddToPlaylist}
                          onCacheTrack={handleCacheTrack}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2: SEARCH RESULTS & RECENT SEARCHES VIEW */}
            {currentView === 'search' && (
              <div className="space-y-6">
                {/* Search Header Info */}
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-white break-words">
                      {searchQuery ? `Search Results for "${searchQuery}"` : 'Search & Discover'}
                    </h1>
                    {searchStatusMsg && searchQuery && (
                      <p className="text-xs text-[#1db954] mt-1 font-mono">
                        {searchStatusMsg}
                      </p>
                    )}
                  </div>
                </div>

                {/* Case 1: When user has not typed a query, show Cached Tracks (if Offline), Recent Searches & Browse categories */}
                {!searchQuery.trim() ? (
                  <div className="space-y-6 sm:space-y-8">
                    {isOfflineMode && (
                      <section className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                            Cached Tracks (Offline)
                          </h2>
                          <span className="text-xs font-mono text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full">
                            {cachedTracksList.length} cached
                          </span>
                        </div>
                        {cachedTracksList.length === 0 ? (
                          <div className="rounded-xl bg-neutral-900/70 border border-neutral-800 p-5 text-sm text-neutral-300">
                            No cached tracks yet. Play any track or choose &ldquo;Cache for Offline&rdquo; while connected to listen without internet.
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
                                onPlay={(t) => handlePlayTrack(t, cachedTracksList)}
                                onToggleLike={handleToggleLike}
                                onAddToQueue={handleAddToQueue}
                                onPlayNext={handlePlayNext}
                                onAddToPlaylist={handleAddToPlaylist}
                                onCacheTrack={handleCacheTrack}
                              />
                            ))}
                          </div>
                        )}
                      </section>
                    )}

                    {/* Persistent Recent Searches Section */}
                    {recentSearches.length > 0 && (
                      <RecentSearches
                        searches={recentSearches}
                        onSelectSearch={handleSelectRecentSearch}
                        onRemoveSearch={handleRemoveRecentSearch}
                        onClearAll={handleClearAllRecentSearches}
                      />
                    )}

                    {/* Spotify-style Browse All Categories */}
                    <section className="space-y-3">
                      <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Browse All Categories</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                        <div
                          onClick={() => handleSelectRecentSearch('Moroccan Chaabi')}
                          className="card-interactive h-24 sm:h-28 rounded-xl p-3 sm:p-4 bg-gradient-to-br from-emerald-600 to-teal-900 cursor-pointer flex flex-col justify-between shadow-md"
                        >
                          <span className="font-extrabold text-white text-sm sm:text-base leading-tight">Moroccan Chaabi</span>
                          <span className="text-[10px] sm:text-[11px] text-emerald-200 truncate">Daoudi, Senhaji, Stati</span>
                        </div>
                        <div
                          onClick={() => handleSelectRecentSearch('Rai Classics')}
                          className="card-interactive h-24 sm:h-28 rounded-xl p-3 sm:p-4 bg-gradient-to-br from-amber-600 to-rose-900 cursor-pointer flex flex-col justify-between shadow-md"
                        >
                          <span className="font-extrabold text-white text-sm sm:text-base leading-tight">Rai Golden Era</span>
                          <span className="text-[10px] sm:text-[11px] text-amber-200 truncate">Khaled, Mami, Hasni</span>
                        </div>
                        <div
                          onClick={() => handleSelectRecentSearch('Maghreb Rap 7elmetado')}
                          className="card-interactive h-24 sm:h-28 rounded-xl p-3 sm:p-4 bg-gradient-to-br from-purple-700 to-rose-900 cursor-pointer flex flex-col justify-between shadow-md"
                        >
                          <span className="font-extrabold text-white text-sm sm:text-base leading-tight">Maghreb Rap & Trap</span>
                          <span className="text-[10px] sm:text-[11px] text-purple-200 truncate">ElGrandeToto, Dizzy Dros</span>
                        </div>
                        <div
                          onClick={() => handleSelectRecentSearch('Top Worldwide Hits')}
                          className="card-interactive h-24 sm:h-28 rounded-xl p-3 sm:p-4 bg-gradient-to-br from-blue-600 to-indigo-950 cursor-pointer flex flex-col justify-between shadow-md"
                        >
                          <span className="font-extrabold text-white text-sm sm:text-base leading-tight">Global Hits</span>
                          <span className="text-[10px] sm:text-[11px] text-blue-200 truncate">Chart Favorites</span>
                        </div>
                      </div>
                    </section>

                    {/* Suggested Popular Tracks */}
                    <section className="space-y-3">
                      <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Popular Suggestions</h2>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 sm:gap-4 px-2 sm:px-4 py-2 text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                          <span className="w-5 sm:w-6 text-center">#</span>
                          <span className="flex-1">Title</span>
                          <span className="hidden md:block w-1/4">Genre</span>
                          <span className="w-12 text-right"><Clock className="w-3.5 h-3.5 ml-auto" /></span>
                        </div>
                        {CURATED_TRACKS.slice(0, 8).map((track, idx) => {
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
                              onPlay={(t) => handlePlayTrack(t, CURATED_TRACKS)}
                              onToggleLike={handleToggleLike}
                              onAddToQueue={handleAddToQueue}
                              onPlayNext={handlePlayNext}
                              onAddToPlaylist={handleAddToPlaylist}
                              onCacheTrack={handleCacheTrack}
                            />
                          );
                        })}
                      </div>
                    </section>
                  </div>
                ) : (
                  /* Case 2: When user is actively querying */
                  <div className="space-y-4">
                    {/* Quick switch between recent searches while browsing */}
                    {recentSearches.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs text-neutral-400">
                        <span className="font-semibold text-neutral-500 uppercase tracking-wider text-[10px] shrink-0">Recent:</span>
                        {recentSearches.map((term) => (
                          <button
                            key={term}
                            onClick={() => handleSelectRecentSearch(term)}
                            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer border ${
                              searchQuery.toLowerCase() === term.toLowerCase()
                                ? 'bg-white text-black border-white font-bold'
                                : 'bg-[#242424] text-neutral-300 border-neutral-800 hover:bg-[#303030] hover:text-white'
                            }`}
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    )}

                    {isSearching ? (
                      <div className="flex items-center justify-center py-16 text-neutral-400 gap-3">
                        <div className="w-5 h-5 border-2 border-[#1db954] border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Searching live music catalog...</span>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="text-center py-16 text-neutral-400 space-y-2">
                        <p className="text-lg font-bold text-white">No results found for "{searchQuery}"</p>
                        <p className="text-sm">
                          {isOfflineMode
                            ? 'You are currently offline. Only cached tracks are searchable until your connection returns.'
                            : 'Please check your spelling or try searching for another artist or genre.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 sm:gap-4 px-2 sm:px-4 py-2 text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                          <span className="w-5 sm:w-6 text-center">#</span>
                          <span className="flex-1">Title</span>
                          <span className="hidden md:block w-1/4">Source / Album</span>
                          <span className="w-12 text-right"><Clock className="w-3.5 h-3.5 ml-auto" /></span>
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
                                handleAddRecentSearch(searchQuery);
                                handlePlayTrack(t, searchResults);
                              }}
                              onToggleLike={handleToggleLike}
                              onAddToQueue={handleAddToQueue}
                              onPlayNext={handlePlayNext}
                              onAddToPlaylist={handleAddToPlaylist}
                              onCacheTrack={handleCacheTrack}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 3: HOME DASHBOARD */}
            {currentView === 'home' && (
              <div className="space-y-7 sm:space-y-8">
                {/* Greeting & Quick Access Cards */}
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-3 sm:mb-4">
                    {greeting}
                  </h1>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                    {allPlaylists.slice(0, 5).concat([
                      {
                        id: 'liked',
                        name: 'Liked Songs',
                        description: 'Your favorite tracks',
                        coverImage: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
                        tracks: likedTracks
                      }
                    ]).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedPlaylistId(item.id);
                          setCurrentView('playlist');
                        }}
                        className="card-interactive group flex items-center bg-[#282828]/70 hover:bg-[#323232] rounded-md overflow-hidden cursor-pointer shadow-sm relative"
                      >
                        <CoverImage
                          src={item.coverImage}
                          alt={item.name}
                          youtubeId={item.tracks[0]?.youtubeId}
                          loading="eager"
                          className="w-12 h-12 sm:w-16 sm:h-16 object-cover shrink-0"
                        />
                        <div className="px-2.5 sm:px-3.5 flex-1 min-w-0 font-bold text-xs sm:text-sm text-white line-clamp-2 sm:truncate">
                          {item.name}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const playable = filterTracksForOffline(item.tracks, cachedYoutubeIds, isOfflineMode);
                            if (playable.length > 0) {
                              handlePlayTrack(playable[0], item.tracks);
                            } else if (item.tracks.length > 0) {
                              handlePlayTrack(item.tracks[0], item.tracks);
                            }
                          }}
                          aria-label={`Play ${item.name}`}
                          className="hidden sm:flex w-10 h-10 rounded-full bg-[#1db954] text-black items-center justify-center opacity-0 group-hover:opacity-100 shadow-xl shadow-black hover:scale-105 active:scale-95 transition-all mr-3 shrink-0 cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-current translate-x-0.2" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cached Frequently Played Section */}
                {frequentTracks.length > 0 && selectedGenre === 'all' && (
                  <div>
                    <div className="flex items-start sm:items-center justify-between gap-3 mb-3 sm:mb-4">
                      <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold text-white flex flex-wrap items-center gap-2">
                          <span>Frequently Played</span>
                          <span className="text-[11px] font-mono font-normal text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full whitespace-nowrap">
                            Cached Offline
                          </span>
                        </h2>
                        <p className="text-xs text-neutral-400 mt-0.5">Metadata &amp; artwork saved locally for instant loading</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                      {frequentTracks.map((track) => {
                        const isCurrent = currentTrack?.id === track.id || currentTrack?.youtubeId === track.youtubeId;
                        return (
                          <div
                            key={`freq-${track.youtubeId}`}
                            onClick={() => handlePlayTrack(track, frequentTracks)}
                            className={`card-interactive group bg-[#181818] hover:bg-[#282828] p-2.5 sm:p-3.5 rounded-lg cursor-pointer flex flex-col relative ${
                              isCurrent && isPlaying ? 'ring-1 ring-[#1db954]/60' : ''
                            }`}
                          >
                            <div className="relative mb-2.5 sm:mb-3 aspect-square rounded-md overflow-hidden bg-neutral-800">
                              <CoverImage
                                src={track.thumbnail}
                                alt={track.title}
                                youtubeId={track.youtubeId}
                                loading="eager"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isCurrent && isPlaying) {
                                    handlePlayPause();
                                  } else {
                                    handlePlayTrack(track, frequentTracks);
                                  }
                                }}
                                aria-label={`Play ${track.title}`}
                                className={`absolute bottom-2 right-2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1db954] text-black flex items-center justify-center shadow-xl shadow-black hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                                  isCurrent ? 'opacity-100 translate-y-0' : 'opacity-90 sm:opacity-0 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:translate-y-2'
                                } ${isCurrent && isPlaying ? 'animate-playing-glow' : ''}`}
                              >
                                {isCurrent && isPlaying ? (
                                  <Pause className="w-4 h-4 fill-current" />
                                ) : (
                                  <Play className="w-4 h-4 fill-current translate-x-0.2" />
                                )}
                              </button>
                            </div>
                            <div className={`font-bold text-xs sm:text-sm truncate ${isCurrent ? 'text-[#1db954]' : 'text-white'}`}>
                              {track.title}
                            </div>
                            <div className="text-[11px] sm:text-xs text-neutral-400 truncate mt-0.5 sm:mt-1">
                              {track.artist}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section 1: Moroccan Chaabi Classics */}
                {(selectedGenre === 'all' || selectedGenre === 'chaabi') && (
                  <div>
                    <div className="flex items-start sm:items-center justify-between gap-3 mb-3 sm:mb-4">
                      <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold text-white flex flex-wrap items-center gap-2">
                          <span>Moroccan Chaabi Classics</span>
                          <span className="text-[11px] font-mono font-normal text-[#1db954] bg-[#1db954]/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                            Heritage
                          </span>
                        </h2>
                        <p className="text-xs text-neutral-400 mt-0.5">Iconic grooves by Daoudi, Senhaji, Najat Aatabou, Stati & Tahour</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPlaylistId('playlist_chaabi');
                          setCurrentView('playlist');
                        }}
                        className="text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0 whitespace-nowrap pt-1 sm:pt-0"
                      >
                        Show all
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                      {CURATED_TRACKS.filter(t => t.genre === 'chaabi').map((track) => {
                        const isCurrent = currentTrack?.id === track.id || currentTrack?.youtubeId === track.youtubeId;
                        const isCached = cachedYoutubeIds.has(track.youtubeId);
                        const isOfflineDisabled = isOfflineMode && !isCached;
                        return (
                          <div
                            key={track.id}
                            onClick={() => handlePlayTrack(track)}
                            className={`card-interactive group bg-[#181818] hover:bg-[#282828] p-2.5 sm:p-3.5 rounded-lg flex flex-col relative ${
                              isOfflineDisabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'
                            } ${isCurrent && isPlaying ? 'ring-1 ring-[#1db954]/60' : ''}`}
                          >
                            <div className="relative mb-2.5 sm:mb-3 aspect-square rounded-md overflow-hidden bg-neutral-800">
                              <CoverImage
                                src={track.thumbnail}
                                alt={track.title}
                                youtubeId={track.youtubeId}
                                loading="eager"
                                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isOfflineDisabled ? 'grayscale' : ''}`}
                              />
                              {!isOfflineDisabled && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isCurrent && isPlaying) {
                                      handlePlayPause();
                                    } else {
                                      handlePlayTrack(track);
                                    }
                                  }}
                                  aria-label={`Play ${track.title}`}
                                  className={`absolute bottom-2 right-2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1db954] text-black flex items-center justify-center shadow-xl shadow-black hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                                    isCurrent ? 'opacity-100 translate-y-0' : 'opacity-90 sm:opacity-0 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:translate-y-2'
                                  } ${isCurrent && isPlaying ? 'animate-playing-glow' : ''}`}
                                >
                                  {isCurrent && isPlaying ? (
                                    <Pause className="w-4 h-4 fill-current" />
                                  ) : (
                                    <Play className="w-4 h-4 fill-current translate-x-0.2" />
                                  )}
                                </button>
                              )}
                            </div>
                            <div className={`font-bold text-xs sm:text-sm truncate ${isCurrent ? 'text-[#1db954]' : 'text-white'}`}>
                              {track.title}
                            </div>
                            <div className="text-[11px] sm:text-xs text-neutral-400 truncate mt-0.5 sm:mt-1">
                              {track.artist}
                              {isOfflineDisabled ? ' • Online only' : isCached ? ' • Cached' : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section 2: Rai Golden Era */}
                {(selectedGenre === 'all' || selectedGenre === 'rai') && (
                  <div>
                    <div className="flex items-start sm:items-center justify-between gap-3 mb-3 sm:mb-4">
                      <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold text-white flex flex-wrap items-center gap-2">
                          <span>Rai Golden Era</span>
                          <span className="text-[11px] font-mono font-normal text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                            Legends
                          </span>
                        </h2>
                        <p className="text-xs text-neutral-400 mt-0.5">Unforgettable classics by Cheb Khaled, Cheb Mami, Cheb Hasni & Rachid Taha</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPlaylistId('playlist_rai');
                          setCurrentView('playlist');
                        }}
                        className="text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0 whitespace-nowrap pt-1 sm:pt-0"
                      >
                        Show all
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                      {CURATED_TRACKS.filter(t => t.genre === 'rai').map((track) => {
                        const isCurrent = currentTrack?.id === track.id || currentTrack?.youtubeId === track.youtubeId;
                        const isCached = cachedYoutubeIds.has(track.youtubeId);
                        const isOfflineDisabled = isOfflineMode && !isCached;
                        return (
                          <div
                            key={track.id}
                            onClick={() => handlePlayTrack(track)}
                            className={`card-interactive group bg-[#181818] hover:bg-[#282828] p-2.5 sm:p-3.5 rounded-lg flex flex-col relative ${
                              isOfflineDisabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'
                            } ${isCurrent && isPlaying ? 'ring-1 ring-[#1db954]/60' : ''}`}
                          >
                            <div className="relative mb-2.5 sm:mb-3 aspect-square rounded-md overflow-hidden bg-neutral-800">
                              <CoverImage
                                src={track.thumbnail}
                                alt={track.title}
                                youtubeId={track.youtubeId}
                                loading="eager"
                                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isOfflineDisabled ? 'grayscale' : ''}`}
                              />
                              {!isOfflineDisabled && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isCurrent && isPlaying) {
                                      handlePlayPause();
                                    } else {
                                      handlePlayTrack(track);
                                    }
                                  }}
                                  aria-label={`Play ${track.title}`}
                                  className={`absolute bottom-2 right-2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1db954] text-black flex items-center justify-center shadow-xl shadow-black hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                                    isCurrent ? 'opacity-100 translate-y-0' : 'opacity-90 sm:opacity-0 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:translate-y-2'
                                  } ${isCurrent && isPlaying ? 'animate-playing-glow' : ''}`}
                                >
                                  {isCurrent && isPlaying ? (
                                    <Pause className="w-4 h-4 fill-current" />
                                  ) : (
                                    <Play className="w-4 h-4 fill-current translate-x-0.2" />
                                  )}
                                </button>
                              )}
                            </div>
                            <div className={`font-bold text-xs sm:text-sm truncate ${isCurrent ? 'text-[#1db954]' : 'text-white'}`}>
                              {track.title}
                            </div>
                            <div className="text-[11px] sm:text-xs text-neutral-400 truncate mt-0.5 sm:mt-1">
                              {track.artist}
                              {isOfflineDisabled ? ' • Online only' : isCached ? ' • Cached' : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section 3: Maghreb Rap & Trap */}
                {(selectedGenre === 'all' || selectedGenre === 'rap') && (
                  <div>
                    <div className="flex items-start sm:items-center justify-between gap-3 mb-3 sm:mb-4">
                      <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold text-white flex flex-wrap items-center gap-2">
                          <span>Maghreb Rap & Trap</span>
                          <span className="text-[11px] font-mono font-normal text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                            Trending
                          </span>
                        </h2>
                        <p className="text-xs text-neutral-400 mt-0.5">Heavyweights from ElGrandeToto, Dizzy Dros, Morad & Soolking</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPlaylistId('playlist_rap');
                          setCurrentView('playlist');
                        }}
                        className="text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0 whitespace-nowrap pt-1 sm:pt-0"
                      >
                        Show all
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                      {CURATED_TRACKS.filter(t => t.genre === 'rap').map((track) => {
                        const isCurrent = currentTrack?.id === track.id || currentTrack?.youtubeId === track.youtubeId;
                        const isCached = cachedYoutubeIds.has(track.youtubeId);
                        const isOfflineDisabled = isOfflineMode && !isCached;
                        return (
                          <div
                            key={track.id}
                            onClick={() => handlePlayTrack(track)}
                            className={`card-interactive group bg-[#181818] hover:bg-[#282828] p-2.5 sm:p-3.5 rounded-lg flex flex-col relative ${
                              isOfflineDisabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'
                            } ${isCurrent && isPlaying ? 'ring-1 ring-[#1db954]/60' : ''}`}
                          >
                            <div className="relative mb-2.5 sm:mb-3 aspect-square rounded-md overflow-hidden bg-neutral-800">
                              <CoverImage
                                src={track.thumbnail}
                                alt={track.title}
                                youtubeId={track.youtubeId}
                                loading="eager"
                                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isOfflineDisabled ? 'grayscale' : ''}`}
                              />
                              {!isOfflineDisabled && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isCurrent && isPlaying) {
                                      handlePlayPause();
                                    } else {
                                      handlePlayTrack(track);
                                    }
                                  }}
                                  aria-label={`Play ${track.title}`}
                                  className={`absolute bottom-2 right-2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1db954] text-black flex items-center justify-center shadow-xl shadow-black hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                                    isCurrent ? 'opacity-100 translate-y-0' : 'opacity-90 sm:opacity-0 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:translate-y-2'
                                  } ${isCurrent && isPlaying ? 'animate-playing-glow' : ''}`}
                                >
                                  {isCurrent && isPlaying ? (
                                    <Pause className="w-4 h-4 fill-current" />
                                  ) : (
                                    <Play className="w-4 h-4 fill-current translate-x-0.2" />
                                  )}
                                </button>
                              )}
                            </div>
                            <div className={`font-bold text-xs sm:text-sm truncate ${isCurrent ? 'text-[#1db954]' : 'text-white'}`}>
                              {track.title}
                            </div>
                            <div className="text-[11px] sm:text-xs text-neutral-400 truncate mt-0.5 sm:mt-1">
                              {track.artist}
                              {isOfflineDisabled ? ' • Online only' : isCached ? ' • Cached' : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section 4: Global Chart Hits */}
                {(selectedGenre === 'all' || selectedGenre === 'global') && (
                  <div>
                    <div className="flex items-start sm:items-center justify-between gap-3 mb-3 sm:mb-4">
                      <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold text-white flex flex-wrap items-center gap-2">
                          <span>Global Chart Hits</span>
                          <span className="text-[11px] font-mono font-normal text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                            Worldwide
                          </span>
                        </h2>
                        <p className="text-xs text-neutral-400 mt-0.5">Worldwide favorites by The Weeknd, Dua Lipa, Kendrick Lamar & Daft Punk</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPlaylistId('playlist_global');
                          setCurrentView('playlist');
                        }}
                        className="text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0 whitespace-nowrap pt-1 sm:pt-0"
                      >
                        Show all
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                      {CURATED_TRACKS.filter(t => t.genre === 'global').map((track) => {
                        const isCurrent = currentTrack?.id === track.id || currentTrack?.youtubeId === track.youtubeId;
                        const isCached = cachedYoutubeIds.has(track.youtubeId);
                        const isOfflineDisabled = isOfflineMode && !isCached;
                        return (
                          <div
                            key={track.id}
                            onClick={() => handlePlayTrack(track)}
                            className={`card-interactive group bg-[#181818] hover:bg-[#282828] p-2.5 sm:p-3.5 rounded-lg flex flex-col relative ${
                              isOfflineDisabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'
                            } ${isCurrent && isPlaying ? 'ring-1 ring-[#1db954]/60' : ''}`}
                          >
                            <div className="relative mb-2.5 sm:mb-3 aspect-square rounded-md overflow-hidden bg-neutral-800">
                              <CoverImage
                                src={track.thumbnail}
                                alt={track.title}
                                youtubeId={track.youtubeId}
                                loading="eager"
                                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isOfflineDisabled ? 'grayscale' : ''}`}
                              />
                              {!isOfflineDisabled && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isCurrent && isPlaying) {
                                      handlePlayPause();
                                    } else {
                                      handlePlayTrack(track);
                                    }
                                  }}
                                  aria-label={`Play ${track.title}`}
                                  className={`absolute bottom-2 right-2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1db954] text-black flex items-center justify-center shadow-xl shadow-black hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                                    isCurrent ? 'opacity-100 translate-y-0' : 'opacity-90 sm:opacity-0 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 sm:translate-y-2'
                                  } ${isCurrent && isPlaying ? 'animate-playing-glow' : ''}`}
                                >
                                  {isCurrent && isPlaying ? (
                                    <Pause className="w-4 h-4 fill-current" />
                                  ) : (
                                    <Play className="w-4 h-4 fill-current translate-x-0.2" />
                                  )}
                                </button>
                              )}
                            </div>
                            <div className={`font-bold text-xs sm:text-sm truncate ${isCurrent ? 'text-[#1db954]' : 'text-white'}`}>
                              {track.title}
                            </div>
                            <div className="text-[11px] sm:text-xs text-neutral-400 truncate mt-0.5 sm:mt-1">
                              {track.artist}
                              {isOfflineDisabled ? ' • Online only' : isCached ? ' • Cached' : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 4: LIBRARY VIEW */}
            {currentView === 'library' && (
              <div className="space-y-5 sm:space-y-6">
                <div className="flex items-center justify-between gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-white">Your Music Library</h1>
                  <button
                    onClick={() => setIsCreatePlaylistOpen(true)}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-[#1db954] text-black font-bold text-xs hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <PlusSquare className="w-4 h-4" />
                    <span>Create Playlist</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div
                    onClick={() => {
                      setSelectedPlaylistId('liked');
                      setCurrentView('playlist');
                    }}
                    className="card-interactive p-5 sm:p-6 rounded-xl bg-gradient-to-br from-indigo-800 to-purple-900 cursor-pointer shadow-lg flex flex-col justify-between h-40 sm:h-48"
                  >
                    <div>
                      <Heart className="w-7 h-7 sm:w-8 sm:h-8 fill-white text-white mb-2.5 sm:mb-3" />
                      <h2 className="text-xl sm:text-2xl font-extrabold text-white">Liked Songs</h2>
                      <p className="text-xs text-neutral-300 mt-1">{likedTrackIds.size} tracks saved</p>
                    </div>
                    <span className="text-xs font-semibold text-white/80">Play your favorites</span>
                  </div>

                  {allPlaylists.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => {
                        setSelectedPlaylistId(pl.id);
                        setCurrentView('playlist');
                      }}
                      className="card-interactive p-3 sm:p-4 rounded-xl bg-[#181818] hover:bg-[#222222] cursor-pointer border border-neutral-800 flex items-center gap-3 sm:gap-4"
                    >
                      <CoverImage
                        src={pl.coverImage}
                        alt={pl.name}
                        youtubeId={pl.tracks[0]?.youtubeId}
                        loading="eager"
                        className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold text-white truncate">{pl.name}</h3>
                          {pl.isCustom && (
                            <span className="text-[10px] bg-neutral-800 text-[#1db954] px-1.5 py-0.5 rounded font-mono shrink-0">
                              Custom
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 line-clamp-2 mt-1">{pl.description}</p>
                        <span className="text-xs text-[#1db954] mt-1.5 sm:mt-2 block font-medium">
                          {pl.tracks.length} tracks
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          </main>
        </div>

        {/* Dynamic Queue Side Drawer */}
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
      </div>

      {/* Expanded Album Artwork Modal (Track Cover View) */}
      <ExpandedCoverModal
        isOpen={isExpandedCoverOpen}
        onClose={() => setIsExpandedCoverOpen(false)}
        track={currentTrack}
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
          setRepeatMode(prev => {
            if (prev === 'off') return 'all';
            if (prev === 'all') return 'one';
            return 'off';
          });
        }}
        onToggleShuffle={() => setIsShuffle(prev => !prev)}
        onToggleLike={(track) => handleToggleLike(track)}
      />

      {/* Sleep Timer Modal */}
      <SleepTimerModal
        isOpen={isSleepTimerOpen}
        onClose={() => setIsSleepTimerOpen(false)}
        activeTimerMinutes={sleepTimerMinutes}
        onSetTimer={setSleepTimerMinutes}
      />

      {/* Create Custom Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreatePlaylistOpen}
        onClose={() => setIsCreatePlaylistOpen(false)}
        onCreatePlaylist={handleCreatePlaylist}
      />

      {/* Hybrid Background Audio + YouTube IFrame Player */}
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
        isVisible={isVideoVisible}
        onCloseVideo={() => setIsVideoVisible(false)}
      />

      {/* Persistent Bottom Spotify Player Bar */}
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
        isVideoVisible={isVideoVisible}
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
        onToggleMute={() => setIsMuted(prev => !prev)}
        onToggleShuffle={() => setIsShuffle(prev => !prev)}
        onToggleRepeat={() => {
          setRepeatMode(prev => {
            if (prev === 'off') return 'all';
            if (prev === 'all') return 'one';
            return 'off';
          });
        }}
        onToggleLike={(track) => handleToggleLike(track)}
        onToggleQueue={() => setIsQueueOpen(prev => !prev)}
        onToggleVideo={() => setIsVideoVisible(prev => !prev)}
        onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
        onOpenExpandedCover={() => setIsExpandedCoverOpen(true)}
      />

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          setSelectedPlaylistId(null);
          if (view === 'search') {
            setTimeout(() => {
              const input = document.getElementById('spotitube-search-input') as HTMLInputElement | null;
              input?.focus();
              (window as unknown as { SpotiTubeAndroid?: { showKeyboard?: () => void } }).SpotiTubeAndroid?.showKeyboard?.();
            }, 60);
          }
        }}
        onOpenCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
      />

      {/* Background Playback Permission Modal */}
      <BackgroundPermissionModal
        isOpen={isBgPermissionOpen}
        onClose={() => setIsBgPermissionOpen(false)}
        onPermissionGranted={() => {
          setOfflineNotice('All permissions allowed — background & offline mode ready');
        }}
      />

      {/* Non-intrusive notice pill for offline restrictions & cache confirmations */}
      {offlineNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-44 md:bottom-36 left-1/2 -translate-x-1/2 z-50 rounded-full bg-neutral-900/95 border border-neutral-700 px-4 py-2 text-xs font-semibold text-white shadow-2xl whitespace-nowrap max-w-[92vw] truncate"
        >
          {offlineNotice}
        </div>
      )}

      {/* Automatic Offline Connectivity Banner */}
      <OfflineIndicator cachedTrackCount={cachedTrackEntries.length} />

      {/* Legal & Compliance Modal (Privacy Policy, Terms of Service, DMCA, Cookies) */}
      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        initialTab={legalTab}
      />
    </div>
  );
}
