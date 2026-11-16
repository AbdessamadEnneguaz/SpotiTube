import React, { useEffect, useRef, useState } from 'react';
import { loadYouTubeIFrameAPI } from '../services/youtubeApi';
import { YTPlayerInstance } from '../types/youtube';
import { Track } from '../types/music';
import { X, Minimize2, Maximize2 } from 'lucide-react';

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
  isVisible: boolean;
  onCloseVideo: () => void;
}

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
  isVisible,
  onCloseVideo
}) => {
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const currentTrackRef = useRef<Track | null>(currentTrack);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const volumeRef = useRef<number>(volume);
  const isMutedRef = useRef<boolean>(isMuted);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onPlayerStateChangeRef = useRef(onPlayerStateChange);
  const onTrackErrorRef = useRef(onTrackError);
  const isCreatingRef = useRef<boolean>(false);

  const [isPlayerReady, setIsPlayerReady] = useState(false);
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
    onTimeUpdateRef.current = onTimeUpdate;
    onPlayerStateChangeRef.current = onPlayerStateChange;
    onTrackErrorRef.current = onTrackError;
  }, [onTimeUpdate, onPlayerStateChange, onTrackError]);

  // Pre-warm YouTube IFrame API script on mount & maintain playback time ticker
  useEffect(() => {
    loadYouTubeIFrameAPI().catch(() => {});

    const timer = setInterval(() => {
      const p = playerRef.current;
      if (p && typeof p.getCurrentTime === 'function') {
        try {
          const cur = p.getCurrentTime() || 0;
          const dur = p.getDuration() || 0;
          onTimeUpdateRef.current(cur, dur);
        } catch {
          // ignore transient ticks
        }
      }
    }, 150);

    return () => {
      clearInterval(timer);
    };
  }, []);

  // Lazily initialize YT Player on first user track selection, and load subsequent tracks
  useEffect(() => {
    if (!currentTrack) return;

    if (playerRef.current && isPlayerReady) {
      try {
        playerRef.current.loadVideoById(currentTrack.youtubeId, 0);
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
            event.target.setVolume(volumeRef.current);
            if (isMutedRef.current) {
              event.target.mute();
            } else {
              event.target.unMute();
            }
            const latest = currentTrackRef.current;
            if (latest && latest.youtubeId !== initialTrack.youtubeId) {
              event.target.loadVideoById(latest.youtubeId, 0);
            }
            if (isPlayingRef.current) {
              event.target.playVideo();
            }
          },
          onStateChange: (event) => {
            const state = event.data;
            if (state === 1) {
              onPlayerStateChangeRef.current('playing');
            } else if (state === 2) {
              onPlayerStateChangeRef.current('paused');
            } else if (state === 0) {
              onPlayerStateChangeRef.current('ended');
            } else if (state === 3) {
              onPlayerStateChangeRef.current('buffering');
            }
          },
          onError: (err) => {
            console.warn('YouTube IFrame player error code:', err.data);
            if (currentTrackRef.current && onTrackErrorRef.current) {
              onTrackErrorRef.current(currentTrackRef.current, err.data);
            }
          }
        }
      });
    });
  }, [currentTrack?.youtubeId, isPlayerReady]);

  // Sync Play / Pause State
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady || !currentTrack) return;
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
  }, [isPlaying, isPlayerReady, currentTrack]);

  // Sync Volume
  useEffect(() => {
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

  // Sync Seek target
  useEffect(() => {
    if (seekTarget !== null && playerRef.current && isPlayerReady) {
      try {
        playerRef.current.seekTo(seekTarget, true);
      } catch (e) {
        console.warn('Seek error:', e);
      }
      onClearSeek();
    }
  }, [seekTarget, isPlayerReady]);

  return (
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
              aria-label={isExpanded ? "Collapse video" : "Expand video"}
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
  );
};
