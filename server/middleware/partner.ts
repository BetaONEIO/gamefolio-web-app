import { Request, Response, NextFunction } from "express";
import { isPartnerType, type PartnerType } from "@shared/partner-access";

/**
 * Route guard for partner-only endpoints (e.g. the Streamer / Indie Developer
 * dashboards). Requires an authenticated user holding the paid partner
 * subscription of the given type.
 *
 *   app.get("/api/indie/dashboard", requirePartnerType("indie"), handler)
 *   app.get("/api/streamer/dashboard", requirePartnerType("streamer"), handler)
 *
 * Note: this checks the paid entitlement (isPartner + partnerType), NOT the
 * self-selected `userType` persona tags.
 */
export function requirePartnerType(type: PartnerType) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated?.()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = req.user as any;
    // Admins bypass so the pages remain testable/reviewable.
    if (user?.role === "admin") {
      return next();
    }
    if (!isPartnerType(user, type)) {
      return res.status(403).json({
        message: `Requires an active ${type} partner subscription`,
        code: "PARTNER_TYPE_REQUIRED",
        requiredPartnerType: type,
      });
    }
    return next();
  };
}
