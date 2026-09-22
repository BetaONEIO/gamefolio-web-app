import express from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import {
  getXPProfile,
  getTierFromDuration,
  computeCampaignTotalXP,
  computeCompletionBonus,
  computeBountyXP,
  listAllProfiles,
  updateProfile,
  type XPTier,
  type XPProfile,
} from '../bounty-xp-service';
import { getBountyRewardConfig } from '@shared/bounty-rewards';
import { NotificationService } from '../notification-service';
import { decryptCampaignKey } from '../campaign-key-security';
import { canClaimCompletionKey, normalizeCampaignInput } from '@shared/campaign-contract';

const router = express.Router();

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function toRows(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result)) return result as any[];
  if (result.rows && Array.isArray(result.rows)) return result.rows;
  return [];
}

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated?.() || !req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function isIndieDeveloperUser(user: any): boolean {
  const role = String(user?.role ?? '').toLowerCase();
  if (role === 'admin' || role === 'moderator') return false;
  return role === 'indie_developer'
    || String(user?.partner_type ?? user?.partnerType ?? '').toLowerCase() === 'indie'
    || Boolean(user?.is_indie_dev_subscriber ?? user?.isIndieDevSubscriber);
}

function rejectIndieDeveloperParticipation(req: any, res: any): boolean {
  if (!isIndieDeveloperUser(req.user)) return false;
  res.status(403).json({
    error: 'Indie developers can manage their own campaigns, but cannot join or complete campaigns as creators',
  });
  return true;
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated?.() || !req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

async function requireOwnerOrAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated?.() || !req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role === 'admin') return next();
  const [instance] = toRows(await db.execute(sql`
    SELECT developer_user_id FROM campaign_instances WHERE id = ${Number(req.params.instanceId)}
  `)) as any[];
  if (!instance || Number(instance.developer_user_id) !== Number(req.user.id)) {
    return res.status(403).json({ error: 'Campaign owner or admin access required' });
  }
  next();
}

async function requireCampaignSubmissionOwnerOrAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated?.() || !req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role === 'admin') return next();
  const [submission] = toRows(await db.execute(sql`
    SELECT ci.developer_user_id
    FROM campaign_bounty_submissions bs
    JOIN campaign_instances ci ON ci.id = bs.instance_id
    WHERE bs.id = ${Number(req.params.id)}
  `)) as any[];
  if (!submission) return res.status(404).json({ error: 'Submission not found' });
  if (Number(submission.developer_user_id) !== Number(req.user.id)) {
    return res.status(403).json({ error: 'Campaign owner or admin access required' });
  }
  next();
}

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return []; }
  }
  return [];
}

function jsonValue(value: any): any {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
}

/**
 * Campaign instances keep their own objective snapshot. The template bounty
 * rows remain the stable submission targets (and therefore provide ids), but
 * their display fields must come from the instance snapshot when one exists.
 */
function mergeInstanceObjectives(templateBounties: any[], snapshotValue: any): any[] {
  const snapshot = jsonValue(snapshotValue);
  const definitions = Array.isArray(snapshot)
    ? snapshot
    : Array.isArray(snapshot?.objectives) ? snapshot.objectives : [];
  if (definitions.length === 0) return templateBounties;

  return definitions.map((definition: any, index: number) => {
    const contentType = definition.content_type ?? definition.contentType ?? definition.type;
    const order = Number(definition.completion_order ?? definition.completionOrder ?? index);
    const template = templateBounties.find((candidate: any) =>
      Number(candidate.completion_order ?? 0) === order ||
      (contentType && candidate.content_type === contentType && !definitions
        .slice(0, index)
        .some((previous: any) => (previous.content_type ?? previous.contentType ?? previous.type) === candidate.content_type)),
    ) ?? templateBounties[index];
    return {
      ...(template ?? {}),
      ...definition,
      id: template?.id ?? definition.id,
      content_type: contentType ?? template?.content_type,
      completion_order: Number.isFinite(order) ? order : index,
      mandatory: definition.mandatory == null ? template?.mandatory : Boolean(definition.mandatory),
      quantity: definition.quantity == null ? template?.quantity : Number(definition.quantity),
      xp_reward: definition.xp_reward ?? definition.xpReward ?? template?.xp_reward,
    };
  }).filter((objective: any) => objective.content_type || objective.title || objective.id);
}

function objectiveXp(bounties: any[]): number | null {
  const total = bounties.reduce((sum, bounty) =>
    sum + Math.max(Number(bounty.xp_reward ?? 0), 0) * Math.max(Number(bounty.quantity ?? 1), 1), 0);
  return total > 0 ? total : null;
}

function campaignRewardConfig(value: any): Record<string, any> {
  const parsed = jsonValue(value);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

function decorateCampaign(row: any): any {
  const bounties = mergeInstanceObjectives(asArray(row.bounties), row.objective_snapshot);
  const persistedXp = row.instance_bounty_xp_reward == null ? null : Number(row.instance_bounty_xp_reward);
  const completionRewardType = row.completion_reward_type ?? row.completion_reward ?? null;
  const rewardConfig = campaignRewardConfig(row.instance_reward_config ?? row.reward_config);
  const gftAmount = Number(rewardConfig.gft ?? rewardConfig.gftAmount ?? 0);
  return {
    ...row,
    bounties,
    objective_snapshot: jsonValue(row.objective_snapshot),
    description: row.description ?? null,
    template_description: row.template_description ?? null,
    participant_capacity: row.max_places ?? row.participant_capacity ?? null,
    duration_days: row.creator_deadline_days ?? row.duration ?? null,
    access_method: row.access_method ?? null,
    application_period_days: row.application_period_days ?? null,
    completion_reward_type: completionRewardType,
    completion_reward_key_required: row.completion_reward_key_required == null
      ? null : Boolean(row.completion_reward_key_required),
    has_full_game_reward: completionRewardType === 'full_game_key' &&
      row.completion_reward_key_required !== false,
    gft_reward_amount: gftAmount > 0 ? gftAmount : null,
    is_verified: ['approved', 'live'].includes(String(row.status)),
    total_campaign_xp: persistedXp != null ? persistedXp : objectiveXp(bounties),
    completion_bonus_xp: row.instance_completion_bonus_xp == null
      ? null : Number(row.instance_completion_bonus_xp),
  };
}

async function awardDurableCampaignReward(args: {
  instanceId: number;
  participantId: number;
  rewardType: string;
  rewardKey: string;
  amount: number;
  userId: number;
  source: any;
  description: string;
}): Promise<boolean> {
  const { instanceId, participantId, rewardType, rewardKey, amount, userId, source, description } = args;
  const canAttempt = await db.transaction(async (tx) => {
    const [participant] = toRows(await tx.execute(sql`
      SELECT status FROM campaign_participants WHERE id = ${participantId} FOR UPDATE
    `)) as any[];
    if (participant?.status === 'expired') return 'expired';
    await tx.execute(sql`
      INSERT INTO campaign_reward_events
        (instance_id, participant_id, reward_type, reward_key, amount, status)
      VALUES (${instanceId}, ${participantId}, ${rewardType}, ${rewardKey}, ${amount}, 'pending')
      ON CONFLICT (participant_id, reward_type, reward_key) DO NOTHING
    `);
    const [event] = toRows(await tx.execute(sql`
      SELECT status FROM campaign_reward_events
      WHERE participant_id = ${participantId} AND reward_type = ${rewardType} AND reward_key = ${rewardKey}
      FOR UPDATE
    `)) as any[];
    return event?.status === 'awarded' ? 'awarded' : 'attempt';
  });
  if (canAttempt === 'expired') return false;
  if (canAttempt === 'awarded') return true;
  const awarded = await awardCampaignXP(userId, amount, source, description, instanceId, rewardKey);
  const [history] = toRows(await db.execute(sql`
    SELECT 1 FROM user_xp_history WHERE dedupe_key = ${rewardKey} LIMIT 1
  `)) as any[];
  if (awarded || history) {
    await db.execute(sql`
      UPDATE campaign_reward_events
      SET status = 'awarded', last_error = NULL, updated_at = NOW()
      WHERE participant_id = ${participantId} AND reward_type = ${rewardType} AND reward_key = ${rewardKey}
    `);
    return Boolean(awarded);
  }
  await db.execute(sql`
    UPDATE campaign_reward_events
    SET status = 'pending', last_error = 'XP ledger write failed', updated_at = NOW()
    WHERE participant_id = ${participantId} AND reward_type = ${rewardType} AND reward_key = ${rewardKey}
  `);
  throw new Error('Campaign reward remains pending and is safe to retry');
}

/** Mark overdue participations once and return unclaimed reward inventory. */
export async function expireOverdueCampaignParticipants(): Promise<number> {
  return db.transaction(async (tx) => {
    const expired = toRows(await tx.execute(sql`
      UPDATE campaign_participants
      SET status = 'expired', expired_at = NOW()
      WHERE COALESCE(completion_deadline, deadline) < NOW()
        AND status NOT IN ('completed', 'completed_and_verified', 'full_game_awarded', 'expired', 'cancelled')
      RETURNING id, instance_id, user_id, access_key_id, completion_reward_key_id
    `)) as any[];
    for (const row of expired) {
      if (row.completion_reward_key_id) {
        await tx.execute(sql`
          UPDATE game_keys
          SET status = 'available', assigned_user_id = NULL, assigned_at = NULL
          WHERE id = ${row.completion_reward_key_id} AND status IN ('reserved', 'assigned')
        `);
      }
      if (row.access_key_id && row.access_key_id !== row.completion_reward_key_id) {
        await tx.execute(sql`
          UPDATE game_keys
          SET status = 'available', assigned_user_id = NULL, assigned_at = NULL
          WHERE id = ${row.access_key_id} AND status = 'reserved'
        `);
      }
    }
    return expired.length;
  });
}

function objectiveProgress(objectives: any[], mandatory: boolean) {
  // All objectives are required for the current campaign contract. The
  // mandatory argument remains for callers that still use the old shape.
  void mandatory;
  const selected = objectives;
  const total = selected.reduce((sum, objective) => sum + Math.max(Number(objective.quantity ?? 1), 1), 0);
  const submitted = selected.reduce((sum, objective) => sum + Math.min(Number(objective.submitted_count ?? 0), Math.max(Number(objective.quantity ?? 1), 1)), 0);
  const approved = selected.reduce((sum, objective) => sum + Math.min(Number(objective.approved_count ?? 0), Math.max(Number(objective.quantity ?? 1), 1)), 0);
  return { total_units: total, submitted_units: submitted, approved_units: approved, remaining_units: Math.max(total - approved, 0), percent_complete: total ? Math.round((approved / total) * 100) : 100 };
}

function campaignJourney(participant: any, objectives: any[]) {
  const required = objectiveProgress(objectives, true);
  const bonus = { total_units: 0, submitted_units: 0, approved_units: 0, remaining_units: 0, percent_complete: 100 };
  const now = Date.now();
  const deadline = participant.deadline ? new Date(participant.deadline).getTime() : NaN;
  const isExpired = Number.isFinite(deadline) && deadline < now && !['completed', 'completed_and_verified', 'full_game_awarded'].includes(participant.participant_status);
  const next = objectives.find((objective) => Number(objective.approved_count ?? 0) < Math.max(Number(objective.quantity ?? 1), 1));
  const hasChangesRequested = objectives.some((objective) => Number(objective.changes_requested_count ?? 0) > 0);
  const hasAwaitingReview = objectives.some((objective) => Number(objective.pending_count ?? 0) + Number(objective.under_review_count ?? 0) > 0);
  const journey_status = isExpired ? 'expired'
    : ['completed', 'completed_and_verified', 'full_game_awarded'].includes(participant.participant_status) ? 'completed'
    : hasChangesRequested ? 'changes_requested'
    : required.submitted_units >= required.total_units && hasAwaitingReview ? 'under_review'
    : 'active';
  return {
    required_progress: required,
    bonus_progress: bonus,
    required_objective_units: required.total_units,
    submitted_objective_units: required.submitted_units,
    approved_objective_units: required.approved_units,
    bonus_objective_units: bonus.total_units,
    submitted_bonus_units: bonus.submitted_units,
    approved_bonus_units: bonus.approved_units,
    next_objective: next ? {
      id: next.id, title: next.title, description: next.description, content_type: next.content_type,
      quantity: Math.max(Number(next.quantity ?? 1), 1),
      submitted_units: Math.min(Number(next.submitted_count ?? 0), Math.max(Number(next.quantity ?? 1), 1)),
      approved_units: Math.min(Number(next.approved_count ?? 0), Math.max(Number(next.quantity ?? 1), 1)),
      remaining_units: Math.max(Math.max(Number(next.quantity ?? 1), 1) - Number(next.approved_count ?? 0), 0),
      xp_reward: next.xp_reward,
    } : null,
    next_objective_title: next?.title ?? null,
    journey_status,
    is_expired: isExpired,
  };
}

// ─────────────────────────────────────────────
// TABLE SETUP
// ─────────────────────────────────────────────

export async function ensureBountyMarketplaceTables() {
  // Use raw pg pool for DDL — drizzle's sql template can silently drop ALTER errors
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const run = (q: string) => pool.query(q).catch((e: any) => {
    if (!e.message?.includes('already exists') && !e.message?.includes('does not exist')) {
      console.warn('Migration warning:', e.message);
    }
  });

  try {
    await run(`ALTER TABLE campaign_instances ALTER COLUMN developer_user_id DROP NOT NULL`);
    await run(`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS gamefolio_managed BOOLEAN DEFAULT false`);
    await run(`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS game_id INTEGER`);
    await run(`ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS gamefolio_managed BOOLEAN DEFAULT false`);
    await run(`ALTER TABLE campaign_template_bounties ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 500`);
    await run(`ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS bounty_xp_reward INTEGER DEFAULT 0`);
    await run(`ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS completion_bonus_xp INTEGER DEFAULT 0`);
    await run(`ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS reward_config JSONB`);
    await run(`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS bounty_xp_reward INTEGER`);
    await run(`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS completion_bonus_xp INTEGER`);
    await run(`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS reward_config JSONB`);
    await run(`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS deadline TIMESTAMP`);
    await run(`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS notes TEXT`);
    await run(`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS access_key_id INTEGER`);
    await run(`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS access_accepted_at TIMESTAMP`);
    await run(`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS access_revealed_at TIMESTAMP`);
    await run(`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS completion_deadline TIMESTAMP`);
    await run(`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS extension_requested_at TIMESTAMP`);
    await run(`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS extension_hours INTEGER`);
    await run(`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS extension_status TEXT`);
    await run(`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS completion_bonus_awarded BOOLEAN DEFAULT false`);
    await run(`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS completion_reward_key_id INTEGER`);
    await run(`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP`);
    await run(`
      CREATE TABLE IF NOT EXISTS campaign_bounty_submissions (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER NOT NULL REFERENCES campaign_instances(id) ON DELETE CASCADE,
        participant_id INTEGER NOT NULL,
        bounty_id INTEGER NOT NULL REFERENCES campaign_template_bounties(id),
        content_type TEXT NOT NULL,
        clip_id INTEGER,
        screenshot_id INTEGER,
        reel_id INTEGER,
        content_url TEXT,
        content_data JSONB,
        status TEXT DEFAULT 'pending',
        review_notes TEXT,
        submitted_at TIMESTAMP DEFAULT NOW(),
        reviewed_at TIMESTAMP,
        xp_awarded INTEGER DEFAULT 0
      )
    `);
    await run(`ALTER TABLE campaign_bounty_submissions ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0`);
    await run(`ALTER TABLE campaign_bounty_submissions ADD COLUMN IF NOT EXISTS creator_id INTEGER`);
    await run(`ALTER TABLE campaign_bounty_submissions ADD COLUMN IF NOT EXISTS participation_id INTEGER`);
    await run(`ALTER TABLE campaign_bounty_submissions ADD COLUMN IF NOT EXISTS game_id INTEGER`);
    await run(`ALTER TABLE campaign_bounty_submissions ADD COLUMN IF NOT EXISTS objective_id INTEGER`);
    await run(`ALTER TABLE campaign_bounty_submissions ADD COLUMN IF NOT EXISTS content_id INTEGER`);
    await run(`ALTER TABLE campaign_bounty_submissions ADD COLUMN IF NOT EXISTS submission_type TEXT`);
    await run(`ALTER TABLE campaign_bounty_submissions ADD COLUMN IF NOT EXISTS validation_state TEXT DEFAULT 'submitted'`);
    await run(`ALTER TABLE campaign_bounty_submissions ADD COLUMN IF NOT EXISTS objective_state TEXT DEFAULT 'submitted'`);
    await run(`ALTER TABLE campaign_bounty_submissions ADD COLUMN IF NOT EXISTS validation_details JSONB`);
    await run(`ALTER TABLE campaign_bounty_submissions ADD COLUMN IF NOT EXISTS reviewed_by_user_id INTEGER`);
    await run(`ALTER TABLE campaign_bounty_submissions ADD COLUMN IF NOT EXISTS supersedes_submission_id INTEGER`);
      await run(`ALTER TABLE campaign_bounty_submissions ADD COLUMN IF NOT EXISTS slot_index INTEGER`);
    await run(`CREATE TABLE IF NOT EXISTS campaign_bounty_submission_reviews (
      id SERIAL PRIMARY KEY,
      submission_id INTEGER NOT NULL REFERENCES campaign_bounty_submissions(id) ON DELETE CASCADE,
      reviewer_user_id INTEGER,
      verdict TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
    await run(`CREATE TABLE IF NOT EXISTS campaign_reward_events (
      id SERIAL PRIMARY KEY, instance_id INTEGER NOT NULL, participant_id INTEGER NOT NULL,
      reward_type TEXT NOT NULL, reward_key TEXT NOT NULL, amount INTEGER, key_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending', last_error TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(), UNIQUE (participant_id, reward_type, reward_key)
    )`);
    await run(`ALTER TABLE campaign_reward_events ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'`);
    await run(`ALTER TABLE campaign_reward_events ADD COLUMN IF NOT EXISTS last_error TEXT`);
    await run(`ALTER TABLE campaign_reward_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()`);
    await run(`CREATE UNIQUE INDEX IF NOT EXISTS user_xp_history_dedupe_key_unique ON user_xp_history (dedupe_key) WHERE dedupe_key IS NOT NULL`);

    // Seed Gamefolio-managed campaigns if none exist
    const { rows: existing } = await pool.query(
      `SELECT id FROM campaign_instances WHERE gamefolio_managed = true LIMIT 1`
    );
    if (existing.length === 0) {
      await seedGamefolioCampaignsWithPool(pool);
    } else {
      console.log(`✅ Gamefolio bounty campaigns already seeded (${existing[0].id})`);
    }
  } finally {
    await pool.end();
  }
}

// ─────────────────────────────────────────────
// GAMEFOLIO-MANAGED CAMPAIGN SEED DATA
// ─────────────────────────────────────────────

const GF_CAMPAIGNS = [
  {
    template: {
      name: 'Content Creator Sprint',
      slug: 'gf-content-creator-sprint',
      category: 'content',
      description: 'Upload gameplay clips and screenshots to your Gamefolio profile. Show the community what you\'re playing and build your gaming portfolio.',
      best_use_case: 'Great for anyone who wants to start building a gaming presence on Gamefolio.',
      duration: 30,
      participant_capacity: 9999,
      demo_keys_required: 0,
      full_keys_required: 0,
      completion_reward: 'xp_badge',
      completion_reward_description: '1,500 XP + Creator Starter badge on your profile',
      estimated_clips: 3,
      estimated_screenshots: 5,
      estimated_feedback: 0,
      featured: true,
      recommended: true,
    },
    bounties: [
      { title: 'Upload 3 Gameplay Clips', description: 'Record and upload at least 3 gameplay clips to your Gamefolio profile.', mandatory: true, quantity: 3, content_type: 'clip', xp_reward: 300, completion_order: 1 },
      { title: 'Upload 5 Screenshots', description: 'Capture and upload at least 5 screenshots from any game.', mandatory: true, quantity: 5, content_type: 'screenshot', xp_reward: 200, completion_order: 2 },
      { title: 'Create a Highlight Reel', description: 'Edit your best moments into a highlight reel and share it.', mandatory: false, quantity: 1, content_type: 'reel', xp_reward: 1000, completion_order: 3 },
    ],
    instance: {
      game_name: 'Gamefolio Platform',
      game_artwork_url: null,
    },
  },
  {
    template: {
      name: 'Streamer Spotlight',
      slug: 'gf-streamer-spotlight',
      category: 'community',
      description: 'Support the Gamefolio streaming community. Follow streamers, engage with their content, and help grow the platform.',
      best_use_case: 'Perfect for gamers who love watching and supporting live streams.',
      duration: 30,
      participant_capacity: 9999,
      demo_keys_required: 0,
      full_keys_required: 0,
      completion_reward: 'xp_badge',
      completion_reward_description: '800 XP + Community badge on your profile',
      estimated_clips: 0,
      estimated_screenshots: 0,
      estimated_feedback: 1,
      featured: true,
      recommended: true,
    },
    bounties: [
      { title: 'Follow 3 Streamers', description: 'Discover and follow at least 3 streamers on Gamefolio. Paste their profile URLs below.', mandatory: true, quantity: 3, content_type: 'feedback', xp_reward: 150, completion_order: 1 },
      { title: 'Clip a Stream Moment', description: 'Upload a clip from a stream you watched and enjoyed.', mandatory: true, quantity: 1, content_type: 'clip', xp_reward: 300, completion_order: 2 },
      { title: 'Share a Streamer\'s Content', description: 'Share a clip or screenshot from a Gamefolio streamer to your profile.', mandatory: false, quantity: 1, content_type: 'screenshot', xp_reward: 350, completion_order: 3 },
    ],
    instance: {
      game_name: 'Gamefolio Platform',
      game_artwork_url: null,
    },
  },
  {
    template: {
      name: 'Game Reviewer',
      slug: 'gf-game-reviewer',
      category: 'feedback',
      description: 'Share your honest thoughts on games you\'ve played. Your reviews help other gamers discover great titles and help developers improve.',
      best_use_case: 'For experienced gamers who want to share their knowledge with the community.',
      duration: 30,
      participant_capacity: 9999,
      demo_keys_required: 0,
      full_keys_required: 0,
      completion_reward: 'xp_badge',
      completion_reward_description: '1,000 XP + Reviewer badge on your profile',
      estimated_clips: 1,
      estimated_screenshots: 2,
      estimated_feedback: 2,
      featured: false,
      recommended: true,
    },
    bounties: [
      { title: 'Write 2 Game Reviews', description: 'Write a review for 2 different games you\'ve played. Include a screenshot and your honest rating. Paste your Gamefolio profile review links.', mandatory: true, quantity: 2, content_type: 'feedback', xp_reward: 400, completion_order: 1 },
      { title: 'Upload Review Screenshots', description: 'Include at least 2 screenshots with your reviews to illustrate your points.', mandatory: true, quantity: 2, content_type: 'screenshot', xp_reward: 200, completion_order: 2 },
      { title: 'Record a Video Review', description: 'Go the extra mile — record a video review or analysis clip.', mandatory: false, quantity: 1, content_type: 'clip', xp_reward: 400, completion_order: 3 },
    ],
    instance: {
      game_name: 'Gamefolio Platform',
      game_artwork_url: null,
    },
  },
  {
    template: {
      name: 'Indie Discovery',
      slug: 'gf-indie-discovery',
      category: 'discovery',
      description: 'Explore the world of indie games. Play something new, capture your experience, and share it with the Gamefolio community.',
      best_use_case: 'For adventurous gamers looking to explore beyond the mainstream.',
      duration: 30,
      participant_capacity: 9999,
      demo_keys_required: 0,
      full_keys_required: 0,
      completion_reward: 'xp_badge',
      completion_reward_description: '1,200 XP + Indie Explorer badge on your profile',
      estimated_clips: 2,
      estimated_screenshots: 3,
      estimated_feedback: 1,
      featured: false,
      recommended: false,
    },
    bounties: [
      { title: 'Play an Indie Game', description: 'Pick any indie game and play it. Upload your first session clip as proof.', mandatory: true, quantity: 1, content_type: 'clip', xp_reward: 300, completion_order: 1 },
      { title: 'Capture Indie Screenshots', description: 'Share 3 screenshots from the indie game you played.', mandatory: true, quantity: 3, content_type: 'screenshot', xp_reward: 300, completion_order: 2 },
      { title: 'Submit Feedback to the Developer', description: 'Leave a review or feedback for the indie developer. Paste the link or write your thoughts below.', mandatory: true, quantity: 1, content_type: 'feedback', xp_reward: 400, completion_order: 3 },
      { title: 'Create a Full Gameplay Reel', description: 'Edit your indie game footage into a highlight reel.', mandatory: false, quantity: 1, content_type: 'reel', xp_reward: 200, completion_order: 4 },
    ],
    instance: {
      game_name: 'Gamefolio Platform',
      game_artwork_url: null,
    },
  },
];

async function seedGamefolioCampaignsWithPool(pool: Pool) {
  for (const camp of GF_CAMPAIGNS) {
    const { template: t, bounties, instance: inst } = camp;

    const { rows: [template] } = await pool.query(`
      INSERT INTO campaign_templates
        (name, slug, category, description, best_use_case, duration,
         participant_capacity, demo_keys_required, full_keys_required,
         completion_reward, completion_reward_description,
         estimated_clips, estimated_screenshots, estimated_feedback,
         featured, recommended, status, gamefolio_managed)
      VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,$8,$9,$10,$11,0,$12,$13,'available',true)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [t.name, t.slug, t.category, t.description, t.best_use_case, t.duration,
        t.participant_capacity, t.completion_reward, t.completion_reward_description,
        t.estimated_clips, t.estimated_screenshots, t.featured, t.recommended]);

    const templateId = template.id;

    for (const b of bounties) {
      await pool.query(`
        INSERT INTO campaign_template_bounties
          (template_id, title, description, mandatory, quantity, content_type, xp_reward, completion_order)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [templateId, b.title, b.description, b.mandatory, b.quantity, b.content_type, b.xp_reward, b.completion_order]);
    }

    await pool.query(`
      INSERT INTO campaign_instances
        (template_id, developer_user_id, game_name, game_artwork_url,
         status, actual_start, gamefolio_managed, start_type)
      VALUES ($1, NULL, $2, $3, 'live', NOW(), true, 'asap')
    `, [templateId, inst.game_name, inst.game_artwork_url]);

    console.log(`  ✓ Seeded: ${t.name}`);
  }
  console.log('✅ Gamefolio-managed bounty campaigns seeded');
}

// ─────────────────────────────────────────────
// MARKETPLACE — PUBLIC
// ─────────────────────────────────────────────

// GET /api/bounties — list live/approved campaigns for participants
router.get('/', async (req, res) => {
  try {
    const { filter, genre, platform } = req.query;
    const viewerUserId = req.user?.id ?? null;

    let statusCondition = sql`ci.status IN ('live', 'approved')`;

    const campaigns = await db.execute(sql`
      SELECT
        ci.id,
        ci.status,
        ci.game_id,
        ci.game_name,
        ci.campaign_title,
        ci.game_artwork_url,
        ci.artwork_url AS campaign_artwork_url,
        ci.game_steam_app_id,
        ci.game_itch_url,
        ci.game_epic_slug,
        ci.artwork_url,
        ci.actual_start,
        ci.end_date,
        ci.created_at,
        ci.developer_user_id,
        ci.description,
        ci.regions,
        ci.platforms,
        ci.access_method,
        ci.application_period_days,
        ci.creator_deadline_days,
        ci.max_places,
        ci.completion_reward_type,
        ci.completion_reward_key_required,
        ci.requires_access_key,
        ci.objective_snapshot,
        ci.reward_config AS instance_reward_config,
        ci.reward_pool_contribution_pence,
        t.name AS template_name,
        t.slug AS template_slug,
        t.description AS template_description,
        t.category,
        t.duration,
        t.participant_capacity,
        t.demo_keys_required,
        t.full_keys_required,
        t.completion_reward,
        t.completion_reward_description,
        t.estimated_clips,
        t.estimated_screenshots,
        t.estimated_feedback,
        t.estimated_views_min,
        t.estimated_views_max,
         t.bounty_xp_reward,
         t.completion_bonus_xp,
         ci.bounty_xp_reward AS instance_bounty_xp_reward,
         ci.completion_bonus_xp AS instance_completion_bonus_xp,
        t.featured,
        t.recommended,
        COALESCE(t.xp_tier, 'standard') AS xp_tier,
        COALESCE(ci.xp_event_multiplier, 1.0) AS xp_event_multiplier,
        COALESCE(ci.gamefolio_managed, false) AS gamefolio_managed,
         g.name AS catalog_game_name,
        g.image_url AS catalog_game_artwork_url,
        igp.header_image_url AS game_profile_header_artwork_url,
        igp.capsule_image_url AS game_profile_capsule_artwork_url,
        igp.screenshot_urls[1] AS game_profile_screenshot_artwork_url,
         igp.game_name AS game_profile_name,
         igp.studio_name AS game_profile_studio_name,
         igp.short_description AS game_profile_short_description,
         igp.full_description AS game_profile_full_description,
         igp.genres AS game_profile_genres,
         igp.platforms AS game_profile_platforms,
        COALESCE(
          NULLIF(igp.header_image_url, ''),
          NULLIF(g.image_url, ''),
          NULLIF(igp.capsule_image_url, ''),
          NULLIF(igp.screenshot_urls[1], ''),
          NULLIF(ci.game_artwork_url, ''),
          NULLIF(ci.artwork_url, '')
        ) AS hero_artwork_url,
        (SELECT COUNT(*) FROM campaign_participants cp WHERE cp.instance_id = ci.id) AS participant_count,
        (SELECT cp.status FROM campaign_participants cp
         WHERE cp.instance_id = ci.id AND cp.user_id = ${viewerUserId}
         LIMIT 1) AS participant_status,
        EXISTS(
          SELECT 1 FROM campaign_participants cp
          WHERE cp.instance_id = ci.id AND cp.user_id = ${viewerUserId}
        ) AS is_joined,
         (SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'demo'
           AND gk.key_pool = 'access' AND gk.status = 'available') AS demo_keys_remaining,
        (SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'full'
           AND gk.key_pool = 'reward' AND gk.status = 'available') AS full_keys_remaining,
        (SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'demo'
          AND gk.key_pool = 'access') AS demo_key_total,
        (SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'full'
          AND gk.key_pool = 'reward') AS full_key_total,
        (SELECT json_agg(b ORDER BY b.completion_order) FROM campaign_template_bounties b WHERE b.template_id = t.id) AS bounties
      FROM campaign_instances ci
      JOIN campaign_templates t ON t.id = ci.template_id
      LEFT JOIN games g ON g.id = ci.game_id
      LEFT JOIN indie_game_profiles igp ON igp.catalog_game_id = g.id AND igp.is_primary = true
      WHERE ${statusCondition}
        AND t.status != 'inactive'
      ORDER BY COALESCE(ci.gamefolio_managed, false) DESC, t.recommended DESC, t.featured DESC, ci.actual_start DESC
    `);

    let rows = toRows(campaigns);

    // Attach computed XP to each campaign
    rows = rows.map((r: any) => decorateCampaign(r));

    // Apply client-side filters
    if (filter === 'recommended') rows = rows.filter((r: any) => r.recommended);
    if (filter === 'demo_available') rows = rows.filter((r: any) => Number(r.demo_keys_remaining) > 0);
    if (filter === 'full_game') rows = rows.filter((r: any) => r.has_full_game_reward);

    res.json(rows);
  } catch (err) {
    console.error('GET /api/bounties error:', err);
    res.status(500).json({ error: 'Failed to load bounties' });
  }
});

// GET /api/bounties/:instanceId — campaign detail
router.get('/:instanceId', async (req, res) => {
  try {
    const instanceId = Number(req.params.instanceId);
    const [campaign] = toRows(await db.execute(sql`
      SELECT
        ci.*,
        t.name AS template_name,
        t.slug AS template_slug,
        ci.description AS description,
        t.description AS template_description,
        t.best_use_case,
        t.category,
        t.duration,
        t.participant_capacity,
        t.demo_keys_required,
        t.full_keys_required,
        t.completion_reward,
        t.completion_reward_description,
        t.estimated_clips,
        t.estimated_screenshots,
        t.estimated_feedback,
        t.estimated_views_min,
        t.estimated_views_max,
         t.bounty_xp_reward,
         t.completion_bonus_xp,
         ci.bounty_xp_reward AS instance_bounty_xp_reward,
         ci.completion_bonus_xp AS instance_completion_bonus_xp,
        ci.reward_config AS instance_reward_config,
        t.featured,
        t.recommended,
        COALESCE(t.xp_tier, 'standard') AS xp_tier,
        COALESCE(ci.xp_event_multiplier, 1.0) AS xp_event_multiplier,
        COALESCE(ci.gamefolio_managed, false) AS gamefolio_managed,
        (SELECT COUNT(*) FROM campaign_participants cp WHERE cp.instance_id = ci.id) AS participant_count,
         (SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'demo'
           AND gk.key_pool = 'access' AND gk.status = 'available') AS demo_keys_remaining,
         (SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'full'
           AND gk.key_pool = 'reward' AND gk.status = 'available') AS full_keys_remaining,
         (SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'demo'
           AND gk.key_pool = 'access') AS demo_key_total,
         (SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'full'
           AND gk.key_pool = 'reward') AS full_key_total,
        (SELECT json_agg(b ORDER BY b.completion_order) FROM campaign_template_bounties b WHERE b.template_id = t.id) AS bounties
      FROM campaign_instances ci
      JOIN campaign_templates t ON t.id = ci.template_id
      WHERE ci.id = ${instanceId}
        AND ci.status IN ('live', 'approved')
    `));

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    res.json(decorateCampaign(campaign));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load campaign' });
  }
});

// ─────────────────────────────────────────────
// JOIN FLOW — AUTHENTICATED
// ─────────────────────────────────────────────

// POST /api/bounties/:instanceId/join
router.post('/:instanceId/join', requireAuth, async (req, res) => {
  try {
    if (rejectIndieDeveloperParticipation(req, res)) return;
    await expireOverdueCampaignParticipants();
    const userId = req.user!.id;
    const instanceId = Number(req.params.instanceId);

    // 1. Load campaign
    const [campaign] = toRows(await db.execute(sql`
      SELECT ci.*, t.participant_capacity, t.demo_keys_required, t.full_keys_required,
        t.duration, COALESCE(ci.access_method, t.access_method, 'demo_to_full') AS access_method,
        COALESCE(ci.creator_deadline_days, t.completion_deadline_days, t.duration, 14) AS creator_deadline_days,
        t.objective_config AS template_objective_config
      FROM campaign_instances ci
      JOIN campaign_templates t ON t.id = ci.template_id
      WHERE ci.id = ${instanceId} AND ci.status IN ('live', 'approved')
    `)) as any[];

    if (!campaign) return res.status(404).json({ error: 'Campaign not found or not active' });
    const [owner] = toRows(await db.execute(sql`
      SELECT role, partner_type, is_indie_dev_subscriber, status
      FROM users WHERE id = ${campaign.developer_user_id}
    `)) as any[];
    if (!owner || owner.status !== 'active') {
      return res.status(409).json({ error: 'Campaign creator account is not active' });
    }
    const ownerEligible = ['developer', 'indie_developer', 'admin', 'moderator'].includes(String(owner.role))
      || String(owner.partner_type ?? '') === 'indie' || Boolean(owner.is_indie_dev_subscriber);
    if (!ownerEligible) return res.status(409).json({ error: 'Campaign creator is no longer eligible' });
    const selectedPlatforms = Array.isArray(campaign.platforms)
      ? campaign.platforms : campaign.platforms ? [String(campaign.platforms)] : [];
    if (req.body?.platform && selectedPlatforms.length > 0 &&
        !selectedPlatforms.includes(String(req.body.platform))) {
      return res.status(400).json({ error: 'Selected platform is not allowed for this campaign' });
    }
    const selectedRegions = Array.isArray(campaign.regions)
      ? campaign.regions : campaign.regions ? [String(campaign.regions)] : [];
    if (req.body?.region && selectedRegions.length > 0 &&
        !selectedRegions.includes('worldwide') && !selectedRegions.includes(String(req.body.region))) {
      return res.status(400).json({ error: 'Selected region is not allowed for this campaign' });
    }
    const participantProfile = toRows(await db.execute(sql`
      SELECT twitch_verified, youtube_verified, kick_verified, rumble_verified,
        stream_platform FROM users WHERE id = ${userId}
    `))[0] as any;
    const objectiveConfigRaw = campaign.objective_snapshot ?? campaign.template_objective_config ?? {};
    const objectiveConfig = typeof objectiveConfigRaw === 'string'
      ? (() => { try { return JSON.parse(objectiveConfigRaw); } catch { return {}; } })()
      : objectiveConfigRaw;
    if (Number(objectiveConfig.stream ?? 0) > 0 &&
        !participantProfile?.twitch_verified && !participantProfile?.youtube_verified &&
        !participantProfile?.kick_verified && !participantProfile?.rumble_verified) {
      return res.status(400).json({ error: 'This campaign requires a verified streaming channel before joining' });
    }

    // 2. Check already joined
    const [existing] = toRows(await db.execute(sql`
      SELECT id, status, deadline, joined_at FROM campaign_participants WHERE instance_id = ${instanceId} AND user_id = ${userId}
    `));
    if (existing) return res.status(409).json({
      error: 'You have already joined this campaign',
      status: (existing as any).status,
      participantId: (existing as any).id,
      deadline: (existing as any).deadline,
      joinedAt: (existing as any).joined_at,
    });
    if (campaign.manual_approval_required) {
      const [application] = toRows(await db.execute(sql`
        SELECT status FROM campaign_applications
        WHERE instance_id = ${instanceId} AND user_id = ${userId}
      `)) as any[];
      if (!application) {
        await db.execute(sql`
          INSERT INTO campaign_applications (instance_id, user_id, status)
          VALUES (${instanceId}, ${userId}, 'pending')
          ON CONFLICT (instance_id, user_id) DO NOTHING
        `);
        return res.status(202).json({ success: true, applicationStatus: 'pending', message: 'Application submitted for creator review' });
      }
      if (application.status !== 'approved') {
        return res.status(application.status === 'rejected' ? 403 : 202).json({
          success: false, applicationStatus: application.status,
          error: application.status === 'rejected' ? 'Application was rejected' : 'Application is awaiting creator approval',
        });
      }
    }

    if (campaign.end_date && new Date(campaign.end_date).getTime() <= Date.now()) {
      return res.status(409).json({ error: 'This campaign has expired' });
    }

    const accessMethod = normalizeCampaignInput({ accessMethod: campaign.access_method }).accessMethod ?? 'demo_to_full';
    const accessKeyType = accessMethod === 'full_game_upfront' ? 'full' : 'demo';
    const requiresAccessKey = accessMethod === 'custom_access'
      ? campaign.requires_access_key !== false
      : ['demo_to_full', 'full_game_upfront', 'private_playtest'].includes(accessMethod);
    const reservation = await db.transaction(async (tx) => {
      const [lockedCampaign] = toRows(await tx.execute(sql`
        SELECT max_places, participant_capacity, end_date, status
        FROM campaign_instances ci JOIN campaign_templates t ON t.id = ci.template_id
        WHERE ci.id = ${instanceId} FOR UPDATE
      `)) as any[];
      if (!lockedCampaign || !['live', 'approved'].includes(lockedCampaign.status)) {
        throw Object.assign(new Error('Campaign is no longer active'), { statusCode: 409 });
      }
      if (lockedCampaign.end_date && new Date(lockedCampaign.end_date).getTime() <= Date.now()) {
        throw Object.assign(new Error('This campaign has expired'), { statusCode: 409 });
      }
      const [counts] = toRows(await tx.execute(sql`
        SELECT COUNT(*) AS participant_count,
          (SELECT COUNT(*) FROM game_keys WHERE instance_id = ${instanceId}
            AND key_type = ${accessKeyType} AND key_pool = 'access' AND status = 'available') AS access_keys_available
          ,(SELECT COUNT(*) FROM game_keys WHERE instance_id = ${instanceId}
            AND key_type = 'full' AND key_pool = 'reward' AND status = 'available') AS reward_keys_available
          ,(SELECT COUNT(*) FROM campaign_participants WHERE instance_id = ${instanceId}
            AND completion_reward_key_id IS NOT NULL
            AND status NOT IN ('expired', 'cancelled')) AS rewards_assigned
        FROM campaign_participants
        WHERE instance_id = ${instanceId} AND status NOT IN ('expired', 'cancelled')
      `)) as any[];
      const configuredCapacity = Number(lockedCampaign.max_places ?? lockedCampaign.participant_capacity ?? 0);
      if (configuredCapacity > 0 && Number(counts?.participant_count ?? 0) >= configuredCapacity) {
        throw Object.assign(new Error('This campaign is full'), { statusCode: 409 });
      }
      const rewardRequired = campaign.completion_reward_key_required !== false;
      const rewardCapacity = Number(counts?.reward_keys_available ?? 0) + Number(counts?.rewards_assigned ?? 0);
      if (rewardRequired && Number(counts?.participant_count ?? 0) >= rewardCapacity) {
        throw Object.assign(new Error('No completion reward capacity remains for this campaign'), { statusCode: 409 });
      }
      if (!requiresAccessKey && configuredCapacity <= 0) {
        throw Object.assign(new Error('This campaign has no configured campaign places'), { statusCode: 409 });
      }
      let demoKeyId: number | null = null;
      let completionRewardKeyId: number | null = null;
      if (requiresAccessKey) {
        const [key] = toRows(await tx.execute(sql`
          UPDATE game_keys SET status = 'reserved', assigned_user_id = ${userId}, assigned_at = NOW()
          WHERE id = (
            SELECT id FROM game_keys
            WHERE instance_id = ${instanceId} AND key_type = ${accessKeyType}
              AND key_pool = 'access' AND status = 'available'
            ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED
          ) RETURNING id, status
        `)) as any[];
        if (!key) throw Object.assign(new Error('No compatible access keys available for this campaign'), { statusCode: 409 });
        demoKeyId = key.id;
      }
      if (rewardRequired) {
        const [rewardKey] = toRows(await tx.execute(sql`
          UPDATE game_keys
          SET status = 'reserved', assigned_user_id = ${userId}, assigned_at = NOW()
          WHERE id = (
            SELECT id FROM game_keys
            WHERE instance_id = ${instanceId} AND key_type = 'full'
              AND key_pool = 'reward' AND status = 'available'
            ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED
          ) RETURNING id
        `)) as any[];
        if (!rewardKey) throw Object.assign(new Error('No completion reward key available'), { statusCode: 409 });
        completionRewardKeyId = rewardKey.id;
      }
      const keylessDeadline = !requiresAccessKey
        ? new Date(Date.now() + Number(campaign.creator_deadline_days ?? 14) * 24 * 60 * 60 * 1000)
        : null;
      const [participant] = toRows(await tx.execute(sql`
        INSERT INTO campaign_participants
          (instance_id, user_id, status, demo_key_id, access_key_id, completion_reward_key_id, joined_at,
           deadline, completion_deadline, access_accepted_at, access_revealed_at)
        VALUES (${instanceId}, ${userId}, ${requiresAccessKey ? 'access_reserved' : 'access_accepted'},
          ${demoKeyId}, ${demoKeyId}, ${completionRewardKeyId}, NOW(), ${keylessDeadline?.toISOString() ?? null},
          ${keylessDeadline?.toISOString() ?? null},
          ${keylessDeadline ? keylessDeadline.toISOString() : null},
          ${keylessDeadline ? keylessDeadline.toISOString() : null}) RETURNING id
      `)) as any[];
      if (demoKeyId && participant?.id) {
        await tx.execute(sql`
        INSERT INTO campaign_key_events
          (key_id, instance_id, participant_id, actor_user_id, event_type,
           from_status, to_status, metadata)
        VALUES (${demoKeyId}, ${instanceId}, ${participant.id}, ${userId},
          'reserved', 'available', 'reserved', '{"plaintext":"not_stored"}'::jsonb)
        `);
      }
      if (completionRewardKeyId && participant?.id) {
        await tx.execute(sql`
          INSERT INTO campaign_key_events
            (key_id, instance_id, participant_id, actor_user_id, event_type,
             from_status, to_status, metadata)
          VALUES (${completionRewardKeyId}, ${instanceId}, ${participant.id}, ${userId},
            'reward_reserved', 'available', 'reserved', '{"plaintext":"not_stored"}'::jsonb)
        `);
      }
      return { participant, demoKeyId, completionRewardKeyId, keylessDeadline };
    });
    const participant = reservation.participant;
    const demoKeyId = reservation.demoKeyId;
    const completionRewardKeyId = reservation.completionRewardKeyId;
    const keylessDeadline = reservation.keylessDeadline;

    // Award join XP
    const [template] = toRows(await db.execute(sql`SELECT COALESCE(xp_tier, 'standard') AS xp_tier FROM campaign_templates WHERE id = (SELECT template_id FROM campaign_instances WHERE id = ${instanceId})`)) as any[];
    const tier2 = (template?.xp_tier || 'standard') as XPTier;
    const profile = getXPProfile(tier2);
    await awardCampaignXP(
      userId,
      profile.joinXP,
      'campaign_join',
      `Joined campaign #${instanceId}`,
      instanceId,
      `campaign:${instanceId}:participation:${participant?.id ?? userId}:creator:${userId}:objective:join:deliverable:join:reward:join`,
    );
    // Existing notification service has no dedicated campaign-join event. Do not
    // overload unrelated notification types; submission/review notifications are
    // dispatched below through its bounty-specific methods.

    res.json({
      success: true,
      demoKey: null,
      accessKeyAvailable: Boolean(demoKeyId),
      deadline: keylessDeadline?.toISOString() ?? null,
      xpAwarded: profile.joinXP,
      message: demoKeyId
        ? 'Access reserved. Reveal your key when you are ready to begin.'
        : 'Joined campaign successfully!',
    });
  } catch (err: any) {
    if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message });
    console.error('POST /api/bounties/:instanceId/join error:', err);
    res.status(500).json({ error: 'Failed to join campaign' });
  }
});

// Manual application review is explicit; approval only opens the admission
// gate. The participant/key transaction still runs when the applicant joins.
router.get('/:instanceId/application', requireAuth, async (req, res) => {
  try {
    if (rejectIndieDeveloperParticipation(req, res)) return;
    const [application] = toRows(await db.execute(sql`
      SELECT id, status, notes, reviewed_at, created_at, updated_at
      FROM campaign_applications
      WHERE instance_id = ${Number(req.params.instanceId)} AND user_id = ${req.user!.id}
    `)) as any[];
    if (!application) return res.status(404).json({ error: 'Application not found' });
    res.json(application);
  } catch {
    res.status(500).json({ error: 'Failed to load application' });
  }
});

router.get('/admin/:instanceId/applications', requireOwnerOrAdmin, async (req, res) => {
  try {
    const applications = await db.execute(sql`
      SELECT ca.*, u.username, u.email
      FROM campaign_applications ca
      LEFT JOIN users u ON u.id = ca.user_id
      WHERE ca.instance_id = ${Number(req.params.instanceId)}
      ORDER BY ca.created_at ASC
    `);
    res.json(toRows(applications));
  } catch {
    res.status(500).json({ error: 'Failed to load applications' });
  }
});

router.patch('/admin/:instanceId/applications/:userId', requireOwnerOrAdmin, async (req, res) => {
  try {
    const instanceId = Number(req.params.instanceId);
    const applicantId = Number(req.params.userId);
    const status = req.body?.status === 'approved' ? 'approved'
      : req.body?.status === 'rejected' ? 'rejected' : null;
    if (!status) return res.status(400).json({ error: 'status must be approved or rejected' });
    const [application] = toRows(await db.execute(sql`
      UPDATE campaign_applications
      SET status = ${status}, reviewed_by = ${req.user!.id}, reviewed_at = NOW(),
          notes = ${req.body?.notes ?? null}, updated_at = NOW()
      WHERE instance_id = ${instanceId} AND user_id = ${applicantId}
      RETURNING id, status, reviewed_at
    `)) as any[];
    if (!application) return res.status(404).json({ error: 'Application not found' });
    res.json({ success: true, application });
  } catch {
    res.status(500).json({ error: 'Failed to review application' });
  }
});

// POST /api/bounties/:instanceId/reveal-access-key
// Joining reserves a key but never returns it. The creator must explicitly
// reveal it, which starts their individual completion deadline.
router.post('/:instanceId/reveal-access-key', requireAuth, async (req, res) => {
  try {
    if (rejectIndieDeveloperParticipation(req, res)) return;
    const userId = req.user!.id;
    const instanceId = Number(req.params.instanceId);
    const [participant] = toRows(await db.execute(sql`
      SELECT cp.id, cp.status, cp.access_key_id, cp.access_revealed_at,
        ci.end_date,
        COALESCE(ci.creator_deadline_days, t.completion_deadline_days, t.duration, 14) AS deadline_days,
        gk.id AS key_id, gk.status AS key_status, gk.key_ciphertext,
        gk.key_iv, gk.key_auth_tag, gk.key_value
      FROM campaign_participants cp
      JOIN campaign_instances ci ON ci.id = cp.instance_id
      JOIN campaign_templates t ON t.id = ci.template_id
      LEFT JOIN game_keys gk ON gk.id = cp.access_key_id
      WHERE cp.instance_id = ${instanceId} AND cp.user_id = ${userId}
    `)) as any[];
    if (!participant) return res.status(404).json({ error: 'You are not participating in this campaign' });
    if (!participant.key_id) {
      if (['expired', 'cancelled'].includes(participant.status)) {
        return res.status(409).json({ error: 'This participation is no longer active' });
      }
      const now = new Date();
      const deadline = new Date(now.getTime() + Number(participant.deadline_days) * 24 * 60 * 60 * 1000);
      if (!participant.access_revealed_at) {
        await db.execute(sql`
          UPDATE campaign_participants
          SET status = 'access_accepted', access_accepted_at = NOW(),
              access_revealed_at = NOW(), completion_deadline = ${deadline.toISOString()},
              deadline = ${deadline.toISOString()}
          WHERE id = ${participant.id} AND user_id = ${userId}
            AND access_revealed_at IS NULL
        `);
      }
      return res.json({
        success: true,
        key: null,
        accessAcceptedAt: participant.access_revealed_at ?? now.toISOString(),
        deadline: participant.access_revealed_at ? undefined : deadline.toISOString(),
      });
    }
    if (['expired', 'cancelled'].includes(participant.status)) {
      return res.status(409).json({ error: 'This participation is no longer active' });
    }

    const now = new Date();
    const deadline = new Date(now.getTime() + Number(participant.deadline_days) * 24 * 60 * 60 * 1000);
    const alreadyRevealed = Boolean(participant.access_revealed_at);
    if (!alreadyRevealed) {
      await db.transaction(async (tx) => {
        const [locked] = toRows(await tx.execute(sql`
          SELECT access_revealed_at, status FROM campaign_participants
          WHERE id = ${participant.id} AND user_id = ${userId} FOR UPDATE
        `)) as any[];
        if (locked?.access_revealed_at) return;
        await tx.execute(sql`
          UPDATE game_keys SET status = 'revealed', revealed_at = NOW()
          WHERE id = ${participant.key_id} AND status IN ('reserved', 'assigned', 'available')
        `);
        await tx.execute(sql`
          UPDATE campaign_participants
          SET status = 'access_accepted', access_accepted_at = NOW(),
              access_revealed_at = NOW(), completion_deadline = ${deadline.toISOString()},
              deadline = ${deadline.toISOString()}
          WHERE id = ${participant.id} AND user_id = ${userId}
            AND access_revealed_at IS NULL
        `);
        await tx.execute(sql`
          INSERT INTO campaign_key_events
            (key_id, instance_id, participant_id, actor_user_id, event_type,
             from_status, to_status, metadata)
          VALUES (${participant.key_id}, ${instanceId}, ${participant.id}, ${userId},
            'revealed', ${participant.key_status}, 'revealed', '{"plaintext":"not_stored"}'::jsonb)
        `);
      });
    }
    const [keyRow] = toRows(await db.execute(sql`
      SELECT key_ciphertext, key_iv, key_auth_tag, key_version, keyring_id, key_value
      FROM game_keys WHERE id = ${participant.key_id}
    `)) as any[];
    const key = decryptCampaignKey(keyRow);

    // The dedupe key makes retries safe while preserving historical XP events.
    const [template] = toRows(await db.execute(sql`
      SELECT COALESCE(t.xp_tier, 'standard') AS xp_tier
      FROM campaign_instances ci JOIN campaign_templates t ON t.id = ci.template_id
      WHERE ci.id = ${instanceId}
    `)) as any[];
    const profile = getXPProfile((template?.xp_tier || 'standard') as XPTier);
    await awardCampaignXP(
      userId, profile.demoClaimXP, 'campaign_demo_claim',
      `Access revealed for campaign #${instanceId}`, instanceId,
      `campaign:${instanceId}:participant:${participant.id}:access:reveal`,
    );
    res.json({
      success: true,
      key,
      accessAcceptedAt: participant.access_revealed_at ?? now.toISOString(),
      deadline: alreadyRevealed ? undefined : deadline.toISOString(),
    });
  } catch {
    res.status(500).json({ error: 'Failed to reveal access key' });
  }
});

// Creators may request at most one bounded extension before expiry.
router.post('/my/:instanceId/extension', requireAuth, async (req, res) => {
  try {
    if (rejectIndieDeveloperParticipation(req, res)) return;
    const hours = Number(req.body?.hours);
    if (![24, 48].includes(hours)) return res.status(400).json({ error: 'Extension must be 24 or 48 hours' });
    const [updated] = toRows(await db.execute(sql`
      UPDATE campaign_participants
      SET extension_requested_at = NOW(), extension_hours = ${hours},
          extension_status = 'requested'
      WHERE instance_id = ${Number(req.params.instanceId)}
        AND user_id = ${req.user!.id}
        AND status NOT IN ('completed', 'completed_and_verified', 'full_game_awarded', 'expired', 'cancelled')
        AND COALESCE(completion_deadline, deadline) > NOW()
        AND extension_status IS NULL
      RETURNING id, extension_status, extension_hours
    `)) as any[];
    if (!updated) return res.status(409).json({ error: 'Extension cannot be requested for this participation' });
    res.json({ success: true, ...updated });
  } catch {
    res.status(500).json({ error: 'Failed to request extension' });
  }
});

// Developer approval is scoped to the campaign owner server-side.
router.patch('/developer/:instanceId/participants/:participantId/extension', requireAuth, async (req, res) => {
  try {
    const approve = req.body?.approve === true;
    const instanceId = Number(req.params.instanceId);
    const participantId = Number(req.params.participantId);
    const [owner] = toRows(await db.execute(sql`
      SELECT developer_user_id FROM campaign_instances WHERE id = ${instanceId}
    `)) as any[];
    if (!owner) return res.status(404).json({ error: 'Campaign not found' });
    if (Number(owner.developer_user_id) !== Number(req.user!.id)) return res.status(403).json({ error: 'Forbidden' });
    if (!approve) {
      await db.execute(sql`
        UPDATE campaign_participants SET extension_status = 'declined'
        WHERE id = ${participantId} AND instance_id = ${instanceId} AND extension_status = 'requested'
      `);
      return res.json({ success: true, status: 'declined' });
    }
    const [updated] = toRows(await db.execute(sql`
      UPDATE campaign_participants
      SET extension_status = 'approved',
          completion_deadline = COALESCE(completion_deadline, deadline) +
            (COALESCE(extension_hours, 24) * interval '1 hour'),
          deadline = COALESCE(completion_deadline, deadline) +
            (COALESCE(extension_hours, 24) * interval '1 hour')
      WHERE id = ${participantId} AND instance_id = ${instanceId}
        AND extension_status = 'requested'
        AND COALESCE(completion_deadline, deadline) > NOW()
      RETURNING id, completion_deadline AS deadline, extension_status
    `)) as any[];
    if (!updated) return res.status(409).json({ error: 'Extension is no longer available' });
    res.json({ success: true, ...updated });
  } catch {
    res.status(500).json({ error: 'Failed to process extension' });
  }
});

// ─────────────────────────────────────────────
// MY CAMPAIGNS — AUTHENTICATED
// ─────────────────────────────────────────────

// GET /api/bounties/my/campaigns — all joined campaigns
router.get('/my/campaigns', requireAuth, async (req, res) => {
  try {
    if (rejectIndieDeveloperParticipation(req, res)) return;
    await expireOverdueCampaignParticipants();
    const userId = req.user!.id;
    const campaigns = await db.execute(sql`
      SELECT
        cp.id AS participant_id,
        cp.status AS participant_status,
        cp.joined_at,
        cp.completed_at,
        cp.deadline,
        cp.demo_key_id,
        cp.full_key_id,
        ci.id AS instance_id,
        ci.game_id,
        ci.game_name,
        ci.campaign_title,
        ci.game_artwork_url,
        ci.artwork_url AS campaign_artwork_url,
        ci.game_steam_app_id,
        ci.game_itch_url,
        ci.game_epic_slug,
        ci.end_date,
        ci.description,
        ci.regions,
        ci.platforms,
        ci.access_method,
        ci.application_period_days,
        ci.creator_deadline_days,
        ci.max_places,
        ci.completion_reward_type,
        ci.completion_reward_key_required,
        ci.requires_access_key,
        ci.objective_snapshot,
        ci.reward_config AS instance_reward_config,
        ci.reward_pool_contribution_pence,
        t.name AS template_name,
        t.slug AS template_slug,
        t.category,
        t.description AS template_description,
        t.best_use_case,
        t.duration,
        t.completion_reward,
        t.completion_reward_description,
         t.bounty_xp_reward,
         t.completion_bonus_xp,
         ci.bounty_xp_reward AS instance_bounty_xp_reward,
         ci.completion_bonus_xp AS instance_completion_bonus_xp,
        COALESCE(t.xp_tier, 'standard') AS xp_tier,
        COALESCE(ci.xp_event_multiplier, 1.0) AS xp_event_multiplier,
         g.name AS catalog_game_name,
        g.image_url AS catalog_game_artwork_url,
        igp.header_image_url AS game_profile_header_artwork_url,
        igp.capsule_image_url AS game_profile_capsule_artwork_url,
        igp.screenshot_urls[1] AS game_profile_screenshot_artwork_url,
         igp.game_name AS game_profile_name,
         igp.studio_name AS game_profile_studio_name,
         igp.short_description AS game_profile_short_description,
         igp.full_description AS game_profile_full_description,
         igp.genres AS game_profile_genres,
         igp.platforms AS game_profile_platforms,
        COALESCE(
          NULLIF(igp.header_image_url, ''),
          NULLIF(g.image_url, ''),
          NULLIF(igp.capsule_image_url, ''),
          NULLIF(igp.screenshot_urls[1], ''),
          NULLIF(ci.game_artwork_url, ''),
          NULLIF(ci.artwork_url, '')
        ) AS hero_artwork_url,
        (SELECT COUNT(*) FROM campaign_template_bounties WHERE template_id = t.id AND mandatory = true) AS mandatory_bounty_count,
        (SELECT COUNT(*) FROM campaign_bounty_submissions bs WHERE bs.instance_id = ci.id AND bs.participant_id = ${userId} AND bs.status = 'approved') AS approved_bounties,
        (SELECT COUNT(*) FROM campaign_bounty_submissions bs WHERE bs.instance_id = ci.id AND bs.participant_id = ${userId}) AS submitted_bounties,
        (
          SELECT json_agg(objective ORDER BY objective.completion_order)
          FROM (
            SELECT b.id, b.title, b.description, b.content_type, b.mandatory, b.quantity, b.xp_reward, b.completion_order,
              COUNT(bs.id) FILTER (WHERE bs.status IN ('pending', 'under_review', 'approved')) AS submitted_count,
              COUNT(bs.id) FILTER (WHERE bs.status = 'approved') AS approved_count,
              COUNT(bs.id) FILTER (WHERE bs.status = 'pending') AS pending_count,
              COUNT(bs.id) FILTER (WHERE bs.status = 'under_review') AS under_review_count,
              COUNT(bs.id) FILTER (WHERE bs.status = 'changes_requested') AS changes_requested_count
            FROM campaign_template_bounties b
            LEFT JOIN campaign_bounty_submissions bs ON bs.bounty_id = b.id
              AND bs.instance_id = ci.id AND bs.participant_id = ${userId}
            WHERE b.template_id = t.id
            GROUP BY b.id
          ) objective
        ) AS objective_progress,
        (cp.demo_key_id IS NOT NULL) AS access_key_reserved,
        (cp.access_revealed_at IS NOT NULL) AS access_key_revealed,
        (cp.full_key_id IS NOT NULL) AS completion_key_available
      FROM campaign_participants cp
      JOIN campaign_instances ci ON ci.id = cp.instance_id
      JOIN campaign_templates t ON t.id = ci.template_id
      LEFT JOIN games g ON g.id = ci.game_id
      LEFT JOIN indie_game_profiles igp ON igp.catalog_game_id = g.id AND igp.is_primary = true
      WHERE cp.user_id = ${userId}
      ORDER BY cp.joined_at DESC
    `);
    res.json(toRows(campaigns).map((campaign: any) => {
      const objectives = mergeInstanceObjectives(asArray(campaign.objective_progress), campaign.objective_snapshot);
      const decorated = decorateCampaign({ ...campaign, bounties: objectives });
      return {
        ...decorated,
        objective_progress: decorated.bounties,
        ...campaignJourney(decorated, decorated.bounties),
      };
    }));
  } catch (err) {
    console.error('GET /api/bounties/my/campaigns error:', err);
    res.status(500).json({ error: 'Failed to load campaigns' });
  }
});

// GET /api/bounties/my/content-picker?contentType=clip — user's existing content for submission
router.get('/my/content-picker', requireAuth, async (req, res) => {
  if (rejectIndieDeveloperParticipation(req, res)) return;
  const userId = req.user!.id;
  const contentType = (req.query.contentType as string) || 'clip';
  const gameId = req.query.gameId == null ? null : Number(req.query.gameId);
  try {
    let items: any[] = [];
    if (contentType === 'clip' || contentType === 'reel') {
      const result = await db.execute(sql`
        SELECT id, title, thumbnail_url AS "thumbnailUrl", created_at AS "createdAt"
        FROM clips
        WHERE user_id = ${userId}
          AND COALESCE(video_type, 'clip') = ${contentType}
          ${gameId != null && Number.isInteger(gameId) ? sql`AND game_id = ${gameId}` : sql``}
        ORDER BY created_at DESC LIMIT 36
      `);
      items = toRows(result);
    } else if (contentType === 'screenshot') {
      const result = await db.execute(sql`
        SELECT id, title,
          COALESCE(thumbnail_url, image_url) AS "thumbnailUrl",
          created_at AS "createdAt"
        FROM screenshots WHERE user_id = ${userId}
          ${gameId != null && Number.isInteger(gameId) ? sql`AND game_id = ${gameId}` : sql``}
        ORDER BY created_at DESC LIMIT 36
      `);
      items = toRows(result);
    }
    res.json({ items, contentType, count: items.length });
  } catch (err) {
    console.error('GET /api/bounties/my/content-picker error:', err);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// GET /api/bounties/my/:instanceId — progress on one campaign
router.get('/my/:instanceId', requireAuth, async (req, res) => {
  try {
    if (rejectIndieDeveloperParticipation(req, res)) return;
    await expireOverdueCampaignParticipants();
    const userId = req.user!.id;
    const instanceId = Number(req.params.instanceId);

    const [participation] = toRows(await db.execute(sql`
      SELECT
        cp.id AS participant_id,
        cp.status AS participant_status,
        cp.joined_at,
        cp.completed_at,
        cp.deadline,
        cp.demo_key_id,
        cp.full_key_id,
        ci.id AS instance_id,
        ci.game_id,
        ci.game_name,
        ci.campaign_title,
        ci.game_artwork_url,
        ci.artwork_url AS campaign_artwork_url,
        ci.game_steam_app_id,
        ci.game_itch_url,
        ci.game_epic_slug,
        ci.end_date,
        ci.description,
        ci.regions,
        ci.platforms,
        ci.access_method,
        ci.application_period_days,
        ci.creator_deadline_days,
        ci.max_places,
        ci.completion_reward_type,
        ci.completion_reward_key_required,
        ci.requires_access_key,
        ci.objective_snapshot,
        ci.reward_config AS instance_reward_config,
        ci.reward_pool_contribution_pence,
        t.id AS template_id,
        t.name AS template_name,
        t.category,
        t.description AS template_description,
        t.best_use_case,
        t.duration,
        t.completion_reward,
        t.completion_reward_description,
         t.bounty_xp_reward,
         t.completion_bonus_xp,
         ci.bounty_xp_reward AS instance_bounty_xp_reward,
         ci.completion_bonus_xp AS instance_completion_bonus_xp,
        COALESCE(t.xp_tier, 'standard') AS xp_tier,
        COALESCE(ci.xp_event_multiplier, 1.0) AS xp_event_multiplier,
         g.name AS catalog_game_name,
        g.image_url AS catalog_game_artwork_url,
        igp.header_image_url AS game_profile_header_artwork_url,
        igp.capsule_image_url AS game_profile_capsule_artwork_url,
        igp.screenshot_urls[1] AS game_profile_screenshot_artwork_url,
         igp.game_name AS game_profile_name,
         igp.studio_name AS game_profile_studio_name,
         igp.short_description AS game_profile_short_description,
         igp.full_description AS game_profile_full_description,
         igp.genres AS game_profile_genres,
         igp.platforms AS game_profile_platforms,
        COALESCE(
          NULLIF(igp.header_image_url, ''),
          NULLIF(g.image_url, ''),
          NULLIF(igp.capsule_image_url, ''),
          NULLIF(igp.screenshot_urls[1], ''),
          NULLIF(ci.game_artwork_url, ''),
          NULLIF(ci.artwork_url, '')
        ) AS hero_artwork_url,
        (cp.demo_key_id IS NOT NULL) AS access_key_reserved,
        (cp.access_revealed_at IS NOT NULL) AS access_key_revealed,
        (cp.full_key_id IS NOT NULL) AS completion_key_available
      FROM campaign_participants cp
      JOIN campaign_instances ci ON ci.id = cp.instance_id
      JOIN campaign_templates t ON t.id = ci.template_id
      LEFT JOIN games g ON g.id = ci.game_id
      LEFT JOIN indie_game_profiles igp ON igp.catalog_game_id = g.id AND igp.is_primary = true
      WHERE cp.instance_id = ${instanceId} AND cp.user_id = ${userId}
    `)) as any[];

    if (!participation) return res.status(404).json({ error: 'You are not participating in this campaign' });

    // Load bounties with submission status
    const bounties = toRows(await db.execute(sql`
      SELECT
        b.*,
        (
          SELECT json_agg(submission ORDER BY submission.submitted_at DESC)
          FROM (
            SELECT
              s.id, s.status, s.review_notes, s.submitted_at, s.reviewed_at,
              s.content_type, s.clip_id, s.screenshot_id, s.reel_id,
              s.content_url, s.content_data, s.xp_awarded, s.slot_index,
              COALESCE(c.title, ss.title) AS media_title,
              COALESCE(c.thumbnail_url, ss.thumbnail_url, c.video_url, ss.image_url) AS thumbnail_url,
              COALESCE(c.video_url, ss.image_url, s.content_url) AS media_url
            FROM campaign_bounty_submissions s
            LEFT JOIN clips c ON c.id = COALESCE(s.clip_id, s.reel_id)
            LEFT JOIN screenshots ss ON ss.id = s.screenshot_id
            WHERE s.bounty_id = b.id AND s.instance_id = ${instanceId} AND s.participant_id = ${userId}
          ) submission
        ) AS submissions,
        (
          SELECT COUNT(*) FROM campaign_bounty_submissions s
          WHERE s.bounty_id = b.id AND s.instance_id = ${instanceId} AND s.participant_id = ${userId} AND s.status = 'approved'
        ) AS approved_count
        ,(
          SELECT COUNT(*) FROM campaign_bounty_submissions s
          WHERE s.bounty_id = b.id AND s.instance_id = ${instanceId} AND s.participant_id = ${userId}
            AND s.status IN ('pending', 'under_review', 'approved')
        ) AS submitted_count
        ,(
          SELECT COUNT(*) FROM campaign_bounty_submissions s
          WHERE s.bounty_id = b.id AND s.instance_id = ${instanceId} AND s.participant_id = ${userId} AND s.status = 'pending'
        ) AS pending_count
        ,(
          SELECT COUNT(*) FROM campaign_bounty_submissions s
          WHERE s.bounty_id = b.id AND s.instance_id = ${instanceId} AND s.participant_id = ${userId} AND s.status = 'under_review'
        ) AS under_review_count
        ,(
          SELECT COUNT(*) FROM campaign_bounty_submissions s
          WHERE s.bounty_id = b.id AND s.instance_id = ${instanceId} AND s.participant_id = ${userId} AND s.status = 'changes_requested'
        ) AS changes_requested_count
        ,(
          SELECT COUNT(*) FROM campaign_bounty_submissions s
          WHERE s.bounty_id = b.id AND s.instance_id = ${instanceId} AND s.participant_id = ${userId} AND s.status = 'rejected'
        ) AS rejected_count
      FROM campaign_template_bounties b
      WHERE b.template_id = ${participation.template_id}
      ORDER BY b.completion_order ASC
    `));

    const instanceBounties = mergeInstanceObjectives(bounties, participation.objective_snapshot);
    const enrichedBounties = instanceBounties.map((bounty: any) => {
      const quantity = Math.max(Number(bounty.quantity ?? 1), 1);
      const approved = Math.min(Number(bounty.approved_count ?? 0), quantity);
      const submitted = Math.min(Number(bounty.submitted_count ?? 0), quantity);
      const submission_status = approved >= quantity ? 'approved'
        : Number(bounty.changes_requested_count ?? 0) > 0 ? 'changes_requested'
        : Number(bounty.rejected_count ?? 0) > 0 ? 'rejected'
        : Number(bounty.under_review_count ?? 0) > 0 ? 'under_review'
        : Number(bounty.pending_count ?? 0) > 0 ? 'submitted'
        : 'not_started';
      return { ...bounty, required_units: quantity, submitted_units: submitted, approved_units: approved, remaining_units: quantity - approved, submission_status };
    });
    const decorated = decorateCampaign({ ...participation, bounties: enrichedBounties });
    res.json({
      ...decorated,
      bounties: enrichedBounties,
      ...campaignJourney(decorated, enrichedBounties),
    });
  } catch (err) {
    console.error('GET /api/bounties/my/:instanceId error:', err);
    res.status(500).json({ error: 'Failed to load campaign progress' });
  }
});

// ─────────────────────────────────────────────
// CONTENT SUBMISSION — AUTHENTICATED
// ─────────────────────────────────────────────

// POST /api/bounties/my/:instanceId/submit/:bountyId
router.post('/my/:instanceId/submit/:bountyId', requireAuth, async (req, res) => {
  try {
    if (rejectIndieDeveloperParticipation(req, res)) return;
    const userId = req.user!.id;
    const instanceId = Number(req.params.instanceId);
    const bountyId = Number(req.params.bountyId);
    if (!Number.isInteger(instanceId) || !Number.isInteger(bountyId)) {
      return res.status(400).json({ error: 'Invalid campaign or bounty id' });
    }

    // Verify participation
    const [participation] = toRows(await db.execute(sql`
      SELECT cp.id, cp.status, cp.deadline, ci.end_date, ci.manual_approval_required, ci.game_id
      FROM campaign_participants cp
      JOIN campaign_instances ci ON ci.id = cp.instance_id
      WHERE cp.instance_id = ${instanceId} AND cp.user_id = ${userId}
    `)) as any[];

    if (!participation) return res.status(403).json({ error: 'You are not participating in this campaign' });
    if (['completed', 'completed_and_verified', 'full_game_awarded'].includes(participation.status)) return res.status(400).json({ error: 'Campaign is already completed' });
    if (participation.deadline && new Date(participation.deadline).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Campaign submission deadline has expired' });
    }

    // Load bounty definition + campaign tier
    const [bounty] = toRows(await db.execute(sql`
      SELECT b.*, t.id AS template_id, COALESCE(t.xp_tier, 'standard') AS xp_tier,
        ci.developer_user_id, ci.game_id AS campaign_game_id
      FROM campaign_template_bounties b
      JOIN campaign_templates t ON t.id = b.template_id
      JOIN campaign_instances ci ON ci.template_id = t.id
      WHERE b.id = ${bountyId} AND ci.id = ${instanceId}
    `)) as any[];

    if (!bounty) return res.status(404).json({ error: 'Bounty not found' });

    const {
      contentType, contentUrl, contentData,
      clipId, screenshotId, reelId,
      supersedesSubmissionId,
      slotIndex,
    } = req.body;
    const submissionStatus = participation.manual_approval_required ? 'under_review' : 'pending';
    if (contentType && contentType !== bounty.content_type) {
      return res.status(400).json({ error: `This objective requires ${bounty.content_type} content` });
    }
    const campaignGameId = participation.game_id == null ? null : Number(participation.game_id);
    const expectedContentType = String(bounty.content_type);
    const suppliedMediaIds = [clipId, reelId, screenshotId].filter((value) => value != null);
    if (suppliedMediaIds.length > 1) {
      return res.status(400).json({ error: 'Only one media item can be attached to a submission' });
    }
    if (['clip', 'reel', 'screenshot'].includes(expectedContentType) && campaignGameId == null) {
      return res.status(409).json({ error: 'This campaign does not have a configured game for media submissions' });
    }
    if (expectedContentType === 'clip' || expectedContentType === 'reel') {
      const expectedId = expectedContentType === 'reel' ? reelId : clipId;
      if (expectedId == null || (expectedContentType === 'clip' && reelId != null) || (expectedContentType === 'reel' && clipId != null)) {
        return res.status(400).json({ error: `This objective requires a ${expectedContentType}` });
      }
      const [clip] = toRows(await db.execute(sql`
        SELECT id, game_id, COALESCE(video_type, 'clip') AS video_type
        FROM clips
        WHERE id = ${Number(expectedId)} AND user_id = ${userId}
      `));
      if (!clip) return res.status(403).json({ error: `Selected ${expectedContentType} does not belong to you` });
      if (Number(clip.game_id) !== campaignGameId) {
        return res.status(400).json({ error: `Selected ${expectedContentType} is not associated with this campaign game` });
      }
      if (clip.video_type !== expectedContentType) {
        return res.status(400).json({ error: `Selected media is not a ${expectedContentType}` });
      }
    }
    if (expectedContentType === 'screenshot') {
      if (screenshotId == null || clipId != null || reelId != null) {
        return res.status(400).json({ error: 'This objective requires a screenshot' });
      }
      const [screenshot] = toRows(await db.execute(sql`
        SELECT id, game_id
        FROM screenshots
        WHERE id = ${Number(screenshotId)} AND user_id = ${userId}
      `));
      if (!screenshot) return res.status(403).json({ error: 'Selected screenshot does not belong to you' });
      if (Number(screenshot.game_id) !== campaignGameId) {
        return res.status(400).json({ error: 'Selected screenshot is not associated with this campaign game' });
      }
    }

    const [existingUnits] = toRows(await db.execute(sql`
      SELECT COUNT(*) AS count FROM campaign_bounty_submissions
      WHERE instance_id = ${instanceId} AND participant_id = ${userId} AND bounty_id = ${bountyId}
        AND status IN ('pending', 'under_review', 'approved')
    `)) as any[];
    if (Number(existingUnits?.count ?? 0) >= Math.max(Number(bounty.quantity ?? 1), 1)) {
      return res.status(409).json({ error: 'All required submission units for this objective have already been submitted' });
    }

    let replacementId: number | null = null;
    let resolvedSlotIndex: number | null = null;
    if (supersedesSubmissionId != null) {
      const [previous] = toRows(await db.execute(sql`
        SELECT id, slot_index FROM campaign_bounty_submissions
        WHERE id = ${Number(supersedesSubmissionId)}
          AND instance_id = ${instanceId}
          AND participant_id = ${userId}
          AND bounty_id = ${bountyId}
          AND status IN ('changes_requested', 'rejected')
      `)) as any[];
      if (!previous) return res.status(400).json({ error: 'Only a rejected or changes-requested submission can be replaced' });
      replacementId = Number(previous.id);
      resolvedSlotIndex = previous.slot_index == null ? null : Number(previous.slot_index);
    }

    // Slot assignment is authoritative on the server. The client may request a
    // slot for presentation, but it can never choose a slot that is already
    // occupied by an active submission or move a replacement to another slot.
    if (resolvedSlotIndex == null) {
      const requestedSlot = Number.isInteger(Number(slotIndex)) ? Number(slotIndex) : null;
      const [availableSlot] = toRows(await db.execute(sql`
        SELECT candidate.slot_index
        FROM generate_series(0, GREATEST(COALESCE(${bounty.quantity}, 1), 1) - 1) AS candidate(slot_index)
        WHERE NOT EXISTS (
          SELECT 1
          FROM campaign_bounty_submissions active_submission
          WHERE active_submission.instance_id = ${instanceId}
            AND active_submission.participant_id = ${userId}
            AND active_submission.bounty_id = ${bountyId}
            AND active_submission.status IN ('pending', 'under_review', 'approved')
            AND active_submission.slot_index = candidate.slot_index
        )
        ORDER BY CASE WHEN candidate.slot_index = ${requestedSlot ?? -1} THEN 0 ELSE 1 END, candidate.slot_index
        LIMIT 1
      `)) as any[];
      if (!availableSlot) {
        return res.status(409).json({ error: 'All submission slots for this objective are already in use' });
      }
      resolvedSlotIndex = Number(availableSlot.slot_index);
    }

    // Compute XP for this submission (deferred until approval, but compute now for preview)
    const tier = (bounty.xp_tier || 'standard') as XPTier;
    const profile = getXPProfile(tier);
    const ct = bounty.content_type as string;
    // Count prior submissions of same type for bonus calculation
    const [prior] = toRows(await db.execute(sql`
      SELECT COUNT(*) AS qty FROM campaign_bounty_submissions
      WHERE participant_id = ${userId} AND instance_id = ${instanceId}
        AND bounty_id IN (SELECT id FROM campaign_template_bounties WHERE template_id = ${bounty.template_id} AND content_type = ${ct})
        AND status IN ('pending','under_review','approved')
    `)) as any[];
    const isFirst = Number(prior?.qty ?? 0) === 0;
    const xpPreview = computeBountyXP(profile, ct, isFirst, bounty.quantity ?? 1, Number(prior?.qty ?? 0));

    // Insert submission
    const [submission] = toRows(await db.execute(sql`
      INSERT INTO campaign_bounty_submissions
        (instance_id, participant_id, participation_id, bounty_id, creator_id, game_id, objective_id,
         content_id, submission_type, content_type, clip_id, screenshot_id, reel_id,
         content_url, content_data, status, objective_state, validation_state,
           submitted_at, xp_awarded, supersedes_submission_id, slot_index)
      VALUES
        (${instanceId}, ${userId}, ${participation.id}, ${bountyId}, ${userId}, ${bounty.campaign_game_id ?? null}, ${bountyId},
         ${clipId ?? screenshotId ?? reelId ?? null}, ${contentType ?? bounty.content_type},
         ${contentType ?? bounty.content_type},
         ${clipId ?? null}, ${screenshotId ?? null}, ${reelId ?? null},
          ${contentUrl ?? null}, ${contentData ? JSON.stringify(contentData) : null},
            ${submissionStatus}, 'submitted', 'submitted', NOW(), 0, ${replacementId}, ${resolvedSlotIndex})
      RETURNING *
    `)) as any[];

    // Each objective can require several submission units. Completion must count
    // units (capped at the objective quantity), not just distinct bounty ids.
    const [completionCheck] = toRows(await db.execute(sql`
      SELECT
        COALESCE(SUM(GREATEST(COALESCE(b.quantity, 1), 1)), 0) AS mandatory_total,
        COALESCE(SUM(LEAST(GREATEST(COALESCE(b.quantity, 1), 1),
          (SELECT COUNT(*) FROM campaign_bounty_submissions unit_submission
           WHERE unit_submission.bounty_id = b.id AND unit_submission.instance_id = ${instanceId}
             AND unit_submission.participant_id = ${userId}
             AND unit_submission.status IN ('pending', 'under_review', 'approved'))), 0) AS mandatory_submitted
      FROM campaign_template_bounties b
      JOIN campaign_instances ci ON ci.template_id = b.template_id
      WHERE ci.id = ${instanceId}
    `)) as any[];

    const allMandatorySubmitted =
      Number(completionCheck?.mandatory_total ?? 0) > 0 &&
      Number(completionCheck?.mandatory_submitted ?? 0) >= Number(completionCheck?.mandatory_total ?? 0);

    if (allMandatorySubmitted) {
      await db.execute(sql`
        UPDATE campaign_participants SET status = 'submitted_for_review'
        WHERE instance_id = ${instanceId} AND user_id = ${userId} AND status != 'completed'
      `);
    }
    if (bounty.developer_user_id) {
      void NotificationService.createBountySubmissionNotification(
        Number(bounty.developer_user_id), userId, bountyId, bounty.title
      );
    }

    res.status(201).json({ submission, allMandatorySubmitted, xpPreview });
  } catch (err) {
    console.error('POST /api/bounties/my/:instanceId/submit/:bountyId error:', err);
    res.status(500).json({ error: 'Failed to submit content' });
  }
});

// POST /api/bounties/my/:instanceId/claim-full-key
router.post('/my/:instanceId/claim-full-key', requireAuth, async (req, res) => {
  try {
    if (rejectIndieDeveloperParticipation(req, res)) return;
    await expireOverdueCampaignParticipants();
    const userId = req.user!.id;
    const instanceId = Number(req.params.instanceId);

    const [participation] = toRows(await db.execute(sql`
      SELECT cp.*, t.full_keys_required, ci.completion_reward_key_required
      FROM campaign_participants cp
      JOIN campaign_instances ci ON ci.id = cp.instance_id
      JOIN campaign_templates t ON t.id = ci.template_id
      WHERE cp.instance_id = ${instanceId} AND cp.user_id = ${userId}
    `)) as any[];

    if (!participation) return res.status(404).json({ error: 'Not a participant' });
    if (participation.completion_reward_key_required === false) {
      return res.status(409).json({ error: 'This campaign does not provide a completion key reward' });
    }
    if (participation.status === 'expired' ||
        (participation.deadline && new Date(participation.deadline).getTime() < Date.now())) {
      return res.status(409).json({ error: 'This participation has expired' });
    }
    const key = await db.transaction(async (tx) => {
      const [lockedParticipant] = toRows(await tx.execute(sql`
        SELECT id, full_key_id, completion_reward_key_id, status FROM campaign_participants
        WHERE instance_id = ${instanceId} AND user_id = ${userId} FOR UPDATE
      `)) as any[];
      if (lockedParticipant?.status === 'expired') {
        throw Object.assign(new Error('This participation has expired'), { statusCode: 409 });
      }
      const [mandatoryState] = toRows(await tx.execute(sql`
        SELECT
          COALESCE(SUM(GREATEST(COALESCE(b.quantity, 1), 1)), 0) AS mandatory_total,
          COALESCE(SUM(LEAST(GREATEST(COALESCE(b.quantity, 1), 1),
            (SELECT COUNT(*) FROM campaign_bounty_submissions s
             WHERE s.bounty_id = b.id AND s.instance_id = ${instanceId}
               AND s.participant_id = ${userId} AND s.status = 'approved')), 0) AS mandatory_approved
        FROM campaign_template_bounties b
        JOIN campaign_instances ci ON ci.template_id = b.template_id
        WHERE ci.id = ${instanceId}
      `)) as any[];
      if (!canClaimCompletionKey(
        lockedParticipant?.status,
        Number(mandatoryState?.mandatory_total ?? 0),
        Number(mandatoryState?.mandatory_approved ?? 0),
      )) {
        if (!['completed', 'completed_and_verified', 'full_game_awarded'].includes(lockedParticipant?.status)) {
          throw Object.assign(new Error('Participation is not complete yet'), { statusCode: 400 });
        }
        throw Object.assign(new Error('All mandatory objectives must be approved before claiming a completion key'), { statusCode: 400 });
      }
      if (lockedParticipant?.full_key_id) {
        const [existingKey] = toRows(await tx.execute(sql`
          SELECT id, key_ciphertext, key_iv, key_auth_tag, key_version, keyring_id, key_value
          FROM game_keys WHERE id = ${lockedParticipant.full_key_id}
        `)) as any[];
        return existingKey;
      }
      if (lockedParticipant?.completion_reward_key_id) {
        const [rewardKey] = toRows(await tx.execute(sql`
          UPDATE game_keys
          SET status = 'rewarded', rewarded_at = NOW()
          WHERE id = ${lockedParticipant.completion_reward_key_id}
            AND assigned_user_id = ${userId} AND status IN ('reserved', 'assigned')
          RETURNING id, key_ciphertext, key_iv, key_auth_tag, key_version, keyring_id, key_value
        `)) as any[];
        if (!rewardKey) throw Object.assign(new Error('Reserved completion reward is unavailable'), { statusCode: 409 });
        await tx.execute(sql`
          UPDATE campaign_participants
          SET full_key_id = ${rewardKey.id}, status = 'completed',
              completed_at = COALESCE(completed_at, NOW())
          WHERE id = ${lockedParticipant.id} AND full_key_id IS NULL
        `);
        return rewardKey;
      }
      const [assigned] = toRows(await tx.execute(sql`
        UPDATE game_keys SET status = 'assigned', assigned_user_id = ${userId}, assigned_at = NOW()
        WHERE id = (
          SELECT id FROM game_keys
          WHERE instance_id = ${instanceId} AND key_type = 'full'
            AND key_pool = 'reward' AND status = 'available'
          ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED
        )
         RETURNING id, key_ciphertext, key_iv, key_auth_tag, key_version, keyring_id, key_value
      `)) as any[];
      if (!assigned) throw Object.assign(new Error('No full-game keys available'), { statusCode: 409 });
      await tx.execute(sql`
        UPDATE campaign_participants
        SET full_key_id = ${assigned.id}, completion_reward_key_id = ${assigned.id},
            status = 'completed', completed_at = COALESCE(completed_at, NOW())
        WHERE instance_id = ${instanceId} AND user_id = ${userId}
      `);
      await tx.execute(sql`
        UPDATE game_keys SET status = 'rewarded', rewarded_at = NOW()
        WHERE id = ${assigned.id} AND status = 'assigned'
      `);
      return assigned;
    });
    if (!key) return res.status(409).json({ error: 'No full-game keys available' });

    // New canonical campaigns award their completion bonus when the final
    // objective is approved. Older tier-based campaigns retain their original
    // full-key timing, but still use an idempotency key.
    const [legacyReward] = toRows(await db.execute(sql`
      SELECT cp.id AS participation_id, COALESCE(t.xp_tier, 'standard') AS xp_tier,
        COALESCE(ci.xp_event_multiplier, 1.0) AS mult, t.slug,
        ci.bounty_xp_reward AS instance_bounty_xp_reward,
        t.bounty_xp_reward
      FROM campaign_participants cp
      JOIN campaign_instances ci ON ci.id = cp.instance_id
      JOIN campaign_templates t ON t.id = ci.template_id
      WHERE cp.instance_id = ${instanceId} AND cp.user_id = ${userId}
    `)) as any[];
    const legacyConfig = getBountyRewardConfig(legacyReward?.slug);
    const legacyTotal = Number(
      legacyReward?.instance_bounty_xp_reward ??
      legacyReward?.bounty_xp_reward ??
      legacyConfig?.totalReward ??
      computeCampaignTotalXP((legacyReward?.xp_tier || 'standard') as XPTier),
    );
    const completionXP = Math.round(legacyTotal * Number(legacyReward?.mult ?? 1.0));
    const completionKey = `campaign:${instanceId}:participation:${legacyReward?.participation_id ?? userId}:creator:${userId}:objective:completion:deliverable:all:reward:completion`;
    const completionAwarded = completionXP > 0 && await awardDurableCampaignReward({
      instanceId,
      participantId: Number(legacyReward?.participation_id ?? participation.id),
      rewardType: 'completion',
      rewardKey: completionKey,
      amount: completionXP,
      userId,
      source: 'bounty_completion',
      description: `Completed campaign #${instanceId}`,
    });
    res.json({
      success: true,
      fullKey: decryptCampaignKey(key),
      xpAwarded: completionAwarded ? completionXP : 0,
    });
  } catch (err) {
    if ((err as any)?.statusCode) return res.status((err as any).statusCode).json({ error: (err as any).message });
    console.error('POST /api/bounties/my/:instanceId/claim-full-key error:', err);
    res.status(500).json({ error: 'Failed to claim full-game key' });
  }
});

// ─────────────────────────────────────────────
// ADMIN — SUBMISSION REVIEW
// ─────────────────────────────────────────────

// GET /api/bounties/admin/submissions — list pending submissions for admins or campaign owners
router.get('/admin/submissions', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const statusFilter = status
      ? sql`bs.status = ${status as string}`
      : sql`bs.status IN ('pending', 'under_review')`;
    const ownerFilter = req.user!.role === 'admin'
      ? sql`TRUE`
      : sql`ci.developer_user_id = ${req.user!.id}`;
    const submissions = await db.execute(sql`
      SELECT
        bs.*,
        u.username, u.display_name, u.avatar_url,
        ci.game_name,
        ci.campaign_title,
        ci.developer_user_id,
        b.title AS bounty_title,
        b.content_type,
        COALESCE(c.video_url, s.image_url) AS media_url,
        COALESCE(c.thumbnail_url, s.thumbnail_url, s.image_url) AS thumbnail_url
      FROM campaign_bounty_submissions bs
      JOIN users u ON u.id = bs.participant_id
      JOIN campaign_instances ci ON ci.id = bs.instance_id
      JOIN campaign_template_bounties b ON b.id = bs.bounty_id
      LEFT JOIN clips c ON c.id = COALESCE(bs.clip_id, bs.reel_id)
      LEFT JOIN screenshots s ON s.id = bs.screenshot_id
       WHERE ${statusFilter} AND ${ownerFilter}
      ORDER BY bs.submitted_at ASC
    `);
    res.json(toRows(submissions));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load submissions' });
  }
});

// PATCH /api/bounties/admin/submissions/:id/review
router.patch('/admin/submissions/:id/review', requireCampaignSubmissionOwnerOrAdmin, async (req, res) => {
  try {
    await expireOverdueCampaignParticipants();
    const submissionId = Number(req.params.id);
    const { verdict, notes } = req.body; // verdict: 'approved' | 'rejected' | 'changes_requested'
    if (!['approved', 'rejected', 'changes_requested', 'under_review'].includes(verdict)) {
      return res.status(400).json({ error: 'Invalid review verdict' });
    }
    if (['rejected', 'changes_requested'].includes(verdict) && !String(notes ?? '').trim()) {
      return res.status(400).json({ error: 'A reason is required for this review decision' });
    }
    const reviewTransition = await db.transaction(async (tx) => {
      const [current] = toRows(await tx.execute(sql`
        SELECT status, instance_id, participant_id, bounty_id, xp_awarded
        FROM campaign_bounty_submissions WHERE id = ${submissionId} FOR UPDATE
      `)) as any[];
      if (!current) return { currentSubmission: null, transitionedSubmission: null };
      const [transitioned] = verdict === 'approved'
        ? toRows(await tx.execute(sql`
            UPDATE campaign_bounty_submissions
             SET status = 'approved', objective_state = 'complete',
                 validation_state = 'complete',
                  review_notes = ${notes ?? null}, reviewed_by_user_id = ${req.user!.id}, reviewed_at = NOW()
            WHERE id = ${submissionId} AND status <> 'approved' RETURNING *
          `)) as any[]
        : toRows(await tx.execute(sql`
            UPDATE campaign_bounty_submissions
             SET status = ${verdict},
                 objective_state = CASE
                   WHEN ${verdict} = 'changes_requested' THEN 'needs_attention'
                   WHEN ${verdict} = 'rejected' THEN 'rejected'
                   ELSE objective_state END,
                 validation_state = ${verdict},
                  review_notes = ${notes ?? null}, reviewed_by_user_id = ${req.user!.id}, reviewed_at = NOW()
            WHERE id = ${submissionId} RETURNING *
          `)) as any[];
      if (transitioned) {
        await tx.execute(sql`
          INSERT INTO campaign_bounty_submission_reviews
            (submission_id, reviewer_user_id, verdict, notes)
          VALUES (${submissionId}, ${req.user!.id}, ${verdict}, ${notes ?? null})
        `);
      }
      return { currentSubmission: current, transitionedSubmission: transitioned };
    });
    const currentSubmission = reviewTransition.currentSubmission;
    const transitionedSubmission = reviewTransition.transitionedSubmission;
    if (!currentSubmission) return res.status(404).json({ error: 'Submission not found' });
    const [participantState] = toRows(await db.execute(sql`
      SELECT status FROM campaign_participants
      WHERE instance_id = ${currentSubmission.instance_id} AND user_id = ${currentSubmission.participant_id}
    `)) as any[];
    const participantExpired = participantState?.status === 'expired';

    // Approval is a guarded state transition: only the request that changes the
    // row to approved may award XP. This keeps retries and concurrent reviews
    // from creating duplicate ledger entries.
    if (verdict === 'approved' &&
        (transitionedSubmission || currentSubmission.status === 'approved') &&
        !participantExpired) {
      const sub = transitionedSubmission ?? currentSubmission;
      if (sub) {
        const [check] = toRows(await db.execute(sql`
          SELECT
        COALESCE(SUM(GREATEST(COALESCE(b.quantity, 1), 1)), 0) AS mandatory_total,
        COALESCE(SUM(LEAST(GREATEST(COALESCE(b.quantity, 1), 1),
          (SELECT COUNT(*) FROM campaign_bounty_submissions unit_submission
           WHERE unit_submission.bounty_id = b.id AND unit_submission.instance_id = ${sub.instance_id}
             AND unit_submission.participant_id = ${sub.participant_id} AND unit_submission.status = 'approved')), 0) AS mandatory_approved
          FROM campaign_template_bounties b
          JOIN campaign_instances ci ON ci.template_id = b.template_id
          WHERE ci.id = ${sub.instance_id}
        `)) as any[];

        const allApproved = Number(check?.mandatory_total) > 0 && Number(check?.mandatory_approved) >= Number(check?.mandatory_total);
        if (allApproved) {
          await db.transaction(async (tx) => {
            await tx.execute(sql`
              SELECT id FROM campaign_participants
              WHERE instance_id = ${sub.instance_id} AND user_id = ${sub.participant_id} FOR UPDATE
            `);
            await tx.execute(sql`
              UPDATE campaign_participants SET status = 'completed_and_verified'
              WHERE instance_id = ${sub.instance_id} AND user_id = ${sub.participant_id}
                AND status NOT IN ('completed', 'full_game_awarded')
            `);
          });
        }

        const [participantRow] = toRows(await db.execute(sql`
          SELECT id FROM campaign_participants
          WHERE instance_id = ${sub.instance_id} AND user_id = ${sub.participant_id}
        `)) as any[];
        if (!participantRow) {
          return res.status(409).json({ error: 'Participant record is unavailable; reward will not be issued' });
        }

        // XP is a campaign completion reward. Approving an individual
        // deliverable must never create an XP ledger entry.
        const [tierRow2] = toRows(await db.execute(sql`
          SELECT COALESCE(t.xp_tier, 'standard') AS xp_tier,
            COALESCE(ci.xp_event_multiplier, 1.0) AS mult,
             ci.template_id, t.slug, ci.bounty_xp_reward AS instance_bounty_xp_reward,
             t.bounty_xp_reward, ci.completion_bonus_xp
          FROM campaign_instances ci
          JOIN campaign_templates t ON t.id = ci.template_id
          WHERE ci.id = ${sub.instance_id}
        `)) as any[];
        const mult4 = Number(tierRow2?.mult ?? 1.0);
        const rewardConfig = getBountyRewardConfig(tierRow2?.slug);

        // Load bounty details to compute XP
        const [bountyInfo] = toRows(await db.execute(sql`
           SELECT b.id AS bounty_id, b.title
          FROM campaign_template_bounties b
          JOIN campaign_bounty_submissions bs ON bs.bounty_id = b.id
          WHERE bs.id = ${submissionId}
        `)) as any[];
        if (bountyInfo) {
          if (allApproved) {
            const campaignTotal = Number(
              tierRow2?.instance_bounty_xp_reward ??
              tierRow2?.bounty_xp_reward ??
              rewardConfig?.totalReward ??
              computeCampaignTotalXP((tierRow2?.xp_tier || 'standard') as XPTier),
            );
            const completionXP = Math.round(campaignTotal * mult4);
            const completionKey = `campaign:${sub.instance_id}:participation:${participantRow?.id ?? sub.participant_id}:creator:${sub.participant_id}:objective:completion:deliverable:all:reward:completion`;
            if (completionXP > 0) {
              const completionAwarded = await awardDurableCampaignReward({
                instanceId: sub.instance_id,
                participantId: participantRow.id,
                rewardType: 'completion',
                rewardKey: completionKey,
                amount: completionXP,
                userId: sub.participant_id,
                source: 'bounty_completion',
                description: `Completed all approved objectives in campaign #${sub.instance_id}`,
              });
              if (completionAwarded) {
                await db.transaction(async (tx) => {
                  await tx.execute(sql`
                    UPDATE campaign_participants
                    SET completion_bonus_awarded = true
                    WHERE instance_id = ${sub.instance_id} AND user_id = ${sub.participant_id}
                      AND completion_bonus_awarded = false
                  `);
                });
              }
            }
          }
          void NotificationService.createBountySubmissionReviewedNotification(
            sub.participant_id, bountyInfo.bounty_id, bountyInfo.title, true, notes
          );
        }
      }
    }
    // The existing review notification supports approval/rejection wording only;
    // use it for actual rejections and avoid mislabeling "under review" or
    // "changes requested" as a rejection.
    if (verdict === 'rejected') {
      const [submissionInfo] = toRows(await db.execute(sql`
        SELECT bs.participant_id, bs.bounty_id, b.title
        FROM campaign_bounty_submissions bs JOIN campaign_template_bounties b ON b.id = bs.bounty_id
        WHERE bs.id = ${submissionId}
      `)) as any[];
      if (submissionInfo) {
        void NotificationService.createBountySubmissionReviewedNotification(
          submissionInfo.participant_id, submissionInfo.bounty_id, submissionInfo.title, false, notes
        );
      }
    }
    if (verdict === 'changes_requested') {
      const [submissionInfo] = toRows(await db.execute(sql`
        SELECT bs.participant_id, bs.bounty_id, b.title
        FROM campaign_bounty_submissions bs JOIN campaign_template_bounties b ON b.id = bs.bounty_id
        WHERE bs.id = ${submissionId}
      `)) as any[];
      if (submissionInfo) {
        void NotificationService.createBountySubmissionChangesRequestedNotification(
          submissionInfo.participant_id, submissionInfo.bounty_id, submissionInfo.title, notes
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to review submission' });
  }
});

// ──────────────────────────────────────────────────────────────
// ADMIN — XP PROFILE MANAGER
// ──────────────────────────────────────────────────────────────

router.get('/admin/xp-profiles', requireAdmin, async (_req, res) => {
  try {
    const profiles = listAllProfiles();
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load XP profiles' });
  }
});

router.patch('/admin/xp-profiles/:tier', requireAdmin, async (req, res) => {
  try {
    const tier = req.params.tier as XPTier;
    if (!['quick', 'standard', 'premium', 'featured'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }
    const allowed = [
      'totalXP','completionBonus','joinXP','demoClaimXP','playDemoXP',
      'firstClipXP','perClipXP','clipBonusQty','clipBonusXP',
      'firstScreenshotXP','perScreenshotXP','screenshotBonusQty','screenshotBonusXP',
      'firstFeedbackXP','perFeedbackXP','reelXP','bugReportXP','streamXP',
    ];
    const patch: Partial<XPProfile> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        (patch as any)[key] = Number(req.body[key]);
      }
    }
    updateProfile(tier, patch);
    res.json({ success: true, tier, patch });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update XP profile' });
  }
});

router.post('/admin/xp-events/:instanceId', requireAdmin, async (req, res) => {
  try {
    const instanceId = Number(req.params.instanceId);
    const { multiplier, reason } = req.body;
    await db.execute(sql`
      UPDATE campaign_instances
      SET xp_event_multiplier = ${Number(multiplier) ?? 1.0}
      WHERE id = ${instanceId}
    `);
    res.json({ success: true, instanceId, multiplier, reason });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set event multiplier' });
  }
});

export default router;
