import { verifyImpersonationToken } from "../services/impersonation-service";
import { storage } from "../storage";
import { createImpersonationAuthMiddleware } from './impersonation-auth-core';

/**
 * Authenticates requests carrying an impersonation token (issued by an admin via
 * POST /api/admin/users/:id/impersonate). On success, req.user is set to the
 * *impersonated* target user — never the admin — and req.impersonation carries
 * the admin's identity + reason for downstream logging/banner display.
 *
 * Mounted before the generic native-JWT Bearer bridge in server/routes.ts, which
 * already no-ops once req.user is set. Admin routes see the target user's role,
 * so an impersonation token cannot itself be used to reach admin-only actions.
 */
export const impersonationAuthMiddleware = createImpersonationAuthMiddleware(
  verifyImpersonationToken,
  storage.getUserById.bind(storage),
);
