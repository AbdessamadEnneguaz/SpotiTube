import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  isSearchRateLimited,
  sanitizeSearchQuery,
  searchYouTubeTracks
} from './lib/youtubeSearch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Security: Disable X-Powered-By to prevent technology fingerprinting
app.disable('x-powered-by');

// Security: Enforce strict HTTP response headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// JSON body parser with size limit to prevent payload flooding
app.use(express.json({ limit: '100kb' }));

// Live YouTube Search API endpoint (Keyless multi-layer extraction, compliant playback via IFrame API)
app.get('/api/search', async (req: Request, res: Response) => {
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || 'unknown';
  if (isSearchRateLimited(clientIp)) {
    return res.status(429).json({
      error: 'Too many search requests. Please wait a moment and try again.'
    });
  }

  const query = sanitizeSearchQuery((req.query.q as string) || '');
  if (!query) {
    return res.json([]);
  }

  try {
    const results = await searchYouTubeTracks(query);
    console.log(`[Search] Query: "${query}" -> Found ${results.length} tracks`);
    return res.json(results);
  } catch (err: any) {
    console.error('Search error in /api/search:', err?.message || err);
    return res.status(500).json([]);
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
