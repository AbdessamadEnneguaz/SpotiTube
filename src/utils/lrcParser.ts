import { LyricLine } from '../types/music';

const LRC_TIMESTAMP_REGEX = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

/**
 * Parses standard LRC format `[mm:ss.xx]` or `[mm:ss.xxx]` (including multi-timestamp lines)
 * into sorted LyricLine entries.
 */
export function parseLrcLyrics(lrcText: string | null | undefined): LyricLine[] {
  if (!lrcText || typeof lrcText !== 'string') return [];

  const parsed: LyricLine[] = [];
  const rawLines = lrcText.split(/\r?\n/);

  for (const rawLine of rawLines) {
    const timestamps: number[] = [];
    let match: RegExpExecArray | null;
    LRC_TIMESTAMP_REGEX.lastIndex = 0;

    while ((match = LRC_TIMESTAMP_REGEX.exec(rawLine)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const fracRaw = match[3] || '0';
      const fracSeconds =
        fracRaw.length === 3
          ? parseInt(fracRaw, 10) / 1000
          : parseInt(fracRaw, 10) / Math.pow(10, fracRaw.length);

      if (Number.isFinite(minutes) && Number.isFinite(seconds) && seconds < 60) {
        timestamps.push(minutes * 60 + seconds + fracSeconds);
      }
    }

    if (timestamps.length === 0) continue;

    const cleanText = rawLine.replace(LRC_TIMESTAMP_REGEX, '').trim();
    if (!cleanText) continue;

    for (const time of timestamps) {
      parsed.push({
        time: Math.round(time * 1000) / 1000,
        text: cleanText,
      });
    }
  }

  return parsed.sort((a, b) => a.time - b.time);
}

/**
 * Strips YouTube-specific suffix clutter so LRCLIB matches studio recordings accurately.
 */
export function cleanTrackTitleForLyrics(rawTitle: string): string {
  if (!rawTitle) return '';
  return rawTitle
    .replace(/\((?:official\s*(?:music\s*)?video|official\s*audio|lyric\s*video|lyrics|visualizer|hd|4k|hq|live|remix|audio)\)/gi, ' ')
    .replace(/\[(?:official\s*(?:music\s*)?video|official\s*audio|lyric\s*video|lyrics|visualizer|hd|4k|hq|audio)\]/gi, ' ')
    .replace(/\b(?:feat\.?|ft\.?)\s+[^([\]]+/gi, ' ')
    .replace(/\s+-\s+topic$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanArtistForLyrics(rawArtist: string): string {
  if (!rawArtist) return '';
  return rawArtist
    .replace(/\s+-\s+topic$/i, '')
    .replace(/[,;&]\s*.*$/, '')
    .replace(/\b(?:feat\.?|ft\.?|x)\s+.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * O(log N) binary search for the currently active lyric line at effectiveTimeSec.
 */
export function findActiveLyricIndex(lines: LyricLine[], effectiveTimeSec: number): number {
  if (!lines || lines.length === 0) return -1;
  let low = 0;
  let high = lines.length - 1;
  let active = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lines[mid].time <= effectiveTimeSec) {
      active = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return active;
}
