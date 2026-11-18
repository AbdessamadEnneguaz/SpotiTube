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
    <aside className="fixed inset-0 md:static md:inset-auto w-full md:w-80 bg-[#161310] md:border-l border-[#EAE0D0]/[0.08] flex flex-col h-full z-50 md:z-30 select-none shadow-2xl shrink-0">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-[#EAE0D0]/[0.07] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Disc3 className="w-4 h-4 text-[#DFCCB0]" />
          <h2 className="font-display text-[#F5F0E8] font-bold text-base">Up Next Queue</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close queue"
          className="text-[#9E9384] hover:text-[#F5F0E8] p-1.5 rounded-lg hover:bg-[#EAE0D0]/[0.06] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {/* Currently Playing */}
        <div>
          <div className="text-xs font-semibold text-[#9E9384] mb-2">
            Now Playing
          </div>
          {currentTrack ? (
            <div className="bg-[#1B1815] p-3 rounded-xl flex items-center gap-3 border border-[#D8C3A5]/30">
              <CoverImage
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                youtubeId={currentTrack.youtubeId}
                className="w-12 h-12 rounded-lg object-cover shrink-0 bg-[#24201B]"
              />
              <div className="truncate flex-1">
                <div className="text-sm font-semibold text-[#EDE0CC] truncate">
                  {currentTrack.title}
                </div>
                <div className="text-xs text-[#9E9384] truncate">
                  {currentTrack.artist}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-[#8F8476] py-2">
              No track currently playing
            </div>
          )}
        </div>

        {/* Next Up Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#9E9384] tabular-nums">
              Next In Queue · {upcomingTracks.length}
            </span>
            {upcomingTracks.length > 0 && (
              <button
                type="button"
                onClick={onClearQueue}
                className="text-xs text-[#9E9384] hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {upcomingTracks.length === 0 ? (
            <div className="text-xs text-[#8F8476] py-6 text-center border border-dashed border-[#EAE0D0]/12 rounded-xl px-4">
              Queue is empty. Click &ldquo;+&rdquo; on any track to queue it next.
            </div>
          ) : (
            <div className="space-y-1.5">
              {upcomingTracks.map((track, i) => {
                const absoluteIndex = queueIndex + 1 + i;
                return (
                  <div
                    key={`${track.id}-${i}`}
                    className="group bg-[#1B1815]/80 hover:bg-[#24201B] p-2 rounded-xl flex items-center gap-2.5 transition-colors border border-[#EAE0D0]/[0.05] hover:border-[#EAE0D0]/15"
                  >
                    <button
                      type="button"
                      onClick={() => onPlayTrackAt(absoluteIndex)}
                      aria-label={`Play ${track.title}`}
                      className="w-7 h-7 rounded-lg bg-[#EAE0D0]/[0.06] group-hover:bg-[#D8C3A5] group-hover:text-[#12100E] flex items-center justify-center shrink-0 transition-colors cursor-pointer text-[#F5F0E8]"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>

                    <CoverImage
                      src={track.thumbnail}
                      alt={track.title}
                      youtubeId={track.youtubeId}
                      className="w-9 h-9 rounded-lg object-cover shrink-0 bg-[#24201B]"
                    />

                    <div className="truncate flex-1 min-w-0">
                      <div className="text-xs font-medium text-[#F5F0E8] truncate group-hover:text-[#EDE0CC]">
                        {track.title}
                      </div>
                      <div className="text-[11px] text-[#9E9384] truncate">
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
                          className="p-1 text-[#9E9384] hover:text-[#F5F0E8] cursor-pointer"
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
                          className="p-1 text-[#9E9384] hover:text-[#F5F0E8] cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemoveTrackAt(absoluteIndex)}
                        title="Remove from queue"
                        aria-label="Remove track from queue"
                        className="p-1 text-[#9E9384] hover:text-rose-400 cursor-pointer"
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
