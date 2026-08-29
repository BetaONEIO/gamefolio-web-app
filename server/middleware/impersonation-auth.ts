import { Request, Response, NextFunction } from "express";
import { verifyImpersonationToken } from "../services/impersonation-service";
import { storage } from "../storage";

/**
 * Authenticates requests carrying an impersonation token (issued by an admin via
 * POST /api/admin/users/:id/impersonate). On success, req.user is set to the
 * *impersonated* target user — never the admin — and req.impersonation carries
 * the admin's identity + reason for downstream logging/banner display.
 *
 * Mounted before the generic native-JWT Bearer bridge in server/routes.ts, which
 * already no-ops once req.user is set. Deliberately NOT mounted on /api/admin/*,
 * so an impersonation token can never itself be used to reach admin-gated routes
 * (adminMiddleware checks req.user.role, which here is the target user's role).
 */
export const impersonationAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (req.user) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  const token = authHeader.substring(7);

  try {
    const payload = verifyImpersonationToken(token);
    const targetUser = await storage.getUserById(payload.targetUserId);
    if (!targetUser) return next();

    req.user = targetUser as any;
    (req as any).impersonation = {
      tokenId: payload.tokenId,
      adminId: payload.adminId,
      adminUsername: payload.adminUsername,
    };
  } catch {
    // Not a valid impersonation token — fall through to normal auth (session or
    // native Bearer bridge), which will independently try/fail on the same header.
  }

  next();
};
