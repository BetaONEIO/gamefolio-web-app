import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { adminMiddleware } from "../middleware/admin";

const adminBountiesRouter = Router();

adminBountiesRouter.use(adminMiddleware);

// db.execute() return shape differs by driver — normalize to a plain array.
function rowsOf(result: unknown): any[] {
  return ((result as any).rows ?? result) as any[];
}

// Overview stats across all bounties.
adminBountiesRouter.get("/overview", async (_req: Request, res: Response) => {
  const result = await db.execute(sql`
    SELECT
      COUNT(DISTINCT b.id)::int AS "totalBounties",
      COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'active')::int AS "activeBounties",
      COUNT(DISTINCT a.id)::int AS "totalParticipants",
      COUNT(DISTINCT a.id) FILTER (WHERE a.completed_at IS NOT NULL)::int AS "totalCompletions",
      COUNT(DISTINCT s.id)::int AS "totalSubmissions",
      COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'pending')::int AS "pendingSubmissions"
    FROM game_bounties b
    LEFT JOIN game_bounty_acceptances a ON a.bounty_id = b.id
    LEFT JOIN bounty_submissions s ON s.bounty_id = b.id
  `);
  const row = rowsOf(result)[0];
  res.json({ overview: row ?? {
    totalBounties: 0, activeBounties: 0, totalParticipants: 0,
    totalCompletions: 0, totalSubmissions: 0, pendingSubmissions: 0,
  } });
});

// List all bounties with per-bounty rollups, newest first.
adminBountiesRouter.get("/", async (_req: Request, res: Response) => {
  const rows = await db.execute(sql`
    SELECT
      b.id,
      b.title,
      b.status,
      b.bounty_type AS "bountyType",
      b.reward_type AS "rewardType",
      b.start_date AS "startDate",
      b.end_date AS "endDate",
      b.created_at AS "createdAt",
      g.id AS "gameId",
      g.name AS "gameName",
      g.image_url AS "gameImageUrl",
      COUNT(DISTINCT a.id)::int AS "participantCount",
      COUNT(DISTINCT a.id) FILTER (WHERE a.completed_at IS NOT NULL)::int AS "completedCount",
      COUNT(DISTINCT s.id)::int AS "submissionCount",
      COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'pending')::int AS "pendingSubmissionCount",
      COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'approved')::int AS "approvedSubmissionCount",
      COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'rejected')::int AS "rejectedSubmissionCount"
    FROM game_bounties b
    LEFT JOIN games g ON g.id = b.game_id
    LEFT JOIN game_bounty_acceptances a ON a.bounty_id = b.id
    LEFT JOIN bounty_submissions s ON s.bounty_id = b.id
    GROUP BY b.id, g.id
    ORDER BY b.created_at DESC
  `);
  res.json({ bounties: rowsOf(rows) });
});

// Detail for a single bounty: full record + participants + submissions.
adminBountiesRouter.get("/:bountyId", async (req: Request, res: Response) => {
  const bountyId = parseInt(req.params.bountyId, 10);
  if (!Number.isFinite(bountyId)) {
    return res.status(400).json({ message: "Invalid bounty id" });
  }

  const bountyResult = await db.execute(sql`
    SELECT b.*, g.name AS "gameName", g.image_url AS "gameImageUrl"
    FROM game_bounties b
    LEFT JOIN games g ON g.id = b.game_id
    WHERE b.id = ${bountyId}
  `);
  const bounty = rowsOf(bountyResult)[0];
  if (!bounty) {
    return res.status(404).json({ message: "Bounty not found" });
  }

  const participants = await db.execute(sql`
    SELECT
      a.id, a.status, a.progress_percent AS "progressPercent",
      a.clips_uploaded AS "clipsUploaded", a.reels_uploaded AS "reelsUploaded",
      a.screenshots_uploaded AS "screenshotsUploaded", a.total_views AS "totalViews",
      a.xp_earned AS "xpEarned", a.joined_at AS "joinedAt", a.completed_at AS "completedAt",
      u.id AS "userId", u.username, u.display_name AS "displayName", u.avatar_url AS "avatarUrl"
    FROM game_bounty_acceptances a
    JOIN users u ON u.id = a.user_id
    WHERE a.bounty_id = ${bountyId}
    ORDER BY a.joined_at DESC
  `);

  const submissions = await db.execute(sql`
    SELECT
      s.id, s.content_type AS "contentType", s.content_id AS "contentId",
      s.status, s.rejection_reason AS "rejectionReason",
      s.reviewed_at AS "reviewedAt", s.created_at AS "createdAt",
      u.id AS "userId", u.username, u.display_name AS "displayName", u.avatar_url AS "avatarUrl"
    FROM bounty_submissions s
    JOIN users u ON u.id = s.user_id
    WHERE s.bounty_id = ${bountyId}
    ORDER BY s.created_at DESC
  `);

  res.json({ bounty, participants: rowsOf(participants), submissions: rowsOf(submissions) });
});

export default adminBountiesRouter;
