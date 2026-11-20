import { getOfflineTrackRecord } from './offlineDb';

export interface AlbumColorPalette {
  baseHex: string;
  cardHex: string;
  darkHex: string;
  rgbTuple: string;
  isDefault: boolean;
}

export const DEFAULT_ALBUM_PALETTE: AlbumColorPalette = {
  baseHex: '#7A161A',
  cardHex: '#591115',
  darkHex: '#180708',
  rgbTuple: '122, 22, 26',
  isDefault: true,
};

const paletteCache = new Map<string, AlbumColorPalette>();
const MAX_CACHE_SIZE = 80;

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) {
    return [0, 0, l];
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;

  if (max === rn) {
    h = (gn - bn) / d + (gn < bn ? 6 : 0);
  } else if (max === gn) {
    h = (bn - rn) / d + 2;
  } else {
    h = (rn - gn) / d + 4;
  }

  return [h / 6, s, l];
}

export function hslToRgb(
  h: number,
  s: number,
  l: number
): [number, number, number] {
  if (s === 0) {
    const gray = Math.round(l * 255);
    return [gray, gray, gray];
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

/**
 * Produces a Spotify-grade backdrop palette tuned so pure white (#FFFFFF)
 * typography stays legible (>= 4.5:1 effective perceived contrast) over the artwork tint.
 */
export function buildPaletteFromRgb(
  r: number,
  g: number,
  b: number,
  isDefault = false
): AlbumColorPalette {
  const [h, rawS, rawL] = rgbToHsl(r, g, b);
  const sat = rawS < 0.08 ? 0.14 : clamp(rawS * 1.15, 0.34, 0.78);
  const baseL = clamp(rawL, 0.28, 0.41);
  const cardL = clamp(baseL - 0.07, 0.21, 0.34);
  const darkL = 0.085;

  const [br, bg, bb] = hslToRgb(h, sat, baseL);
  const [cr, cg, cb] = hslToRgb(h, clamp(sat * 0.95, 0.24, 0.75), cardL);
  const [dr, dg, db] = hslToRgb(h, clamp(sat * 0.85, 0.18, 0.65), darkL);

  return {
    baseHex: rgbToHex(br, bg, bb),
    cardHex: rgbToHex(cr, cg, cb),
    darkHex: rgbToHex(dr, dg, db),
    rgbTuple: `${br}, ${bg}, ${bb}`,
    isDefault,
  };
}

/**
 * Pure pixel-buffer analyzer: samples RGBA pixels and picks the dominant,
 * aesthetically balanced chromatic swatch while skipping blown whites & crushed blacks.
 */
export function pickDominantColorFromPixels(
  pixels: ArrayLike<number>
): AlbumColorPalette | null {
  if (!pixels || pixels.length < 4) return null;

  interface Bucket {
    weight: number;
    rSum: number;
    gSum: number;
    bSum: number;
  }

  const buckets = new Map<number, Bucket>();

  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];

    if (a < 128) continue;

    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luma < 24 || luma > 236) continue;

    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const chroma = (maxC - minC) / 255;

    // Prioritize rich chromatic tones over neutral muddy grays
    const weight = 0.35 + chroma * 2.4;

    const rq = r >> 4;
    const gq = g >> 4;
    const bq = b >> 4;
    const key = (rq << 8) | (gq << 4) | bq;

    const existing = buckets.get(key);
    if (existing) {
      existing.weight += weight;
      existing.rSum += r * weight;
      existing.gSum += g * weight;
      existing.bSum += b * weight;
    } else {
      buckets.set(key, {
        weight,
        rSum: r * weight,
        gSum: g * weight,
        bSum: b * weight,
      });
    }
  }

  if (buckets.size === 0) return null;

  let winningBucket: Bucket | null = null;
  for (const bucket of buckets.values()) {
    if (!winningBucket || bucket.weight > winningBucket.weight) {
      winningBucket = bucket;
    }
  }

  if (!winningBucket || winningBucket.weight <= 0) return null;

  const avgR = Math.round(winningBucket.rSum / winningBucket.weight);
  const avgG = Math.round(winningBucket.gSum / winningBucket.weight);
  const avgB = Math.round(winningBucket.bSum / winningBucket.weight);

  return buildPaletteFromRgb(avgR, avgG, avgB, false);
}

function setCachedPalette(key: string, palette: AlbumColorPalette): void {
  if (paletteCache.size >= MAX_CACHE_SIZE) {
    const firstKey = paletteCache.keys().next().value;
    if (firstKey !== undefined) paletteCache.delete(firstKey);
  }
  paletteCache.set(key, palette);
}

function sampleImageElementOnCanvas(
  src: string,
  useAnonymousCors: boolean
): Promise<AlbumColorPalette | null> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined' || typeof document === 'undefined') {
      resolve(null);
      return;
    }

    const img = new Image();
    if (useAnonymousCors) {
      img.crossOrigin = 'anonymous';
    }
    img.referrerPolicy = 'no-referrer';

    let settled = false;
    const finish = (result: AlbumColorPalette | null) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const timer = window.setTimeout(() => finish(null), 4000);

    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const size = 24;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size);
        finish(pickDominantColorFromPixels(imageData.data));
      } catch {
        // SecurityError from tainted cross-origin canvas -> graceful fallback
        finish(null);
      }
    };

    img.onerror = () => {
      window.clearTimeout(timer);
      finish(null);
    };

    img.src = src;
  });
}

/**
 * Extracts dominant palette for a track's artwork using an offscreen HTML5 <canvas>.
 * Prefers local IndexedDB coverBlobs (zero CORS taint), falls back safely to CORS-enabled
 * external URL sampling, and smoothly falls back to Kiddwave crimson-obsidian if CORS blocks pixels.
 */
export async function extractAlbumColor(
  thumbnailUrl?: string | null,
  youtubeId?: string | null
): Promise<AlbumColorPalette> {
  const cacheKey = youtubeId || thumbnailUrl || '';
  if (cacheKey && paletteCache.has(cacheKey)) {
    return paletteCache.get(cacheKey)!;
  }

  // 1. Check offline stored artwork blob first (guaranteed CORS-clean)
  if (youtubeId) {
    try {
      const offlineRec = await getOfflineTrackRecord(youtubeId);
      if (offlineRec?.coverBlob && typeof URL !== 'undefined') {
        const blobUrl = URL.createObjectURL(offlineRec.coverBlob);
        try {
          const fromBlob = await sampleImageElementOnCanvas(blobUrl, false);
          if (fromBlob) {
            setCachedPalette(cacheKey, fromBlob);
            return fromBlob;
          }
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      }
    } catch {
      // Ignore offline lookup failure
    }
  }

  // 2. Sample thumbnail URL via offscreen canvas with CORS anonymous mode
  const candidates: string[] = [];
  if (thumbnailUrl && !thumbnailUrl.startsWith('data:image/svg')) {
    candidates.push(thumbnailUrl);
  }
  if (youtubeId) {
    const hqUrl = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
    if (!candidates.includes(hqUrl)) candidates.push(hqUrl);
  }

  for (const url of candidates) {
    const isSameOriginOrBlob =
      url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('/');
    const sampled = await sampleImageElementOnCanvas(url, !isSameOriginOrBlob);
    if (sampled) {
      if (cacheKey) setCachedPalette(cacheKey, sampled);
      return sampled;
    }
  }

  // 3. Smooth fallback to Kiddwave deep crimson-obsidian
  if (cacheKey) setCachedPalette(cacheKey, DEFAULT_ALBUM_PALETTE);
  return DEFAULT_ALBUM_PALETTE;
}
