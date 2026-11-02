import crypto from "node:crypto";
import { Router, type Request, type Response } from "express";
import { and, eq, gte, sql } from "drizzle-orm";
import { userXPHistory, users } from "@shared/schema";
import { db } from "../db";
import { createAndPush } from "../notification-service";
import { captureRouteError } from "../sentry";
import { calculateLevel } from "../level-system";
import {
  calculateVpzoneXP,
  getVpzonePulseLimits,
  isVpzoneEventFresh,
  vpzoneDedupeKey,
  vpzonePulseEventSchema,
  VPZONE_XP_PER_PULSE,
} from "../services/vpzone-pulse";

const router = Router();

function auditVpzoneEvent(outcome: string, details: Record<string, unknown>) {
  console.info(JSON.stringify({ event: "vpzone_pulse_audit", outcome, ...details }));
}

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

  const { eventId, username, vpzoneId, pulses, occurredAt } = parsed.data;
  const limits = getVpzonePulseLimits();
  if (pulses > limits.maxPulsesPerEvent) {
    auditVpzoneEvent("event_limit_rejected", { eventId, username, vpzoneId, pulses, limit: limits.maxPulsesPerEvent });
    return res.status(422).json({ error: "Pulse event exceeds the configured limit", limit: limits.maxPulsesPerEvent });
  }
  const xpAwarded = calculateVpzoneXP(pulses);
  if (xpAwarded < 1) {
    return res.status(422).json({
      error: "This event converts to less than 1 whole Gamefolio XP",
      pulses,
      xpAwarded: 0,
    });
  }

  try {
    const identityCondition = vpzoneId
      ? eq(users.vpzoneId, vpzoneId)
      : sql`LOWER(${users.vpzoneChannelName}) = LOWER(${username})`;
    const matches = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(and(
        eq(users.vpzoneVerified, true),
        identityCondition,
      ))
      .limit(2);

    if (matches.length === 0) {
      return res.status(404).json({ error: "No linked Gamefolio account found" });
    }
    if (matches.length > 1) {
      return res.status(409).json({ error: "More than one linked account matched this VPZone username" });
    }

    const user = matches[0];
    const dedupeKey = vpzoneDedupeKey(eventId);
    const awardResult = await db.transaction(async (tx) => {
      // Serialize VPZone awards for this user so concurrent events cannot race
      // past the rolling limits.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${user.id}, 144809)`);

      const [existing] = await tx.select({ id: userXPHistory.id })
        .from(userXPHistory).where(eq(userXPHistory.dedupeKey, dedupeKey)).limit(1);
      if (existing) return { status: "duplicate" as const };

      if (!isVpzoneEventFresh(occurredAt, new Date(), limits.maxAgeMinutes)) {
        return { status: "stale" as const };
      }

      const now = new Date();
      const rollingDayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const sumSince = async (start: Date) => {
        const [row] = await tx.select({ total: sql<number>`COALESCE(SUM(${userXPHistory.xpAmount}), 0)` })
          .from(userXPHistory)
          .where(and(eq(userXPHistory.userId, user.id), eq(userXPHistory.source, "vpzone_pulse"), gte(userXPHistory.createdAt, start)));
        return Number(row?.total ?? 0);
      };
      const [dailyXp, monthlyXp] = await Promise.all([sumSince(rollingDayStart), sumSince(monthStart)]);
      if (dailyXp + xpAwarded > limits.dailyXp) return { status: "daily_limit" as const, current: dailyXp };
      if (monthlyXp + xpAwarded > limits.monthlyXp) return { status: "monthly_limit" as const, current: monthlyXp };

      await tx.insert(userXPHistory).values({
        userId: user.id, xpAmount: xpAwarded, source: "vpzone_pulse", dedupeKey,
        description: `Earned ${xpAwarded} bonus XP from ${pulses} Pulse on VPZone`,
      });
      const [updated] = await tx.update(users)
        .set({ totalXP: sql`${users.totalXP} + ${xpAwarded}` })
        .where(eq(users.id, user.id)).returning({ totalXP: users.totalXP });
      await tx.update(users).set({ level: calculateLevel(Number(updated.totalXP)) }).where(eq(users.id, user.id));
      return { status: "awarded" as const };
    });

    if (awardResult.status === "duplicate") {
      return res.status(200).json({
        success: true,
        duplicate: true,
        eventId,
        username,
        pulses,
        xpAwarded: 0,
      });
    }
    if (awardResult.status === "stale") {
      auditVpzoneEvent("stale_rejected", { eventId, userId: user.id, occurredAt });
      return res.status(422).json({ error: "Pulse event is too old or has an invalid future timestamp" });
    }
    if (awardResult.status === "daily_limit" || awardResult.status === "monthly_limit") {
      const limit = awardResult.status === "daily_limit" ? limits.dailyXp : limits.monthlyXp;
      auditVpzoneEvent(`${awardResult.status}_rejected`, { eventId, userId: user.id, xpAwarded, current: awardResult.current, limit });
      return res.status(429).json({ error: "VPZone XP limit reached", period: awardResult.status === "daily_limit" ? "rolling_24_hours" : "calendar_month", limit });
    }

    await createAndPush({
      userId: user.id,
      type: "vpzone_pulse_bonus",
      title: "VPZone bonus XP",
      message: `You earned ${xpAwarded} bonus XP after earning ${pulses} Pulse on VPZone!`,
      actionUrl: "/profile",
      metadata: { eventId, pulses, xpAwarded, source: "vpzone" },
    }).catch(error => {
      captureRouteError(error);
      console.error("VPZone XP notification failed:", error);
    });

    auditVpzoneEvent("awarded", { eventId, userId: user.id, vpzoneId, pulses, xpAwarded });

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
