import crypto from "node:crypto";
import { Router, type Request, type Response } from "express";
import { and, eq, sql } from "drizzle-orm";
import { users } from "@shared/schema";
import { db } from "../db";
import { createAndPush } from "../notification-service";
import { captureRouteError } from "../sentry";
import { XPService } from "../xp-service";
import {
  calculateVpzoneXP,
  vpzoneDedupeKey,
  vpzonePulseEventSchema,
  VPZONE_XP_PER_PULSE,
} from "../services/vpzone-pulse";

const router = Router();

function suppliedSecret(req: Request): string | null {
  const authorization = req.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7);
  return req.get("x-vpzone-secret") ?? null;
}

function secretsMatch(supplied: string | null, expected: string): boolean {
  if (!supplied) return false;
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
}

router.post("/pulse", async (req: Request, res: Response) => {
  const secret = process.env.VPZONE_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(503).json({ error: "VPZone integration is not configured" });
  }
  if (!secretsMatch(suppliedSecret(req), secret)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const parsed = vpzonePulseEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request",
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { eventId, username, pulses } = parsed.data;
  const xpAwarded = calculateVpzoneXP(pulses);
  if (xpAwarded < 1) {
    return res.status(422).json({
      error: "This event converts to less than 1 whole Gamefolio XP",
      pulses,
      xpAwarded: 0,
    });
  }

  try {
    const matches = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(and(
        eq(users.vpzoneVerified, true),
        sql`LOWER(${users.vpzoneChannelName}) = LOWER(${username})`,
      ))
      .limit(2);

    if (matches.length === 0) {
      return res.status(404).json({ error: "No linked Gamefolio account found" });
    }
    if (matches.length > 1) {
      return res.status(409).json({ error: "More than one linked account matched this VPZone username" });
    }

    const user = matches[0];
    const awarded = await XPService.awardXP(
      user.id,
      xpAwarded,
      "vpzone_pulse",
      `Earned ${xpAwarded} bonus XP from ${pulses} Pulse on VPZone`,
      undefined,
      { dedupeKey: vpzoneDedupeKey(eventId) },
    );

    if (!awarded) {
      return res.status(200).json({
        success: true,
        duplicate: true,
        eventId,
        username,
        pulses,
        xpAwarded: 0,
      });
    }

    await createAndPush({
      userId: user.id,
      type: "vpzone_pulse_bonus",
      title: "VPZone bonus XP",
      message: `You earned ${xpAwarded} bonus XP after earning ${pulses} Pulse on VPZone!`,
      actionUrl: "/profile",
      metadata: { eventId, pulses, xpAwarded, source: "vpzone" },
    });

    return res.status(200).json({
      success: true,
      duplicate: false,
      eventId,
      username,
      gamefolioUsername: user.username,
      pulses,
      xpAwarded,
      conversionRate: VPZONE_XP_PER_PULSE,
    });
  } catch (error) {
    captureRouteError(error);
    console.error("VPZone Pulse webhook failed:", error);
    return res.status(500).json({ error: "Unable to process Pulse event" });
  }
});

export default router;
