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
  awardCampaignXP,
  listAllProfiles,
  updateProfile,
  type XPTier,
  type XPProfile,
} from '../bounty-xp-service';

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
    await run(`ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS gamefolio_managed BOOLEAN DEFAULT false`);
    await run(`ALTER TABLE campaign_template_bounties ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 500`);
    await run(`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS deadline TIMESTAMP`);
    await run(`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS notes TEXT`);
    await run(`
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
        COALESCE(t.xp_tier, 'standard') AS xp_tier,
        COALESCE(ci.xp_event_multiplier, 1.0) AS xp_event_multiplier,
        COALESCE(ci.gamefolio_managed, false) AS gamefolio_managed,
        (SELECT COUNT(*) FROM campaign_participants cp WHERE cp.instance_id = ci.id) AS participant_count,
        (SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'demo' AND gk.status = 'available') AS demo_keys_remaining,
        (SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'full' AND gk.status = 'available') AS full_keys_remaining,
        (SELECT json_agg(b ORDER BY b.completion_order) FROM campaign_template_bounties b WHERE b.template_id = t.id) AS bounties
      FROM campaign_instances ci
      JOIN campaign_templates t ON t.id = ci.template_id
      WHERE ${statusCondition}
        AND t.status != 'inactive'
      ORDER BY COALESCE(ci.gamefolio_managed, false) DESC, t.recommended DESC, t.featured DESC, ci.actual_start DESC
    `);

    let rows = toRows(campaigns);

    // Attach computed XP to each campaign
    rows = rows.map((r: any) => {
      const tier = (r.xp_tier || 'standard') as XPTier;
      const mult = Number(r.xp_event_multiplier ?? 1.0);
      return {
        ...r,
        total_campaign_xp: computeCampaignTotalXP(tier, mult),
        completion_bonus_xp: computeCompletionBonus(tier, mult),
        xp_tier: tier,
      };
    });

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
        COALESCE(t.xp_tier, 'standard') AS xp_tier,
        COALESCE(ci.xp_event_multiplier, 1.0) AS xp_event_multiplier,
        COALESCE(ci.gamefolio_managed, false) AS gamefolio_managed,
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

    const tier = (campaign.xp_tier || 'standard') as XPTier;
    const mult = Number(campaign.xp_event_multiplier ?? 1.0);
    res.json({
      ...campaign,
      total_campaign_xp: computeCampaignTotalXP(tier, mult),
      completion_bonus_xp: computeCompletionBonus(tier, mult),
      xp_tier: tier,
    });
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

    // Award join XP
    const [template] = toRows(await db.execute(sql`SELECT COALESCE(xp_tier, 'standard') AS xp_tier FROM campaign_templates WHERE id = (SELECT template_id FROM campaign_instances WHERE id = ${instanceId})`)) as any[];
    const tier2 = (template?.xp_tier || 'standard') as XPTier;
    const profile = getXPProfile(tier2);
    await awardCampaignXP(userId, profile.joinXP, 'campaign_join', `Joined campaign #${instanceId}`, instanceId);
    if (demoKeyValue) {
      await awardCampaignXP(userId, profile.demoClaimXP, 'campaign_demo_claim', `Claimed demo key for campaign #${instanceId}`, instanceId);
    }

    res.json({
      success: true,
      demoKey: demoKeyValue,
      deadline: deadline.toISOString(),
      xpAwarded: profile.joinXP + (demoKeyValue ? profile.demoClaimXP : 0),
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

    // Load bounty definition + campaign tier
    const [bounty] = toRows(await db.execute(sql`
      SELECT b.*, t.id AS template_id, COALESCE(t.xp_tier, 'standard') AS xp_tier
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

    // Compute XP for this submission (deferred until approval, but compute now for preview)
    const tier = (bounty.xp_tier || 'standard') as XPTier;
    const profile = getXPProfile(tier);
    const ct = bounty.content_type as string;
    // Count prior submissions of same type for bonus calculation
    const [prior] = toRows(await db.execute(sql`
      SELECT COUNT(*) AS qty FROM bounty_submissions
      WHERE participant_id = ${userId} AND instance_id = ${instanceId}
        AND bounty_id IN (SELECT id FROM campaign_template_bounties WHERE template_id = ${bounty.template_id} AND content_type = ${ct})
        AND status IN ('pending','under_review','approved')
    `)) as any[];
    const isFirst = Number(prior?.qty ?? 0) === 0;
    const xpPreview = computeBountyXP(profile, ct, isFirst, bounty.quantity ?? 1, Number(prior?.qty ?? 0));

    // Insert submission
    const [submission] = toRows(await db.execute(sql`
      INSERT INTO bounty_submissions
        (instance_id, participant_id, bounty_id, content_type, clip_id, screenshot_id, reel_id, content_url, content_data, status, submitted_at, xp_awarded)
      VALUES
        (${instanceId}, ${userId}, ${bountyId}, ${contentType ?? bounty.content_type},
         ${clipId ?? null}, ${screenshotId ?? null}, ${reelId ?? null},
         ${contentUrl ?? null}, ${contentData ? JSON.stringify(contentData) : null},
         'pending', NOW(), 0)
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

    res.status(201).json({ submission, allMandatorySubmitted, xpPreview });
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

    // Award completion bonus XP
    const [tierRow] = toRows(await db.execute(sql`
      SELECT COALESCE(t.xp_tier, 'standard') AS xp_tier, COALESCE(ci.xp_event_multiplier, 1.0) AS mult
      FROM campaign_instances ci
      JOIN campaign_templates t ON t.id = ci.template_id
      WHERE ci.id = ${instanceId}
    `)) as any[];
    const tier3 = (tierRow?.xp_tier || 'standard') as XPTier;
    const mult3 = Number(tierRow?.mult ?? 1.0);
    const bonusXP = computeCompletionBonus(tier3, mult3);
    await awardCampaignXP(userId, bonusXP, 'campaign_completion', `Completed campaign #${instanceId}`, instanceId);

    res.json({ success: true, fullKey: key.key_value, xpAwarded: bonusXP });
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

        // Award XP for this approved submission
        const [tierRow2] = toRows(await db.execute(sql`
          SELECT COALESCE(t.xp_tier, 'standard') AS xp_tier, COALESCE(ci.xp_event_multiplier, 1.0) AS mult
          FROM campaign_instances ci
          JOIN campaign_templates t ON t.id = ci.template_id
          WHERE ci.id = ${sub.instance_id}
        `)) as any[];
        const tier4 = (tierRow2?.xp_tier || 'standard') as XPTier;
        const profile4 = getXPProfile(tier4);
        const mult4 = Number(tierRow2?.mult ?? 1.0);

        // Load bounty details to compute XP
        const [bountyInfo] = toRows(await db.execute(sql`
          SELECT b.content_type, b.quantity FROM campaign_template_bounties b
          JOIN bounty_submissions bs ON bs.bounty_id = b.id
          WHERE bs.id = ${submissionId}
        `)) as any[];
        if (bountyInfo) {
          // Count prior approved submissions of same type for bonus
          const [priorApproved] = toRows(await db.execute(sql`
            SELECT COUNT(*) AS qty FROM bounty_submissions
            WHERE participant_id = ${sub.participant_id} AND instance_id = ${sub.instance_id}
              AND bounty_id IN (SELECT id FROM campaign_template_bounties WHERE template_id = (SELECT template_id FROM campaign_instances WHERE id = ${sub.instance_id}) AND content_type = ${bountyInfo.content_type})
              AND status = 'approved' AND id != ${submissionId}
          `)) as any[];
          const isFirst2 = Number(priorApproved?.qty ?? 0) === 0;
          const bountyXP = computeBountyXP(profile4, bountyInfo.content_type, isFirst2, bountyInfo.quantity ?? 1, Number(priorApproved?.qty ?? 0));
          const totalXP = Math.round(bountyXP * mult4);
          await awardCampaignXP(sub.participant_id, totalXP, 'bounty_approved', `Bounty approved in campaign #${sub.instance_id}`, sub.instance_id);
          await db.execute(sql`UPDATE bounty_submissions SET xp_awarded = ${totalXP} WHERE id = ${submissionId}`);
        }
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
