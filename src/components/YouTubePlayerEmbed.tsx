import React, { useEffect, useRef, useState } from 'react';
import { loadYouTubeIFrameAPI } from '../services/youtubeApi';
import { YTPlayerInstance } from '../types/youtube';
import { AudioSettings, RepeatMode, Track } from '../types/music';
import {
  buildMediaMetadataInit,
  parseMediaBridgeCommand,
  registerPrimaryAudioElement,
  setAudioKeepAlivePlaying,
  shouldPreserveIntentOnVisibilityPause,
} from '../utils/backgroundAudio';
import { resolveClientMirrorAudio } from '../utils/clientAudioResolver';
import {
  showBackgroundNowPlayingNotification,
  clearBackgroundNowPlayingNotification,
} from '../utils/backgroundPermission';
import { buildSignedAudioUrl, createSignedHeaders } from '../utils/requestSignature';
import { canRouteThroughWebAudio, sharedAudioEngine } from '../utils/audioEngine';
import {
  computeCrossfadeGains,
  isSignatureFresh,
  shouldPrefetchNextTrack,
  shouldTriggerCrossfade,
} from '../utils/gaplessPrefetch';
import { getOfflineTrackRecord } from '../utils/offlineDb';

interface YouTubePlayerEmbedProps {
  currentTrack: Track | null;
  nextTrack?: Track | null;
  repeatMode?: RepeatMode;
  audioSettings: AudioSettings;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  seekTarget: number | null;
  onClearSeek: () => void;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onPlayerStateChange: (state: 'playing' | 'paused' | 'ended' | 'buffering') => void;
  onTrackError?: (track: Track, errorCode: number) => void;
  onPlayPause?: () => void;
  onNext?: () => void;
  onCrossfadeNext?: () => void;
  onPrevious?: () => void;
  onSeek?: (seconds: number) => void;
}

type EngineMode = 'native_audio' | 'youtube_iframe';

interface CachedStreamEntry {
  url: string;
  signedAtMs: number;
  isBlob?: boolean;
}

interface PreparedDeckEntry {
  youtubeId: string;
  deckIndex: 0 | 1;
  url: string;
}

interface ActiveCrossfade {
  fromEl: HTMLAudioElement;
  toEl: HTMLAudioElement;
  durationMs: number;
  startedAtMs: number;
}

export const YouTubePlayerEmbed: React.FC<YouTubePlayerEmbedProps> = ({
  currentTrack,
  nextTrack = null,
  repeatMode = 'off',
  audioSettings,
  isPlaying,
  volume,
  isMuted,
  seekTarget,
  onClearSeek,
  onTimeUpdate,
  onPlayerStateChange,
  onTrackError,
  onPlayPause,
  onNext,
  onCrossfadeNext,
  onPrevious,
  onSeek,
}) => {
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const deckARef = useRef<HTMLAudioElement | null>(null);
  const deckBRef = useRef<HTMLAudioElement | null>(null);
  const bypassAudioRef = useRef<HTMLAudioElement | null>(null);

  const activeDeckIdxRef = useRef<0 | 1>(0);
  const isBypassActiveRef = useRef<boolean>(false);

  const currentTrackRef = useRef<Track | null>(currentTrack);
  const nextTrackRef = useRef<Track | null>(nextTrack);
  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  const audioSettingsRef = useRef<AudioSettings>(audioSettings);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const volumeRef = useRef<number>(volume);
  const isMutedRef = useRef<boolean>(isMuted);

  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onPlayerStateChangeRef = useRef(onPlayerStateChange);
  const onTrackErrorRef = useRef(onTrackError);
  const onPlayPauseRef = useRef(onPlayPause);
  const onNextRef = useRef(onNext);
  const onCrossfadeNextRef = useRef(onCrossfadeNext);
  const onPreviousRef = useRef(onPrevious);
  const onSeekRef = useRef(onSeek);

  const isCreatingRef = useRef<boolean>(false);
  const lastHiddenAtRef = useRef<number>(-1);
  const engineModeRef = useRef<EngineMode>('youtube_iframe');
  const activeProbeSeqRef = useRef<number>(0);
  const lastPositionUpdateRef = useRef<number>(0);
  const keepAliveCtxRef = useRef<AudioContext | null>(null);
  const keepAliveOscRef = useRef<OscillatorNode | null>(null);

  const resolvedStreamCacheRef = useRef<Map<string, CachedStreamEntry>>(new Map());
  const blobUrlCacheRef = useRef<Map<string, string>>(new Map());
  const prefetchedForIdRef = useRef<string | null>(null);
  const preparedDeckRef = useRef<PreparedDeckEntry | null>(null);
  const crossfadeRef = useRef<ActiveCrossfade | null>(null);
  const skipNextTrackLoadIdRef = useRef<string | null>(null);

  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [engineMode, setEngineMode] = useState<EngineMode>('youtube_iframe');

  const getDeckEl = (idx: 0 | 1): HTMLAudioElement | null =>
    idx === 0 ? deckARef.current : deckBRef.current;

  const getActiveNativeAudioEl = (): HTMLAudioElement | null => {
    if (isBypassActiveRef.current) return bypassAudioRef.current;
    return getDeckEl(activeDeckIdxRef.current);
  };

  const getTargetMasterVolume = (): number =>
    isMutedRef.current ? 0 : Math.min(1, Math.max(0, volumeRef.current / 100));

  const setDeckOutputLevel = (el: HTMLAudioElement | null, gainFactor: number) => {
    if (!el) return;
    const masterVol = getTargetMasterVolume();
    const clampedFactor = Math.min(1, Math.max(0, gainFactor));
    if (sharedAudioEngine.getIsWebAudioActive(el)) {
      el.volume = masterVol;
      el.muted = isMutedRef.current;
      sharedAudioEngine.setDeckGain(el, clampedFactor);
    } else {
      el.volume = masterVol * clampedFactor;
      el.muted = isMutedRef.current;
    }
  };

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    audioSettingsRef.current = audioSettings;
    sharedAudioEngine.applySettings(audioSettings);
  }, [audioSettings]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    volumeRef.current = volume;
    isMutedRef.current = isMuted;
  }, [volume, isMuted]);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
    onPlayerStateChangeRef.current = onPlayerStateChange;
    onTrackErrorRef.current = onTrackError;
    onPlayPauseRef.current = onPlayPause;
    onNextRef.current = onNext;
    onCrossfadeNextRef.current = onCrossfadeNext;
    onPreviousRef.current = onPrevious;
    onSeekRef.current = onSeek;
  }, [
    onTimeUpdate,
    onPlayerStateChange,
    onTrackError,
    onPlayPause,
    onNext,
    onCrossfadeNext,
    onPrevious,
    onSeek,
  ]);

  const setActiveEngine = (mode: EngineMode) => {
    engineModeRef.current = mode;
    setEngineMode(mode);
  };

  // Cleanup any created Blob URLs when unmounting completely
  useEffect(() => {
    return () => {
      blobUrlCacheRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      blobUrlCacheRef.current.clear();
    };
  }, []);

  // Register primary <audio> element for iOS/Android gesture unlock
  useEffect(() => {
    registerPrimaryAudioElement(deckARef.current);
    return () => {
      registerPrimaryAudioElement(null);
    };
  }, []);

  const ensureDeckAttachedForWebAudio = (el: HTMLAudioElement | null, gain = 1) => {
    if (!el) return;
    sharedAudioEngine.attachDeck(el, gain);
    sharedAudioEngine.applySettings(audioSettingsRef.current);
    sharedAudioEngine.resume();
  };

  // Resolves a fresh playable URL for any track: Offline IndexedDB blob -> Backend /api/audio -> Client mirrors
  const resolveNativeStreamForTrack = async (
    track: Track,
    probeTimeoutMs = 1800
  ): Promise<CachedStreamEntry | null> => {
    if (!track || !track.youtubeId) return null;

    // 1. Offline IndexedDB storage (instant, works offline)
    try {
      const offlineRec = await getOfflineTrackRecord(track.youtubeId);
      if (offlineRec?.audioBlob && offlineRec.audioBlob.size > 1024) {
        let blobUrl = blobUrlCacheRef.current.get(track.youtubeId);
        if (!blobUrl) {
          blobUrl = URL.createObjectURL(offlineRec.audioBlob);
          blobUrlCacheRef.current.set(track.youtubeId, blobUrl);
        }
        return { url: blobUrl, signedAtMs: Date.now(), isBlob: true };
      }
    } catch {
      // Proceed to online streaming if IndexedDB unavailable
    }

    // Skip network probes when offline
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return null;
    }

    // 2. Signed backend /api/audio probe
    try {
      const sigHeaders = await createSignedHeaders('/api/audio', track.youtubeId);
      const probeRes = await fetch(
        `/api/audio?v=${encodeURIComponent(track.youtubeId)}&probe=1`,
        {
          headers: sigHeaders,
          signal: AbortSignal.timeout(probeTimeoutMs),
        }
      );
      if (probeRes.ok) {
        const probeData = await probeRes.json();
        if (probeData?.available) {
          const signedUrl = await buildSignedAudioUrl(track.youtubeId);
          return { url: signedUrl, signedAtMs: Date.now(), isBlob: false };
        }
      }
    } catch {
      // ignore probe timeout/error
    }

    // 3. Client Piped/Invidious mirror fallback
    const refEl = deckARef.current;
    const canPlay = refEl
      ? (mime: string) => {
          try {
            return Boolean(refEl.canPlayType(mime));
          } catch {
            return true;
          }
        }
      : undefined;

    const mirror = await resolveClientMirrorAudio(track.youtubeId, canPlay);
    if (mirror?.url) {
      return { url: mirror.url, signedAtMs: Date.now(), isBlob: false };
    }
    return null;
  };

  // Pre-fetch next track stream and pre-warm standby deck cleanly in background
  const prefetchNextTrackStream = async (targetTrack: Track) => {
    if (!targetTrack || !targetTrack.youtubeId) return;
    try {
      const existing = resolvedStreamCacheRef.current.get(targetTrack.youtubeId);
      let resolved = existing;
      if (
        !resolved ||
        (resolved.url.startsWith('/api/audio') && !isSignatureFresh(resolved.signedAtMs))
      ) {
        const fresh = await resolveNativeStreamForTrack(targetTrack, 2200);
        if (!fresh) return;
        resolved = fresh;
        resolvedStreamCacheRef.current.set(targetTrack.youtubeId, fresh);
      }

      // If still pointing to same next track and eligible for Web Audio, warm standby deck!
      if (
        nextTrackRef.current?.youtubeId === targetTrack.youtubeId &&
        canRouteThroughWebAudio(resolved.url, window.location.origin)
      ) {
        const standbyIdx: 0 | 1 = activeDeckIdxRef.current === 0 ? 1 : 0;
        const standbyEl = getDeckEl(standbyIdx);
        if (standbyEl && !crossfadeRef.current) {
          const playbackUrl =
            resolved.url.startsWith('/api/audio') && !isSignatureFresh(resolved.signedAtMs)
              ? await buildSignedAudioUrl(targetTrack.youtubeId)
              : resolved.url;
          ensureDeckAttachedForWebAudio(standbyEl, 0);
          standbyEl.preload = 'auto';
          standbyEl.src = playbackUrl;
          standbyEl.load();
          preparedDeckRef.current = {
            youtubeId: targetTrack.youtubeId,
            deckIndex: standbyIdx,
            url: playbackUrl,
          };
        }
      }
    } catch {
      // Background prefetch failures are always silent
    }
  };

  // Update MediaSession metadata & lock-screen action handlers
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;

    if (currentTrack && typeof MediaMetadata !== 'undefined') {
      try {
        ms.metadata = new MediaMetadata(buildMediaMetadataInit(currentTrack));
      } catch {
        // ignore unsupported browser metadata fields
      }
    } else {
      ms.metadata = null;
    }

    const safeAction = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // ignore unsupported actions on older browsers
      }
    };

    safeAction('play', () => {
      if (!isPlayingRef.current) {
        onPlayPauseRef.current?.();
      }
      const activeNative = getActiveNativeAudioEl();
      if (engineModeRef.current === 'native_audio' && activeNative) {
        sharedAudioEngine.resume();
        activeNative.play().catch(() => {});
      } else if (playerRef.current) {
        try {
          playerRef.current.playVideo();
        } catch {
          // ignore
        }
      }
    });

    safeAction('pause', () => {
      if (isPlayingRef.current) {
        onPlayPauseRef.current?.();
      }
    });

    safeAction('previoustrack', () => onPreviousRef.current?.());
    safeAction('nexttrack', () => onNextRef.current?.());

    safeAction('seekto', (details) => {
      if (typeof details.seekTime === 'number') {
        onSeekRef.current?.(Math.max(0, details.seekTime));
      }
    });

    safeAction('seekbackward', (details) => {
      const offset = details.seekOffset || 10;
      const activeNative = getActiveNativeAudioEl();
      const cur =
        engineModeRef.current === 'native_audio' && activeNative
          ? activeNative.currentTime || 0
          : playerRef.current?.getCurrentTime?.() || 0;
      onSeekRef.current?.(Math.max(0, cur - offset));
    });

    safeAction('seekforward', (details) => {
      const offset = details.seekOffset || 10;
      const activeNative = getActiveNativeAudioEl();
      const cur =
        engineModeRef.current === 'native_audio' && activeNative
          ? activeNative.currentTime || 0
          : playerRef.current?.getCurrentTime?.() || 0;
      onSeekRef.current?.(cur + offset);
    });
  }, [currentTrack]);

  // Listen to native Android MediaStyle notification buttons & lockscreen seekbar
  useEffect(() => {
    const win = window as unknown as {
      __spotitubeMediaControl?: (cmd: string) => void;
    };
    win.__spotitubeMediaControl = (rawCmd: string) => {
      const parsed = parseMediaBridgeCommand(rawCmd);
      if (!parsed) return;

      if (parsed.type === 'play') {
        if (!isPlayingRef.current) {
          onPlayPauseRef.current?.();
        }
        const activeNative = getActiveNativeAudioEl();
        if (engineModeRef.current === 'native_audio' && activeNative) {
          sharedAudioEngine.resume();
          activeNative.play().catch(() => {});
        } else if (playerRef.current) {
          try {
            playerRef.current.playVideo();
          } catch {
            // ignore
          }
        }
      } else if (parsed.type === 'pause' || parsed.type === 'stop') {
        if (isPlayingRef.current) {
          onPlayPauseRef.current?.();
        }
      } else if (parsed.type === 'toggle') {
        onPlayPauseRef.current?.();
      } else if (parsed.type === 'next') {
        onNextRef.current?.();
      } else if (parsed.type === 'previous') {
        onPreviousRef.current?.();
      } else if (parsed.type === 'seek') {
        onSeekRef.current?.(parsed.seconds);
      }
    };
    return () => {
      delete win.__spotitubeMediaControl;
    };
  }, []);

  // Sync MediaSession playbackState, silent WAV + Web Audio keep-alive, and background notification
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = currentTrack
          ? isPlaying
            ? 'playing'
            : 'paused'
          : 'none';
      } catch {
        // ignore
      }
    }

    // Only run silent keep-alive when playing via YouTube IFrame (native <audio> keeps session alive itself)
    const needsKeepAlive = Boolean(currentTrack && isPlaying && engineMode === 'youtube_iframe');
    setAudioKeepAlivePlaying(needsKeepAlive);

    if (needsKeepAlive) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          if (!keepAliveCtxRef.current || keepAliveCtxRef.current.state === 'closed') {
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = 20;
            gain.gain.value = 0.0001;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            keepAliveCtxRef.current = ctx;
            keepAliveOscRef.current = osc;
          } else if (keepAliveCtxRef.current.state === 'suspended') {
            keepAliveCtxRef.current.resume().catch(() => {});
          }
        }
      } catch {
        // ignore Web Audio autoplay restrictions
      }
    } else if (keepAliveCtxRef.current && keepAliveCtxRef.current.state === 'running') {
      keepAliveCtxRef.current.suspend().catch(() => {});
    }

    if (currentTrack && isPlaying && typeof document !== 'undefined' && document.hidden) {
      void showBackgroundNowPlayingNotification(currentTrack, true);
    } else if (!isPlaying || !currentTrack) {
      void clearBackgroundNowPlayingNotification();
    }

    try {
      const bridge = (window as unknown as {
        SpotiTubeAndroid?: {
          updateMediaState?: (
            hasTrack: boolean,
            playing: boolean,
            title: string,
            artist: string,
            artworkUrl: string,
            durationMs: number,
            positionMs: number
          ) => void;
          setPlayingState?: (playing: boolean, title: string, artist: string) => void;
        };
      }).SpotiTubeAndroid;

      const activeNative = getActiveNativeAudioEl();
      const curPosSec =
        engineModeRef.current === 'native_audio' && activeNative
          ? activeNative.currentTime || 0
          : playerRef.current?.getCurrentTime?.() || 0;
      const trackDurSec = currentTrack?.durationSeconds || 0;
      const artworkUrl =
        currentTrack?.thumbnail ||
        (currentTrack?.youtubeId ? `https://i.ytimg.com/vi/${currentTrack.youtubeId}/hqdefault.jpg` : '');

      if (bridge?.updateMediaState) {
        bridge.updateMediaState(
          Boolean(currentTrack),
          Boolean(currentTrack && isPlaying),
          currentTrack?.title || 'Kiddwave',
          currentTrack?.artist || 'Global Soundstage',
          artworkUrl,
          Math.max(0, Math.round(trackDurSec * 1000)),
          Math.max(0, Math.round(curPosSec * 1000))
        );
      } else {
        bridge?.setPlayingState?.(
          Boolean(currentTrack && isPlaying),
          currentTrack?.title || 'Kiddwave',
          currentTrack?.artist || 'Global Soundstage'
        );
      }
    } catch {
      // ignore outside native Android wrapper
    }
  }, [currentTrack, isPlaying, engineMode]);

  // Pre-warm YouTube IFrame API + run precision 150ms progress, pre-fetch, and crossfade loop
  useEffect(() => {
    let cancelled = false;
    loadYouTubeIFrameAPI()
      .then(() => {
        if (cancelled || playerRef.current || isCreatingRef.current) return;
        if (!window.YT || !window.YT.Player) return;
        isCreatingRef.current = true;

        new window.YT.Player('spotitube-iframe-anchor', {
          height: '100%',
          width: '100%',
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              playerRef.current = event.target;
              isCreatingRef.current = false;
              setIsPlayerReady(true);

              try {
                const iframeEl = event.target.getIframe?.();
                if (iframeEl) {
                  iframeEl.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
                  iframeEl.setAttribute('tabindex', '-1');
                  iframeEl.style.pointerEvents = 'none';
                }
              } catch {
                // ignore
              }

              event.target.setVolume(volumeRef.current);
              if (isMutedRef.current) {
                event.target.mute();
              } else {
                event.target.unMute();
              }

              if (engineModeRef.current === 'native_audio') {
                return;
              }

              const active = currentTrackRef.current;
              if (active) {
                event.target.loadVideoById(active.youtubeId, 0);
                if (isPlayingRef.current) {
                  event.target.playVideo();
                }
              }
            },
            onStateChange: (event) => {
              if (engineModeRef.current !== 'youtube_iframe') return;
              const state = event.data;
              if (state === 1) {
                onPlayerStateChangeRef.current('playing');
              } else if (state === 2) {
                const hiddenElapsedMs =
                  lastHiddenAtRef.current > 0 ? Date.now() - lastHiddenAtRef.current : -1;
                if (
                  shouldPreserveIntentOnVisibilityPause({
                    isDocumentHidden: document.hidden,
                    userIntendedPlay: isPlayingRef.current,
                    msSinceHidden: hiddenElapsedMs,
                  })
                ) {
                  for (const delayMs of [120, 400, 900, 1600]) {
                    setTimeout(() => {
                      if (engineModeRef.current === 'youtube_iframe' && isPlayingRef.current) {
                        try {
                          playerRef.current?.playVideo();
                        } catch {
                          // ignore
                        }
                      }
                    }, delayMs);
                  }
                  return;
                }
                onPlayerStateChangeRef.current('paused');
              } else if (state === 0) {
                onPlayerStateChangeRef.current('ended');
              } else if (state === 3) {
                onPlayerStateChangeRef.current('buffering');
              }
            },
            onError: (err) => {
              if (engineModeRef.current !== 'youtube_iframe') return;
              console.warn('YouTube IFrame player error code:', err.data);
              if (currentTrackRef.current && onTrackErrorRef.current) {
                onTrackErrorRef.current(currentTrackRef.current, err.data);
              }
            },
          },
        });
      })
      .catch(() => {
        isCreatingRef.current = false;
      });

    const handleVisibilityChange = () => {
      if (document.hidden) {
        lastHiddenAtRef.current = Date.now();
        if (isPlayingRef.current && currentTrackRef.current) {
          void showBackgroundNowPlayingNotification(currentTrackRef.current, true);
        }
        return;
      }

      void clearBackgroundNowPlayingNotification();

      const activeNative = getActiveNativeAudioEl();
      if (isPlayingRef.current && currentTrackRef.current) {
        if (engineModeRef.current === 'native_audio' && activeNative) {
          if (activeNative.paused) {
            sharedAudioEngine.resume();
            activeNative.play().catch(() => {});
          }
        } else if (playerRef.current) {
          try {
            const st = playerRef.current.getPlayerState();
            if (st !== 1 && st !== 3) {
              playerRef.current.playVideo();
            }
          } catch {
            // ignore
          }
        }
      }
    };

    const handleWindowBlur = () => {
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (active && active.tagName === 'IFRAME' && active.id === 'spotitube-iframe-anchor') {
          try {
            (active as HTMLElement).blur();
            window.focus();
          } catch {
            // ignore
          }
        }
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    const timer = setInterval(() => {
      let cur = 0;
      let dur = 0;
      const activeNative = getActiveNativeAudioEl();

      if (engineModeRef.current === 'native_audio' && activeNative) {
        cur = activeNative.currentTime || 0;
        dur = Number.isFinite(activeNative.duration)
          ? activeNative.duration
          : currentTrackRef.current?.durationSeconds || 0;
      } else {
        const p = playerRef.current;
        if (p && typeof p.getCurrentTime === 'function') {
          try {
            cur = p.getCurrentTime() || 0;
            dur = p.getDuration() || 0;
          } catch {
            // ignore transient ticks
          }
        }
      }

      // Active crossfade gain envelope progression
      if (crossfadeRef.current) {
        const cf = crossfadeRef.current;
        const elapsed = Date.now() - cf.startedAtMs;
        const progress01 = Math.min(1, Math.max(0, elapsed / cf.durationMs));
        const { outgoingGain, incomingGain } = computeCrossfadeGains(progress01);
        setDeckOutputLevel(cf.fromEl, outgoingGain);
        setDeckOutputLevel(cf.toEl, incomingGain);

        if (progress01 >= 1) {
          try {
            cf.fromEl.pause();
            cf.fromEl.removeAttribute('src');
            cf.fromEl.load();
          } catch {
            // ignore
          }
          setDeckOutputLevel(cf.toEl, 1);
          crossfadeRef.current = null;
        }
      }

      if (cur > 0 || dur > 0) {
        onTimeUpdateRef.current(cur, dur);

        // 1. Background Next-Track Pre-fetch at 75% or <=20s remaining
        const candidateNext = nextTrackRef.current;
        if (
          isPlayingRef.current &&
          shouldPrefetchNextTrack({
            currentTime: cur,
            duration: dur,
            nextTrackId: candidateNext?.youtubeId || null,
            alreadyPrefetchedId: prefetchedForIdRef.current,
            repeatMode: repeatModeRef.current,
          }) &&
          candidateNext
        ) {
          prefetchedForIdRef.current = candidateNext.youtubeId;
          void prefetchNextTrackStream(candidateNext);
        }

        // 2. Smooth Crossfade transition when remaining <= crossfadeSeconds
        const prepared = preparedDeckRef.current;
        const cfSec = audioSettingsRef.current.crossfadeSeconds;
        if (
          !crossfadeRef.current &&
          !isBypassActiveRef.current &&
          isPlayingRef.current &&
          candidateNext &&
          prepared &&
          prepared.youtubeId === candidateNext.youtubeId &&
          shouldTriggerCrossfade({
            currentTime: cur,
            duration: dur,
            crossfadeSeconds: cfSec,
            hasPreparedNextTrack: true,
            engineMode: engineModeRef.current,
            repeatMode: repeatModeRef.current,
          })
        ) {
          const fromEl = getDeckEl(activeDeckIdxRef.current);
          const toEl = getDeckEl(prepared.deckIndex);
          if (fromEl && toEl && fromEl !== toEl && toEl.src) {
            skipNextTrackLoadIdRef.current = candidateNext.youtubeId;
            activeDeckIdxRef.current = prepared.deckIndex;
            preparedDeckRef.current = null;

            ensureDeckAttachedForWebAudio(toEl, 0);
            setDeckOutputLevel(toEl, 0);
            toEl.currentTime = 0;
            toEl
              .play()
              .then(() => {
                crossfadeRef.current = {
                  fromEl,
                  toEl,
                  durationMs: cfSec * 1000,
                  startedAtMs: Date.now(),
                };
                onCrossfadeNextRef.current?.();
              })
              .catch(() => {
                skipNextTrackLoadIdRef.current = null;
                setDeckOutputLevel(fromEl, 1);
              });
          }
        }

        // 3. Periodic MediaSession & Android lockscreen position sync
        const now = Date.now();
        if (now - lastPositionUpdateRef.current > 1000 && dur > 0) {
          lastPositionUpdateRef.current = now;
          const clampedSec = Math.min(cur, dur);
          if (
            typeof navigator !== 'undefined' &&
            'mediaSession' in navigator &&
            typeof navigator.mediaSession.setPositionState === 'function'
          ) {
            try {
              navigator.mediaSession.setPositionState({
                duration: dur,
                playbackRate: isPlayingRef.current ? 1 : 0,
                position: clampedSec,
              });
            } catch {
              // ignore
            }
          }
          try {
            const win = window as unknown as {
              SpotiTubeAndroid?: {
                updatePlaybackPosition?: (durationMs: number, positionMs: number, playing: boolean) => void;
              };
            };
            win.SpotiTubeAndroid?.updatePlaybackPosition?.(
              Math.max(0, Math.round(dur * 1000)),
              Math.max(0, Math.round(clampedSec * 1000)),
              isPlayingRef.current
            );
          } catch {
            // ignore outside Android wrapper
          }
        }
      }
    }, 150);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      setAudioKeepAlivePlaying(false);
      try {
        keepAliveOscRef.current?.stop();
      } catch {
        // ignore
      }
      if (keepAliveCtxRef.current && keepAliveCtxRef.current.state !== 'closed') {
        keepAliveCtxRef.current.close().catch(() => {});
      }
      keepAliveOscRef.current = null;
      keepAliveCtxRef.current = null;
      void clearBackgroundNowPlayingNotification();
    };
  }, []);

  const startOrLoadYouTubeIFrame = (track: Track, startSeconds = 0) => {
    setActiveEngine('youtube_iframe');

    if (playerRef.current && isPlayerReady) {
      try {
        playerRef.current.loadVideoById(track.youtubeId, startSeconds);
        if (isPlayingRef.current) {
          playerRef.current.playVideo();
        }
      } catch (e) {
        console.warn('Error loading video by ID:', e);
      }
      return;
    }

    if (isCreatingRef.current) return;
    isCreatingRef.current = true;

    loadYouTubeIFrameAPI().then(() => {
      if (!window.YT || !window.YT.Player) {
        isCreatingRef.current = false;
        return;
      }

      const initialTrack = currentTrackRef.current;
      if (!initialTrack) {
        isCreatingRef.current = false;
        return;
      }

      new window.YT.Player('spotitube-iframe-anchor', {
        height: '100%',
        width: '100%',
        videoId: initialTrack.youtubeId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            playerRef.current = event.target;
            isCreatingRef.current = false;
            setIsPlayerReady(true);

            try {
              const iframeEl = event.target.getIframe?.();
              if (iframeEl) {
                iframeEl.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
                iframeEl.setAttribute('tabindex', '-1');
                iframeEl.style.pointerEvents = 'none';
              }
            } catch {
              // ignore
            }

            event.target.setVolume(volumeRef.current);
            if (isMutedRef.current) {
              event.target.mute();
            } else {
              event.target.unMute();
            }

            if (engineModeRef.current === 'native_audio') {
              event.target.pauseVideo();
              return;
            }

            const latest = currentTrackRef.current;
            if (latest && latest.youtubeId !== initialTrack.youtubeId) {
              event.target.loadVideoById(latest.youtubeId, startSeconds);
            }
            if (isPlayingRef.current) {
              event.target.playVideo();
            }
          },
          onStateChange: (event) => {
            if (engineModeRef.current !== 'youtube_iframe') return;
            const state = event.data;
            if (state === 1) {
              onPlayerStateChangeRef.current('playing');
            } else if (state === 2) {
              const hiddenElapsedMs =
                lastHiddenAtRef.current > 0 ? Date.now() - lastHiddenAtRef.current : -1;
              if (
                shouldPreserveIntentOnVisibilityPause({
                  isDocumentHidden: document.hidden,
                  userIntendedPlay: isPlayingRef.current,
                  msSinceHidden: hiddenElapsedMs,
                })
              ) {
                for (const delayMs of [120, 400, 900, 1600]) {
                  setTimeout(() => {
                    if (engineModeRef.current === 'youtube_iframe' && isPlayingRef.current) {
                      try {
                        playerRef.current?.playVideo();
                      } catch {
                        // ignore
                      }
                    }
                  }, delayMs);
                }
                return;
              }
              onPlayerStateChangeRef.current('paused');
            } else if (state === 0) {
              onPlayerStateChangeRef.current('ended');
            } else if (state === 3) {
              onPlayerStateChangeRef.current('buffering');
            }
          },
          onError: (err) => {
            if (engineModeRef.current !== 'youtube_iframe') return;
            console.warn('YouTube IFrame player error code:', err.data);
            if (currentTrackRef.current && onTrackErrorRef.current) {
              onTrackErrorRef.current(currentTrackRef.current, err.data);
            }
          },
        },
      });
    });
  };

  // Play native URL either through Web Audio mastering deck (same-origin/blob) or clean bypass deck (external mirror)
  const playNativeUrl = async (
    track: Track,
    url: string,
    startSeconds = 0,
    preferredDeckIdx?: 0 | 1
  ): Promise<boolean> => {
    const useWebAudio = canRouteThroughWebAudio(url, window.location.origin);

    if (useWebAudio) {
      const targetIdx = preferredDeckIdx ?? activeDeckIdxRef.current;
      const el = getDeckEl(targetIdx);
      if (!el) return false;

      // Pause bypass if it was active
      if (bypassAudioRef.current && !bypassAudioRef.current.paused) {
        try {
          bypassAudioRef.current.pause();
        } catch {
          // ignore
        }
      }

      isBypassActiveRef.current = false;
      activeDeckIdxRef.current = targetIdx;
      ensureDeckAttachedForWebAudio(el, 1);

      if (el.src !== url && !el.src.endsWith(url)) {
        el.preload = 'auto';
        el.src = url;
      }
      if (startSeconds > 0.4) {
        try {
          el.currentTime = startSeconds;
        } catch {
          // ignore
        }
      }
      setDeckOutputLevel(el, 1);

      setActiveEngine('native_audio');
      try {
        playerRef.current?.pauseVideo();
      } catch {
        // ignore
      }

      if (isPlayingRef.current) {
        sharedAudioEngine.resume();
        await el.play();
      }
      return true;
    }

    // External CORS-restricted third-party mirror -> use un-tainted bypass <audio>
    const bypass = bypassAudioRef.current;
    if (!bypass) return false;

    const currentDeck = getDeckEl(activeDeckIdxRef.current);
    if (currentDeck && !currentDeck.paused) {
      try {
        currentDeck.pause();
      } catch {
        // ignore
      }
    }

    isBypassActiveRef.current = true;
    bypass.preload = 'auto';
    bypass.src = url;
    if (startSeconds > 0.4) {
      try {
        bypass.currentTime = startSeconds;
      } catch {
        // ignore
      }
    }
    setDeckOutputLevel(bypass, 1);

    setActiveEngine('native_audio');
    try {
      playerRef.current?.pauseVideo();
    } catch {
      // ignore
    }

    if (isPlayingRef.current) {
      await bypass.play();
    }
    return true;
  };

  // Track change lifecycle: Offline IndexedDB -> Pre-fetched gapless deck -> Instant IFrame + background native upgrade
  useEffect(() => {
    if (!currentTrack) return;

    // Clear prefetch state for newly playing track
    prefetchedForIdRef.current = null;

    // If this track was just started cleanly via crossfade, preserve its active crossfading deck!
    if (skipNextTrackLoadIdRef.current === currentTrack.youtubeId) {
      skipNextTrackLoadIdRef.current = null;
      return;
    }

    // Cancel any in-progress crossfade on manual track switch
    if (crossfadeRef.current) {
      try {
        crossfadeRef.current.fromEl.pause();
      } catch {
        // ignore
      }
      crossfadeRef.current = null;
    }

    const seq = ++activeProbeSeqRef.current;

    // Pause active native audio before switching
    const curActiveNative = getActiveNativeAudioEl();
    if (engineModeRef.current === 'native_audio' && curActiveNative) {
      try {
        curActiveNative.pause();
      } catch {
        // ignore
      }
    }

    let cancelled = false;

    // Fast path 1: Already warmed & prepared on standby deck!
    const prepared = preparedDeckRef.current;
    if (prepared && prepared.youtubeId === currentTrack.youtubeId) {
      preparedDeckRef.current = null;
      const targetDeck = getDeckEl(prepared.deckIndex);
      if (targetDeck) {
        (async () => {
          const cached = resolvedStreamCacheRef.current.get(currentTrack.youtubeId);
          let finalUrl = prepared.url;
          if (cached?.url.startsWith('/api/audio') && !isSignatureFresh(cached.signedAtMs)) {
            finalUrl = await buildSignedAudioUrl(currentTrack.youtubeId);
            resolvedStreamCacheRef.current.set(currentTrack.youtubeId, {
              url: finalUrl,
              signedAtMs: Date.now(),
            });
          }
          if (cancelled || currentTrackRef.current?.youtubeId !== currentTrack.youtubeId) return;
          try {
            await playNativeUrl(currentTrack, finalUrl, 0, prepared.deckIndex);
          } catch {
            if (currentTrackRef.current?.youtubeId === currentTrack.youtubeId) {
              startOrLoadYouTubeIFrame(currentTrack, 0);
            }
          }
        })();
        return () => {
          cancelled = true;
        };
      }
    }

    // Fast path 2: Cached stream URL from earlier prefetch or previous play
    const cachedStream = resolvedStreamCacheRef.current.get(currentTrack.youtubeId);
    if (cachedStream) {
      (async () => {
        const freshUrl =
          cachedStream.url.startsWith('/api/audio') && !isSignatureFresh(cachedStream.signedAtMs)
            ? await buildSignedAudioUrl(currentTrack.youtubeId)
            : cachedStream.url;
        if (freshUrl !== cachedStream.url) {
          resolvedStreamCacheRef.current.set(currentTrack.youtubeId, {
            url: freshUrl,
            signedAtMs: Date.now(),
            isBlob: cachedStream.isBlob,
          });
        }
        if (cancelled || currentTrackRef.current?.youtubeId !== currentTrack.youtubeId) return;
        try {
          await playNativeUrl(currentTrack, freshUrl, 0);
        } catch {
          if (currentTrackRef.current?.youtubeId === currentTrack.youtubeId) {
            startOrLoadYouTubeIFrame(currentTrack, 0);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    // Fast path 3: Check IndexedDB offline storage before touching YouTube IFrame
    (async () => {
      const offlineRec = await getOfflineTrackRecord(currentTrack.youtubeId);
      if (cancelled || seq !== activeProbeSeqRef.current) return;

      if (offlineRec?.audioBlob && offlineRec.audioBlob.size > 1024) {
        let blobUrl = blobUrlCacheRef.current.get(currentTrack.youtubeId);
        if (!blobUrl) {
          blobUrl = URL.createObjectURL(offlineRec.audioBlob);
          blobUrlCacheRef.current.set(currentTrack.youtubeId, blobUrl);
        }
        resolvedStreamCacheRef.current.set(currentTrack.youtubeId, {
          url: blobUrl,
          signedAtMs: Date.now(),
          isBlob: true,
        });
        try {
          await playNativeUrl(currentTrack, blobUrl, 0);
          return;
        } catch {
          // Fall through if local blob decoding fails
        }
      }

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return;
      }

      // Start immediately via pre-warmed YouTube IFrame at 0ms while probing native stream in background
      startOrLoadYouTubeIFrame(currentTrack, 0);

      const resolved = await resolveNativeStreamForTrack(currentTrack, 1600);
      if (
        cancelled ||
        seq !== activeProbeSeqRef.current ||
        !resolved ||
        currentTrackRef.current?.youtubeId !== currentTrack.youtubeId
      ) {
        return;
      }

      resolvedStreamCacheRef.current.set(currentTrack.youtubeId, resolved);

      const useWebAudio = canRouteThroughWebAudio(resolved.url, window.location.origin);
      const targetEl = useWebAudio ? getDeckEl(activeDeckIdxRef.current) : bypassAudioRef.current;
      if (!targetEl) return;

      if (useWebAudio) {
        ensureDeckAttachedForWebAudio(targetEl, 1);
      }
      targetEl.preload = 'auto';
      targetEl.src = resolved.url;

      const onCanPlayHandoff = () => {
        targetEl.removeEventListener('canplay', onCanPlayHandoff);
        if (cancelled || seq !== activeProbeSeqRef.current) return;
        if (currentTrackRef.current?.youtubeId !== currentTrack.youtubeId) return;

        const resumePos = playerRef.current?.getCurrentTime?.() || 0;
        isBypassActiveRef.current = !useWebAudio;
        try {
          if (resumePos > 0.4) targetEl.currentTime = resumePos;
        } catch {
          // ignore
        }
        setDeckOutputLevel(targetEl, 1);

        if (isPlayingRef.current) {
          if (useWebAudio) sharedAudioEngine.resume();
          targetEl
            .play()
            .then(() => {
              setActiveEngine('native_audio');
              try {
                playerRef.current?.pauseVideo();
              } catch {
                // ignore
              }
            })
            .catch(() => {
              // Keep IFrame playing seamlessly if browser blocks handoff
            });
        }
      };

      targetEl.addEventListener('canplay', onCanPlayHandoff, { once: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.youtubeId]);

  // Sync Play / Pause State across active engine
  useEffect(() => {
    if (!currentTrack) return;

    const activeNative = getActiveNativeAudioEl();
    if (engineMode === 'native_audio' && activeNative) {
      if (isPlaying) {
        if (activeNative.paused && activeNative.src) {
          if (!isBypassActiveRef.current) sharedAudioEngine.resume();
          activeNative.play().catch(() => {});
        }
      } else if (!activeNative.paused) {
        activeNative.pause();
      }
      return;
    }

    if (!playerRef.current || !isPlayerReady) return;
    try {
      const state = playerRef.current.getPlayerState();
      if (isPlaying && state !== 1 && state !== 3) {
        playerRef.current.playVideo();
      } else if (!isPlaying && state === 1) {
        playerRef.current.pauseVideo();
      }
    } catch {
      // player might not be fully active yet
    }
  }, [isPlaying, isPlayerReady, currentTrack, engineMode]);

  // Sync Volume across active engines
  useEffect(() => {
    const activeNative = getActiveNativeAudioEl();
    if (activeNative && !crossfadeRef.current) {
      setDeckOutputLevel(activeNative, 1);
    }

    if (!playerRef.current || !isPlayerReady) return;
    try {
      playerRef.current.setVolume(volume);
      if (isMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
      }
    } catch {
      // ignore
    }
  }, [volume, isMuted, isPlayerReady]);

  // Sync Seek target across active engine & external lockscreen seekbar
  useEffect(() => {
    if (seekTarget === null) return;

    const activeNative = getActiveNativeAudioEl();
    const syncExternalSeekPosition = (posSec: number) => {
      const trackDurSec =
        (engineModeRef.current === 'native_audio' &&
        activeNative &&
        Number.isFinite(activeNative.duration)
          ? activeNative.duration
          : playerRef.current?.getDuration?.() || currentTrackRef.current?.durationSeconds) || 0;
      if (trackDurSec > 0) {
        const clampedSec = Math.min(trackDurSec, Math.max(0, posSec));
        if (
          typeof navigator !== 'undefined' &&
          'mediaSession' in navigator &&
          typeof navigator.mediaSession.setPositionState === 'function'
        ) {
          try {
            navigator.mediaSession.setPositionState({
              duration: trackDurSec,
              playbackRate: isPlayingRef.current ? 1 : 0,
              position: clampedSec,
            });
          } catch {
            // ignore
          }
        }
        try {
          const win = window as unknown as {
            SpotiTubeAndroid?: {
              updatePlaybackPosition?: (durationMs: number, positionMs: number, playing: boolean) => void;
            };
          };
          win.SpotiTubeAndroid?.updatePlaybackPosition?.(
            Math.max(0, Math.round(trackDurSec * 1000)),
            Math.max(0, Math.round(clampedSec * 1000)),
            isPlayingRef.current
          );
        } catch {
          // ignore outside Android wrapper
        }
      }
    };

    if (engineMode === 'native_audio' && activeNative) {
      try {
        activeNative.currentTime = seekTarget;
      } catch {
        // ignore
      }
      syncExternalSeekPosition(seekTarget);
      onClearSeek();
      return;
    }

    if (playerRef.current && isPlayerReady) {
      try {
        playerRef.current.seekTo(seekTarget, true);
        if (document.activeElement?.id === 'spotitube-iframe-anchor') {
          (document.activeElement as HTMLElement).blur();
          window.focus();
        }
      } catch (e) {
        console.warn('Seek error:', e);
      }
      syncExternalSeekPosition(seekTarget);
      onClearSeek();
    }
  }, [seekTarget, isPlayerReady, engineMode]);

  const handleAudioElPlay = (el: HTMLAudioElement | null) => {
    if (el === getActiveNativeAudioEl() && engineModeRef.current === 'native_audio') {
      onPlayerStateChangeRef.current('playing');
    }
  };

  const handleAudioElPause = (el: HTMLAudioElement | null) => {
    if (
      el === getActiveNativeAudioEl() &&
      engineModeRef.current === 'native_audio' &&
      el?.getAttribute('src') &&
      !document.hidden &&
      !crossfadeRef.current
    ) {
      onPlayerStateChangeRef.current('paused');
    }
  };

  const handleAudioElEnded = (el: HTMLAudioElement | null) => {
    if (el === getActiveNativeAudioEl() && engineModeRef.current === 'native_audio') {
      onPlayerStateChangeRef.current('ended');
    }
  };

  const handleAudioElError = (el: HTMLAudioElement | null) => {
    if (
      el === getActiveNativeAudioEl() &&
      engineModeRef.current === 'native_audio' &&
      currentTrackRef.current
    ) {
      const resumeSec = el?.currentTime || 0;
      if (typeof navigator === 'undefined' || navigator.onLine !== false) {
        startOrLoadYouTubeIFrame(currentTrackRef.current, resumeSec);
      }
    }
  };

  return (
    <>
      {/* Dual Web-Audio Mastering Decks (for same-origin /api/audio & IndexedDB blob: offline tracks) */}
      <audio
        ref={deckARef}
        preload="auto"
        playsInline
        onPlay={() => handleAudioElPlay(deckARef.current)}
        onPause={() => handleAudioElPause(deckARef.current)}
        onEnded={() => handleAudioElEnded(deckARef.current)}
        onError={() => handleAudioElError(deckARef.current)}
      />
      <audio
        ref={deckBRef}
        preload="auto"
        playsInline
        onPlay={() => handleAudioElPlay(deckBRef.current)}
        onPause={() => handleAudioElPause(deckBRef.current)}
        onEnded={() => handleAudioElEnded(deckBRef.current)}
        onError={() => handleAudioElError(deckBRef.current)}
      />

      {/* Clean Bypass <audio> Deck (guarantees CORS-restricted external mirrors never go silent) */}
      <audio
        ref={bypassAudioRef}
        preload="auto"
        playsInline
        onPlay={() => handleAudioElPlay(bypassAudioRef.current)}
        onPause={() => handleAudioElPause(bypassAudioRef.current)}
        onEnded={() => handleAudioElEnded(bypassAudioRef.current)}
        onError={() => handleAudioElError(bypassAudioRef.current)}
      />

      {/* Hidden off-screen YouTube IFrame fallback */}
      <div
        aria-hidden="true"
        tabIndex={-1}
        className="fixed -z-10 bottom-0 right-0 w-px h-px opacity-0 pointer-events-none overflow-hidden"
      >
        <div id="spotitube-iframe-anchor" tabIndex={-1} className="w-[220px] h-[220px]" />
      </div>
    </>
  );
};
