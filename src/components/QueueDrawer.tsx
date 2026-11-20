import React from 'react';
import { X, Trash2, ChevronUp, ChevronDown, Play, Disc3 } from 'lucide-react';
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
    <aside className="fixed inset-0 md:static md:inset-auto w-full md:w-80 bg-[#0B0A0B] md:border-l border-white/[0.08] flex flex-col h-full z-[60] md:z-30 select-none shadow-2xl shrink-0">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Disc3 className="w-4 h-4 text-[#FF443A]" />
          <h2 className="font-display text-white font-bold text-base">Up Next Queue</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close queue"
          className="text-[#A39E9F] hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {/* Currently Playing */}
        <div>
          <div className="text-xs font-semibold text-[#A39E9F] mb-2">
            Now Playing
          </div>
          {currentTrack ? (
            <div className="bg-[#110E0F] p-3 rounded-xl flex items-center gap-3 border border-[#EF2323]/40">
              <CoverImage
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                youtubeId={currentTrack.youtubeId}
                className="w-12 h-12 rounded-lg object-cover shrink-0 bg-[#171213]"
              />
              <div className="truncate flex-1">
                <div className="text-sm font-semibold text-[#FF443A] truncate">
                  {currentTrack.title}
                </div>
                <div className="text-xs text-[#A39E9F] truncate">
                  {currentTrack.artist}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-[#6F6A6B] py-2">
              No track currently playing
            </div>
          )}
        </div>

        {/* Next Up Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#A39E9F] tabular-nums">
              Next In Queue · {upcomingTracks.length}
            </span>
            {upcomingTracks.length > 0 && (
              <button
                type="button"
                onClick={onClearQueue}
                className="text-xs text-[#A39E9F] hover:text-[#FF443A] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {upcomingTracks.length === 0 ? (
            <div className="text-xs text-[#6F6A6B] py-6 text-center border border-dashed border-white/12 rounded-xl px-4">
              Queue is empty. Click &ldquo;+&rdquo; on any track to queue it next.
            </div>
          ) : (
            <div className="space-y-1.5">
              {upcomingTracks.map((track, i) => {
                const absoluteIndex = queueIndex + 1 + i;
                return (
                  <div
                    key={`${track.id}-${i}`}
                    className="group bg-[#110E0F] hover:bg-[#171213] p-2 rounded-xl flex items-center gap-2.5 transition-colors border border-white/[0.06] hover:border-[#EF2323]/35"
                  >
                    <button
                      type="button"
                      onClick={() => onPlayTrackAt(absoluteIndex)}
                      aria-label={`Play ${track.title}`}
                      className="w-7 h-7 rounded-lg bg-white/[0.06] group-hover:bg-[#EF2323] group-hover:text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer text-white"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>

                    <CoverImage
                      src={track.thumbnail}
                      alt={track.title}
                      youtubeId={track.youtubeId}
                      className="w-9 h-9 rounded-lg object-cover shrink-0 bg-[#171213]"
                    />

                    <div className="truncate flex-1 min-w-0">
                      <div className="text-xs font-medium text-white truncate group-hover:text-[#FF443A]">
                        {track.title}
                      </div>
                      <div className="text-[11px] text-[#A39E9F] truncate">
                        {track.artist}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() => onMoveTrack(absoluteIndex, absoluteIndex - 1)}
                          title="Move up"
                          aria-label="Move track up in queue"
                          className="p-1 text-[#A39E9F] hover:text-white cursor-pointer"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {i < upcomingTracks.length - 1 && (
                        <button
                          type="button"
                          onClick={() => onMoveTrack(absoluteIndex, absoluteIndex + 1)}
                          title="Move down"
                          aria-label="Move track down in queue"
                          className="p-1 text-[#A39E9F] hover:text-white cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemoveTrackAt(absoluteIndex)}
                        title="Remove from queue"
                        aria-label="Remove track from queue"
                        className="p-1 text-[#A39E9F] hover:text-[#FF443A] cursor-pointer"
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
