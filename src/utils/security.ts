const YOUTUBE_ID_RE = /^[0-9A-Za-z_-]{11}$/;

/**
 * Validates that a string is strictly an 11-character YouTube video ID.
 */
export function isValidYouTubeId(id: unknown): id is string {
  return typeof id === 'string' && YOUTUBE_ID_RE.test(id);
}

/**
 * Ensures image/cover URLs use safe HTTPS (or benign relative paths / safe SVG data URI).
 * Blocks javascript:, vbscript:, file:, or arbitrary HTML payloads.
 */
export function sanitizeMediaUrl(url: unknown, fallback = ''): string {
  if (typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;

  if (trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  if (trimmed.startsWith('data:image/svg+xml;')) {
    return trimmed;
  }
  return fallback;
}

/**
 * Strips potentially dangerous control characters and bounds input length.
 */
export function sanitizeClientText(raw: unknown, maxLength = 120): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Safe JSON parser with schema guard and prototype-pollution resistance.
 */
export function safeParseJson<T>(raw: string | null, fallback: T, validate?: (val: unknown) => val is T): T {
  if (!raw || raw.length > 512_000) return fallback;
  try {
    const parsed = JSON.parse(raw, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }
      return value;
    });
    if (validate && !validate(parsed)) {
      return fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}
