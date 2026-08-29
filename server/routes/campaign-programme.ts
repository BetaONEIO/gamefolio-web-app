import express from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = express.Router();

// ─────────────────────────────────────────────
// DB SETUP
// ─────────────────────────────────────────────

async function ensureCampaignTables() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS campaign_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        description TEXT,
        best_use_case TEXT,
        artwork_url TEXT,
        duration INTEGER NOT NULL,
        participant_capacity INTEGER NOT NULL,
        demo_keys_required INTEGER NOT NULL DEFAULT 0,
        full_keys_required INTEGER NOT NULL DEFAULT 0,
        completion_reward TEXT DEFAULT 'full_game_key',
        completion_reward_description TEXT,
        campaign_price INTEGER DEFAULT 0,
        estimated_clips INTEGER DEFAULT 0,
        estimated_reels INTEGER DEFAULT 0,
        estimated_screenshots INTEGER DEFAULT 0,
        estimated_feedback INTEGER DEFAULT 0,
        estimated_views_min INTEGER DEFAULT 0,
        estimated_views_max INTEGER DEFAULT 0,
        status TEXT DEFAULT 'available',
        featured BOOLEAN DEFAULT false,
        recommended BOOLEAN DEFAULT false,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS campaign_template_bounties (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES campaign_templates(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        mandatory BOOLEAN DEFAULT true,
        quantity INTEGER DEFAULT 1,
        completion_order INTEGER DEFAULT 0,
        xp_reward INTEGER DEFAULT 500,
        validation_method TEXT DEFAULT 'manual_review',
        content_type TEXT
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS campaign_instances (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES campaign_templates(id),
        developer_user_id INTEGER NOT NULL,
        game_id INTEGER,
        game_name TEXT,
        game_artwork_url TEXT,
        game_steam_app_id TEXT,
        game_itch_url TEXT,
        game_epic_slug TEXT,
        artwork_url TEXT,
        start_type TEXT DEFAULT 'asap',
        scheduled_start TIMESTAMP,
        actual_start TIMESTAMP,
        end_date TIMESTAMP,
        auto_campaign BOOLEAN DEFAULT false,
        auto_campaign_settings JSONB,
        status TEXT DEFAULT 'draft',
        admin_notes TEXT,
        rejection_reason TEXT,
        submitted_at TIMESTAMP,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS game_key_batches (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER NOT NULL REFERENCES campaign_instances(id) ON DELETE CASCADE,
        key_type TEXT NOT NULL,
        total_keys INTEGER DEFAULT 0,
        valid_keys INTEGER DEFAULT 0,
        duplicate_keys INTEGER DEFAULT 0,
        invalid_keys INTEGER DEFAULT 0,
        distributed_keys INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS game_keys (
        id SERIAL PRIMARY KEY,
        batch_id INTEGER REFERENCES game_key_batches(id) ON DELETE CASCADE,
        instance_id INTEGER REFERENCES campaign_instances(id) ON DELETE SET NULL,
        developer_user_id INTEGER,
        key_type TEXT NOT NULL,
        key_value TEXT NOT NULL,
        status TEXT DEFAULT 'available',
        assigned_user_id INTEGER,
        assigned_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Migration: make game_keys columns nullable for pool support
    await db.execute(sql`
      ALTER TABLE game_keys ALTER COLUMN instance_id DROP NOT NULL
    `).catch(() => {});
    await db.execute(sql`
      ALTER TABLE game_keys ADD COLUMN IF NOT EXISTS developer_user_id INTEGER
    `).catch(() => {});
    await db.execute(sql`
      ALTER TABLE game_key_batches ALTER COLUMN instance_id DROP NOT NULL
    `).catch(() => {});
    await db.execute(sql`
      ALTER TABLE game_key_batches ADD COLUMN IF NOT EXISTS developer_user_id INTEGER
    `).catch(() => {});

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS campaign_participants (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER NOT NULL REFERENCES campaign_instances(id),
        user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'enrolled',
        demo_key_id INTEGER REFERENCES game_keys(id),
        full_key_id INTEGER REFERENCES game_keys(id),
        joined_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        UNIQUE(instance_id, user_id)
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS auto_campaign_settings (
        id SERIAL PRIMARY KEY,
        developer_user_id INTEGER NOT NULL UNIQUE,
        enabled BOOLEAN DEFAULT false,
        allowed_templates JSONB DEFAULT '[]',
        frequency TEXT DEFAULT 'weekly',
        max_creators_per_campaign INTEGER DEFAULT 20,
        min_key_reserve INTEGER DEFAULT 10,
        key_pool_size INTEGER DEFAULT 50,
        game_name TEXT,
        game_artwork_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Migration: add updated_at to campaign_templates if missing (seed updates need it)
    await db.execute(sql`
      ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `).catch(() => {});

    // Migration: recreate auto_campaign_settings with correct column types (safe because data is minimal)
    await db.execute(sql`
      DROP TABLE IF EXISTS auto_campaign_settings
    `).catch(() => {});
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS auto_campaign_settings (
        id SERIAL PRIMARY KEY,
        developer_user_id INTEGER NOT NULL UNIQUE,
        enabled BOOLEAN DEFAULT false,
        allowed_templates JSONB DEFAULT '[]',
        frequency TEXT DEFAULT 'weekly',
        max_creators_per_campaign INTEGER DEFAULT 20,
        min_key_reserve INTEGER DEFAULT 10,
        key_pool_size INTEGER DEFAULT 50,
        game_name TEXT,
        game_artwork_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Migration: add new columns if they don't exist
    await db.execute(sql`
      ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS estimated_reels INTEGER DEFAULT 0
    `);
    await db.execute(sql`
      ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS auto_campaign BOOLEAN DEFAULT false
    `);
    await db.execute(sql`
      ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS auto_campaign_settings JSONB
    `);

    await seedCampaignTemplates();
  } catch (err) {
    console.error('Failed to create campaign tables:', err);
  }
}

// ─────────────────────────────────────────────
// SEED TEMPLATES
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// NEW SIMPLIFIED CAMPAIGN TEMPLATES (4 types)
// Every campaign requires BOTH demo keys AND full game keys.
// Bounties are auto-generated; developers never see them.
// ─────────────────────────────────────────────

const TEMPLATES = [
  {
    name: "Quick Creator Campaign",
    slug: "quick-creator",
    category: "quick_creator",
    description: "Fast exposure with quick creator participation and first impressions.",
    bestUseCase: "Getting your first creators playing and talking about your game.",
    duration: 5,
    participantCapacity: 20,
    demoKeysRequired: 20,
    fullKeysRequired: 20,
    completionReward: "full_game_key",
    completionRewardDescription: "Full game key awarded after verified completion",
    estimatedClips: 40,
    estimatedReels: 10,
    estimatedScreenshots: 40,
    estimatedFeedback: 20,
    estimatedViewsMin: 3000,
    estimatedViewsMax: 15000,
    status: "available",
    featured: false,
    recommended: false,
    displayOrder: 1,
    bounties: [
      { title: "Play the Game", description: "Download and play the game", mandatory: true, quantity: 1, order: 1, xp: 500, validation: "session_tracking", contentType: "session" },
      { title: "Upload 2 Gameplay Clips", description: "Upload 2 gameplay clips tagged with the game", mandatory: true, quantity: 2, order: 2, xp: 2000, validation: "manual_review", contentType: "clip" },
      { title: "Upload 2 Screenshots", description: "Upload 2 screenshots from the game", mandatory: true, quantity: 2, order: 3, xp: 400, validation: "manual_review", contentType: "screenshot" },
      { title: "Submit Feedback", description: "Submit your first impressions via the feedback form", mandatory: true, quantity: 1, order: 4, xp: 1000, validation: "form_submission", contentType: "feedback" },
    ],
  },
  {
    name: "Content Boost Campaign",
    slug: "content-boost",
    category: "content_boost",
    description: "Generate lots of promotional content across multiple formats.",
    bestUseCase: "Building a library of clips, reels and screenshots for marketing.",
    duration: 10,
    participantCapacity: 35,
    demoKeysRequired: 35,
    fullKeysRequired: 35,
    completionReward: "full_game_key",
    completionRewardDescription: "Full game key awarded after verified completion",
    estimatedClips: 70,
    estimatedReels: 35,
    estimatedScreenshots: 105,
    estimatedFeedback: 35,
    estimatedViewsMin: 10000,
    estimatedViewsMax: 50000,
    status: "available",
    featured: false,
    recommended: true,
    displayOrder: 2,
    bounties: [
      { title: "Play the Game", description: "Download and play the game", mandatory: true, quantity: 1, order: 1, xp: 500, validation: "session_tracking", contentType: "session" },
      { title: "Upload 2 Gameplay Clips", description: "Upload 2 gameplay clips tagged with the game", mandatory: true, quantity: 2, order: 2, xp: 2000, validation: "manual_review", contentType: "clip" },
      { title: "Upload 1 Reel", description: "Create and upload 1 gameplay reel", mandatory: true, quantity: 1, order: 3, xp: 2500, validation: "manual_review", contentType: "reel" },
      { title: "Upload 3 Screenshots", description: "Upload 3 screenshots from the game", mandatory: true, quantity: 3, order: 4, xp: 600, validation: "manual_review", contentType: "screenshot" },
      { title: "Submit Feedback", description: "Submit your impressions via the feedback form", mandatory: true, quantity: 1, order: 5, xp: 1000, validation: "form_submission", contentType: "feedback" },
    ],
  },
  {
    name: "Creator Showcase Campaign",
    slug: "creator-showcase",
    category: "creator_showcase",
    description: "Deep creator engagement with premium content including streams and reviews.",
    bestUseCase: "Maximum exposure and high-quality creator content.",
    duration: 21,
    participantCapacity: 25,
    demoKeysRequired: 25,
    fullKeysRequired: 25,
    completionReward: "full_game_key",
    completionRewardDescription: "Full game key awarded after verified completion",
    estimatedClips: 50,
    estimatedReels: 25,
    estimatedScreenshots: 75,
    estimatedFeedback: 25,
    estimatedViewsMin: 15000,
    estimatedViewsMax: 80000,
    status: "available",
    featured: false,
    recommended: false,
    displayOrder: 3,
    bounties: [
      { title: "Play the Game", description: "Download and play the game", mandatory: true, quantity: 1, order: 1, xp: 500, validation: "session_tracking", contentType: "session" },
      { title: "Upload 2 Gameplay Clips", description: "Upload 2 gameplay clips tagged with the game", mandatory: true, quantity: 2, order: 2, xp: 2000, validation: "manual_review", contentType: "clip" },
      { title: "Upload 1 Reel", description: "Create and upload 1 gameplay reel", mandatory: true, quantity: 1, order: 3, xp: 2500, validation: "manual_review", contentType: "reel" },
      { title: "Upload 3 Screenshots", description: "Upload 3 screenshots from the game", mandatory: true, quantity: 3, order: 4, xp: 600, validation: "manual_review", contentType: "screenshot" },
      { title: "Stream the Game", description: "Stream the game live for at least 1 hour", mandatory: true, quantity: 1, order: 5, xp: 3000, validation: "stream_duration", contentType: "stream" },
      { title: "Submit Review", description: "Submit a written or video review", mandatory: true, quantity: 1, order: 6, xp: 1500, validation: "form_submission", contentType: "feedback" },
    ],
  },
  {
    name: "Custom Campaign",
    slug: "custom-campaign",
    category: "custom",
    description: "For experienced developers who want full control over campaign settings.",
    bestUseCase: "Custom duration, capacity and targeting for specific needs.",
    duration: 14,
    participantCapacity: 20,
    demoKeysRequired: 20,
    fullKeysRequired: 20,
    completionReward: "full_game_key",
    completionRewardDescription: "Full game key awarded after verified completion",
    estimatedClips: 40,
    estimatedReels: 20,
    estimatedScreenshots: 60,
    estimatedFeedback: 20,
    estimatedViewsMin: 5000,
    estimatedViewsMax: 30000,
    status: "available",
    featured: false,
    recommended: false,
    displayOrder: 4,
    bounties: [
      { title: "Play the Game", description: "Download and play the game", mandatory: true, quantity: 1, order: 1, xp: 500, validation: "session_tracking", contentType: "session" },
      { title: "Upload Content", description: "Upload creator content tagged with the game", mandatory: true, quantity: 3, order: 2, xp: 2500, validation: "manual_review", contentType: "clip" },
      { title: "Submit Feedback", description: "Submit your impressions via the feedback form", mandatory: true, quantity: 1, order: 3, xp: 1000, validation: "form_submission", contentType: "feedback" },
    ],
  },
];

function toRows(result: any): any[] {
  // drizzle-orm/postgres-js returns a RowList (array-like), not { rows: [] }
  // drizzle-orm/node-postgres returns { rows: [] }
  // Support both shapes.
  if (Array.isArray(result)) return result as any[];
  if (result && Array.isArray(result.rows)) return result.rows;
  return [];
}

async function seedCampaignTemplates() {
  try {
    for (const t of TEMPLATES) {
      const existing = toRows(await db.execute(sql`SELECT id FROM campaign_templates WHERE slug = ${t.slug}`));
      let templateId: number;

      if (existing.length > 0) {
        templateId = (existing[0] as any).id;
        await db.execute(sql`
          UPDATE campaign_templates SET
            name = ${t.name},
            category = ${t.category},
            description = ${t.description},
            best_use_case = ${t.bestUseCase},
            duration = ${t.duration},
            participant_capacity = ${t.participantCapacity},
            demo_keys_required = ${t.demoKeysRequired},
            full_keys_required = ${t.fullKeysRequired},
            completion_reward = ${t.completionReward},
            completion_reward_description = ${t.completionRewardDescription},
            estimated_clips = ${t.estimatedClips},
            estimated_reels = ${t.estimatedReels ?? 0},
            estimated_screenshots = ${t.estimatedScreenshots},
            estimated_feedback = ${t.estimatedFeedback},
            estimated_views_min = ${t.estimatedViewsMin},
            estimated_views_max = ${t.estimatedViewsMax},
            status = ${t.status},
            featured = ${t.featured},
            recommended = ${t.recommended},
            display_order = ${t.displayOrder},
            updated_at = NOW()
          WHERE id = ${templateId}
        `);
        await db.execute(sql`DELETE FROM campaign_template_bounties WHERE template_id = ${templateId}`);
      } else {
        const insertedRows = toRows(await db.execute(sql`
          INSERT INTO campaign_templates
            (name, slug, category, description, best_use_case, duration, participant_capacity,
             demo_keys_required, full_keys_required, completion_reward, completion_reward_description,
             estimated_clips, estimated_reels, estimated_screenshots, estimated_feedback,
             estimated_views_min, estimated_views_max,
             status, featured, recommended, display_order)
          VALUES
            (${t.name}, ${t.slug}, ${t.category}, ${t.description}, ${t.bestUseCase},
             ${t.duration}, ${t.participantCapacity}, ${t.demoKeysRequired}, ${t.fullKeysRequired},
             ${t.completionReward}, ${t.completionRewardDescription},
             ${t.estimatedClips}, ${t.estimatedReels ?? 0}, ${t.estimatedScreenshots}, ${t.estimatedFeedback},
             ${t.estimatedViewsMin}, ${t.estimatedViewsMax},
             ${t.status}, ${t.featured}, ${t.recommended}, ${t.displayOrder})
          RETURNING id
        `));
        templateId = (insertedRows[0] as any).id;
      }

      for (const b of t.bounties) {
        await db.execute(sql`
          INSERT INTO campaign_template_bounties
            (template_id, title, description, mandatory, quantity, completion_order, xp_reward, validation_method, content_type)
          VALUES
            (${templateId}, ${b.title}, ${b.description}, ${b.mandatory}, ${b.quantity},
             ${b.order}, ${b.xp}, ${b.validation}, ${b.contentType})
        `);
      }
    }
    console.log('✅ Campaign templates seeded/updated');
  } catch (err) {
    console.error('Failed to seed campaign templates:', err);
  }
}

ensureCampaignTables();

// ─────────────────────────────────────────────
// AUTH MIDDLEWARE
// ─────────────────────────────────────────────

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated?.() || !req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated?.() || !req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
}

// ─────────────────────────────────────────────
// AUTO CAMPAIGN SCHEDULER
// ─────────────────────────────────────────────

/**
 * Run auto-campaign check for a single developer.
 * Creates a new auto-campaign if all safety checks pass.
 */
async function runAutoCampaignCheck(developerUserId: number): Promise<{ created: boolean; message: string; campaignId?: number }> {
  // 1. Load auto-campaign settings
  const settingsRows = toRows(await db.execute(sql`
    SELECT * FROM auto_campaign_settings WHERE developer_user_id = ${developerUserId}
  `)) as any[];

  if (settingsRows.length === 0 || !settingsRows[0].enabled) {
    return { created: false, message: 'Auto campaigns not enabled' };
  }

  const settings = settingsRows[0];
  const allowedTemplates = settings.allowed_templates ? (Array.isArray(settings.allowed_templates) ? settings.allowed_templates : JSON.parse(settings.allowed_templates)) : [];
  const maxCreators = settings.max_creators_per_campaign ?? 20;
  const minKeyReserve = settings.min_key_reserve ?? 10;
  const gameName = settings.game_name;
  const gameArtworkUrl = settings.game_artwork_url;

  if (allowedTemplates.length === 0) {
    return { created: false, message: 'No campaign templates selected for auto campaigns' };
  }

  // 2. Count active auto-campaigns (running or approved/scheduled)
  const activeRows = toRows(await db.execute(sql`
    SELECT COUNT(*) AS count FROM campaign_instances
    WHERE developer_user_id = ${developerUserId}
      AND auto_campaign = true
      AND status IN ('live', 'approved', 'scheduled', 'draft', 'awaiting_review')
  `)) as any[];
  const activeAutoCampaigns = Number(activeRows[0].count ?? 0);

  if (activeAutoCampaigns >= 3) {
    return { created: false, message: 'Maximum simultaneous auto-campaigns (3) already running' };
  }

  // 3. Count pool keys (unassigned to any instance)
  const demoPoolRows = toRows(await db.execute(sql`
    SELECT COUNT(*) AS count FROM game_keys
    WHERE developer_user_id = ${developerUserId}
      AND instance_id IS NULL
      AND key_type = 'demo'
      AND status = 'available'
  `)) as any[];
  const fullPoolRows = toRows(await db.execute(sql`
    SELECT COUNT(*) AS count FROM game_keys
    WHERE developer_user_id = ${developerUserId}
      AND instance_id IS NULL
      AND key_type = 'full'
      AND status = 'available'
  `)) as any[];
  const demoPool = Number(demoPoolRows[0].count ?? 0);
  const fullPool = Number(fullPoolRows[0].count ?? 0);

  // 4. Pick a template (random from allowed list)
  const tmplIds = allowedTemplates as number[];
  const randomTemplateId = tmplIds[Math.floor(Math.random() * tmplIds.length)];

  const [tmpl] = toRows(await db.execute(sql`
    SELECT id, name, duration, participant_capacity,
           demo_keys_required, full_keys_required, estimated_clips, estimated_screenshots
    FROM campaign_templates WHERE id = ${randomTemplateId}
  `)) as any[];

  if (!tmpl) {
    return { created: false, message: 'Selected template not found' };
  }

  const needDemo = Number(tmpl.demo_keys_required ?? tmpl.participant_capacity ?? 20);
  const needFull = Number(tmpl.full_keys_required ?? tmpl.participant_capacity ?? 20);
  const creators = Math.min(maxCreators, Number(tmpl.participant_capacity ?? 20));

  // 5. Safety: must have enough keys (required + reserve)
  if (demoPool < needDemo + minKeyReserve) {
    return { created: false, message: `Not enough demo keys in pool (${demoPool} available, ${needDemo + minKeyReserve} needed)` };
  }
  if (fullPool < needFull + minKeyReserve) {
    return { created: false, message: `Not enough full keys in pool (${fullPool} available, ${needFull + minKeyReserve} needed)` };
  }

  // 6. Create campaign instance
  const [instance] = toRows(await db.execute(sql`
    INSERT INTO campaign_instances
      (template_id, developer_user_id, game_name, game_artwork_url,
       status, auto_campaign, start_type, artwork_url, participant_capacity)
    VALUES
      (${randomTemplateId}, ${developerUserId}, ${gameName ?? null}, ${gameArtworkUrl ?? null},
       'approved', true, 'asap', ${gameArtworkUrl ?? null}, ${creators})
    RETURNING *
  `) as any[]);

  const instanceId = instance.id;

  // 7. Assign keys from pool to the new instance
  // Demo keys
  const demoKeysToAssign = toRows(await db.execute(sql`
    SELECT id FROM game_keys
    WHERE developer_user_id = ${developerUserId}
      AND instance_id IS NULL
      AND key_type = 'demo'
      AND status = 'available'
    ORDER BY created_at ASC
    LIMIT ${needDemo}
  `));
  for (const k of demoKeysToAssign) {
    await db.execute(sql`
      UPDATE game_keys SET instance_id = ${instanceId} WHERE id = ${(k as any).id}
    `);
  }

  // Full keys
  const fullKeysToAssign = toRows(await db.execute(sql`
    SELECT id FROM game_keys
    WHERE developer_user_id = ${developerUserId}
      AND instance_id IS NULL
      AND key_type = 'full'
      AND status = 'available'
    ORDER BY created_at ASC
    LIMIT ${needFull}
  `));
  for (const k of fullKeysToAssign) {
    await db.execute(sql`
      UPDATE game_keys SET instance_id = ${instanceId} WHERE id = ${(k as any).id}
    `);
  }

  return {
    created: true,
    message: `Auto-campaign "${tmpl.name}" created with ${creators} creators`,
    campaignId: instanceId,
  };
}

// Global scheduler interval (runs every 30 minutes)
let autoCampaignInterval: ReturnType<typeof setInterval> | null = null;

function startAutoCampaignScheduler() {
  if (autoCampaignInterval) return;
  autoCampaignInterval = setInterval(async () => {
    try {
      // Find all developers with auto campaigns enabled
      const devRows = toRows(await db.execute(sql`
        SELECT developer_user_id FROM auto_campaign_settings WHERE enabled = true
      `)) as any[];
      for (const row of devRows) {
        try {
          await runAutoCampaignCheck(row.developer_user_id);
        } catch (innerErr) {
          console.error(`Auto-campaign check failed for dev ${row.developer_user_id}:`, innerErr);
        }
      }
    } catch (err) {
      console.error('Auto-campaign scheduler tick failed:', err);
    }
  }, 30 * 60 * 1000); // 30 minutes
  console.log('✅ Auto-campaign scheduler started (30min interval)');
}

// Start scheduler after a brief delay (let DB init finish)
setTimeout(startAutoCampaignScheduler, 5000);

// ─────────────────────────────────────────────
// ROUTES: CAMPAIGN TEMPLATES
// ─────────────────────────────────────────────

// GET /api/campaigns/templates — list all active templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await db.execute(sql`
      SELECT t.*,
        (SELECT json_agg(b ORDER BY b.completion_order) FROM campaign_template_bounties b WHERE b.template_id = t.id) AS bounties
      FROM campaign_templates t
      WHERE t.status != 'inactive'
      ORDER BY t.display_order ASC
    `);
    res.json(toRows(templates));
  } catch (err) {
    console.error('GET /api/campaigns/templates error:', err);
    res.status(500).json({ error: 'Failed to load campaign templates' });
  }
});

// GET /api/campaigns/templates/:id — single template with full bounty list
router.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [template] = toRows(await db.execute(sql`
      SELECT t.*,
        (SELECT json_agg(b ORDER BY b.completion_order) FROM campaign_template_bounties b WHERE b.template_id = t.id) AS bounties
      FROM campaign_templates t WHERE t.id = ${Number(id)}
    `));
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load template' });
  }
});

// ─────────────────────────────────────────────
// ROUTES: CAMPAIGN INSTANCES (developer-facing)
// ─────────────────────────────────────────────

// GET /api/campaigns/overview — stats for the overview tab
router.get('/overview', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const stats = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'live') AS active_campaigns,
        COUNT(*) FILTER (WHERE status = 'scheduled' OR status = 'approved') AS scheduled_campaigns,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_campaigns,
        COUNT(*) FILTER (WHERE status = 'draft' OR status = 'awaiting_review' OR status = 'changes_requested') AS draft_campaigns,
        SUM((SELECT COUNT(*) FROM campaign_participants cp WHERE cp.instance_id = ci.id)) AS total_participants,
        SUM((SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'demo' AND gk.status = 'available')) AS demo_keys_remaining,
        SUM((SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'full' AND gk.status = 'available')) AS full_keys_remaining
      FROM campaign_instances ci
      WHERE ci.developer_user_id = ${userId}
    `);
    const row = (toRows(stats)[0] as any) ?? {};

    const recent = await db.execute(sql`
      SELECT ci.id, ci.status, ci.game_name, ci.game_artwork_url, ci.created_at,
        ci.scheduled_start, ci.actual_start, ci.end_date,
        t.name AS template_name, t.duration, t.participant_capacity
      FROM campaign_instances ci
      JOIN campaign_templates t ON t.id = ci.template_id
      WHERE ci.developer_user_id = ${userId}
      ORDER BY ci.created_at DESC LIMIT 5
    `);

    res.json({
      activeCampaigns: Number(row.active_campaigns ?? 0),
      scheduledCampaigns: Number(row.scheduled_campaigns ?? 0),
      completedCampaigns: Number(row.completed_campaigns ?? 0),
      draftCampaigns: Number(row.draft_campaigns ?? 0),
      totalParticipants: Number(row.total_participants ?? 0),
      demoKeysRemaining: Number(row.demo_keys_remaining ?? 0),
      fullKeysRemaining: Number(row.full_keys_remaining ?? 0),
      recentCampaigns: toRows(recent),
    });
  } catch (err) {
    console.error('GET /api/campaigns/overview error:', err);
    res.status(500).json({ error: 'Failed to load overview' });
  }
});

// GET /api/campaigns/instances — list developer's campaign instances
router.get('/instances', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const instances = await db.execute(sql`
      SELECT ci.*,
        t.name AS template_name, t.slug AS template_slug, t.duration,
        t.participant_capacity, t.demo_keys_required, t.full_keys_required,
        t.category, t.estimated_clips, t.estimated_screenshots,
        (SELECT COUNT(*) FROM campaign_participants cp WHERE cp.instance_id = ci.id) AS participant_count,
        (SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'demo' AND gk.status = 'available') AS demo_keys_remaining,
        (SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'full' AND gk.status = 'available') AS full_keys_remaining,
        (SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'demo') AS demo_keys_total,
        (SELECT COUNT(*) FROM game_keys gk WHERE gk.instance_id = ci.id AND gk.key_type = 'full') AS full_keys_total
      FROM campaign_instances ci
      JOIN campaign_templates t ON t.id = ci.template_id
      WHERE ci.developer_user_id = ${userId}
      ORDER BY ci.created_at DESC
    `);
    res.json(toRows(instances));
  } catch (err) {
    console.error('GET /api/campaigns/instances error:', err);
    res.status(500).json({ error: 'Failed to load campaigns' });
  }
});

// POST /api/campaigns/instances — create a new campaign instance (draft)
router.post('/instances', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      templateId, gameId, gameName, gameArtworkUrl, gameSteamAppId, gameItchUrl, gameEpicSlug,
      startType, scheduledStart, artworkUrl,
    } = req.body;

    if (!templateId) return res.status(400).json({ error: 'templateId is required' });

    const [tmpl] = toRows(await db.execute(sql`SELECT id FROM campaign_templates WHERE id = ${Number(templateId)}`));
    if (!tmpl) return res.status(404).json({ error: 'Campaign template not found' });

    // Active-campaign concurrency cap: free accounts get 1 active campaign at
    // a time, paid Indie Developer subscribers get up to 5. Drafts don't
    // count — only campaigns actually in flight (submitted, approved, live).
    const [subRow] = toRows(await db.execute(sql`
      SELECT is_indie_dev_subscriber AS "isIndieDevSubscriber" FROM users WHERE id = ${userId}
    `));
    const isIndieDevSubscriber = !!subRow?.isIndieDevSubscriber;
    const campaignLimit = isIndieDevSubscriber ? 5 : 1;

    const [{ count: activeCampaignCount }] = toRows(await db.execute(sql`
      SELECT COUNT(*)::int AS count FROM campaign_instances
      WHERE developer_user_id = ${userId} AND status NOT IN ('draft', 'completed', 'cancelled', 'rejected')
    `));

    if (activeCampaignCount >= campaignLimit) {
      return res.status(403).json({
        error: isIndieDevSubscriber
          ? `You've reached your active campaign limit (${campaignLimit}).`
          : `Free accounts can run 1 active campaign at a time. Upgrade to Game Developer to run up to 5.`,
      });
    }

    const [instance] = toRows(await db.execute(sql`
      INSERT INTO campaign_instances
        (template_id, developer_user_id, game_id, game_name, game_artwork_url,
         game_steam_app_id, game_itch_url, game_epic_slug,
         artwork_url, start_type, scheduled_start, status)
      VALUES
        (${Number(templateId)}, ${userId}, ${gameId ?? null}, ${gameName ?? null}, ${gameArtworkUrl ?? null},
         ${gameSteamAppId ?? null}, ${gameItchUrl ?? null}, ${gameEpicSlug ?? null},
         ${artworkUrl ?? null}, ${startType ?? 'asap'}, ${scheduledStart ?? null}, 'draft')
      RETURNING *
    `) as any[]);

    res.status(201).json(instance);
  } catch (err) {
    console.error('POST /api/campaigns/instances error:', err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// PATCH /api/campaigns/instances/:id — update draft (artwork, dates, game)
router.patch('/instances/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const instanceId = Number(req.params.id);
    const {
      gameId, gameName, gameArtworkUrl, gameSteamAppId, gameItchUrl, gameEpicSlug,
      startType, scheduledStart, artworkUrl, status,
    } = req.body;

    const [existing] = toRows(await db.execute(sql`
      SELECT id, developer_user_id, status FROM campaign_instances WHERE id = ${instanceId}
    `)) as any[];
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    if (existing.developer_user_id !== userId) return res.status(403).json({ error: 'Forbidden' });
    if (existing.status === 'live') return res.status(400).json({ error: 'Cannot modify a live campaign' });

    const newStatus = status === 'awaiting_review' ? 'awaiting_review' : undefined;
    const submittedAt = newStatus === 'awaiting_review' ? new Date().toISOString() : undefined;

    await db.execute(sql`
      UPDATE campaign_instances SET
        game_id = COALESCE(${gameId ?? null}, game_id),
        game_name = COALESCE(${gameName ?? null}, game_name),
        game_artwork_url = COALESCE(${gameArtworkUrl ?? null}, game_artwork_url),
        game_steam_app_id = COALESCE(${gameSteamAppId ?? null}, game_steam_app_id),
        game_itch_url = COALESCE(${gameItchUrl ?? null}, game_itch_url),
        game_epic_slug = COALESCE(${gameEpicSlug ?? null}, game_epic_slug),
        artwork_url = COALESCE(${artworkUrl ?? null}, artwork_url),
        start_type = COALESCE(${startType ?? null}, start_type),
        scheduled_start = COALESCE(${scheduledStart ?? null}, scheduled_start),
        status = COALESCE(${newStatus ?? null}, status),
        submitted_at = COALESCE(${submittedAt ?? null}, submitted_at),
        updated_at = NOW()
      WHERE id = ${instanceId}
    `);

    const [updated] = toRows(await db.execute(sql`SELECT * FROM campaign_instances WHERE id = ${instanceId}`));
    res.json(updated);
  } catch (err) {
    console.error('PATCH /api/campaigns/instances/:id error:', err);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// POST /api/campaigns/instances/:id/keys — upload keys for a campaign
router.post('/instances/:id/keys', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const instanceId = Number(req.params.id);
    const { keyType, keys } = req.body; // keyType: 'demo' | 'full'; keys: string[]

    if (!keyType || !['demo', 'full'].includes(keyType)) return res.status(400).json({ error: 'keyType must be demo or full' });
    if (!Array.isArray(keys) || keys.length === 0) return res.status(400).json({ error: 'keys array is required' });

    const [instance] = toRows(await db.execute(sql`
      SELECT id, developer_user_id, status FROM campaign_instances WHERE id = ${instanceId}
    `)) as any[];
    if (!instance) return res.status(404).json({ error: 'Campaign not found' });
    if (instance.developer_user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    // De-dupe and validate
    const trimmed = keys.map((k: string) => k.trim()).filter((k: string) => k.length > 0);
    const cleaned: string[] = [];
    const seen = new Set<string>();
    for (const k of trimmed) {
      if (!seen.has(k)) { seen.add(k); cleaned.push(k); }
    }
    const total = keys.length;
    const duplicates = total - cleaned.length;

    // Check for keys already in this campaign
    const existingKeysRes = await db.execute(sql`
      SELECT key_value FROM game_keys WHERE instance_id = ${instanceId} AND key_type = ${keyType}
    `);
    const existingSet = new Set((toRows(existingKeysRes) as any[]).map(r => r.key_value));
    const newKeys = cleaned.filter(k => !existingSet.has(k));
    const alreadyExists = cleaned.length - newKeys.length;

    // Create batch
    const [batch] = toRows(await db.execute(sql`
      INSERT INTO game_key_batches (instance_id, key_type, total_keys, valid_keys, duplicate_keys, invalid_keys)
      VALUES (${instanceId}, ${keyType}, ${total}, ${newKeys.length}, ${duplicates + alreadyExists}, 0)
      RETURNING id
    `)) as any[];

    // Insert individual keys
    for (const keyValue of newKeys) {
      await db.execute(sql`
        INSERT INTO game_keys (batch_id, instance_id, key_type, key_value, status)
        VALUES (${batch.id}, ${instanceId}, ${keyType}, ${keyValue}, 'available')
        ON CONFLICT DO NOTHING
      `);
    }

    res.json({
      added: newKeys.length,
      duplicates: duplicates + alreadyExists,
      total,
      batchId: batch.id,
    });
  } catch (err) {
    console.error('POST /api/campaigns/instances/:id/keys error:', err);
    res.status(500).json({ error: 'Failed to upload keys' });
  }
});

// POST /api/campaigns/instances/:id/submit — submit for Gamefolio review
router.post('/instances/:id/submit', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const instanceId = Number(req.params.id);

    const [instance] = toRows(await db.execute(sql`
      SELECT * FROM campaign_instances WHERE id = ${instanceId}
    `)) as any[];
    if (!instance) return res.status(404).json({ error: 'Campaign not found' });
    if (instance.developer_user_id !== userId) return res.status(403).json({ error: 'Forbidden' });
    if (!['draft', 'changes_requested'].includes(instance.status)) {
      return res.status(400).json({ error: 'Campaign cannot be submitted in its current state' });
    }

    await db.execute(sql`
      UPDATE campaign_instances
      SET status = 'awaiting_review', submitted_at = NOW(), updated_at = NOW()
      WHERE id = ${instanceId}
    `);

    res.json({ success: true, status: 'awaiting_review' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit campaign' });
  }
});

// ─────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────

// GET /api/campaigns/admin/instances — all instances for admin review
router.get('/admin/instances', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const statusFilter = status ? sql`AND ci.status = ${status as string}` : sql``;
    const instances = await db.execute(sql`
      SELECT ci.*,
        t.name AS template_name, t.slug AS template_slug,
        u.username AS developer_username, u.display_name AS developer_display_name
      FROM campaign_instances ci
      JOIN campaign_templates t ON t.id = ci.template_id
      JOIN users u ON u.id = ci.developer_user_id
      WHERE 1=1 ${statusFilter}
      ORDER BY ci.submitted_at DESC NULLS LAST, ci.created_at DESC
    `);
    res.json(toRows(instances));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load admin instances' });
  }
});

// PATCH /api/campaigns/admin/instances/:id/approve
router.patch('/admin/instances/:id/approve', requireAdmin, async (req, res) => {
  try {
    const instanceId = Number(req.params.id);
    await db.execute(sql`
      UPDATE campaign_instances
      SET status = 'approved', approved_at = NOW(), updated_at = NOW(), admin_notes = ${req.body.notes ?? null}
      WHERE id = ${instanceId}
    `);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve campaign' });
  }
});

// PATCH /api/campaigns/admin/instances/:id/reject
router.patch('/admin/instances/:id/reject', requireAdmin, async (req, res) => {
  try {
    const instanceId = Number(req.params.id);
    const { reason, status } = req.body; // status: 'rejected' | 'changes_requested'
    await db.execute(sql`
      UPDATE campaign_instances
      SET status = ${status ?? 'rejected'}, rejection_reason = ${reason ?? null}, updated_at = NOW()
      WHERE id = ${instanceId}
    `);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject campaign' });
  }
});

// PATCH /api/campaigns/admin/templates/:id — admin edits to a template
router.patch('/admin/templates/:id', requireAdmin, async (req, res) => {
  try {
    const templateId = Number(req.params.id);
    const { status, featured, recommended, displayOrder } = req.body;
    await db.execute(sql`
      UPDATE campaign_templates
      SET
        status = COALESCE(${status ?? null}, status),
        featured = COALESCE(${featured ?? null}, featured),
        recommended = COALESCE(${recommended ?? null}, recommended),
        display_order = COALESCE(${displayOrder ?? null}, display_order)
      WHERE id = ${templateId}
    `);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// ─────────────────────────────────────────────
// AUTO CAMPAIGN SETTINGS (Indie Pro feature)
// ─────────────────────────────────────────────

// GET /api/campaigns/auto/settings — get current auto-campaign config
router.get('/auto/settings', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const rows = toRows(await db.execute(sql`
      SELECT * FROM auto_campaign_settings WHERE developer_user_id = ${userId}
    `)) as any[];
    if (rows.length === 0) {
      return res.json({ enabled: false, settings: null });
    }
    const row = rows[0];
    const allowedTemplates = row.allowed_templates ? (Array.isArray(row.allowed_templates) ? row.allowed_templates : JSON.parse(row.allowed_templates)) : [];
    res.json({
      enabled: row.enabled ?? false,
      settings: {
        allowedTemplates,
        frequency: row.frequency ?? 'weekly',
        maxCreatorsPerCampaign: row.max_creators_per_campaign ?? 20,
        minKeyReserve: row.min_key_reserve ?? 10,
        keyPoolSize: row.key_pool_size ?? 50,
        gameName: row.game_name ?? '',
        gameArtworkUrl: row.game_artwork_url ?? '',
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load auto-campaign settings' });
  }
});

// POST /api/campaigns/auto/settings — save auto-campaign config
router.post('/auto/settings', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      enabled, allowedTemplates, frequency, maxCreatorsPerCampaign,
      minKeyReserve, keyPoolSize, gameName, gameArtworkUrl,
    } = req.body;

    // Upsert into auto_campaign_settings
    const existing = toRows(await db.execute(sql`
      SELECT id FROM auto_campaign_settings WHERE developer_user_id = ${userId}
    `));

    const templatesJson = JSON.stringify(allowedTemplates ?? []);
    if (existing.length > 0) {
      await db.execute(sql`
        UPDATE auto_campaign_settings SET
          enabled = ${enabled ?? false},
          allowed_templates = ${templatesJson}::jsonb,
          frequency = ${frequency ?? 'weekly'},
          max_creators_per_campaign = ${maxCreatorsPerCampaign ?? 20},
          min_key_reserve = ${minKeyReserve ?? 10},
          key_pool_size = ${keyPoolSize ?? 50},
          game_name = ${gameName ?? null},
          game_artwork_url = ${gameArtworkUrl ?? null},
          updated_at = NOW()
        WHERE developer_user_id = ${userId}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO auto_campaign_settings
          (developer_user_id, enabled, allowed_templates, frequency,
           max_creators_per_campaign, min_key_reserve, key_pool_size,
           game_name, game_artwork_url)
        VALUES
          (${userId}, ${enabled ?? false}, ${templatesJson}::jsonb, ${frequency ?? 'weekly'},
           ${maxCreatorsPerCampaign ?? 20}, ${minKeyReserve ?? 10}, ${keyPoolSize ?? 50},
           ${gameName ?? null}, ${gameArtworkUrl ?? null})
      `);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/campaigns/auto/settings error:', err);
    res.status(500).json({ error: 'Failed to save auto-campaign settings' });
  }
});

// GET /api/campaigns/auto/queue — auto-campaign history
router.get('/auto/queue', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const rows = toRows(await db.execute(sql`
      SELECT ci.id, ci.game_name, ci.game_artwork_url, ci.created_at, ci.status,
        t.name AS template_name, t.duration
      FROM campaign_instances ci
      JOIN campaign_templates t ON t.id = ci.template_id
      WHERE ci.developer_user_id = ${userId} AND ci.auto_campaign = true
      ORDER BY ci.created_at DESC
    `));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load auto-campaign queue' });
  }
});

// POST /api/campaigns/auto/trigger — manually trigger auto-campaign check (dev/admin)
router.post('/auto/trigger', requireAuth, async (req, res) => {
  try {
    const result = await runAutoCampaignCheck(req.user!.id);
    res.json(result);
  } catch (err: any) {
    console.error('Auto-campaign trigger error:', err);
    res.status(500).json({ error: err.message || 'Auto-campaign check failed' });
  }
});

// GET /api/campaigns/auto/pool — pool key counts for automatic campaigns
router.get('/auto/pool', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const demoRows = toRows(await db.execute(sql`
      SELECT COUNT(*) AS count FROM game_keys
      WHERE developer_user_id = ${userId} AND instance_id IS NULL AND key_type = 'demo' AND status = 'available'
    `)) as any[];
    const fullRows = toRows(await db.execute(sql`
      SELECT COUNT(*) AS count FROM game_keys
      WHERE developer_user_id = ${userId} AND instance_id IS NULL AND key_type = 'full' AND status = 'available'
    `)) as any[];
    res.json({
      demoKeys: Number(demoRows[0].count ?? 0),
      fullKeys:  Number(fullRows[0].count  ?? 0),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load pool counts' });
  }
});

// POST /api/campaigns/auto/keys — upload keys to the unassigned pool
router.post('/auto/keys', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { keyType, keys } = req.body;
    if (!keyType || !['demo', 'full'].includes(keyType)) {
      return res.status(400).json({ error: 'keyType must be demo or full' });
    }
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'keys array is required' });
    }

    const trimmed  = keys.map((k: string) => k.trim()).filter((k: string) => k.length > 0);
    const cleaned  = [...new Set(trimmed)];

    const existing = toRows(await db.execute(sql`
      SELECT key_value FROM game_keys
      WHERE developer_user_id = ${userId} AND key_type = ${keyType} AND instance_id IS NULL
    `)) as any[];
    const existingSet = new Set(existing.map((r: any) => r.key_value));
    const newKeys  = cleaned.filter((k: string) => !existingSet.has(k));
    const duplicates = cleaned.length - newKeys.length;

    // Create a pool batch (instance_id = NULL)
    const batchRows = toRows(await db.execute(sql`
      INSERT INTO game_key_batches (instance_id, key_type, total_keys, valid_keys, duplicate_keys, invalid_keys)
      VALUES (NULL, ${keyType}, ${trimmed.length}, ${newKeys.length}, ${duplicates}, 0)
      RETURNING id
    `)) as any[];
    const batchId = batchRows[0]?.id ?? null;

    for (const keyValue of newKeys) {
      await db.execute(sql`
        INSERT INTO game_keys (batch_id, developer_user_id, key_type, key_value, status)
        VALUES (${batchId}, ${userId}, ${keyType}, ${keyValue}, 'available')
        ON CONFLICT DO NOTHING
      `);
    }

    res.json({ added: newKeys.length, duplicates, total: trimmed.length });
  } catch (err) {
    console.error('POST /api/campaigns/auto/keys error:', err);
    res.status(500).json({ error: 'Failed to upload pool keys' });
  }
});

export default router;
