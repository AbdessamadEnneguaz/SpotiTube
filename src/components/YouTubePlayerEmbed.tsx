import React, { useEffect, useRef, useState } from 'react';
import { loadYouTubeIFrameAPI } from '../services/youtubeApi';
import { YTPlayerInstance } from '../types/youtube';
import { Track } from '../types/music';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import {
  buildMediaMetadataInit,
  setAudioKeepAlivePlaying,
  shouldPreserveIntentOnVisibilityPause
} from '../utils/backgroundAudio';
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
  isVisible: boolean;
  onCloseVideo: () => void;
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
  onSeek,
  isVisible,
  onCloseVideo
}) => {
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const nativeAudioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrackRef = useRef<Track | null>(currentTrack);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const volumeRef = useRef<number>(volume);
  const isMutedRef = useRef<boolean>(isMuted);
  const isVisibleRef = useRef<boolean>(isVisible);
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
  const [isExpanded, setIsExpanded] = useState(false);

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
    isVisibleRef.current = isVisible;
  }, [isVisible]);

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
  }, [currentTrack, isPlaying, engineMode]);

  // Pre-warm YouTube IFrame API, track playback ticker, and mobile visibilitychange guard
  useEffect(() => {
    loadYouTubeIFrameAPI().catch(() => {});

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

    document.addEventListener('visibilitychange', handleVisibilityChange);

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
        if (
          now - lastPositionUpdateRef.current > 1000 &&
          dur > 0 &&
          typeof navigator !== 'undefined' &&
          'mediaSession' in navigator &&
          typeof navigator.mediaSession.setPositionState === 'function'
        ) {
          lastPositionUpdateRef.current = now;
          try {
            navigator.mediaSession.setPositionState({
              duration: dur,
              playbackRate: 1,
              position: Math.min(cur, dur)
            });
          } catch {
            // ignore
          }
        }
      }
    }, 150);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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

            // If native audio already owns playback for the current track, pause YT immediately
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
                // Attempt background resume instead of letting visibilitychange force-pause UI state
                setTimeout(() => {
                  if (engineModeRef.current === 'youtube_iframe' && isPlayingRef.current) {
                    try {
                      playerRef.current?.playVideo();
                    } catch {
                      // ignore
                    }
                  }
                }, 150);
                setTimeout(() => {
                  if (engineModeRef.current === 'youtube_iframe' && isPlayingRef.current) {
                    try {
                      playerRef.current?.playVideo();
                    } catch {
                      // ignore
                    }
                  }
                }, 600);
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

  // Load new track: probe native background HTML5 audio first when video is hidden; fallback cleanly to YouTube IFrame
  useEffect(() => {
    if (!currentTrack) return;

    const seq = ++activeProbeSeqRef.current;

    // Pause both engines cleanly before switching tracks
    if (nativeAudioRef.current) {
      try {
        nativeAudioRef.current.pause();
        nativeAudioRef.current.removeAttribute('src');
        nativeAudioRef.current.load();
      } catch {
        // ignore
      }
    }
    if (playerRef.current && isPlayerReady) {
      try {
        playerRef.current.pauseVideo();
      } catch {
        // ignore
      }
    }

    if (isVisibleRef.current) {
      startOrLoadYouTubeIFrame(currentTrack, 0);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const probeRes = await fetch(
          `/api/audio?v=${encodeURIComponent(currentTrack.youtubeId)}&probe=1`,
          { signal: AbortSignal.timeout(3000) }
        );
        if (cancelled || seq !== activeProbeSeqRef.current) return;

        if (probeRes.ok) {
          const probeData = await probeRes.json();
          if (
            probeData?.available &&
            nativeAudioRef.current &&
            !isVisibleRef.current &&
            currentTrackRef.current?.youtubeId === currentTrack.youtubeId
          ) {
            setActiveEngine('native_audio');
            const audioEl = nativeAudioRef.current;
            audioEl.src = `/api/audio?v=${encodeURIComponent(currentTrack.youtubeId)}`;
            audioEl.volume = isMutedRef.current ? 0 : Math.min(1, Math.max(0, volumeRef.current / 100));
            audioEl.muted = isMutedRef.current;
            if (isPlayingRef.current) {
              audioEl.play().catch(() => {
                // If native <audio> playback blocked/fails, fall back cleanly to YT IFrame
                if (currentTrackRef.current?.youtubeId === currentTrack.youtubeId) {
                  startOrLoadYouTubeIFrame(currentTrack, 0);
                }
              });
            }
            return;
          }
        }
      } catch {
        // probe failed or timed out; fall back to YouTube IFrame
      }

      if (!cancelled && seq === activeProbeSeqRef.current) {
        startOrLoadYouTubeIFrame(currentTrack, 0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.youtubeId]);

  // If user opens Video View while playing in native_audio mode, switch smoothly to YouTube IFrame
  useEffect(() => {
    if (isVisible && engineMode === 'native_audio' && currentTrack) {
      const resumeSec = nativeAudioRef.current?.currentTime || 0;
      if (nativeAudioRef.current) {
        nativeAudioRef.current.pause();
      }
      startOrLoadYouTubeIFrame(currentTrack, resumeSec);
    }
  }, [isVisible]);

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

  // Sync Seek target across active engine
  useEffect(() => {
    if (seekTarget === null) return;

    if (engineMode === 'native_audio' && nativeAudioRef.current) {
      try {
        nativeAudioRef.current.currentTime = seekTarget;
      } catch {
        // ignore
      }
      onClearSeek();
      return;
    }

    if (playerRef.current && isPlayerReady) {
      try {
        playerRef.current.seekTo(seekTarget, true);
      } catch (e) {
        console.warn('Seek error:', e);
      }
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

      <div
        className={`fixed transition-all duration-300 rounded-xl overflow-hidden shadow-2xl border border-neutral-700 bg-black ${
          isVisible
            ? isExpanded
              ? 'z-50 bottom-28 right-6 w-[560px] h-[340px]'
              : 'z-50 bottom-28 right-6 w-[360px] h-[220px]'
            : '-z-10 bottom-0 right-0 w-[220px] h-[220px] opacity-0 pointer-events-none'
        }`}
      >
        {/* Floating Header */}
        {isVisible && (
          <div className="bg-[#181818]/95 px-3 py-2 flex items-center justify-between text-xs text-white border-b border-neutral-800">
            <div className="flex items-center gap-2 truncate pr-2">
              <span className="w-2 h-2 rounded-full bg-[#1db954] animate-pulse" />
              <span className="font-semibold truncate">
                {currentTrack ? `${currentTrack.title} • ${currentTrack.artist}` : 'YouTube Video Stream'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? 'Collapse video' : 'Expand video'}
                className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={onCloseVideo}
                aria-label="Hide video player"
                className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Target Mount Element for YouTube IFrame API */}
        <div className="w-full h-full bg-black">
          <div id="spotitube-iframe-anchor" className="w-full h-full" />
        </div>
      </div>
    </>
  );
};

