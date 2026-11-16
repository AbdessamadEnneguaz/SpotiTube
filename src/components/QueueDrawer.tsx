import React from 'react';
import { X, Trash2, ChevronUp, ChevronDown, Play, Music } from 'lucide-react';
import { Track } from '../types/music';
import { CoverImage } from './CoverImage';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  onPlayTrackAt: (index: number) => void;
  onRemoveTrackAt: (index: number) => void;
  onMoveTrack: (fromIndex: number, toIndex: number) => void;
  onClearQueue: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  currentTrack,
  queue,
  queueIndex,
  onPlayTrackAt,
  onRemoveTrackAt,
  onMoveTrack,
  onClearQueue
}) => {
  if (!isOpen) return null;

  const upcomingTracks = queue.slice(queueIndex + 1);

  return (
    <aside className="fixed inset-0 md:static md:inset-auto w-full md:w-80 bg-[#121212] md:border-l border-neutral-800 flex flex-col h-full z-50 md:z-30 select-none shadow-2xl shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-[#1db954]" />
          <h2 className="text-white font-bold text-base">Play Queue</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close queue"
          className="text-neutral-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-neutral-700">
        {/* Currently Playing Card */}
        <div>
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
            Now Playing
          </div>
          {currentTrack ? (
            <div className="bg-[#181818] p-3 rounded-lg flex items-center gap-3 border border-neutral-800 shadow">
              <CoverImage
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                youtubeId={currentTrack.youtubeId}
                className="w-12 h-12 rounded object-cover shrink-0 bg-neutral-800"
              />
              <div className="truncate flex-1">
                <div className="text-sm font-bold text-[#1db954] truncate">
                  {currentTrack.title}
                </div>
                <div className="text-xs text-neutral-400 truncate">
                  {currentTrack.artist}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-neutral-500 italic py-2">
              No track currently playing
            </div>
          )}
        </div>

        {/* Next Up Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Next In Queue ({upcomingTracks.length})
            </span>
            {upcomingTracks.length > 0 && (
              <button
                onClick={onClearQueue}
                className="text-[11px] text-neutral-400 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {upcomingTracks.length === 0 ? (
            <div className="text-xs text-neutral-500 py-6 text-center border border-dashed border-neutral-800 rounded-lg">
              Queue is empty. Click "+" on any track to queue it next!
            </div>
          ) : (
            <div className="space-y-1">
              {upcomingTracks.map((track, i) => {
                const absoluteIndex = queueIndex + 1 + i;
                return (
                  <div
                    key={`${track.id}-${i}`}
                    className="group bg-[#181818]/60 hover:bg-[#202020] p-2 rounded-md flex items-center gap-2.5 transition-colors border border-transparent hover:border-neutral-700/50"
                  >
                    <button
                      onClick={() => onPlayTrackAt(absoluteIndex)}
                      aria-label={`Play ${track.title}`}
                      className="w-6 h-6 rounded-full bg-neutral-800 group-hover:bg-[#1db954] group-hover:text-black flex items-center justify-center shrink-0 transition-colors cursor-pointer text-white"
                    >
                      <Play className="w-3 h-3 fill-current translate-x-0.2" />
                    </button>

                    <CoverImage
                      src={track.thumbnail}
                      alt={track.title}
                      youtubeId={track.youtubeId}
                      className="w-9 h-9 rounded object-cover shrink-0 bg-neutral-800"
                    />

                    <div className="truncate flex-1 min-w-0">
                      <div className="text-xs font-medium text-white truncate group-hover:text-[#1db954]">
                        {track.title}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate">
                        {track.artist}
                      </div>
                    </div>

                    {/* Reorder and Delete controls */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {i > 0 && (
                        <button
                          onClick={() => onMoveTrack(absoluteIndex, absoluteIndex - 1)}
                          title="Move up"
                          aria-label="Move track up in queue"
                          className="p-1 text-neutral-400 hover:text-white"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {i < upcomingTracks.length - 1 && (
                        <button
                          onClick={() => onMoveTrack(absoluteIndex, absoluteIndex + 1)}
                          title="Move down"
                          aria-label="Move track down in queue"
                          className="p-1 text-neutral-400 hover:text-white"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onRemoveTrackAt(absoluteIndex)}
                        title="Remove from queue"
                        aria-label="Remove track from queue"
                        className="p-1 text-neutral-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
