import React, { useEffect, useRef, useState } from 'react';
import { loadYouTubeIFrameAPI } from '../services/youtubeApi';
import { YTPlayerInstance } from '../types/youtube';
import { Track } from '../types/music';
import { X, ExternalLink, Tv, Minimize2, Maximize2 } from 'lucide-react';

interface YouTubePlayerEmbedProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  seekTarget: number | null;
  onClearSeek: () => void;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onPlayerStateChange: (state: 'playing' | 'paused' | 'ended' | 'buffering') => void;
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
  isVisible,
  onCloseVideo
}) => {
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const playerReadyRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Initialize YT Player once
  useEffect(() => {
    let timer: any = null;

    loadYouTubeIFrameAPI().then(() => {
      if (!window.YT || !window.YT.Player) return;

      const player = new window.YT.Player('spotitube-iframe-anchor', {
        height: '100%',
        width: '100%',
        videoId: currentTrack ? currentTrack.youtubeId : undefined,
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
            playerReadyRef.current = true;
            setIsPlayerReady(true);
            event.target.setVolume(volume);
            if (isMuted) event.target.mute();
          },
          onStateChange: (event) => {
            const state = event.data;
            if (state === 1) {
              onPlayerStateChange('playing');
            } else if (state === 2) {
              onPlayerStateChange('paused');
            } else if (state === 0) {
              onPlayerStateChange('ended');
            } else if (state === 3) {
              onPlayerStateChange('buffering');
            }
          },
          onError: (err) => {
            console.warn('YouTube IFrame player error code:', err.data);
          }
        }
      });
    });

    // High-precision time ticker (150ms) for real-time karaoke synchronization
    timer = setInterval(() => {
      const p = playerRef.current;
      if (p && typeof p.getCurrentTime === 'function') {
        try {
          const cur = p.getCurrentTime() || 0;
          const dur = p.getDuration() || 0;
          onTimeUpdate(cur, dur);
        } catch {
          // ignore transient ticks
        }
      }
    }, 150);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  // Sync Video ID changes
  useEffect(() => {
    if (!playerRef.current || !isPlayerReady || !currentTrack) return;
    try {
      playerRef.current.loadVideoById(currentTrack.youtubeId, 0);
      if (isPlaying) {
        playerRef.current.playVideo();
      }
    } catch (e) {
      console.warn('Error loading video by ID:', e);
    }
  }, [currentTrack?.youtubeId, isPlayerReady]);

  // Sync Play / Pause State
  useEffect(() => {
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
  }, [isPlaying, isPlayerReady]);

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
    } catch (e) {
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
      ref={containerRef}
      className={`fixed z-50 transition-all duration-300 rounded-xl overflow-hidden shadow-2xl border border-neutral-700 bg-black ${
        isVisible
          ? isExpanded
            ? 'bottom-28 right-6 w-[560px] h-[340px]'
            : 'bottom-28 right-6 w-[360px] h-[220px]'
          : 'bottom-0 right-0 w-[1px] h-[1px] opacity-0 pointer-events-none'
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
