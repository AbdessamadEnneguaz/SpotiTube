import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ALBUM_PALETTE,
  buildPaletteFromRgb,
  pickDominantColorFromPixels,
  rgbToHsl,
} from './albumColor';

function makeSolidBuffer(r: number, g: number, b: number, a = 255, count = 16): Uint8ClampedArray {
  const arr = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i++) {
    arr[i * 4] = r;
    arr[i * 4 + 1] = g;
    arr[i * 4 + 2] = b;
    arr[i * 4 + 3] = a;
  }
  return arr;
}

test('pickDominantColorFromPixels extracts vibrant blue hue with legible dark contrast', () => {
  const buffer = makeSolidBuffer(35, 130, 246);
  const palette = pickDominantColorFromPixels(buffer);
  assert.ok(palette);
  assert.equal(palette.isDefault, false);
  assert.match(palette.baseHex, /^#[0-9a-f]{6}$/);
  assert.match(palette.cardHex, /^#[0-9a-f]{6}$/);
  assert.match(palette.darkHex, /^#[0-9a-f]{6}$/);

  // Verify dominant hue stays in blue spectrum (~0.58-0.63) and lightness is clamped for white text legibility
  const br = parseInt(palette.baseHex.slice(1, 3), 16);
  const bg = parseInt(palette.baseHex.slice(3, 5), 16);
  const bb = parseInt(palette.baseHex.slice(5, 7), 16);
  const [h, , l] = rgbToHsl(br, bg, bb);
  assert.ok(h > 0.5 && h < 0.7, `Expected blue hue, got ${h}`);
  assert.ok(l >= 0.25 && l <= 0.45, `Expected legible mid-dark lightness, got ${l}`);
});

test('pickDominantColorFromPixels prefers vivid chromatic tones over neutral gray backgrounds', () => {
  // 12 neutral gray pixels + 6 vivid emerald green pixels
  const pixels = new Uint8ClampedArray(18 * 4);
  for (let i = 0; i < 12; i++) {
    pixels[i * 4] = 128;
    pixels[i * 4 + 1] = 128;
    pixels[i * 4 + 2] = 128;
    pixels[i * 4 + 3] = 255;
  }
  for (let i = 12; i < 18; i++) {
    pixels[i * 4] = 22;
    pixels[i * 4 + 1] = 185;
    pixels[i * 4 + 2] = 94;
    pixels[i * 4 + 3] = 255;
  }

  const palette = pickDominantColorFromPixels(pixels);
  assert.ok(palette);
  const br = parseInt(palette.baseHex.slice(1, 3), 16);
  const bg = parseInt(palette.baseHex.slice(3, 5), 16);
  const bb = parseInt(palette.baseHex.slice(5, 7), 16);
  assert.ok(bg > br && bg > bb, `Expected green channel dominance, got ${br},${bg},${bb}`);
});

test('pickDominantColorFromPixels returns null on pure black/white/transparent pixels for crimson fallback', () => {
  assert.equal(pickDominantColorFromPixels(makeSolidBuffer(0, 0, 0)), null);
  assert.equal(pickDominantColorFromPixels(makeSolidBuffer(255, 255, 255)), null);
  assert.equal(pickDominantColorFromPixels(makeSolidBuffer(220, 40, 40, 0)), null);
});

test('buildPaletteFromRgb clamps overly bright yellow into contrast-safe deep gold', () => {
  const palette = buildPaletteFromRgb(255, 240, 80, false);
  const br = parseInt(palette.baseHex.slice(1, 3), 16);
  const bg = parseInt(palette.baseHex.slice(3, 5), 16);
  const bb = parseInt(palette.baseHex.slice(5, 7), 16);
  const [, , l] = rgbToHsl(br, bg, bb);
  assert.ok(l <= 0.43, `Lightness should stay dark enough for white lyrics text, got ${l}`);
  assert.notEqual(palette.baseHex, DEFAULT_ALBUM_PALETTE.baseHex);
});
