import express from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

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

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated?.() || !req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// ─────────────────────────────────────────────
// TABLE SETUP
// ─────────────────────────────────────────────

export async function ensureBountyMarketplaceTables() {
  try {
    // Extend campaign_participants with more status tracking
    await db.execute(sql`
      ALTER TABLE campaign_participants
        ADD COLUMN IF NOT EXISTS deadline TIMESTAMP,
        ADD COLUMN IF NOT EXISTS notes TEXT
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bounty_submissions (
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
        reviewed_at TIMESTAMP
      )
    `);
  } catch (err) {
    console.error('Failed to ensure bounty marketplace tables:', err);
  }
}

// ─────────────────────────────────────────────
// MARKETPLACE — PUBLIC
// ─────────────────────────────────────────────

// GET /api/bounties — list live/approved campaigns for participants
router.get('/', async (req, res) => {
  try {
    const { filter, genre, platform } = req.query;

    let statusCondition = sql`ci.status IN ('live', 'approved')`;

    const campaigns = await db.execute(sql`
      SELECT
        ci.id,
        ci.status,
        ci.game_name,
        ci.game_artwork_url,
        ci.game_steam_app_id,
        ci.game_itch_url,
        ci.game_epic_slug,
        ci.artwork_url,
        ci.actual_start,
        ci.end_date,
        ci.created_at,
        t.name AS template_name,
        t.slug AS template_slug,
        t.description,
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
        t.featured,
        t.recommended,
        (SELECT COUNT(*) FROM campaign_participants cp WHERE cp.instance_id = ci.id) AS participant_count,
        (SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'demo' AND gk.status = 'available') AS demo_keys_remaining,
        (SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'full' AND gk.status = 'available') AS full_keys_remaining,
        (SELECT json_agg(b ORDER BY b.completion_order) FROM campaign_template_bounties b WHERE b.template_id = t.id) AS bounties
      FROM campaign_instances ci
      JOIN campaign_templates t ON t.id = ci.template_id
      WHERE ${statusCondition}
        AND t.status != 'inactive'
      ORDER BY t.recommended DESC, t.featured DESC, ci.actual_start DESC
    `);

    let rows = toRows(campaigns);

    // Apply client-side filters
    if (filter === 'recommended') rows = rows.filter((r: any) => r.recommended);
    if (filter === 'demo_available') rows = rows.filter((r: any) => Number(r.demo_keys_remaining) > 0);
    if (filter === 'full_game') rows = rows.filter((r: any) => r.completion_reward === 'full_game_key');

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
        t.description,
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
        t.featured,
        t.recommended,
        (SELECT COUNT(*) FROM campaign_participants cp WHERE cp.instance_id = ci.id) AS participant_count,
        (SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'demo' AND gk.status = 'available') AS demo_keys_remaining,
        (SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'full' AND gk.status = 'available') AS full_keys_remaining,
        (SELECT json_agg(b ORDER BY b.completion_order) FROM campaign_template_bounties b WHERE b.template_id = t.id) AS bounties
      FROM campaign_instances ci
      JOIN campaign_templates t ON t.id = ci.template_id
      WHERE ci.id = ${instanceId}
        AND ci.status IN ('live', 'approved')
    `));

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
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
    const userId = req.user!.id;
    const instanceId = Number(req.params.instanceId);

    // 1. Load campaign
    const [campaign] = toRows(await db.execute(sql`
      SELECT ci.*, t.participant_capacity, t.demo_keys_required
      FROM campaign_instances ci
      JOIN campaign_templates t ON t.id = ci.template_id
      WHERE ci.id = ${instanceId} AND ci.status IN ('live', 'approved')
    `)) as any[];

    if (!campaign) return res.status(404).json({ error: 'Campaign not found or not active' });

    // 2. Check already joined
    const [existing] = toRows(await db.execute(sql`
      SELECT id, status FROM campaign_participants WHERE instance_id = ${instanceId} AND user_id = ${userId}
    `));
    if (existing) return res.status(409).json({ error: 'You have already joined this campaign', status: (existing as any).status });

    // 3. Check capacity
    const [counts] = toRows(await db.execute(sql`
      SELECT
        COUNT(*) AS participant_count,
        (SELECT COUNT(*) FROM game_keys WHERE instance_id = ${instanceId} AND key_type = 'demo' AND status = 'available') AS demo_keys_available
      FROM campaign_participants WHERE instance_id = ${instanceId}
    `)) as any[];

    const participantCount = Number(counts?.participant_count ?? 0);
    const demoKeysAvailable = Number(counts?.demo_keys_available ?? 0);

    if (participantCount >= Number(campaign.participant_capacity)) {
      return res.status(409).json({ error: 'This campaign is full' });
    }

    // 4. Assign demo key if required
    let demoKeyId: number | null = null;
    let demoKeyValue: string | null = null;

    if (Number(campaign.demo_keys_required) > 0) {
      if (demoKeysAvailable === 0) {
        return res.status(409).json({ error: 'No demo keys available for this campaign' });
      }

      // Claim one key
      const [key] = toRows(await db.execute(sql`
        UPDATE game_keys
        SET status = 'assigned', assigned_user_id = ${userId}, assigned_at = NOW()
        WHERE id = (
          SELECT id FROM game_keys
          WHERE instance_id = ${instanceId} AND key_type = 'demo' AND status = 'available'
          ORDER BY id LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id, key_value
      `)) as any[];

      if (!key) return res.status(409).json({ error: 'Could not assign demo key — please try again' });
      demoKeyId = key.id;
      demoKeyValue = key.key_value;
    }

    // 5. Create participant record
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + Number(campaign.duration ?? 14));

    await db.execute(sql`
      INSERT INTO campaign_participants
        (instance_id, user_id, status, demo_key_id, joined_at, deadline)
      VALUES
        (${instanceId}, ${userId}, 'demo_key_claimed', ${demoKeyId}, NOW(), ${deadline.toISOString()})
    `);

    res.json({
      success: true,
      demoKey: demoKeyValue,
      deadline: deadline.toISOString(),
      message: demoKeyValue ? 'Demo key assigned. Play the game and complete the bounties!' : 'Joined campaign successfully!',
    });
  } catch (err: any) {
    console.error('POST /api/bounties/:instanceId/join error:', err);
    res.status(500).json({ error: 'Failed to join campaign' });
  }
});

// ─────────────────────────────────────────────
// MY CAMPAIGNS — AUTHENTICATED
// ─────────────────────────────────────────────

// GET /api/bounties/my/campaigns — all joined campaigns
router.get('/my/campaigns', requireAuth, async (req, res) => {
  try {
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
        ci.game_name,
        ci.game_artwork_url,
        ci.game_steam_app_id,
        ci.end_date,
        t.name AS template_name,
        t.slug AS template_slug,
        t.category,
        t.duration,
        t.completion_reward,
        t.completion_reward_description,
        (SELECT COUNT(*) FROM campaign_template_bounties WHERE template_id = t.id AND mandatory = true) AS mandatory_bounty_count,
        (SELECT COUNT(*) FROM bounty_submissions bs WHERE bs.instance_id = ci.id AND bs.participant_id = ${userId} AND bs.status = 'approved') AS approved_bounties,
        (SELECT COUNT(*) FROM bounty_submissions bs WHERE bs.instance_id = ci.id AND bs.participant_id = ${userId}) AS submitted_bounties,
        (SELECT key_value FROM game_keys gk WHERE gk.id = cp.demo_key_id) AS demo_key_value,
        (SELECT key_value FROM game_keys gk WHERE gk.id = cp.full_key_id) AS full_key_value
      FROM campaign_participants cp
      JOIN campaign_instances ci ON ci.id = cp.instance_id
      JOIN campaign_templates t ON t.id = ci.template_id
      WHERE cp.user_id = ${userId}
      ORDER BY cp.joined_at DESC
    `);
    res.json(toRows(campaigns));
  } catch (err) {
    console.error('GET /api/bounties/my/campaigns error:', err);
    res.status(500).json({ error: 'Failed to load campaigns' });
  }
});

// GET /api/bounties/my/:instanceId — progress on one campaign
router.get('/my/:instanceId', requireAuth, async (req, res) => {
  try {
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
        ci.game_name,
        ci.game_artwork_url,
        ci.game_steam_app_id,
        ci.game_itch_url,
        ci.end_date,
        t.id AS template_id,
        t.name AS template_name,
        t.category,
        t.duration,
        t.completion_reward,
        t.completion_reward_description,
        (SELECT key_value FROM game_keys gk WHERE gk.id = cp.demo_key_id) AS demo_key_value,
        (SELECT key_value FROM game_keys gk WHERE gk.id = cp.full_key_id) AS full_key_value
      FROM campaign_participants cp
      JOIN campaign_instances ci ON ci.id = cp.instance_id
      JOIN campaign_templates t ON t.id = ci.template_id
      WHERE cp.instance_id = ${instanceId} AND cp.user_id = ${userId}
    `)) as any[];

    if (!participation) return res.status(404).json({ error: 'You are not participating in this campaign' });

    // Load bounties with submission status
    const bounties = toRows(await db.execute(sql`
      SELECT
        b.*,
        (
          SELECT json_agg(s ORDER BY s.submitted_at DESC)
          FROM bounty_submissions s
          WHERE s.bounty_id = b.id AND s.instance_id = ${instanceId} AND s.participant_id = ${userId}
        ) AS submissions,
        (
          SELECT COUNT(*) FROM bounty_submissions s
          WHERE s.bounty_id = b.id AND s.instance_id = ${instanceId} AND s.participant_id = ${userId} AND s.status = 'approved'
        ) AS approved_count
      FROM campaign_template_bounties b
      WHERE b.template_id = ${participation.template_id}
      ORDER BY b.completion_order ASC
    `));

    res.json({ ...participation, bounties });
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
    const userId = req.user!.id;
    const instanceId = Number(req.params.instanceId);
    const bountyId = Number(req.params.bountyId);

    // Verify participation
    const [participation] = toRows(await db.execute(sql`
      SELECT id, status FROM campaign_participants
      WHERE instance_id = ${instanceId} AND user_id = ${userId}
    `)) as any[];

    if (!participation) return res.status(403).json({ error: 'You are not participating in this campaign' });
    if (participation.status === 'completed') return res.status(400).json({ error: 'Campaign is already completed' });

    // Load bounty definition
    const [bounty] = toRows(await db.execute(sql`
      SELECT b.*, t.id AS template_id
      FROM campaign_template_bounties b
      JOIN campaign_templates t ON t.id = b.template_id
      JOIN campaign_instances ci ON ci.template_id = t.id
      WHERE b.id = ${bountyId} AND ci.id = ${instanceId}
    `)) as any[];

    if (!bounty) return res.status(404).json({ error: 'Bounty not found' });

    const {
      contentType, contentUrl, contentData,
      clipId, screenshotId, reelId,
    } = req.body;

    // Insert submission
    const [submission] = toRows(await db.execute(sql`
      INSERT INTO bounty_submissions
        (instance_id, participant_id, bounty_id, content_type, clip_id, screenshot_id, reel_id, content_url, content_data, status, submitted_at)
      VALUES
        (${instanceId}, ${userId}, ${bountyId}, ${contentType ?? bounty.content_type},
         ${clipId ?? null}, ${screenshotId ?? null}, ${reelId ?? null},
         ${contentUrl ?? null}, ${contentData ? JSON.stringify(contentData) : null},
         'pending', NOW())
      RETURNING *
    `)) as any[];

    // Check if all mandatory bounties now have at least one pending/approved submission
    const [completionCheck] = toRows(await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE b.mandatory = true) AS mandatory_total,
        COUNT(DISTINCT bs.bounty_id) FILTER (WHERE b.mandatory = true AND bs.status IN ('pending', 'under_review', 'approved')) AS mandatory_submitted
      FROM campaign_template_bounties b
      JOIN campaign_instances ci ON ci.template_id = b.template_id
      LEFT JOIN bounty_submissions bs ON bs.bounty_id = b.id AND bs.instance_id = ${instanceId} AND bs.participant_id = ${userId}
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

    res.status(201).json({ submission, allMandatorySubmitted });
  } catch (err) {
    console.error('POST /api/bounties/my/:instanceId/submit/:bountyId error:', err);
    res.status(500).json({ error: 'Failed to submit content' });
  }
});

// POST /api/bounties/my/:instanceId/claim-full-key
router.post('/my/:instanceId/claim-full-key', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const instanceId = Number(req.params.instanceId);

    const [participation] = toRows(await db.execute(sql`
      SELECT cp.*, t.full_keys_required
      FROM campaign_participants cp
      JOIN campaign_instances ci ON ci.id = cp.instance_id
      JOIN campaign_templates t ON t.id = ci.template_id
      WHERE cp.instance_id = ${instanceId} AND cp.user_id = ${userId}
    `)) as any[];

    if (!participation) return res.status(404).json({ error: 'Not a participant' });
    if (participation.full_key_id) return res.status(409).json({ error: 'You have already claimed a full-game key' });

    // Check all mandatory bounties are approved
    const [check] = toRows(await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE b.mandatory = true) AS mandatory_total,
        COUNT(DISTINCT bs.bounty_id) FILTER (WHERE b.mandatory = true AND bs.status = 'approved') AS mandatory_approved
      FROM campaign_template_bounties b
      JOIN campaign_instances ci ON ci.template_id = b.template_id
      LEFT JOIN bounty_submissions bs ON bs.bounty_id = b.id AND bs.instance_id = ${instanceId} AND bs.participant_id = ${userId}
      WHERE ci.id = ${instanceId}
    `)) as any[];

    const mandatory = Number(check?.mandatory_total ?? 0);
    const approved = Number(check?.mandatory_approved ?? 0);

    if (mandatory > 0 && approved < mandatory) {
      return res.status(400).json({
        error: `All mandatory bounties must be approved first (${approved}/${mandatory} approved)`,
      });
    }

    // Claim a full key
    const [key] = toRows(await db.execute(sql`
      UPDATE game_keys
      SET status = 'assigned', assigned_user_id = ${userId}, assigned_at = NOW()
      WHERE id = (
        SELECT id FROM game_keys
        WHERE instance_id = ${instanceId} AND key_type = 'full' AND status = 'available'
        ORDER BY id LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, key_value
    `)) as any[];

    if (!key) return res.status(409).json({ error: 'No full-game keys available' });

    await db.execute(sql`
      UPDATE campaign_participants
      SET full_key_id = ${key.id}, status = 'completed', completed_at = NOW()
      WHERE instance_id = ${instanceId} AND user_id = ${userId}
    `);

    res.json({ success: true, fullKey: key.key_value });
  } catch (err) {
    console.error('POST /api/bounties/my/:instanceId/claim-full-key error:', err);
    res.status(500).json({ error: 'Failed to claim full-game key' });
  }
});

// ─────────────────────────────────────────────
// ADMIN — SUBMISSION REVIEW
// ─────────────────────────────────────────────

// GET /api/bounties/admin/submissions — list pending submissions
router.get('/admin/submissions', requireAdmin, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const submissions = await db.execute(sql`
      SELECT
        bs.*,
        u.username, u.display_name,
        ci.game_name,
        b.title AS bounty_title,
        b.content_type
      FROM bounty_submissions bs
      JOIN users u ON u.id = bs.participant_id
      JOIN campaign_instances ci ON ci.id = bs.instance_id
      JOIN campaign_template_bounties b ON b.id = bs.bounty_id
      WHERE bs.status = ${status as string}
      ORDER BY bs.submitted_at ASC
    `);
    res.json(toRows(submissions));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load submissions' });
  }
});

// PATCH /api/bounties/admin/submissions/:id/review
router.patch('/admin/submissions/:id/review', requireAdmin, async (req, res) => {
  try {
    const submissionId = Number(req.params.id);
    const { verdict, notes } = req.body; // verdict: 'approved' | 'rejected' | 'changes_requested'

    await db.execute(sql`
      UPDATE bounty_submissions
      SET status = ${verdict}, review_notes = ${notes ?? null}, reviewed_at = NOW()
      WHERE id = ${submissionId}
    `);

    // If approved, check if campaign participant can claim full key
    if (verdict === 'approved') {
      const [sub] = toRows(await db.execute(sql`SELECT instance_id, participant_id FROM bounty_submissions WHERE id = ${submissionId}`)) as any[];
      if (sub) {
        const [check] = toRows(await db.execute(sql`
          SELECT
            COUNT(*) FILTER (WHERE b.mandatory = true) AS mandatory_total,
            COUNT(DISTINCT bs.bounty_id) FILTER (WHERE b.mandatory = true AND bs.status = 'approved') AS mandatory_approved
          FROM campaign_template_bounties b
          JOIN campaign_instances ci ON ci.template_id = b.template_id
          LEFT JOIN bounty_submissions bs ON bs.bounty_id = b.id AND bs.instance_id = ${sub.instance_id} AND bs.participant_id = ${sub.participant_id}
          WHERE ci.id = ${sub.instance_id}
        `)) as any[];

        const allApproved = Number(check?.mandatory_total) > 0 && Number(check?.mandatory_approved) >= Number(check?.mandatory_total);
        if (allApproved) {
          await db.execute(sql`
            UPDATE campaign_participants SET status = 'completed_and_verified'
            WHERE instance_id = ${sub.instance_id} AND user_id = ${sub.participant_id}
              AND status NOT IN ('completed', 'full_game_awarded')
          `);
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to review submission' });
  }
});

export default router;
