import { AsyncLocalStorage } from 'node:async_hooks';
import type { Request, Response, NextFunction } from 'express';

export interface RequestContext {
  /** Lowercased X-GF-Platform header the native Capacitor apps set on every
   *  request ('ios' | 'android'); undefined for web clients. */
  platform?: string;
  /** Raw User-Agent header, used for a coarse web mobile-vs-desktop split. */
  userAgent?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Express middleware that exposes the current request's platform header and
 * user-agent to deep call sites (e.g. storage.createUser → notifyNewSignup)
 * via AsyncLocalStorage, so we don't have to thread them through every
 * function signature. Register this early, before the route handlers.
 */
export function requestContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const rawPlatform = req.headers['x-gf-platform'];
  const rawUa = req.headers['user-agent'];
  const ctx: RequestContext = {
    platform: ((Array.isArray(rawPlatform) ? rawPlatform[0] : rawPlatform) || '').toLowerCase() || undefined,
    userAgent: Array.isArray(rawUa) ? rawUa[0] : rawUa,
  };
  storage.run(ctx, () => next());
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/**
 * Best-effort human-readable signup source for analytics / notifications:
 * "iOS App" | "Android App" | "Mobile Web" | "Desktop Web" | "Unknown".
 *
 * Native apps are detected by the X-GF-Platform header they send on every
 * request (see client/src/lib/platform.ts). Web requests don't carry it, so we
 * fall back to a coarse mobile-vs-desktop split from the User-Agent. NB: an
 * OAuth sign-in that completes via a browser redirect on a native device may
 * lack the header and therefore read as "Mobile Web".
 */
export function getSignupSource(): string {
  const ctx = storage.getStore();
  const platform = ctx?.platform;
  if (platform === 'ios') return 'iOS App';
  if (platform === 'android') return 'Android App';

  const ua = ctx?.userAgent;
  if (!ua) return 'Unknown';
  const isMobile = /Mobi|Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Tablet/i.test(ua);
  return isMobile ? 'Mobile Web' : 'Desktop Web';
}
