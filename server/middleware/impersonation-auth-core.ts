import type { NextFunction, Request, Response } from 'express';
import type { ImpersonationTokenPayload } from '../services/impersonation-service';

type VerifyImpersonationToken = (token: string) => ImpersonationTokenPayload;
type LoadUser = (userId: number) => Promise<unknown>;

export function createImpersonationAuthMiddleware(
  verifyToken: VerifyImpersonationToken,
  loadUser: LoadUser,
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
    const token = authHeader.substring(7);

    try {
      const payload = verifyToken(token);
      const targetUser = await loadUser(payload.targetUserId);
      if (!targetUser) return next();

      // A browser impersonation tab still carries the admin's normal session
      // cookie. The valid, short-lived impersonation bearer token must take
      // precedence for this request or developer APIs will accidentally run as
      // the admin and fail ownership checks.
      req.user = targetUser as any;
      (req as any).impersonation = {
        tokenId: payload.tokenId,
        adminId: payload.adminId,
        adminUsername: payload.adminUsername,
      };
    } catch {
      // Not a valid impersonation token — preserve any existing session user
      // and let the native Bearer bridge independently try the same header.
    }

    next();
  };
}
