import { Router, type Request, type Response } from "express";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { userXPHistory } from "@shared/schema";
import { db } from "../db";
import { storage } from "../storage";
import { hybridAuth } from "../middleware/hybrid-auth";
import { XPService } from "../xp-service";
import { captureRouteError } from "../sentry";

const router = Router();
const DAILY_LIMIT = 5;
const WATCH_THRESHOLD_SECONDS = 10;
const DOUBLED_DISCOVERY_XP = 20;

function utcDay() {
  const dayKey = new Date().toISOString().slice(0, 10);
  const start = new Date(`${dayKey}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { dayKey, start, end };
}

async function getProgress(userId: number) {
  const { start, end } = utcDay();
  const rows = await db.select({ count: sql<number>`count(*)::int` }).from(userXPHistory).where(and(
    eq(userXPHistory.userId, userId),
    eq(userXPHistory.source, "surprise_me_bonus"),
    gte(userXPHistory.createdAt, start),
    lt(userXPHistory.createdAt, end),
  ));
  const completed = Number(rows[0]?.count ?? 0);
  return { completed, remaining: Math.max(0, DAILY_LIMIT - completed), limit: DAILY_LIMIT };
}

router.get("/status", hybridAuth, async (req: Request, res: Response) => {
  try {
    return res.json(await getProgress(req.user!.id));
  } catch (error) {
    captureRouteError(error, { route: "surprise-me-status" });
    return res.status(500).json({ message: "Could not load Surprise Me progress" });
  }
});

router.post("/pick", hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const progress = await getProgress(userId);
    if (progress.remaining === 0) return res.status(429).json({ message: "Daily Surprise Me bonus complete", ...progress });

    const { dayKey, start, end } = utcDay();
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    const result = await db.execute(sql`
      SELECT c.id FROM clips c
      WHERE c.user_id <> ${userId}
        AND c.status = 'ready'
        AND c.age_restricted = false
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks b
          WHERE (b.blocker_id = ${userId} AND b.blocked_id = c.user_id)
             OR (b.blocker_id = c.user_id AND b.blocked_id = ${userId})
        )
        AND NOT EXISTS (
          SELECT 1 FROM user_xp_history h
          WHERE h.user_id = ${userId}
            AND h.source = 'surprise_me_assigned'
            AND h.content_id = c.id
            AND h.created_at >= ${startIso}
            AND h.created_at < ${endIso}
        )
      ORDER BY random() LIMIT 1
    `);
    const row = (((result as any).rows ?? result) as Array<{ id: number }>)[0];
    if (!row) return res.status(404).json({ message: "No new clips are available right now" });

    await storage.addUserXPHistoryIfAbsent({
      userId, clipId: row.id, contentType: "clip", contentId: row.id, xpAmount: 0,
      source: "surprise_me_assigned", description: `Surprise Me assignment for clip #${row.id}`,
      dedupeKey: `surprise-assignment:${userId}:${dayKey}:${row.id}`,
    });
    const clip = await storage.getClipById(row.id);
    if (!clip) return res.status(404).json({ message: "That surprise is no longer available" });
    return res.json({ clip, progress, watchThresholdSeconds: WATCH_THRESHOLD_SECONDS, xpAwarded: DOUBLED_DISCOVERY_XP });
  } catch (error) {
    captureRouteError(error, { route: "surprise-me-pick" });
    return res.status(500).json({ message: "Could not find a surprise clip" });
  }
});

router.post("/complete", hybridAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const clipId = Number(req.body?.clipId);
    const watchedSeconds = Number(req.body?.watchedSeconds);
    if (!Number.isInteger(clipId) || watchedSeconds < WATCH_THRESHOLD_SECONDS) {
      return res.status(400).json({ message: `Watch at least ${WATCH_THRESHOLD_SECONDS} seconds to earn the bonus` });
    }
    const progress = await getProgress(userId);
    if (progress.remaining === 0) return res.status(429).json({ message: "Daily Surprise Me bonus complete", ...progress });

    const { dayKey, start, end } = utcDay();
    const [assignment] = await db.select({ id: userXPHistory.id }).from(userXPHistory).where(and(
      eq(userXPHistory.userId, userId), eq(userXPHistory.source, "surprise_me_assigned"),
      eq(userXPHistory.contentId, clipId), gte(userXPHistory.createdAt, start), lt(userXPHistory.createdAt, end),
    )).limit(1);
    if (!assignment) return res.status(403).json({ message: "Request a Surprise Me clip first" });

    await XPService.awardXP(userId, DOUBLED_DISCOVERY_XP, "surprise_me_bonus", `Surprise Me 2x discovery bonus for clip #${clipId}`, clipId, {
      contentType: "clip", contentId: clipId, dedupeKey: `surprise-reward:${userId}:${dayKey}:${clipId}`,
    });
    const updated = await getProgress(userId);
    return res.json({ awarded: updated.completed > progress.completed, xpAwarded: DOUBLED_DISCOVERY_XP, progress: updated });
  } catch (error) {
    captureRouteError(error, { route: "surprise-me-complete" });
    return res.status(500).json({ message: "Could not award the Surprise Me bonus" });
  }
});

export default router;
