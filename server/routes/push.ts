import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { adminMiddleware } from "../middleware/admin";
import {
  insertPushBroadcastSchema,
  pushAudienceSchema,
  type PushAudience,
} from "@shared/schema";
import {
  isPushEnabled,
  pushDisabledReason,
  sendPushToAll,
  sendPushToProUsers,
  sendPushToRole,
  sendPushToUsers,
  sendPushToUser,
} from "../push-service";

const pushRouter = Router();

// ----- User-facing endpoints -----

const registerSchema = z.object({
  token: z.string().trim().min(10).max(4096),
  platform: z.enum(["ios", "android", "web"]),
  deviceModel: z.string().trim().max(120).optional(),
  appVersion: z.string().trim().max(40).optional(),
});

pushRouter.post("/register", async (req: Request, res: Response) => {
  // Use req.user rather than req.isAuthenticated() — the latter only
  // recognises cookie/session auth, but on native the request is JWT-only
  // (the global Bearer bridge populates req.user without flipping the
  // passport session flag).
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid token payload", errors: parsed.error.flatten() });
  }
  try {
    await storage.upsertPushToken({
      userId: (req.user as any).id,
      token: parsed.data.token,
      platform: parsed.data.platform,
      deviceModel: parsed.data.deviceModel ?? null,
      appVersion: parsed.data.appVersion ?? null,
    });
    return res.json({ ok: true, pushEnabled: isPushEnabled() });
  } catch (err) {
    console.error("[push] register failed:", err);
    return res.status(500).json({ message: "Failed to register push token" });
  }
});

const unregisterSchema = z.object({
  token: z.string().trim().min(10).max(4096),
});

pushRouter.post("/unregister", async (req: Request, res: Response) => {
  // Auth not required: lets logout flush the device's token even if the
  // session has already been invalidated.
  const parsed = unregisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid token payload" });
  }
  try {
    await storage.deletePushToken(parsed.data.token);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[push] unregister failed:", err);
    return res.status(500).json({ message: "Failed to unregister push token" });
  }
});

// Lets the client send a self-test push to confirm the round-trip works
// without bothering an admin. Only fires to the caller's own tokens.
pushRouter.post("/test", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!isPushEnabled()) {
    return res.status(503).json({ message: pushDisabledReason() ?? "Push disabled" });
  }
  const result = await sendPushToUser((req.user as any).id, {
    title: "Gamefolio test push",
    body: "If you see this, push notifications are working on this device.",
    data: { type: "test" },
  });
  return res.json({ ok: true, ...result });
});

// ----- Admin endpoints -----

const adminPushRouter = Router();

adminPushRouter.use(adminMiddleware);

adminPushRouter.get("/status", (_req: Request, res: Response) => {
  res.json({ enabled: isPushEnabled(), reason: pushDisabledReason() });
});

adminPushRouter.get("/broadcasts", async (req: Request, res: Response) => {
  const limitRaw = parseInt(String(req.query.limit ?? "50"), 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
  const rows = await storage.getRecentPushBroadcasts(limit);
  res.json({ broadcasts: rows });
});

adminPushRouter.post("/broadcast", async (req: Request, res: Response) => {
  if (!isPushEnabled()) {
    return res.status(503).json({
      message: pushDisabledReason() ?? "Push notifications are not configured on the server.",
    });
  }
  const parsed = insertPushBroadcastSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid broadcast", errors: parsed.error.flatten() });
  }
  const { title, body, actionUrl, audience } = parsed.data;
  const sender = (req.user as any).id as number;

  let result: { recipientCount: number; successCount: number; failureCount: number };
  try {
    result = await dispatch(audience, { title, body, actionUrl: actionUrl ?? null });
  } catch (err) {
    console.error("[push] broadcast failed:", err);
    return res.status(500).json({ message: "Broadcast failed", error: (err as Error).message });
  }

  const broadcast = await storage.createPushBroadcast({
    sentByUserId: sender,
    title,
    body,
    actionUrl: actionUrl ?? null,
    audience,
    recipientCount: result.recipientCount,
    successCount: result.successCount,
    failureCount: result.failureCount,
  });

  return res.json({ broadcast, ...result });
});

async function dispatch(audience: PushAudience, opts: { title: string; body: string; actionUrl: string | null }) {
  switch (audience.kind) {
    case "all":
      return sendPushToAll(opts);
    case "role":
      return sendPushToRole(audience.role, opts);
    case "pro":
      return sendPushToProUsers(opts);
    case "users":
      return sendPushToUsers(audience.userIds, opts);
  }
}

export { pushRouter, adminPushRouter };
