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

// ─────────────────────────────────────────────
// Legacy indie-developer game bounties (game_bounties / game_bounty_acceptances)
// ─────────────────────────────────────────────

// Overview stats across all legacy bounties.
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

// ─────────────────────────────────────────────
// Campaign marketplace (newer, Gamefolio-managed bounty system)
// Registered before the legacy "/" and "/:bountyId" routes below so
// "/campaigns" and "/campaigns/overview" aren't swallowed by "/:bountyId".
// ─────────────────────────────────────────────

// Overview stats across all campaign marketplace instances.
adminBountiesRouter.get("/campaigns/overview", async (_req: Request, res: Response) => {
  const result = await db.execute(sql`
    SELECT
      COUNT(DISTINCT ci.id)::int AS "totalCampaigns",
      COUNT(DISTINCT ci.id) FILTER (WHERE ci.status = 'active')::int AS "activeCampaigns",
      COUNT(DISTINCT cp.id)::int AS "totalParticipants",
      COUNT(DISTINCT cp.id) FILTER (WHERE cp.completed_at IS NOT NULL)::int AS "totalCompletions"
    FROM campaign_instances ci
    LEFT JOIN campaign_participants cp ON cp.instance_id = ci.id
  `);
  const row = rowsOf(result)[0];
  res.json({ overview: row ?? {
    totalCampaigns: 0, activeCampaigns: 0, totalParticipants: 0, totalCompletions: 0,
  } });
});

// List all campaign instances with participant/completion rollups, newest first.
adminBountiesRouter.get("/campaigns", async (_req: Request, res: Response) => {
  const rows = await db.execute(sql`
    SELECT
      ci.id,
      ci.status,
      ci.gamefolio_managed AS "gamefolioManaged",
      ci.game_name AS "gameName",
      ci.game_artwork_url AS "gameArtworkUrl",
      ci.start_type AS "startType",
      ci.scheduled_start AS "scheduledStart",
      ci.actual_start AS "actualStart",
      ci.end_date AS "endDate",
      ci.created_at AS "createdAt",
      t.id AS "templateId",
      t.name AS "templateName",
      COUNT(DISTINCT cp.id)::int AS "participantCount",
      COUNT(DISTINCT cp.id) FILTER (WHERE cp.completed_at IS NOT NULL)::int AS "completedCount"
    FROM campaign_instances ci
    LEFT JOIN campaign_templates t ON t.id = ci.template_id
    LEFT JOIN campaign_participants cp ON cp.instance_id = ci.id
    GROUP BY ci.id, t.id
    ORDER BY ci.created_at DESC
  `);
  res.json({ campaigns: rowsOf(rows) });
});

// Detail for a single campaign instance: record + template bounties + participants.
adminBountiesRouter.get("/campaigns/:instanceId", async (req: Request, res: Response) => {
  const instanceId = parseInt(req.params.instanceId, 10);
  if (!Number.isFinite(instanceId)) {
    return res.status(400).json({ message: "Invalid campaign instance id" });
  }

  const instanceResult = await db.execute(sql`
    SELECT ci.*, t.name AS "templateName", t.category AS "templateCategory"
    FROM campaign_instances ci
    LEFT JOIN campaign_templates t ON t.id = ci.template_id
    WHERE ci.id = ${instanceId}
  `);
  const campaign = rowsOf(instanceResult)[0];
  if (!campaign) {
    return res.status(404).json({ message: "Campaign instance not found" });
  }

  const bounties = await db.execute(sql`
    SELECT id, title, content_type AS "contentType", mandatory, quantity, xp_reward AS "xpReward"
    FROM campaign_template_bounties
    WHERE template_id = ${campaign.template_id}
    ORDER BY completion_order ASC
  `);

  const participants = await db.execute(sql`
    SELECT
      cp.id, cp.status, cp.xp_earned AS "xpEarned",
      cp.joined_at AS "joinedAt", cp.completed_at AS "completedAt", cp.deadline,
      u.id AS "userId", u.username, u.display_name AS "displayName", u.avatar_url AS "avatarUrl"
    FROM campaign_participants cp
    JOIN users u ON u.id = cp.user_id
    WHERE cp.instance_id = ${instanceId}
    ORDER BY cp.joined_at DESC
  `);

  res.json({ campaign, bounties: rowsOf(bounties), participants: rowsOf(participants) });
});

// ─────────────────────────────────────────────
// Legacy list/detail — registered last since "/:bountyId" is a catch-all
// that would otherwise swallow the "/campaigns" routes above.
// ─────────────────────────────────────────────

// List all legacy bounties with per-bounty rollups, newest first.
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

// Detail for a single legacy bounty: full record + participants + submissions.
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
