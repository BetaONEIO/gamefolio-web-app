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
        batch_id INTEGER NOT NULL REFERENCES game_key_batches(id) ON DELETE CASCADE,
        instance_id INTEGER NOT NULL REFERENCES campaign_instances(id) ON DELETE CASCADE,
        key_type TEXT NOT NULL,
        key_value TEXT NOT NULL,
        status TEXT DEFAULT 'available',
        assigned_user_id INTEGER,
        assigned_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
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

    await seedCampaignTemplates();
  } catch (err) {
    console.error('Failed to create campaign tables:', err);
  }
}

// ─────────────────────────────────────────────
// SEED TEMPLATES
// ─────────────────────────────────────────────

const TEMPLATES = [
  {
    name: "Demo Discovery",
    slug: "demo-discovery",
    category: "demo_promotion",
    description: "Promote a playable demo and generate early gameplay content from engaged players.",
    bestUseCase: "New demos and upcoming releases",
    duration: 7,
    participantCapacity: 30,
    demoKeysRequired: 30,
    fullKeysRequired: 30,
    completionReward: "full_game_key",
    completionRewardDescription: "One full-game key after all mandatory bounties are verified",
    estimatedClips: 90,
    estimatedScreenshots: 90,
    estimatedFeedback: 30,
    estimatedViewsMin: 5000,
    estimatedViewsMax: 25000,
    status: "available",
    featured: true,
    recommended: true,
    displayOrder: 1,
    bounties: [
      { title: "Play the Demo", description: "Download and play the game demo", mandatory: true, quantity: 1, order: 1, xp: 500, validation: "session_tracking", contentType: "session" },
      { title: "Upload 3 Clips", description: "Upload 3 gameplay clips from the demo tagged with the game", mandatory: true, quantity: 3, order: 2, xp: 3000, validation: "manual_review", contentType: "clip" },
      { title: "Upload 3 Screenshots", description: "Upload 3 screenshots from the demo", mandatory: true, quantity: 3, order: 3, xp: 600, validation: "manual_review", contentType: "screenshot" },
      { title: "Submit First Impressions", description: "Submit your first impressions via the structured feedback form", mandatory: true, quantity: 1, order: 4, xp: 1000, validation: "form_submission", contentType: "feedback" },
    ],
  },
  {
    name: "Quick Clip Boost",
    slug: "quick-clip-boost",
    category: "content_generation",
    description: "Generate short-form gameplay clips and reels quickly with a focused content campaign.",
    bestUseCase: "Generating short-form gameplay content quickly",
    duration: 7,
    participantCapacity: 25,
    demoKeysRequired: 25,
    fullKeysRequired: 10,
    completionReward: "full_game_key",
    completionRewardDescription: "Full-game key on verified completion",
    estimatedClips: 75,
    estimatedScreenshots: 0,
    estimatedFeedback: 0,
    estimatedViewsMin: 3000,
    estimatedViewsMax: 15000,
    status: "available",
    featured: false,
    recommended: false,
    displayOrder: 2,
    bounties: [
      { title: "Upload 3 Gameplay Clips", description: "Upload 3 gameplay clips tagged with the game", mandatory: true, quantity: 3, order: 1, xp: 3000, validation: "manual_review", contentType: "clip" },
      { title: "Upload 1 Reel", description: "Create and upload 1 gameplay reel", mandatory: true, quantity: 1, order: 2, xp: 2500, validation: "manual_review", contentType: "reel" },
      { title: "Tag the Game Correctly", description: "All content must be tagged with the correct game", mandatory: true, quantity: 1, order: 3, xp: 200, validation: "auto_tag_check", contentType: "tag" },
    ],
  },
  {
    name: "Launch Week",
    slug: "launch-week",
    category: "game_launch",
    description: "A 14-day multi-format launch campaign generating clips, reels, screenshots and first impressions at scale.",
    bestUseCase: "New game launches",
    duration: 14,
    participantCapacity: 50,
    demoKeysRequired: 0,
    fullKeysRequired: 50,
    completionReward: "full_game_key",
    completionRewardDescription: "Full-game key included in campaign",
    estimatedClips: 250,
    estimatedScreenshots: 250,
    estimatedFeedback: 50,
    estimatedViewsMin: 15000,
    estimatedViewsMax: 75000,
    status: "available",
    featured: true,
    recommended: false,
    displayOrder: 3,
    bounties: [
      { title: "Upload 5 Clips", description: "Upload 5 gameplay clips from the game", mandatory: true, quantity: 5, order: 1, xp: 5000, validation: "manual_review", contentType: "clip" },
      { title: "Upload 3 Reels", description: "Create and upload 3 gameplay reels", mandatory: true, quantity: 3, order: 2, xp: 7500, validation: "manual_review", contentType: "reel" },
      { title: "Upload 5 Screenshots", description: "Upload 5 screenshots from the game", mandatory: true, quantity: 5, order: 3, xp: 1000, validation: "manual_review", contentType: "screenshot" },
      { title: "Submit First Impressions", description: "Submit structured first impressions feedback", mandatory: true, quantity: 1, order: 4, xp: 1000, validation: "form_submission", contentType: "feedback" },
      { title: "Reach 100 Views", description: "Accumulate 100 genuine views across your submitted content", mandatory: true, quantity: 100, order: 5, xp: 2500, validation: "view_count", contentType: "views" },
    ],
  },
  {
    name: "Streamer Discovery",
    slug: "streamer-discovery",
    category: "streaming",
    description: "Find dedicated streamers, generate live coverage, and build an ongoing streamer community around your game.",
    bestUseCase: "Finding streamers and generating live exposure",
    duration: 14,
    participantCapacity: 20,
    demoKeysRequired: 0,
    fullKeysRequired: 20,
    completionReward: "xp_bonus",
    completionRewardDescription: "XP bonus and streamer badge on verified completion",
    estimatedClips: 40,
    estimatedScreenshots: 0,
    estimatedFeedback: 20,
    estimatedViewsMin: 10000,
    estimatedViewsMax: 100000,
    status: "available",
    featured: false,
    recommended: false,
    displayOrder: 4,
    bounties: [
      { title: "Stream for 2 Hours", description: "Stream the game live for a minimum of 2 continuous hours", mandatory: true, quantity: 1, order: 1, xp: 5000, validation: "stream_duration", contentType: "stream" },
      { title: "Upload 2 Stream Highlights", description: "Upload 2 clip highlights from your stream", mandatory: true, quantity: 2, order: 2, xp: 2000, validation: "manual_review", contentType: "clip" },
      { title: "Upload 1 Reel", description: "Create and upload 1 reel from your stream", mandatory: true, quantity: 1, order: 3, xp: 2500, validation: "manual_review", contentType: "reel" },
      { title: "Submit Stream Analytics", description: "Submit your stream analytics via the structured form", mandatory: true, quantity: 1, order: 4, xp: 1000, validation: "form_submission", contentType: "analytics" },
    ],
  },
  {
    name: "Screenshot Showcase",
    slug: "screenshot-showcase",
    category: "screenshots",
    description: "Generate a curated collection of high-quality screenshots to showcase your game's visual strengths.",
    bestUseCase: "Visually strong games needing a screenshot library",
    duration: 7,
    participantCapacity: 30,
    demoKeysRequired: 0,
    fullKeysRequired: 30,
    completionReward: "xp_bonus",
    completionRewardDescription: "XP bonus on verified completion",
    estimatedClips: 0,
    estimatedScreenshots: 150,
    estimatedFeedback: 0,
    estimatedViewsMin: 2000,
    estimatedViewsMax: 10000,
    status: "available",
    featured: false,
    recommended: false,
    displayOrder: 5,
    bounties: [
      { title: "Upload 5 Screenshots", description: "Upload 5 high-quality screenshots showcasing the game", mandatory: true, quantity: 5, order: 1, xp: 1000, validation: "manual_review", contentType: "screenshot" },
      { title: "Submit a Featured Screenshot", description: "Select and submit your best single screenshot for potential featuring", mandatory: true, quantity: 1, order: 2, xp: 500, validation: "manual_review", contentType: "screenshot" },
      { title: "Tag Game and Visual Category", description: "Correctly tag all screenshots with the game and appropriate visual category", mandatory: true, quantity: 1, order: 3, xp: 200, validation: "auto_tag_check", contentType: "tag" },
    ],
  },
  {
    name: "First Impressions",
    slug: "first-impressions",
    category: "reviews_feedback",
    description: "Collect structured early feedback from first-time players alongside light content generation.",
    bestUseCase: "Early feedback and structured content generation for demos",
    duration: 7,
    participantCapacity: 30,
    demoKeysRequired: 30,
    fullKeysRequired: 30,
    completionReward: "full_game_key",
    completionRewardDescription: "Full-game key after all bounties verified",
    estimatedClips: 30,
    estimatedScreenshots: 0,
    estimatedFeedback: 30,
    estimatedViewsMin: 2000,
    estimatedViewsMax: 8000,
    status: "available",
    featured: false,
    recommended: true,
    displayOrder: 6,
    bounties: [
      { title: "Play the Demo", description: "Download and play the game demo", mandatory: true, quantity: 1, order: 1, xp: 500, validation: "session_tracking", contentType: "session" },
      { title: "Upload 1 Clip", description: "Upload 1 gameplay clip from the demo", mandatory: true, quantity: 1, order: 2, xp: 1000, validation: "manual_review", contentType: "clip" },
      { title: "Complete Structured Feedback", description: "Fill in the full structured feedback form", mandatory: true, quantity: 1, order: 3, xp: 1500, validation: "form_submission", contentType: "feedback" },
      { title: "Submit First Impressions", description: "Write and submit your first impressions review", mandatory: true, quantity: 1, order: 4, xp: 1000, validation: "form_submission", contentType: "feedback" },
    ],
  },
  {
    name: "Bug Hunter",
    slug: "bug-hunter",
    category: "bug_testing",
    description: "Deploy community testers to find and document bugs in demos, betas or early-access builds.",
    bestUseCase: "Testing demos, betas and early-access builds",
    duration: 14,
    participantCapacity: 30,
    demoKeysRequired: 30,
    fullKeysRequired: 0,
    completionReward: "xp_bonus",
    completionRewardDescription: "Significant XP bonus for verified bug reports",
    estimatedClips: 30,
    estimatedScreenshots: 30,
    estimatedFeedback: 30,
    estimatedViewsMin: 0,
    estimatedViewsMax: 0,
    status: "available",
    featured: false,
    recommended: false,
    displayOrder: 7,
    bounties: [
      { title: "Play Minimum Session", description: "Play the game for a minimum required session time", mandatory: true, quantity: 1, order: 1, xp: 500, validation: "session_tracking", contentType: "session" },
      { title: "Submit Reproducible Bug Report", description: "Submit at least one detailed, reproducible bug report", mandatory: true, quantity: 1, order: 2, xp: 2000, validation: "form_submission", contentType: "feedback" },
      { title: "Upload Supporting Media", description: "Upload a screenshot or clip that demonstrates the reported bug", mandatory: true, quantity: 1, order: 3, xp: 500, validation: "manual_review", contentType: "clip" },
      { title: "Complete Severity Fields", description: "Fill in all severity and device fields on your bug report", mandatory: true, quantity: 1, order: 4, xp: 300, validation: "form_submission", contentType: "feedback" },
    ],
  },
  {
    name: "Update Spotlight",
    slug: "update-spotlight",
    category: "updates_dlc",
    description: "Generate fresh content and player impressions around a major update, DLC or seasonal release.",
    bestUseCase: "Major updates, DLC and seasonal releases",
    duration: 14,
    participantCapacity: 40,
    demoKeysRequired: 0,
    fullKeysRequired: 0,
    completionReward: "xp_bonus",
    completionRewardDescription: "XP bonus for verified update content",
    estimatedClips: 120,
    estimatedScreenshots: 120,
    estimatedFeedback: 40,
    estimatedViewsMin: 8000,
    estimatedViewsMax: 40000,
    status: "available",
    featured: false,
    recommended: false,
    displayOrder: 8,
    bounties: [
      { title: "Play the Latest Update", description: "Play the game featuring the new update content", mandatory: true, quantity: 1, order: 1, xp: 500, validation: "session_tracking", contentType: "session" },
      { title: "Upload 3 Clips (New Content)", description: "Upload 3 clips featuring the new update content", mandatory: true, quantity: 3, order: 2, xp: 3000, validation: "manual_review", contentType: "clip" },
      { title: "Upload 3 Screenshots", description: "Upload 3 screenshots of new update content", mandatory: true, quantity: 3, order: 3, xp: 600, validation: "manual_review", contentType: "screenshot" },
      { title: "Submit Update Impressions", description: "Submit your impressions of the update via the feedback form", mandatory: true, quantity: 1, order: 4, xp: 1000, validation: "form_submission", contentType: "feedback" },
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
    const existing = await db.execute(sql`SELECT COUNT(*) as count FROM campaign_templates`);
    const existingRows = toRows(existing);
    const count = Number((existingRows[0] as any)?.count ?? 0);
    if (count > 0) return; // already seeded

    for (const t of TEMPLATES) {
      const insertedRows = toRows(await db.execute(sql`
        INSERT INTO campaign_templates
          (name, slug, category, description, best_use_case, duration, participant_capacity,
           demo_keys_required, full_keys_required, completion_reward, completion_reward_description,
           estimated_clips, estimated_screenshots, estimated_feedback,
           estimated_views_min, estimated_views_max,
           status, featured, recommended, display_order)
        VALUES
          (${t.name}, ${t.slug}, ${t.category}, ${t.description}, ${t.bestUseCase},
           ${t.duration}, ${t.participantCapacity}, ${t.demoKeysRequired}, ${t.fullKeysRequired},
           ${t.completionReward}, ${t.completionRewardDescription},
           ${t.estimatedClips}, ${t.estimatedScreenshots}, ${t.estimatedFeedback},
           ${t.estimatedViewsMin}, ${t.estimatedViewsMax},
           ${t.status}, ${t.featured}, ${t.recommended}, ${t.displayOrder})
        RETURNING id
      `));
      const inserted = insertedRows[0] as any;

      const templateId = inserted.id;
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
    console.log('✅ Campaign templates seeded');
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

function requirePartner(req: any, res: any, next: any) {
  if (!req.isAuthenticated?.() || !req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.user.isPartner) return res.status(403).json({ error: 'Indie partner access required' });
  next();
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated?.() || !req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
  next();
}

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
router.get('/overview', requirePartner, async (req, res) => {
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
router.get('/instances', requirePartner, async (req, res) => {
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
router.post('/instances', requirePartner, async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      templateId, gameId, gameName, gameArtworkUrl, gameSteamAppId, gameItchUrl, gameEpicSlug,
      startType, scheduledStart, artworkUrl,
    } = req.body;

    if (!templateId) return res.status(400).json({ error: 'templateId is required' });

    const [tmpl] = toRows(await db.execute(sql`SELECT id FROM campaign_templates WHERE id = ${Number(templateId)}`));
    if (!tmpl) return res.status(404).json({ error: 'Campaign template not found' });

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
router.patch('/instances/:id', requirePartner, async (req, res) => {
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
router.post('/instances/:id/keys', requirePartner, async (req, res) => {
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
    const cleaned = [...new Set(keys.map((k: string) => k.trim()).filter((k: string) => k.length > 0))];
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
router.post('/instances/:id/submit', requirePartner, async (req, res) => {
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

export default router;
