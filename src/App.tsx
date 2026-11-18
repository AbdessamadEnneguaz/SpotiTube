import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  Heart,
  Clock,
  Globe2,
  PlusSquare,
  ArrowRight,
  Compass
} from 'lucide-react';
import heroWorldStudio from './assets/images/hero_world_studio_1795013397130.jpg';
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
import {
  CURATED_TRACKS,
  PLAYLISTS,
  WORLD_COUNTRY_PRESETS,
  DEFAULT_FAVORITES_COVER
} from './data/curatedTracks';
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
import { safeParseJson, sanitizeMediaUrl, sanitizeClientText } from './utils/security';
import { unlockAudioKeepAlive } from './utils/backgroundAudio';

const REGION_SECTIONS: Array<{
  id: 'americas' | 'europe' | 'africa' | 'asia';
  title: string;
  subtitle: string;
  playlistId: string;
}> = [
  {
    id: 'americas',
    title: 'Americas & Latin Wave',
    subtitle: 'United States · Canada · Puerto Rico · Colombia · Brazil',
    playlistId: 'playlist_americas_latin'
  },
  {
    id: 'europe',
    title: 'Europe Pop & Electronic',
    subtitle: 'United Kingdom · France · Belgium · Spain',
    playlistId: 'playlist_europe_nights'
  },
  {
    id: 'africa',
    title: 'Africa: Afrobeats & Amapiano',
    subtitle: 'Nigeria · South Africa · Mediterranean Fusion',
    playlistId: 'playlist_africa_pulse'
  },
  {
    id: 'asia',
    title: 'Asia: K-Pop, J-Pop & Bollywood',
    subtitle: 'South Korea · Japan · India',
    playlistId: 'playlist_asia_soundwave'
  }
];

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

  const handleSelectRecentSearch = useCallback((term: string) => {
    setSearchQuery(term);
    setCurrentView('search');
    setSelectedPlaylistId(null);
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
      const parsed = safeParseJson<Playlist[]>(saved, [], (val): val is Playlist[] => Array.isArray(val));
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

  // User Liked Songs (Global defaults instead of local-only)
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

  useEffect(() => {
    if (isShuffle) {
      setShuffledIndices(generateShuffledIndices(queue.length, queueIndex));
    }
  }, [isShuffle, queue.length]);

  const likedTracks = useMemo(() => {
    return CURATED_TRACKS.filter(t => likedTrackIds.has(t.id));
  }, [likedTrackIds]);

  const displayedTracks = useMemo(() => {
    if (selectedGenre === 'all') return CURATED_TRACKS;
    if (selectedGenre === 'global') return CURATED_TRACKS.slice(0, 12);
    return CURATED_TRACKS.filter(t => t.region === selectedGenre || t.genre === selectedGenre);
  }, [selectedGenre]);

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

  const activePlaylist = useMemo(() => {
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
    return allPlaylists.find(p => p.id === selectedPlaylistId) || null;
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

    setCachedTrackEntries(prev => {
      const updated = recordTrackPlay(prev, track);
      saveCachedTrackEntries(updated);
      return updated;
    });
    void syncTrackToServiceWorkerCache(track);
  }, [currentView, searchResults, displayedTracks, queue, cachedYoutubeIds, isOfflineMode]);

  const handleInspectTrack = useCallback((track: Track, contextList?: Track[]) => {
    if (!isTrackPlayableOffline(track, cachedYoutubeIds, isOfflineMode)) {
      setOfflineNotice(`"${track.title}" requires an internet connection.`);
      return;
    }
    if (!(currentTrack?.id === track.id || currentTrack?.youtubeId === track.youtubeId)) {
      handlePlayTrack(track, contextList);
    }
    setIsExpandedCoverOpen(true);
  }, [currentTrack, handlePlayTrack, cachedYoutubeIds, isOfflineMode]);

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
        setSeekTarget(0);
        setCurrentTime(0);
        setIsPlaying(true);
      } else {
        handleNext();
      }
    }
  }, [handleNext, repeatMode]);

  const fallbackAttemptsRef = useRef<Record<string, number>>({});

  const handleTrackError = useCallback(async (failedTrack: Track, errorCode: number) => {
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
    if (Math.abs(curr - lastTimeRef.current) >= 0.18 || Math.abs(curr - lastTimeRef.current) > 1.5) {
      lastTimeRef.current = curr;
      setCurrentTime(curr);
    }
    if (dur > 0 && Math.abs(duration - dur) > 2) {
      setDuration(dur);
    }
  }, [duration]);

  const searchFocusTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (searchFocusTimerRef.current !== null) {
        window.clearTimeout(searchFocusTimerRef.current);
      }
    };
  }, []);

  const handleNavigate = useCallback((view: 'home' | 'search' | 'library') => {
    setCurrentView(view);
    setSelectedPlaylistId(null);

    if (searchFocusTimerRef.current !== null) {
      window.clearTimeout(searchFocusTimerRef.current);
      searchFocusTimerRef.current = null;
    }

    if (view === 'search') {
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

      // Focus synchronously inside user gesture, then reinforce after view transition
      focusAndShowKeyboard();
      searchFocusTimerRef.current = window.setTimeout(() => {
        focusAndShowKeyboard();
        searchFocusTimerRef.current = null;
      }, 140);
    }
  }, []);

  const renderTrackCard = (track: Track, contextList: Track[]) => {
    const isCurrent = currentTrack?.id === track.id || currentTrack?.youtubeId === track.youtubeId;
    const isCached = cachedYoutubeIds.has(track.youtubeId);
    const isOfflineDisabled = isOfflineMode && !isCached;

    return (
      <div
        key={track.id}
        onClick={() => handleInspectTrack(track, contextList)}
        className={`card-interactive group bg-[#1B1815] hover:bg-[#24201B] p-3 rounded-2xl border transition-colors flex flex-col relative ${
          isOfflineDisabled ? 'opacity-45 cursor-not-allowed border-[#EAE0D0]/[0.04]' : 'cursor-pointer border-[#EAE0D0]/[0.07] hover:border-[#EAE0D0]/16'
        } ${isCurrent && isPlaying ? 'border-[#D8C3A5]/50 bg-[#24201B]' : ''}`}
      >
        <div className="relative mb-3 aspect-video sm:aspect-[4/3] rounded-xl overflow-hidden bg-[#12100E]">
          <CoverImage
            src={track.thumbnail}
            alt={track.title}
            youtubeId={track.youtubeId}
            loading="eager"
            className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isOfflineDisabled ? 'grayscale' : ''}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
          <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-[#E4DDD2] truncate">
              {track.country || 'World'}
            </span>
            {!isOfflineDisabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isCurrent && isPlaying) {
                    handlePlayPause();
                  } else {
                    handlePlayTrack(track, contextList);
                  }
                }}
                aria-label={`Play ${track.title}`}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isCurrent
                    ? 'bg-[#D8C3A5] text-[#12100E]'
                    : 'bg-black/75 text-[#F5F0E8] hover:bg-[#D8C3A5] hover:text-[#12100E]'
                }`}
              >
                {isCurrent && isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current translate-x-0.2" />
                )}
              </button>
            )}
          </div>
        </div>
        <div className={`font-semibold text-xs sm:text-sm truncate ${isCurrent ? 'text-[#EDE0CC]' : 'text-[#F5F0E8]'}`}>
          {track.title}
        </div>
        <div className="text-[11px] sm:text-xs text-[#9E9384] truncate mt-0.5 tabular-nums">
          {track.artist} · {track.durationFormatted}
          {isOfflineDisabled ? ' · Online only' : isCached ? ' · Cached' : ''}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-[#12100E] text-[#F5F0E8] font-sans antialiased">
      {/* Application Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Architectural Studio Left Rail */}
        <Sidebar
          currentView={currentView}
          selectedPlaylistId={selectedPlaylistId}
          playlists={allPlaylists}
          likedCount={likedTrackIds.size}
          onNavigate={handleNavigate}
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

        {/* Central Content Viewport */}
        <div className="flex-1 flex flex-col bg-[#12100E] overflow-hidden relative">
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

          <main
            ref={mainContentRef}
            className="flex-1 overflow-y-auto px-3 sm:px-5 md:px-7 py-4 sm:py-6 scrollbar-thin"
          >
            <div key={viewKey} className="animate-view-fade-slide w-full max-w-7xl mx-auto min-h-full">
              {/* VIEW 1: PLAYLIST OR SAVED FAVORITES */}
              {currentView === 'playlist' && activePlaylist && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row items-center md:items-end text-center md:text-left gap-5 bg-[#1B1815] p-5 sm:p-6 rounded-2xl border border-[#EAE0D0]/[0.08]">
                    <CoverImage
                      src={activePlaylist.coverImage}
                      alt={activePlaylist.name}
                      youtubeId={activePlaylist.tracks[0]?.youtubeId}
                      loading="eager"
                      className="w-36 h-36 sm:w-44 sm:h-44 rounded-xl object-cover shadow-xl shrink-0"
                    />
                    <div className="flex-1 space-y-2 min-w-0 w-full">
                      <div className="text-xs font-medium text-[#DFCCB0]">
                        {activePlaylist.isCustom ? 'Custom Mix' : activePlaylist.regionLabel || 'Curated Collection'}
                      </div>
                      <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#F5F0E8] tracking-tight text-balance">
                        {activePlaylist.name}
                      </h1>
                      <p className="text-xs sm:text-sm text-[#C8BEB0] max-w-2xl mx-auto md:mx-0">
                        {activePlaylist.description}
                      </p>
                      <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-[#9E9384] pt-1 tabular-nums">
                        <span>{activePlaylist.tracks.length} tracks</span>
                        <span aria-hidden="true">·</span>
                        <span>Worldwide Soundstage</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const playable = filterTracksForOffline(activePlaylist.tracks, cachedYoutubeIds, isOfflineMode);
                        if (playable.length > 0) {
                          handlePlayTrack(playable[0], activePlaylist.tracks);
                        } else if (activePlaylist.tracks.length > 0) {
                          handlePlayTrack(activePlaylist.tracks[0], activePlaylist.tracks);
                        }
                      }}
                      aria-label={`Play ${activePlaylist.name}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D8C3A5] hover:bg-[#E4D3BA] text-[#12100E] font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Play Collection</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 sm:gap-4 px-2.5 sm:px-4 py-2 text-xs font-semibold text-[#9E9384] border-b border-[#EAE0D0]/[0.07]">
                      <span className="w-6 text-center shrink-0">#</span>
                      <span className="flex-1 min-w-0">Title</span>
                      <span className="hidden md:block w-1/4">Album</span>
                      <span className="hidden sm:block w-24 shrink-0" aria-hidden="true" />
                      <span className="w-12 text-right shrink-0"><Clock className="w-3.5 h-3.5 ml-auto" /></span>
                    </div>

                    {activePlaylist.tracks.length === 0 ? (
                      <div className="text-center py-12 text-[#9E9384] text-sm space-y-2">
                        <p>No tracks in this playlist yet.</p>
                        <p className="text-xs text-[#8F8476]">
                          Search for any song worldwide, then open options on a track to add it here.
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
                            onInspectTrack={(t) => handleInspectTrack(t, activePlaylist.tracks)}
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

              {/* VIEW 2: GLOBAL SEARCH & COUNTRY EXPLORER */}
              {currentView === 'search' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="font-display text-xl sm:text-2xl font-bold text-[#F5F0E8] break-words">
                      {searchQuery ? `Results for "${searchQuery}"` : 'Explore Any Country & Genre'}
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
                                  onPlay={(t) => handlePlayTrack(t, cachedTracksList)}
                                  onInspectTrack={(t) => handleInspectTrack(t, cachedTracksList)}
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

                      {recentSearches.length > 0 && (
                        <RecentSearches
                          searches={recentSearches}
                          onSelectSearch={handleSelectRecentSearch}
                          onRemoveSearch={handleRemoveRecentSearch}
                          onClearAll={handleClearAllRecentSearches}
                        />
                      )}

                      {/* Browse By Country Worldwide */}
                      <section className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h2 className="font-display text-lg sm:text-xl font-bold text-[#F5F0E8]">
                            Browse Music by Country
                          </h2>
                          <span className="text-xs text-[#9E9384]">Tap any country to stream</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                          {WORLD_COUNTRY_PRESETS.map((country) => (
                            <button
                              type="button"
                              key={country.id}
                              onClick={() => handleSelectRecentSearch(country.query)}
                              className="card-interactive text-left p-3.5 rounded-xl bg-[#1B1815] hover:bg-[#24201B] border border-[#EAE0D0]/[0.08] hover:border-[#D8C3A5]/45 cursor-pointer flex flex-col justify-between min-h-[84px]"
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

                      {/* Global Top Picks */}
                      <section className="space-y-3">
                        <h2 className="font-display text-lg sm:text-xl font-bold text-[#F5F0E8]">
                          Worldwide Rotation
                        </h2>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 sm:gap-4 px-2.5 sm:px-4 py-2 text-xs font-semibold text-[#9E9384] border-b border-[#EAE0D0]/[0.07]">
                            <span className="w-6 text-center shrink-0">#</span>
                            <span className="flex-1 min-w-0">Title</span>
                            <span className="hidden md:block w-1/4">Album</span>
                            <span className="hidden sm:block w-24 shrink-0" aria-hidden="true" />
                            <span className="w-12 text-right shrink-0"><Clock className="w-3.5 h-3.5 ml-auto" /></span>
                          </div>
                          {CURATED_TRACKS.slice(0, 10).map((track, idx) => {
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
                                onInspectTrack={(t) => handleInspectTrack(t, CURATED_TRACKS)}
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
                    <div className="space-y-4">
                      {recentSearches.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs text-[#9E9384]">
                          <span className="font-semibold text-[#8F8476] text-[11px] shrink-0">Recent:</span>
                          {recentSearches.map((term) => (
                            <button
                              type="button"
                              key={term}
                              onClick={() => handleSelectRecentSearch(term)}
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
                            <span className="w-12 text-right shrink-0"><Clock className="w-3.5 h-3.5 ml-auto" /></span>
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
                                onInspectTrack={(t) => {
                                  handleAddRecentSearch(searchQuery);
                                  handleInspectTrack(t, searchResults);
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

              {/* VIEW 3: EDITORIAL GLOBAL HOME DISCOVERY */}
              {currentView === 'home' && (
                <div className="space-y-8">
                  {/* Editorial Soundstage Hero Banner */}
                  <section className="relative rounded-2xl overflow-hidden border border-[#EAE0D0]/[0.08] bg-[#1B1815]">
                    <div className="relative min-h-[210px] sm:min-h-[240px] flex flex-col justify-end p-5 sm:p-7">
                      <img
                        src={heroWorldStudio}
                        alt="Analog mastering turntable and brushed studio console"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover opacity-55 sepia-[.15]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#12100E] via-[#12100E]/88 to-[#12100E]/35" />
                      <div className="relative z-10 max-w-2xl space-y-3">
                        <div className="text-xs font-medium text-[#DFCCB0] flex items-center gap-2">
                          <Globe2 className="w-3.5 h-3.5" />
                          <span>World Music Soundstage · Americas · Europe · Africa · Asia</span>
                        </div>
                        <h1 className="font-display text-2xl sm:text-4xl font-bold text-[#F5F0E8] tracking-tight text-balance">
                          Global sounds from every corner of the world
                        </h1>
                        <p className="text-xs sm:text-sm text-[#C8BEB0] leading-relaxed max-w-xl">
                          Discover chart hits and regional scenes across 15+ countries — stream instantly or pick any nation below.
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const playable = filterTracksForOffline(CURATED_TRACKS, cachedYoutubeIds, isOfflineMode);
                              const first = playable[0] || CURATED_TRACKS[0];
                              if (first) handlePlayTrack(first, CURATED_TRACKS);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D8C3A5] hover:bg-[#E4D3BA] text-[#12100E] font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Play className="w-4 h-4 fill-current" />
                            <span>Play World Rotation</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNavigate('search')}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EAE0D0]/[0.08] hover:bg-[#EAE0D0]/[0.14] text-[#F5F0E8] font-semibold text-xs sm:text-sm border border-[#EAE0D0]/12 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Compass className="w-4 h-4 text-[#DFCCB0]" />
                            <span>Browse Any Country</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Quick Country Explorer Strip */}
                  {selectedGenre === 'all' && (
                    <section className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h2 className="font-display text-lg sm:text-xl font-bold text-[#F5F0E8]">
                            Explore by Country
                          </h2>
                          <p className="text-xs text-[#9E9384] mt-0.5">
                            Pick any country to load live tracks from its scene
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                        {WORLD_COUNTRY_PRESETS.map((country) => (
                          <button
                            type="button"
                            key={country.id}
                            onClick={() => handleSelectRecentSearch(country.query)}
                            className="card-interactive text-left px-3.5 py-3 rounded-xl bg-[#1B1815] hover:bg-[#24201B] border border-[#EAE0D0]/[0.08] hover:border-[#D8C3A5]/45 cursor-pointer flex flex-col justify-between min-h-[76px]"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-display font-bold text-sm text-[#F5F0E8] truncate">
                                {country.name}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-[#DFCCB0] shrink-0" />
                            </div>
                            <span className="text-[11px] text-[#9E9384] mt-1.5 truncate">
                              {country.styleHint}
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Curated World Collections */}
                  {selectedGenre === 'all' && (
                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="font-display text-lg sm:text-xl font-bold text-[#F5F0E8]">
                          Curated World Mixes
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {allPlaylists.slice(0, 5).map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              setSelectedPlaylistId(item.id);
                              setCurrentView('playlist');
                            }}
                            className="card-interactive group flex items-center gap-3.5 bg-[#1B1815] hover:bg-[#24201B] border border-[#EAE0D0]/[0.08] hover:border-[#EAE0D0]/16 p-2.5 rounded-2xl cursor-pointer"
                          >
                            <CoverImage
                              src={item.coverImage}
                              alt={item.name}
                              youtubeId={item.tracks[0]?.youtubeId}
                              loading="eager"
                              className="w-16 h-16 rounded-xl object-cover shrink-0 bg-[#12100E]"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-display font-bold text-sm text-[#F5F0E8] truncate">
                                {item.name}
                              </div>
                              <div className="text-xs text-[#9E9384] truncate mt-0.5 tabular-nums">
                                {item.regionLabel || 'Custom'} · {item.tracks.length} tracks
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const playable = filterTracksForOffline(item.tracks, cachedYoutubeIds, isOfflineMode);
                                const first = playable[0] || item.tracks[0];
                                if (first) handlePlayTrack(first, item.tracks);
                              }}
                              aria-label={`Play ${item.name}`}
                              className="w-9 h-9 rounded-xl bg-[#EAE0D0]/[0.06] group-hover:bg-[#D8C3A5] text-[#E4DDD2] group-hover:text-[#12100E] flex items-center justify-center transition-colors shrink-0 mr-1 cursor-pointer"
                            >
                              <Play className="w-4 h-4 fill-current translate-x-0.2" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Recently Cached / Frequently Played */}
                  {frequentTracks.length > 0 && selectedGenre === 'all' && (
                    <section className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h2 className="font-display text-lg sm:text-xl font-bold text-[#F5F0E8]">
                            Recently Played &amp; Cached
                          </h2>
                          <p className="text-xs text-[#9E9384] mt-0.5">
                            Saved locally for instant playback · {frequentTracks.length} ready offline
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {frequentTracks.map((track) => renderTrackCard(track, frequentTracks))}
                      </div>
                    </section>
                  )}

                  {/* Regional Showcases (when All Countries active) OR Filtered Region Table */}
                  {selectedGenre === 'all' ? (
                    <div className="space-y-8">
                      {REGION_SECTIONS.map((section) => {
                        const regionTracks = CURATED_TRACKS.filter(t => t.region === section.id);
                        return (
                          <section key={section.id} className="space-y-3">
                            <div className="flex items-end justify-between gap-3">
                              <div className="min-w-0">
                                <h2 className="font-display text-lg sm:text-xl font-bold text-[#F5F0E8]">
                                  {section.title}
                                </h2>
                                <p className="text-xs text-[#9E9384] mt-0.5 truncate">
                                  {section.subtitle}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPlaylistId(section.playlistId);
                                  setCurrentView('playlist');
                                }}
                                className="text-xs font-semibold text-[#DFCCB0] hover:text-[#EDE0CC] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                              >
                                View collection
                              </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                              {regionTracks.map((track) => renderTrackCard(track, regionTracks))}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  ) : (
                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="font-display text-lg sm:text-xl font-bold text-[#F5F0E8]">
                          {selectedGenre === 'global'
                            ? 'World Charts'
                            : `${selectedGenre.charAt(0).toUpperCase()}${selectedGenre.slice(1)} Selection`}
                        </h2>
                        <span className="text-xs text-[#9E9384] font-mono tabular-nums">
                          {displayedTracks.length} tracks
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 sm:gap-4 px-2.5 sm:px-4 py-2 text-xs font-semibold text-[#9E9384] border-b border-[#EAE0D0]/[0.07]">
                          <span className="w-6 text-center shrink-0">#</span>
                          <span className="flex-1 min-w-0">Title</span>
                          <span className="hidden md:block w-1/4">Album</span>
                          <span className="hidden sm:block w-24 shrink-0" aria-hidden="true" />
                          <span className="w-12 text-right shrink-0"><Clock className="w-3.5 h-3.5 ml-auto" /></span>
                        </div>
                        {displayedTracks.map((track, idx) => {
                          const isCached = cachedYoutubeIds.has(track.youtubeId);
                          return (
                            <TrackRow
                              key={track.id}
                              track={track}
                              index={idx}
                              isCurrent={currentTrack?.id === track.id || currentTrack?.youtubeId === track.youtubeId}
                              isPlaying={isPlaying}
                              isLiked={likedTrackIds.has(track.id)}
                              isCached={isCached}
                              isOfflineDisabled={isOfflineMode && !isCached}
                              customPlaylists={customPlaylists}
                              onPlay={(t) => handlePlayTrack(t, displayedTracks)}
                              onInspectTrack={(t) => handleInspectTrack(t, displayedTracks)}
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
                  )}
                </div>
              )}

              {/* VIEW 4: LIBRARY VIEW */}
              {currentView === 'library' && (
                <div className="space-y-5 sm:space-y-6">
                  <div className="flex items-center justify-between gap-2">
                    <h1 className="font-display text-xl sm:text-2xl font-bold text-[#F5F0E8]">Your Music Library</h1>
                    <button
                      type="button"
                      onClick={() => setIsCreatePlaylistOpen(true)}
                      className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-[#D8C3A5] hover:bg-[#E4D3BA] text-[#12100E] font-bold text-xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
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
                      className="card-interactive p-5 rounded-2xl bg-[#1B1815] hover:bg-[#24201B] border border-[#D8C3A5]/30 cursor-pointer flex items-center gap-4"
                    >
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0">
                        <CoverImage
                          src={DEFAULT_FAVORITES_COVER}
                          alt="Saved Favorites"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                          <Heart className="w-7 h-7 fill-[#D8C3A5] text-[#D8C3A5]" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-display text-lg sm:text-xl font-bold text-[#F5F0E8]">Saved Favorites</h2>
                        <p className="text-xs text-[#9E9384] mt-1 tabular-nums">{likedTrackIds.size} tracks saved locally</p>
                        <span className="text-xs font-semibold text-[#DFCCB0] mt-2 inline-block">Open collection</span>
                      </div>
                    </div>

                    {allPlaylists.map((pl) => (
                      <div
                        key={pl.id}
                        onClick={() => {
                          setSelectedPlaylistId(pl.id);
                          setCurrentView('playlist');
                        }}
                        className="card-interactive p-3.5 sm:p-4 rounded-2xl bg-[#1B1815] hover:bg-[#24201B] cursor-pointer border border-[#EAE0D0]/[0.08] flex items-center gap-3.5"
                      >
                        <CoverImage
                          src={pl.coverImage}
                          alt={pl.name}
                          youtubeId={pl.tracks[0]?.youtubeId}
                          loading="eager"
                          className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl object-cover shrink-0 bg-[#12100E]"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display text-sm sm:text-base font-bold text-[#F5F0E8] truncate">{pl.name}</h3>
                          <p className="text-xs text-[#9E9384] line-clamp-2 mt-1">{pl.description}</p>
                          <span className="text-xs text-[#DFCCB0] mt-2 block font-medium tabular-nums">
                            {pl.isCustom ? 'Custom · ' : pl.regionLabel ? `${pl.regionLabel} · ` : ''}
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

      {/* Expanded Track & Artist Detail Modal */}
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
          setRepeatMode(prev => {
            if (prev === 'off') return 'all';
            if (prev === 'all') return 'one';
            return 'off';
          });
        }}
        onToggleShuffle={() => setIsShuffle(prev => !prev)}
        onToggleLike={(track) => handleToggleLike(track)}
        onPlayTrack={handlePlayTrack}
        onSearchArtist={handleSelectRecentSearch}
      />

      <SleepTimerModal
        isOpen={isSleepTimerOpen}
        onClose={() => setIsSleepTimerOpen(false)}
        activeTimerMinutes={sleepTimerMinutes}
        onSetTimer={setSleepTimerMinutes}
      />

      <CreatePlaylistModal
        isOpen={isCreatePlaylistOpen}
        onClose={() => setIsCreatePlaylistOpen(false)}
        onCreatePlaylist={handleCreatePlaylist}
      />

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
        onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
        onOpenExpandedCover={() => setIsExpandedCoverOpen(true)}
      />

      <MobileNav
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
      />

      <BackgroundPermissionModal
        isOpen={isBgPermissionOpen}
        onClose={() => setIsBgPermissionOpen(false)}
        onPermissionGranted={() => {
          setOfflineNotice('All permissions allowed — background & offline mode ready');
        }}
      />

      {offlineNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-40 md:bottom-28 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-[#1B1815]/95 border border-[#D8C3A5]/40 px-4 py-2 text-xs font-semibold text-[#EDE0CC] shadow-2xl whitespace-nowrap max-w-[92vw] truncate"
        >
          {offlineNotice}
        </div>
      )}

      <OfflineIndicator cachedTrackCount={cachedTrackEntries.length} />

      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        initialTab={legalTab}
      />
    </div>
  );
}
