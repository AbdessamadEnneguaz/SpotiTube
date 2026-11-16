import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  isSearchRateLimited,
  sanitizeSearchQuery,
  searchYouTubeTracks
} from './lib/youtubeSearch.js';
import {
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

// Security: Reject excessively long URLs / malformed path flooding early
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.url.length > 2048) {
    return res.status(414).json({ error: 'Request URI too long.' });
  }
  if (req.url.includes('\0')) {
    return res.status(400).json({ error: 'Invalid request.' });
  }
  next();
});

// Security: Enforce hardened HTTP response headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
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
      "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com https://images.unsplash.com",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
      "media-src 'self' data: blob:",
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

// Background Audio Stream API (probe & bounded HTTP 206 Range chunks for mobile background playback)
app.get('/api/audio', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (isSearchRateLimited(clientIp)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Too many requests.' });
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

  if (!stream) {
    return res.status(404).json({ error: 'Audio stream unavailable.' });
  }

  const rangeHdr = typeof req.headers.range === 'string' ? req.headers.range : undefined;
  const { start, end } = clampByteRange(rangeHdr, stream.contentLength);

  try {
    const upstream = await fetch(stream.url, {
      headers: { Range: `bytes=${start}-${end}` },
      signal: AbortSignal.timeout(7000)
    });

    if (!upstream.ok && upstream.status !== 206) {
      invalidateAudioStreamCache(videoId);
      return res.status(502).json({ error: 'Audio upstream failed.' });
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
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

// Health check endpoint for monitoring & uptime checks
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SpotiTube Media Engine'
  });
});

// Start server with Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
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
    console.log(`SpotiTube full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
