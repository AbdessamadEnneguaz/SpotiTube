import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveApkDownloadConfig } from './src/utils/apkDownload.js';
import {
  isSearchRateLimited,
  sanitizeSearchQuery,
  searchYouTubeTracks
} from './lib/youtubeSearch.js';
import {
  AUDIO_CHUNK_BYTES,
  isSafeGoogleVideoUrl,
  isValidAudioVideoId,
  resolveAudioStream,
  clampByteRange,
  invalidateAudioStreamCache
} from './lib/youtubeAudio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

// Trust first proxy hop (Vercel / Cloud Run) for accurate req.ip without spoofing
app.set('trust proxy', 1);

// Security: Disable X-Powered-By to prevent technology fingerprinting
app.disable('x-powered-by');

// Security: Slowloris / slow-HTTP protection timeouts
httpServer.requestTimeout = 15000;
httpServer.headersTimeout = 10000;
httpServer.keepAliveTimeout = 5000;

// Security: Reject excessively long URLs, traversal, null bytes, or CRLF injection early
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.url.length > 2048) {
    return res.status(414).json({ error: 'Request URI too long.' });
  }
  let decodedPath = req.path;
  try {
    decodedPath = decodeURIComponent(req.path);
  } catch {
    return res.status(400).json({ error: 'Malformed request path.' });
  }
  if (
    req.url.includes('\0') ||
    /[\r\n]/.test(req.url) ||
    decodedPath.includes('..')
  ) {
    return res.status(400).json({ error: 'Invalid request.' });
  }
  next();
});

// Security: Enforce hardened HTTP response headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com",
      "worker-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com https://images.unsplash.com https://upload.wikimedia.org https://thumb.wikimedia.org",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
      "media-src 'self' data: blob: https:",
      "connect-src 'self' ws: wss: https://pipedapi.kavin.rocks https://pipedapi.adminforge.de https://api.piped.private.coffee https://i.ytimg.com https://images.unsplash.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );
  next();
});

// JSON body parser with strict size limit to prevent payload flooding
app.use(express.json({ limit: '64kb' }));

// Restrict API routes strictly to GET/HEAD
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  next();
});

// Live YouTube Search API endpoint (Keyless multi-layer extraction, compliant playback via IFrame API)
app.get('/api/search', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (isSearchRateLimited(clientIp)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({
      error: 'Too many search requests. Please wait a moment and try again.'
    });
  }

  if (Array.isArray(req.query.q)) {
    return res.status(400).json({ error: 'Invalid query parameter.' });
  }
  const rawQuery = typeof req.query.q === 'string' ? req.query.q : '';
  const query = sanitizeSearchQuery(rawQuery);
  if (!query) {
    return res.json([]);
  }

  try {
    const results = await searchYouTubeTracks(query);
    if (results.length > 0) {
      res.setHeader('Cache-Control', 'public, max-age=120');
    }
    return res.json(results);
  } catch {
    return res.status(500).json([]);
  }
});

const artistBioCache = new Map<string, { extract: string; description: string; thumbnail?: string; expiresAt: number }>();

app.get('/api/artist', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (isSearchRateLimited(clientIp)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many requests.' });
  }

  if (Array.isArray(req.query.name)) {
    return res.status(400).json({ error: 'Invalid artist parameter.' });
  }
  const rawName = typeof req.query.name === 'string' ? req.query.name : '';
  const cleanName = sanitizeSearchQuery(rawName).slice(0, 80);
  if (!cleanName || cleanName.length < 2) {
    return res.json({ found: false });
  }

  const cacheKey = cleanName.toLowerCase();
  const cached = artistBioCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.json({ found: true, ...cached });
  }

  try {
    const slug = encodeURIComponent(cleanName.replace(/\s+/g, '_'));
    const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'KiddwaveMusicDirectory/1.0'
      },
      redirect: 'error',
      signal: AbortSignal.timeout(2500)
    });

    if (!wikiRes.ok) {
      return res.json({ found: false });
    }

    const data = await wikiRes.json() as {
      type?: string;
      extract?: string;
      description?: string;
      thumbnail?: { source?: string };
    };

    if (!data || data.type === 'disambiguation' || !data.extract) {
      return res.json({ found: false });
    }

    const payload = {
      extract: String(data.extract).slice(0, 600),
      description: String(data.description || '').slice(0, 140),
      thumbnail:
        typeof data.thumbnail?.source === 'string' && data.thumbnail.source.startsWith('https://')
          ? data.thumbnail.source
          : undefined,
      expiresAt: Date.now() + 1000 * 60 * 60 * 12
    };

    if (artistBioCache.size >= 250) {
      const oldestKey = artistBioCache.keys().next().value;
      if (oldestKey !== undefined) artistBioCache.delete(oldestKey);
    }
    artistBioCache.set(cacheKey, payload);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.json({ found: true, ...payload });
  } catch {
    return res.json({ found: false });
  }
});

// Background Audio Stream API (probe & bounded HTTP 206 Range chunks for mobile background playback)
app.get('/api/audio', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (isSearchRateLimited(clientIp)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many requests.' });
  }

  if (Array.isArray(req.query.v)) {
    return res.status(400).json({ error: 'Invalid video ID parameter.' });
  }
  const videoId = typeof req.query.v === 'string' ? req.query.v : '';
  const isProbe = req.query.probe === '1';

  if (!isValidAudioVideoId(videoId)) {
    return res.status(400).json({ error: 'Invalid video ID.' });
  }

  const stream = await resolveAudioStream(videoId);
  if (isProbe) {
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      available: Boolean(stream),
      mimeType: stream?.mimeType || null
    });
  }

  if (!stream || !isSafeGoogleVideoUrl(stream.url)) {
    return res.status(404).json({ error: 'Audio stream unavailable.' });
  }

  const rangeHdr = typeof req.headers.range === 'string' ? req.headers.range : undefined;
  const { start, end } = clampByteRange(rangeHdr, stream.contentLength);

  try {
    const upstream = await fetch(stream.url, {
      headers: { Range: `bytes=${start}-${end}` },
      redirect: 'error',
      signal: AbortSignal.timeout(7000)
    });

    if (!upstream.ok && upstream.status !== 206) {
      invalidateAudioStreamCache(videoId);
      return res.status(502).json({ error: 'Audio upstream failed.' });
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.length > AUDIO_CHUNK_BYTES + 1024) {
      return res.status(502).json({ error: 'Upstream range exceeded bounds.' });
    }
    const contentRange =
      upstream.headers.get('content-range') ||
      (stream.contentLength
        ? `bytes ${start}-${start + buf.length - 1}/${stream.contentLength}`
        : `bytes ${start}-${start + buf.length - 1}/*`);

    res.status(206);
    res.setHeader('Content-Type', stream.mimeType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Range', contentRange);
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Cache-Control', 'no-store');
    return res.send(buf);
  } catch {
    invalidateAudioStreamCache(videoId);
    return res.status(502).json({ error: 'Audio stream error.' });
  }
});

// Android APK availability metadata & direct download MIME headers
const findLocalApkPath = (): string | undefined => {
  const candidates = [
    path.resolve(__dirname, 'public', 'Kiddwave.apk'),
    path.resolve(__dirname, 'dist', 'Kiddwave.apk'),
    path.resolve(__dirname, 'public', 'SpotiTube.apk'),
    path.resolve(__dirname, 'dist', 'SpotiTube.apk')
  ];
  return candidates.find((p) => {
    try {
      return fs.existsSync(p) && fs.statSync(p).size > 1024;
    } catch {
      return false;
    }
  });
};

let cachedApkHash: { path: string; mtimeMs: number; size: number; sha256: string } | null = null;
const getApkSha256 = (apkPath: string): string | undefined => {
  try {
    const st = fs.statSync(apkPath);
    if (
      cachedApkHash &&
      cachedApkHash.path === apkPath &&
      cachedApkHash.mtimeMs === st.mtimeMs &&
      cachedApkHash.size === st.size
    ) {
      return cachedApkHash.sha256;
    }
    const sha256 = crypto.createHash('sha256').update(fs.readFileSync(apkPath)).digest('hex');
    cachedApkHash = { path: apkPath, mtimeMs: st.mtimeMs, size: st.size, sha256 };
    return sha256;
  } catch {
    return undefined;
  }
};

app.get('/api/apk-info', (_req: Request, res: Response) => {
  const localPath = findLocalApkPath();
  const sha256 = localPath ? getApkSha256(localPath) : undefined;
  const config = resolveApkDownloadConfig({
    configuredUrl: process.env.ANDROID_APK_URL || process.env.VITE_ANDROID_APK_URL,
    localApkExists: Boolean(localPath),
    sha256
  });
  res.setHeader('Cache-Control', 'no-store');
  return res.json(config);
});

const handleApkDownload = (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (isSearchRateLimited(`apk:${clientIp}`)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many download requests. Please try again shortly.' });
  }
  const found = findLocalApkPath();
  if (!found) {
    return res.status(404).json({ error: 'APK binary not yet built or uploaded.' });
  }
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="Kiddwave.apk"');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
  return res.sendFile(found);
};

app.get('/Kiddwave.apk', handleApkDownload);
app.get('/SpotiTube.apk', handleApkDownload);

// Health check endpoint for monitoring & uptime checks
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Kiddwave Media Engine'
  });
});

// Reject unknown /api/* routes cleanly with JSON 404 rather than HTML fallback
app.all('/api/*', (_req: Request, res: Response) => {
  return res.status(404).json({ error: 'API endpoint not found.' });
});

// Ensure OTA manifests and Service Worker are never aggressively cached
app.use(['/app-version.json', '/sw.js', '/index.html'], (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});

// Start server with Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(
      express.static(distPath, {
        setHeaders(res, filePath) {
          const base = path.basename(filePath);
          if (base === 'index.html' || base === 'sw.js' || base === 'app-version.json') {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        }
      })
    );
    app.get('*', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Kiddwave full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
