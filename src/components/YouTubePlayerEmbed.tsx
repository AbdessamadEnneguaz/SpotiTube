import React, { useEffect, useRef, useState } from 'react';
import { loadYouTubeIFrameAPI } from '../services/youtubeApi';
import { YTPlayerInstance } from '../types/youtube';
import { Track } from '../types/music';
import {
  buildMediaMetadataInit,
  parseMediaBridgeCommand,
  registerPrimaryAudioElement,
  setAudioKeepAlivePlaying,
  shouldPreserveIntentOnVisibilityPause
} from '../utils/backgroundAudio';
import { resolveClientMirrorAudio } from '../utils/clientAudioResolver';
import {
  showBackgroundNowPlayingNotification,
  clearBackgroundNowPlayingNotification
} from '../utils/backgroundPermission';

interface YouTubePlayerEmbedProps {
  currentTrack: Track | null;
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
  onPrevious?: () => void;
  onSeek?: (seconds: number) => void;
}

type EngineMode = 'native_audio' | 'youtube_iframe';

export const YouTubePlayerEmbed: React.FC<YouTubePlayerEmbedProps> = ({
  currentTrack,
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
  onPrevious,
  onSeek
}) => {
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const nativeAudioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrackRef = useRef<Track | null>(currentTrack);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const volumeRef = useRef<number>(volume);
  const isMutedRef = useRef<boolean>(isMuted);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onPlayerStateChangeRef = useRef(onPlayerStateChange);
  const onTrackErrorRef = useRef(onTrackError);
  const onPlayPauseRef = useRef(onPlayPause);
  const onNextRef = useRef(onNext);
  const onPreviousRef = useRef(onPrevious);
  const onSeekRef = useRef(onSeek);

  const isCreatingRef = useRef<boolean>(false);
  const lastHiddenAtRef = useRef<number>(-1);
  const engineModeRef = useRef<EngineMode>('youtube_iframe');
  const activeProbeSeqRef = useRef<number>(0);
  const lastPositionUpdateRef = useRef<number>(0);
  const keepAliveCtxRef = useRef<AudioContext | null>(null);
  const keepAliveOscRef = useRef<OscillatorNode | null>(null);

  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [engineMode, setEngineMode] = useState<EngineMode>('youtube_iframe');

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

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
    onPreviousRef.current = onPrevious;
    onSeekRef.current = onSeek;
  }, [onTimeUpdate, onPlayerStateChange, onTrackError, onPlayPause, onNext, onPrevious, onSeek]);

  const setActiveEngine = (mode: EngineMode) => {
    engineModeRef.current = mode;
    setEngineMode(mode);
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
      if (engineModeRef.current === 'native_audio' && nativeAudioRef.current) {
        nativeAudioRef.current.play().catch(() => {});
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
      const cur =
        engineModeRef.current === 'native_audio' && nativeAudioRef.current
          ? nativeAudioRef.current.currentTime || 0
          : playerRef.current?.getCurrentTime?.() || 0;
      onSeekRef.current?.(Math.max(0, cur - offset));
    });

    safeAction('seekforward', (details) => {
      const offset = details.seekOffset || 10;
      const cur =
        engineModeRef.current === 'native_audio' && nativeAudioRef.current
          ? nativeAudioRef.current.currentTime || 0
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
        if (engineModeRef.current === 'native_audio' && nativeAudioRef.current) {
          nativeAudioRef.current.play().catch(() => {});
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

      const curPosSec =
        engineModeRef.current === 'native_audio' && nativeAudioRef.current
          ? nativeAudioRef.current.currentTime || 0
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

  // Register primary <audio> element so user gestures unlock it before async resolution
  useEffect(() => {
    registerPrimaryAudioElement(nativeAudioRef.current);
    return () => {
      registerPrimaryAudioElement(null);
    };
  }, []);

  // Pre-warm YouTube IFrame API & player instance immediately on mount for zero-delay playback
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
            origin: window.location.origin
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
                    msSinceHidden: hiddenElapsedMs
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
            }
          }
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

      // Returning to foreground: ensure active engine matches user intent
      if (isPlayingRef.current && currentTrackRef.current) {
        if (engineModeRef.current === 'native_audio' && nativeAudioRef.current) {
          if (nativeAudioRef.current.paused) {
            nativeAudioRef.current.play().catch(() => {});
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

      if (engineModeRef.current === 'native_audio' && nativeAudioRef.current) {
        cur = nativeAudioRef.current.currentTime || 0;
        dur = Number.isFinite(nativeAudioRef.current.duration)
          ? nativeAudioRef.current.duration
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

      if (cur > 0 || dur > 0) {
        onTimeUpdateRef.current(cur, dur);
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
                position: clampedSec
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

  const resolvedStreamCacheRef = useRef<Map<string, string>>(new Map());

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
          origin: window.location.origin
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
                  msSinceHidden: hiddenElapsedMs
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
          }
        }
      });
    });
  };

  // Zero-delay track start: play immediately via pre-warmed engine (or cached stream), probe background audio non-blocking
  useEffect(() => {
    if (!currentTrack) return;

    const seq = ++activeProbeSeqRef.current;

    if (engineModeRef.current === 'native_audio' && nativeAudioRef.current) {
      try {
        nativeAudioRef.current.pause();
      } catch {
        // ignore
      }
    }

    const cachedNativeUrl = resolvedStreamCacheRef.current.get(currentTrack.youtubeId);
    if (cachedNativeUrl && nativeAudioRef.current) {
      setActiveEngine('native_audio');
      if (playerRef.current && isPlayerReady) {
        try {
          playerRef.current.pauseVideo();
        } catch {
          // ignore
        }
      }
      const audioEl = nativeAudioRef.current;
      audioEl.src = cachedNativeUrl;
      audioEl.volume = isMutedRef.current ? 0 : Math.min(1, Math.max(0, volumeRef.current / 100));
      audioEl.muted = isMutedRef.current;
      if (isPlayingRef.current) {
        audioEl.play().catch(() => {
          if (currentTrackRef.current?.youtubeId === currentTrack.youtubeId) {
            startOrLoadYouTubeIFrame(currentTrack, 0);
          }
        });
      }
      return;
    }

    // Start immediately via pre-warmed IFrame with 0ms wait
    startOrLoadYouTubeIFrame(currentTrack, 0);

    let cancelled = false;
    (async () => {
      const probeBackend = async (): Promise<string | null> => {
        try {
          const probeRes = await fetch(
            `/api/audio?v=${encodeURIComponent(currentTrack.youtubeId)}&probe=1`,
            { signal: AbortSignal.timeout(1500) }
          );
          if (probeRes.ok) {
            const probeData = await probeRes.json();
            if (probeData?.available) {
              return `/api/audio?v=${encodeURIComponent(currentTrack.youtubeId)}`;
            }
          }
        } catch {
          // ignore probe timeout/error
        }
        return null;
      };

      const audioEl = nativeAudioRef.current;
      const canPlay = audioEl
        ? (mime: string) => {
            try {
              return Boolean(audioEl.canPlayType(mime));
            } catch {
              return true;
            }
          }
        : undefined;

      const resolvedNativeUrl =
        (await probeBackend()) ||
        (await resolveClientMirrorAudio(currentTrack.youtubeId, canPlay).then((m) => m?.url || null));

      if (cancelled || seq !== activeProbeSeqRef.current || !resolvedNativeUrl || !nativeAudioRef.current) {
        return;
      }

      resolvedStreamCacheRef.current.set(currentTrack.youtubeId, resolvedNativeUrl);
      if (currentTrackRef.current?.youtubeId !== currentTrack.youtubeId) return;

      // Seamless handoff to native <audio> once buffered, preserving playback position
      const el = nativeAudioRef.current;
      el.preload = 'auto';
      el.src = resolvedNativeUrl;

      const onCanPlayHandoff = () => {
        el.removeEventListener('canplay', onCanPlayHandoff);
        if (cancelled || seq !== activeProbeSeqRef.current) return;
        if (currentTrackRef.current?.youtubeId !== currentTrack.youtubeId) return;

        const resumePos = playerRef.current?.getCurrentTime?.() || 0;
        try {
          if (resumePos > 0.4) el.currentTime = resumePos;
        } catch {
          // ignore
        }
        el.volume = isMutedRef.current ? 0 : Math.min(1, Math.max(0, volumeRef.current / 100));
        el.muted = isMutedRef.current;

        if (isPlayingRef.current) {
          el.play()
            .then(() => {
              setActiveEngine('native_audio');
              try {
                playerRef.current?.pauseVideo();
              } catch {
                // ignore
              }
            })
            .catch(() => {
              // Keep YouTube IFrame playing seamlessly if native handoff is blocked
            });
        }
      };

      el.addEventListener('canplay', onCanPlayHandoff, { once: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.youtubeId]);

  // Sync Play / Pause State across active engine
  useEffect(() => {
    if (!currentTrack) return;

    if (engineMode === 'native_audio' && nativeAudioRef.current) {
      const audioEl = nativeAudioRef.current;
      if (isPlaying) {
        if (audioEl.paused && audioEl.src) {
          audioEl.play().catch(() => {});
        }
      } else if (!audioEl.paused) {
        audioEl.pause();
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

  // Sync Volume across active engine
  useEffect(() => {
    if (nativeAudioRef.current) {
      nativeAudioRef.current.volume = isMuted ? 0 : Math.min(1, Math.max(0, volume / 100));
      nativeAudioRef.current.muted = isMuted;
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

  // Sync Seek target across active engine & immediately update external media notification seekbar
  useEffect(() => {
    if (seekTarget === null) return;

    const syncExternalSeekPosition = (posSec: number) => {
      const trackDurSec =
        (engineModeRef.current === 'native_audio' && nativeAudioRef.current && Number.isFinite(nativeAudioRef.current.duration)
          ? nativeAudioRef.current.duration
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
              position: clampedSec
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

    if (engineMode === 'native_audio' && nativeAudioRef.current) {
      try {
        nativeAudioRef.current.currentTime = seekTarget;
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

  return (
    <>
      {/* Native HTML5 Audio Element for true OS-level background playback on mobile */}
      <audio
        ref={nativeAudioRef}
        preload="auto"
        playsInline
        onPlay={() => {
          if (engineModeRef.current === 'native_audio') {
            onPlayerStateChangeRef.current('playing');
          }
        }}
        onPause={() => {
          if (
            engineModeRef.current === 'native_audio' &&
            nativeAudioRef.current?.getAttribute('src') &&
            !document.hidden
          ) {
            onPlayerStateChangeRef.current('paused');
          }
        }}
        onEnded={() => {
          if (engineModeRef.current === 'native_audio') {
            onPlayerStateChangeRef.current('ended');
          }
        }}
        onError={() => {
          if (engineModeRef.current === 'native_audio' && currentTrackRef.current) {
            const resumeSec = nativeAudioRef.current?.currentTime || 0;
            startOrLoadYouTubeIFrame(currentTrackRef.current, resumeSec);
          }
        }}
      />

      {/* Hidden off-screen audio engine */}
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

