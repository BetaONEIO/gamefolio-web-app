import type { NextFunction, Request, Response } from "express";
import type { ImpersonationTokenPayload } from "../services/impersonation-service";

type VerifyImpersonationToken = (token: string) => ImpersonationTokenPayload;
type LoadUser = (userId: number) => Promise<unknown>;
type IsImpersonationTokenCandidate = (token: string) => boolean;

export function createImpersonationAuthMiddleware(
  verifyToken: VerifyImpersonationToken,
  loadUser: LoadUser,
  isImpersonationTokenCandidate: IsImpersonationTokenCandidate,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return next();
    const token = authHeader.substring(7);

    // Native access tokens share the Authorization header and are handled by
    // the next middleware. Only impersonation-shaped tokens belong here.
    if (!isImpersonationTokenCandidate(token)) return next();

    const rejectImpersonation = (status: 401 | 403, code: string, message: string) => {
      // Passport may already have hydrated the administrator from the shared
      // session cookie. Never allow a failed impersonation request to inherit
      // that identity for this request.
      req.user = undefined;
      delete (req as any).impersonation;
      return res.status(status).json({ message, code });
    };

    try {
      const payload = verifyToken(token);
      const targetUser = await loadUser(payload.targetUserId);
      if (!targetUser) {
        return rejectImpersonation(
          401,
          "IMPERSONATION_TARGET_UNAVAILABLE",
          "Impersonation session is no longer valid",
        );
      }

      const targetRole = (targetUser as { role?: unknown }).role;
      if (targetRole === "admin" || targetRole === "moderator") {
        return rejectImpersonation(
          403,
          "IMPERSONATION_TARGET_PRIVILEGED",
          "Privileged accounts cannot be impersonated",
        );
      }

      // A fresh impersonation tab still carries the administrator's session
      // cookie. A valid, short-lived impersonation token must take precedence
      // for this request so downstream ownership checks run as the target user.
      req.user = targetUser as any;
      (req as any).impersonation = {
        tokenId: payload.tokenId,
        adminId: payload.adminId,
        adminUsername: payload.adminUsername,
      };
    } catch {
      return rejectImpersonation(
        401,
        "IMPERSONATION_TOKEN_INVALID_OR_EXPIRED",
        "Impersonation session is invalid or expired",
      );
    }

    next();
  };
}
