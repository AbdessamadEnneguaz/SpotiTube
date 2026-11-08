import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Security: Disable X-Powered-By to prevent technology fingerprinting
app.disable('x-powered-by');

// Security: Enforce strict HTTP response headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// JSON body parser with size limit to prevent payload flooding
app.use(express.json({ limit: '100kb' }));

// Helper to convert MM:SS or HH:MM:SS to seconds
function parseLengthToSeconds(lengthStr: string): number {
  if (!lengthStr) return 210;
  const parts = lengthStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 210;
}

// In-Memory Rate Limiter for Search API (Protection against DDoS and automated flood requests)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const searchRateLimits = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_SEARCH_REQUESTS = 60; // Max 60 queries/min per client IP

function isRateLimited(clientIp: string): boolean {
  const now = Date.now();
  const record = searchRateLimits.get(clientIp);

  if (!record || now > record.resetAt) {
    searchRateLimits.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= MAX_SEARCH_REQUESTS) {
    return true;
  }

  record.count += 1;
  return false;
}

// Periodic cleanup of expired rate limit records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of searchRateLimits.entries()) {
    if (now > record.resetAt) {
      searchRateLimits.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// Live YouTube Search API endpoint (Keyless metadata extraction, compliant playback via IFrame API)
app.get('/api/search', async (req: Request, res: Response) => {
  // Rate limiting check
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({
      error: 'Too many search requests. Please wait a moment and try again.'
    });
  }

  // Input Sanitization: Trim, enforce max length, strip illegal control characters
  let query = (req.query.q as string || '').trim();
  if (!query) {
    return res.json([]);
  }

  // Prevent buffer/query payload abuse (max 120 chars)
  if (query.length > 120) {
    query = query.slice(0, 120);
  }

  // Strip dangerous HTML/script injection characters
  query = query.replace(/[<>{}\\]/g, '').trim();

  if (!query) {
    return res.json([]);
  }

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      console.warn(`YouTube fetch returned status ${response.status}`);
      return res.status(response.status).json([]);
    }

    const html = await response.text();
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/) || html.match(/ytInitialData = ({.*?});/);
    if (!match) {
      console.warn('Could not extract ytInitialData from YouTube response');
      return res.json([]);
    }

    const data = JSON.parse(match[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    const results = [];

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        if (item.videoRenderer) {
          const v = item.videoRenderer;
          const id = v.videoId;
          if (!id) continue;

          const title = v.title?.runs?.map((r: any) => r.text).join('') || v.title?.simpleText || 'Unknown Title';
          const channel = v.ownerText?.runs?.map((r: any) => r.text).join('') || 'YouTube Artist';
          const length = v.lengthText?.simpleText || '3:30';
          const thumb = v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

          results.push({
            id: id,
            youtubeId: id,
            title: title,
            channel: channel,
            artist: channel,
            thumbnail: thumb,
            durationSeconds: parseLengthToSeconds(length),
            durationFormatted: length
          });

          if (results.length >= 20) break;
        }
      }
      if (results.length >= 20) break;
    }

    console.log(`[Search] Query: "${query}" -> Found ${results.length} tracks`);
    return res.json(results);
  } catch (err: any) {
    console.error('Search error in /api/search:', err?.message || err);
    return res.status(500).json([]);
  }
});

// Health check endpoint for monitoring & uptime checks
app.get('/api/health', (req: Request, res: Response) => {
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
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SpotiTube full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
