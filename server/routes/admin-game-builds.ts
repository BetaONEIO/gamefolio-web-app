/**
 * Moderation queue for developer-uploaded game builds.
 *
 * Every build waits for a human here before it is publicly downloadable. That
 * is not caution for its own sake: the catalogue's existing user-added-game path
 * auto-approves, which is how the "Untitled game" stubs got in, and the cost of
 * that mistake on a row of metadata is a tidy-up. The cost of it on a hosted
 * executable is distributing malware under Gamefolio's name.
 */

import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { adminMiddleware } from "../middleware/admin";
import { captureRouteError } from "../sentry";
import { createAndPush } from "../notification-service";
import { buildRootPrefix, deletePrefix, isR2Configured } from "../r2-storage";

const router = Router();
router.use(adminMiddleware);

function rowsOf(result: unknown): any[] {
  return ((result as any).rows ?? result) as any[];
}

const REVIEWABLE_STATUSES = ["pending_review", "approved", "rejected", "pending_upload"];

/** The queue. Defaults to what actually needs a decision. */
router.get("/", async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "pending_review";
    if (!REVIEWABLE_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Unknown status filter" });
    }
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const result = await db.execute(sql`
      SELECT b.id, b.build_type AS "buildType", b.platform, b.channel, b.label,
             b.original_file_name AS "originalFileName",
             b.size_bytes AS "sizeBytes", b.stored_bytes AS "storedBytes",
             b.status, b.review_notes AS "reviewNotes",
             b.download_count AS "downloadCount",
             b.hidden_at AS "hiddenAt", b.hidden_reason AS "hiddenReason",
             b.web_entry_path AS "webEntryPath",
             b.created_at AS "createdAt",
             b.profile_id AS "profileId",
             p.game_name AS "gameName",
             u.id AS "userId", u.username, u.display_name AS "displayName",
             u.is_indie_dev_subscriber AS "isIndieDevSubscriber"
      FROM game_builds b
      JOIN indie_game_profiles p ON p.id = b.profile_id
      JOIN users u ON u.id = b.user_id
      WHERE b.status = ${status}
      ORDER BY b.created_at ASC
      LIMIT ${limit}
    `);

    const counts = await db.execute(sql`
      SELECT status, COUNT(*)::int AS "count"
      FROM game_builds
      WHERE status <> 'removed'
      GROUP BY status
    `);

    res.json({
      builds: rowsOf(result),
      counts: Object.fromEntries(rowsOf(counts).map((r) => [r.status, Number(r.count)])),
      hostingConfigured: isR2Configured(),
    });
  } catch (error) {
    captureRouteError(error, { route: "admin-game-builds GET /" });
    res.status(500).json({ message: "Failed to load the build queue" });
  }
});

async function loadBuild(buildId: number) {
  const result = await db.execute(sql`
    SELECT b.id, b.user_id AS "userId", b.profile_id AS "profileId", b.label,
           b.status, b.build_type AS "buildType", p.game_name AS "gameName"
    FROM game_builds b
    JOIN indie_game_profiles p ON p.id = b.profile_id
    WHERE b.id = ${buildId} LIMIT 1
  `);
  return rowsOf(result)[0] ?? null;
}

router.post("/:id/approve", async (req: Request, res: Response) => {
  try {
    const buildId = Number(req.params.id);
    if (!Number.isInteger(buildId)) return res.status(400).json({ message: "Invalid build id" });

    const build = await loadBuild(buildId);
    if (!build) return res.status(404).json({ message: "Build not found" });
    if (build.status !== "pending_review") {
      return res.status(409).json({ message: `Build is ${build.status}, not awaiting review` });
    }

    await db.execute(sql`
      UPDATE game_builds
      SET status = 'approved', review_notes = NULL,
          reviewed_by = ${(req as any).user?.id ?? null}, reviewed_at = now(), updated_at = now()
      WHERE id = ${buildId}
    `);

    await createAndPush({
      userId: Number(build.userId),
      type: "game_build_approved",
      title: "Build approved",
      message: `"${build.label}" for ${build.gameName ?? "your game"} is now live on Gamefolio.`,
      actionUrl: `/indie-dashboard?tab=builds`,
    }).catch((err) => console.error("[AdminGameBuilds] approval notification failed:", err));

    res.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "admin-game-builds POST /:id/approve" });
    res.status(500).json({ message: "Failed to approve the build" });
  }
});

/**
 * Reject without deleting. The developer keeps the bytes (and the quota cost)
 * until they fix or remove it, which is deliberate — silently reclaiming
 * someone's upload because a moderator said no is not ours to do.
 */
router.post("/:id/reject", async (req: Request, res: Response) => {
  try {
    const buildId = Number(req.params.id);
    if (!Number.isInteger(buildId)) return res.status(400).json({ message: "Invalid build id" });

    const reason = String(req.body?.reason ?? "").trim().slice(0, 500);
    if (!reason) return res.status(400).json({ message: "A reason is required so the developer can fix it" });

    const build = await loadBuild(buildId);
    if (!build) return res.status(404).json({ message: "Build not found" });
    if (build.status !== "pending_review") {
      return res.status(409).json({ message: `Build is ${build.status}, not awaiting review` });
    }

    await db.execute(sql`
      UPDATE game_builds
      SET status = 'rejected', review_notes = ${reason},
          reviewed_by = ${(req as any).user?.id ?? null}, reviewed_at = now(), updated_at = now()
      WHERE id = ${buildId}
    `);

    await createAndPush({
      userId: Number(build.userId),
      type: "game_build_rejected",
      title: "Build needs changes",
      message: `"${build.label}" was not approved: ${reason}`,
      actionUrl: `/indie-dashboard?tab=builds`,
    }).catch((err) => console.error("[AdminGameBuilds] rejection notification failed:", err));

    res.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "admin-game-builds POST /:id/reject" });
    res.status(500).json({ message: "Failed to reject the build" });
  }
});

/**
 * Take down an already-live build. Separate from reject because it is the
 * response to something that got through — the bytes go immediately rather
 * than waiting on the developer.
 */
router.post("/:id/takedown", async (req: Request, res: Response) => {
  try {
    const buildId = Number(req.params.id);
    if (!Number.isInteger(buildId)) return res.status(400).json({ message: "Invalid build id" });
    if (!isR2Configured()) {
      return res.status(503).json({ message: "R2 is not configured; cannot remove build files" });
    }

    const reason = String(req.body?.reason ?? "").trim().slice(0, 500);
    if (!reason) return res.status(400).json({ message: "A reason is required" });

    const build = await loadBuild(buildId);
    if (!build) return res.status(404).json({ message: "Build not found" });

    // Objects first — if this throws, the row still points at them and the
    // takedown can be retried rather than leaving unreferenced bytes behind.
    await deletePrefix(buildRootPrefix(Number(build.userId), buildId));
    await db.execute(sql`
      UPDATE game_builds
      SET status = 'removed', stored_bytes = 0, review_notes = ${reason},
          reviewed_by = ${(req as any).user?.id ?? null}, reviewed_at = now(), updated_at = now()
      WHERE id = ${buildId}
    `);

    await createAndPush({
      userId: Number(build.userId),
      type: "game_build_removed",
      title: "Build removed",
      message: `"${build.label}" was removed from Gamefolio: ${reason}`,
      actionUrl: `/indie-dashboard?tab=builds`,
    }).catch((err) => console.error("[AdminGameBuilds] takedown notification failed:", err));

    res.json({ success: true });
  } catch (error) {
    captureRouteError(error, { route: "admin-game-builds POST /:id/takedown" });
    res.status(500).json({ message: "Failed to take down the build" });
  }
});

export default router;
