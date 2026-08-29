import { Request, Response, NextFunction } from 'express';

/**
 * Detects whether the request originated from the developer portal subdomain.
 * Checks Origin header (CORS preflight / XHR) then falls back to Referer.
 */
export function isDeveloperSubdomainRequest(req: Request): boolean {
  const origin = req.headers.origin || req.headers.referer || '';
  return origin.includes('developer.gamefolio.com');
}

/**
 * Middleware that returns 403 for requests from developer.gamefolio.com
 * when the route would create a new user account.
 */
export function blockDeveloperRegistration(req: Request, res: Response, next: NextFunction) {
  if (isDeveloperSubdomainRequest(req)) {
    return res.status(403).json({
      message: 'New registrations are not available on the developer portal. Please create an account on app.gamefolio.com first, then sign in here.',
      code: 'DEV_PORTAL_NO_REGISTRATION',
    });
  }
  next();
}
