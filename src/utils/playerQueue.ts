import { Track, RepeatMode } from '../types/music';

export interface QueueState {
  queue: Track[];
  currentIndex: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  shuffledIndices: number[];
}

/**
 * Generate a randomized index array for shuffle mode
 */
export function generateShuffledIndices(length: number, currentIndex: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  // Remove current index, shuffle remaining, then put current at 0
  const remaining = indices.filter(i => i !== currentIndex);
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  return currentIndex >= 0 && currentIndex < length ? [currentIndex, ...remaining] : remaining;
}

/**
 * Determine next track index based on repeat and shuffle modes
 */
export function getNextIndex(
  queueLength: number,
  currentIndex: number,
  repeatMode: RepeatMode,
  isShuffle: boolean,
  shuffledIndices: number[]
): number | null {
  if (queueLength === 0) return null;

  if (repeatMode === 'one') {
    return currentIndex;
  }

  if (isShuffle && shuffledIndices.length === queueLength) {
    const posInShuffle = shuffledIndices.indexOf(currentIndex);
    if (posInShuffle >= 0 && posInShuffle < shuffledIndices.length - 1) {
      return shuffledIndices[posInShuffle + 1];
    }
    // End of shuffle list reached
    if (repeatMode === 'all') {
      return shuffledIndices[0];
    }
    return null;
  }

  // Standard sequential playback
  if (currentIndex < queueLength - 1) {
    return currentIndex + 1;
  }

  // End of queue reached
  if (repeatMode === 'all') {
    return 0;
  }

  return null;
}

/**
 * Determine previous track index based on playback mode
 */
export function getPreviousIndex(
  queueLength: number,
  currentIndex: number,
  isShuffle: boolean,
  shuffledIndices: number[]
): number | null {
  if (queueLength === 0) return null;

  if (isShuffle && shuffledIndices.length === queueLength) {
    const posInShuffle = shuffledIndices.indexOf(currentIndex);
    if (posInShuffle > 0) {
      return shuffledIndices[posInShuffle - 1];
    }
    return shuffledIndices[0];
  }

  if (currentIndex > 0) {
    return currentIndex - 1;
  }

  return 0;
}

/**
 * Insert track right after current playing track or append
 */
export function addToQueue(queue: Track[], track: Track, playNext: boolean = false, currentIndex: number = 0): Track[] {
  if (playNext && queue.length > 0) {
    const newQueue = [...queue];
    newQueue.splice(currentIndex + 1, 0, track);
    return newQueue;
  }
  return [...queue, track];
}

/**
 * Remove track at specific index
 */
export function removeFromQueue(queue: Track[], indexToRemove: number): Track[] {
  return queue.filter((_, idx) => idx !== indexToRemove);
}

/**
 * Reorder queue items (drag-and-drop or move up/down)
 */
export function reorderQueue(queue: Track[], fromIndex: number, toIndex: number): Track[] {
  if (fromIndex < 0 || fromIndex >= queue.length || toIndex < 0 || toIndex >= queue.length) {
    return queue;
  }
  const result = [...queue];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}
