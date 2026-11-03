import type { NextFunction, Request, Response } from 'express';

// Exact browser origins. Production does not allow suffix matches
// (`.gamefolio.com`, `localhost.evil.com`) or arbitrary dev ports.
const PRODUCTION_ORIGINS = new Set([
  'https://app.gamefolio.com',
  'https://developer.gamefolio.com',
  'https://gamefolio.com',
  'https://www.gamefolio.com',
  // Capacitor iOS (capacitor.config.ts iosScheme) and Ionic.
  'capacitor://localhost',
  'ionic://localhost',
  // Capacitor Android. androidScheme is `https`, so the WebView origin is
  // exactly `https://localhost`. `http://localhost` covers builds that still
  // use the older http scheme. These are the origins with no explicit port;
  // `http://localhost:3000` and similar stay limited to non-production below.
  'https://localhost',
  'http://localhost',
]);

export function isOriginAllowed(origin: string): boolean {
  if (PRODUCTION_ORIGINS.has(origin)) return true;
  if (process.env.NODE_ENV === 'production') return false;

  try {
    const url = new URL(origin);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname === 'localhost';
  } catch {
    return false;
  }
}

// `Location` is required by tus-js-client after a creation POST. `@tus/server`
// also exposes it on the upload response itself (it replaces this header via
// writeHead); listing it here covers every other API response.
const EXPOSE_HEADERS = 'Location, Upload-Offset, Upload-Length, Tus-Resumable, Upload-Metadata, Upload-Result, X-Request-ID';

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With, Upload-Type, Upload-Length, Upload-Offset, Upload-Metadata, Tus-Resumable, Upload-Defer-Length, Upload-Checksum');
  res.setHeader('Access-Control-Expose-Headers', EXPOSE_HEADERS);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
}
