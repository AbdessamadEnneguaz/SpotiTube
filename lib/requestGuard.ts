import crypto from 'node:crypto';
import { isSafeGoogleVideoUrl } from './youtubeAudio';

const CLIENT_TAG_BYTES = Buffer.from('kw-v1-a8f4c291e5b07d33', 'utf-8');
export const REQUEST_SIGNATURE_WINDOW_SECONDS = 120;

const BLOCKED_UA_TOKENS = [
  'curl/',
  'python-requests',
  'scrapy',
  'wget',
  'httpie',
  'go-http-client',
  'libwww-perl',
  'python-urllib',
  'aiohttp/',
];

const DIGITS_RE = /^\d{9,12}$/;
const HEX64_RE = /^[0-9a-f]{64}$/i;

const ALLOWED_MIRROR_AUDIO_HOSTS = new Set([
  'pipedapi.kavin.rocks',
  'pipedapi.adminforge.de',
  'api.piped.private.coffee',
  'inv.nadeko.net',
  'invidious.nerdvpn.de',
  'yewtu.be',
]);
const PIPED_PROXY_HOST_RE = /^[a-z0-9-]+proxy[a-z0-9-]*\.[a-z0-9.-]+$/;

export function isBlockedUserAgent(rawUa: string | string[] | undefined | null): boolean {
  const ua = Array.isArray(rawUa) ? rawUa[0] : rawUa;
  if (typeof ua !== 'string' || !ua.trim()) {
    return true;
  }
  const lower = ua.trim().toLowerCase();
  return BLOCKED_UA_TOKENS.some((token) => lower.includes(token));
}

export function computeServerSignature(
  timestampStr: string | number,
  path: string,
  paramValue: string
): string {
  const canonical = `${String(timestampStr).trim()}:${path.trim()}:${paramValue.trim()}`;
  return crypto.createHmac('sha256', CLIENT_TAG_BYTES).update(canonical).digest('hex');
}

export function verifyServerRequestSignature(options: {
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, unknown>;
  path: string;
  paramValue: string;
  allowQueryParams?: boolean;
  nowUnixSeconds?: number;
}): boolean {
  const { headers, query, path, paramValue, allowQueryParams = false, nowUnixSeconds } = options;

  let tsRaw = headers['x-kw-timestamp'];
  let sigRaw = headers['x-kw-signature'];
  let ts = Array.isArray(tsRaw) ? tsRaw[0] : tsRaw;
  let sig = Array.isArray(sigRaw) ? sigRaw[0] : sigRaw;

  if ((!ts || !sig) && allowQueryParams && query) {
    if (typeof query.ts === 'string') ts = query.ts;
    if (typeof query.sig === 'string') sig = query.sig;
  }

  if (typeof ts !== 'string' || typeof sig !== 'string') {
    return false;
  }
  const cleanTs = ts.trim();
  const cleanSig = sig.trim().toLowerCase();
  if (!DIGITS_RE.test(cleanTs) || !HEX64_RE.test(cleanSig)) {
    return false;
  }

  const nowSec = nowUnixSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - Number.parseInt(cleanTs, 10)) > REQUEST_SIGNATURE_WINDOW_SECONDS) {
    return false;
  }

  const expected = computeServerSignature(cleanTs, path, paramValue);
  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(cleanSig, 'hex');
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export function isSafeUpstreamAudioUrl(rawUrl: unknown): boolean {
  if (isSafeGoogleVideoUrl(rawUrl)) return true;
  if (typeof rawUrl !== 'string' || !rawUrl.startsWith('https://') || rawUrl.length > 2048) {
    return false;
  }
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
      return false;
    }
    if (parsed.port && parsed.port !== '443') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (ALLOWED_MIRROR_AUDIO_HOSTS.has(host)) return true;
    return (
      PIPED_PROXY_HOST_RE.test(host) &&
      (host.endsWith('.kavin.rocks') ||
        host.endsWith('.adminforge.de') ||
        host.endsWith('.private.coffee'))
    );
  } catch {
    return false;
  }
}
