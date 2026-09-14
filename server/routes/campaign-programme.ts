import express from 'express';
import crypto from 'node:crypto';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { BOUNTY_REWARD_CONFIG, calculateCustomCampaign, CUSTOM_OBJECTIVE_VALUES } from '@shared/bounty-rewards';
import { computeCampaignTotalXP, computeCompletionBonus, type XPTier } from '../bounty-xp-service';
import { configuredActiveCampaignKeyVersion, decryptCampaignKey, encryptCampaignKey, hashCampaignKey } from '../campaign-key-security';
import { normalizeCampaignInput, normalizeCampaignReminderThresholds } from '@shared/campaign-contract';
import { createAndPush } from '../notification-service';
import {
  CAMPAIGN_COMMERCIAL_MODEL,
  DEFAULT_CAMPAIGN_PRIORITIES,
  calculateCampaignEstimate,
  type CampaignContentType,
  type CampaignPriority,
} from '@shared/campaign-commercial-model';

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
        bounty_xp_reward INTEGER DEFAULT 0,
        completion_bonus_xp INTEGER DEFAULT 0,
        reward_config JSONB,
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
        campaign_title TEXT,
        description TEXT,
        regions TEXT DEFAULT 'worldwide',
        platforms TEXT[],
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
    await db.execute(sql`ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS bounty_xp_reward INTEGER DEFAULT 0`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS completion_bonus_xp INTEGER DEFAULT 0`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS reward_config JSONB`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS access_method TEXT NOT NULL DEFAULT 'demo_to_full'`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS application_period_days INTEGER NOT NULL DEFAULT 30`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS completion_deadline_days INTEGER`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS objective_config JSONB`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS max_places INTEGER`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS requires_access_key BOOLEAN NOT NULL DEFAULT true`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS reminder_thresholds_hours INTEGER[] NOT NULL DEFAULT ARRAY[72,48,24,6]`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS bounty_xp_reward INTEGER`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS completion_bonus_xp INTEGER`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS reward_config JSONB`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS access_method TEXT`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS access_instructions TEXT`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS completion_reward_type TEXT`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS completion_reward_key_required BOOLEAN NOT NULL DEFAULT true`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS application_period_days INTEGER`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS creator_deadline_days INTEGER`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS max_places INTEGER`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS capacity_source TEXT`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS estimate_snapshot JSONB`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS objective_snapshot JSONB`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS lifecycle_state TEXT NOT NULL DEFAULT 'draft'`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS manual_approval_required BOOLEAN NOT NULL DEFAULT false`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS requires_access_key BOOLEAN NOT NULL DEFAULT true`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS reminder_thresholds_hours INTEGER[]`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS commercial_type TEXT`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS budget_pence INTEGER`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS content_priorities JSONB`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMP`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS billing_period_end TIMESTAMP`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS reward_pool_contribution_pence INTEGER`).catch(() => {});
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS campaign_starter_allowances (
        id SERIAL PRIMARY KEY,
        developer_user_id INTEGER NOT NULL,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        instance_id INTEGER NOT NULL REFERENCES campaign_instances(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (developer_user_id, period_start)
      )
    `).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ALTER COLUMN reminder_thresholds_hours DROP NOT NULL`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ALTER COLUMN reminder_thresholds_hours DROP DEFAULT`).catch(() => {});
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS campaign_participant_reminder_events (
        id SERIAL PRIMARY KEY, participant_id INTEGER NOT NULL REFERENCES campaign_participants(id) ON DELETE CASCADE,
        instance_id INTEGER NOT NULL REFERENCES campaign_instances(id) ON DELETE CASCADE,
        threshold_hours INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
        claimed_at TIMESTAMP, sent_at TIMESTAMP, last_error TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (participant_id, threshold_hours)
      )
    `).catch(() => {});
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS campaign_applications (
        id SERIAL PRIMARY KEY, instance_id INTEGER NOT NULL REFERENCES campaign_instances(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', reviewed_by INTEGER,
        reviewed_at TIMESTAMP, notes TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(), UNIQUE (instance_id, user_id)
      )
    `).catch(() => {});
    // Older deployments may have the legacy game_keys shape. Add every
    // encryption column before attempting version tagging/backfill.
    await db.execute(sql`
      ALTER TABLE game_keys
        ADD COLUMN IF NOT EXISTS key_ciphertext TEXT,
        ADD COLUMN IF NOT EXISTS key_iv TEXT,
        ADD COLUMN IF NOT EXISTS key_auth_tag TEXT,
        ADD COLUMN IF NOT EXISTS key_hash TEXT,
        ADD COLUMN IF NOT EXISTS key_version TEXT,
        ADD COLUMN IF NOT EXISTS keyring_id TEXT
    `).catch(() => {});
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS campaign_keyrings (
        id SERIAL PRIMARY KEY, keyring_id TEXT NOT NULL, key_version TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'environment', status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(), retired_at TIMESTAMP,
        UNIQUE (keyring_id, key_version)
      )
    `).catch(() => {});
    const activeVersion = configuredActiveCampaignKeyVersion();
    const activeSecretConfigured = Boolean(
      process.env[`CAMPAIGN_KEY_ENCRYPTION_KEY_V${activeVersion.slice('campaign-v'.length)}`] ||
      (activeVersion === 'campaign-v1' && process.env.CAMPAIGN_KEY_ENCRYPTION_KEY),
    );
    if (activeSecretConfigured) {
      await db.execute(sql`
        INSERT INTO campaign_keyrings (keyring_id, key_version, provider, status)
        VALUES ('campaign', ${activeVersion}, 'environment', 'active')
        ON CONFLICT (keyring_id, key_version) DO UPDATE SET status = 'active', retired_at = NULL
      `);
    }
    if (process.env.WALLET_ENCRYPTION_KEY) {
      await db.execute(sql`
        INSERT INTO campaign_keyrings (keyring_id, key_version, provider, status)
        VALUES ('wallet', 'wallet-v1', 'environment', 'legacy')
        ON CONFLICT (keyring_id, key_version) DO NOTHING
      `);
      await db.execute(sql`
        UPDATE game_keys SET key_version = 'wallet-v1', keyring_id = 'wallet'
        WHERE key_ciphertext IS NOT NULL AND key_version IS NULL
      `);
    }
    // Freeze the effective reward values for instances created before the
    // snapshot columns existed. Template rows may be reseeded later, but
    // launched/completed campaigns must continue to report their original
    // tier-based or configured reward values.
    const instancesNeedingSnapshots = toRows(await db.execute(sql`
      SELECT ci.id, ci.xp_event_multiplier, COALESCE(t.xp_tier, 'standard') AS xp_tier,
        t.bounty_xp_reward AS template_bounty_xp_reward,
        t.completion_bonus_xp AS template_completion_bonus_xp,
        t.reward_config AS template_reward_config
      FROM campaign_instances ci
      JOIN campaign_templates t ON t.id = ci.template_id
      WHERE ci.bounty_xp_reward IS NULL OR ci.completion_bonus_xp IS NULL OR ci.reward_config IS NULL
    `)) as any[];
    for (const instance of instancesNeedingSnapshots) {
      const config = instance.template_reward_config;
      const multiplier = Number(instance.xp_event_multiplier ?? 1);
      const rewardConfig = config && typeof config === 'object' ? config : null;
      const tier = (instance.xp_tier || 'standard') as XPTier;
      const bountyXpReward = Number(
        rewardConfig?.totalReward ??
        instance.template_bounty_xp_reward ??
        computeCampaignTotalXP(tier, multiplier),
      );
      const completionBonusXp = Number(
        rewardConfig?.completionBonus ??
        instance.template_completion_bonus_xp ??
        computeCompletionBonus(tier, multiplier),
      );
      await db.execute(sql`
        UPDATE campaign_instances
        SET bounty_xp_reward = COALESCE(bounty_xp_reward, ${bountyXpReward}),
            completion_bonus_xp = COALESCE(completion_bonus_xp, ${completionBonusXp}),
            reward_config = COALESCE(reward_config, ${rewardConfig ? JSON.stringify(rewardConfig) : null}::jsonb),
            updated_at = NOW()
        WHERE id = ${instance.id}
      `);
    }
    // Additive fields for campaigns created before the personalised setup flow.
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS campaign_title TEXT`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS description TEXT`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS regions TEXT DEFAULT 'worldwide'`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS platforms TEXT[]`).catch(() => {});
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
        key_value TEXT,
        status TEXT DEFAULT 'available',
        assigned_user_id INTEGER,
        assigned_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`ALTER TABLE game_keys ALTER COLUMN key_value DROP NOT NULL`).catch(() => {});
    await db.execute(sql`ALTER TABLE game_keys ADD COLUMN IF NOT EXISTS key_pool TEXT NOT NULL DEFAULT 'access'`).catch(() => {});
    await db.execute(sql`ALTER TABLE game_keys ADD COLUMN IF NOT EXISTS platform TEXT`).catch(() => {});
    await db.execute(sql`ALTER TABLE game_keys ADD COLUMN IF NOT EXISTS key_ciphertext TEXT`).catch(() => {});
    await db.execute(sql`ALTER TABLE game_keys ADD COLUMN IF NOT EXISTS key_iv TEXT`).catch(() => {});
    await db.execute(sql`ALTER TABLE game_keys ADD COLUMN IF NOT EXISTS key_auth_tag TEXT`).catch(() => {});
    await db.execute(sql`ALTER TABLE game_keys ADD COLUMN IF NOT EXISTS key_hash TEXT`).catch(() => {});
    await db.execute(sql`ALTER TABLE game_keys ADD COLUMN IF NOT EXISTS revealed_at TIMESTAMP`).catch(() => {});
    await db.execute(sql`ALTER TABLE game_keys ADD COLUMN IF NOT EXISTS rewarded_at TIMESTAMP`).catch(() => {});
    await db.execute(sql`ALTER TABLE game_keys ADD COLUMN IF NOT EXISTS removed_at TIMESTAMP`).catch(() => {});
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
      UPDATE game_keys
      SET key_pool = 'reward'
      WHERE key_type = 'full' AND key_pool = 'access'
        AND key_value IS NOT NULL AND key_ciphertext IS NULL
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
    await db.execute(sql`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS access_key_id INTEGER REFERENCES game_keys(id)`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS access_accepted_at TIMESTAMP`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS access_revealed_at TIMESTAMP`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS completion_deadline TIMESTAMP`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS extension_requested_at TIMESTAMP`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS extension_hours INTEGER`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS extension_status TEXT`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS owner_game_declared BOOLEAN NOT NULL DEFAULT false`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS owner_game_verified BOOLEAN NOT NULL DEFAULT false`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS completion_bonus_awarded BOOLEAN NOT NULL DEFAULT false`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS completion_reward_key_id INTEGER REFERENCES game_keys(id)`).catch(() => {});
    await db.execute(sql`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP`).catch(() => {});
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS campaign_key_events (
        id SERIAL PRIMARY KEY,
        key_id INTEGER NOT NULL REFERENCES game_keys(id) ON DELETE CASCADE,
        instance_id INTEGER REFERENCES campaign_instances(id) ON DELETE SET NULL,
        participant_id INTEGER REFERENCES campaign_participants(id) ON DELETE SET NULL,
        actor_user_id INTEGER,
        event_type TEXT NOT NULL,
        from_status TEXT,
        to_status TEXT,
        metadata JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS campaign_reward_events (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER NOT NULL REFERENCES campaign_instances(id) ON DELETE CASCADE,
        participant_id INTEGER NOT NULL REFERENCES campaign_participants(id) ON DELETE CASCADE,
        reward_type TEXT NOT NULL,
        reward_key TEXT NOT NULL,
        amount INTEGER,
        key_id INTEGER REFERENCES game_keys(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (participant_id, reward_type, reward_key)
      )
    `);
    await db.execute(sql`
      ALTER TABLE campaign_reward_events
        ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS last_error TEXT,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    `).catch(() => {});
    // Older approved/live instances may predate the application close field.
    // Backfill only from activation time; review submission never starts it.
    await db.execute(sql`
      UPDATE campaign_instances
      SET end_date = COALESCE(actual_start, approved_at, NOW())
        + (COALESCE(application_period_days, 30) * interval '1 day')
      WHERE status IN ('approved', 'live') AND end_date IS NULL
    `).catch(() => {});
    await migrateLegacyCampaignKeys();

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

    // Additive compatibility migration: never drop developer automation
    // settings during boot. Existing values are campaign configuration data.
    await db.execute(sql`
      ALTER TABLE auto_campaign_settings
        ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS allowed_templates JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'weekly',
        ADD COLUMN IF NOT EXISTS max_creators_per_campaign INTEGER DEFAULT 20,
        ADD COLUMN IF NOT EXISTS min_key_reserve INTEGER DEFAULT 10,
        ADD COLUMN IF NOT EXISTS key_pool_size INTEGER DEFAULT 50,
        ADD COLUMN IF NOT EXISTS game_name TEXT,
        ADD COLUMN IF NOT EXISTS game_artwork_url TEXT,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `).catch(() => {});

    // Migration: add new columns if they don't exist
    await db.execute(sql`
      ALTER TABLE campaign_templates ADD COLUMN IF NOT EXISTS estimated_reels INTEGER DEFAULT 0
    `);
    await db.execute(sql`
      ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS auto_campaign BOOLEAN DEFAULT false
    `);
    await db.execute(sql`
      ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS game_id INTEGER
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
    description: "Generate an initial wave of gameplay content and creator feedback.",
    bestUseCase: "Getting your first creators playing and talking about your game.",
    duration: 7,
    participantCapacity: 0,
    demoKeysRequired: 0,
    fullKeysRequired: 0,
    completionReward: "full_game_key",
    completionRewardDescription: "Full game key awarded after verified completion",
    estimatedClips: 40,
    estimatedReels: 10,
    estimatedScreenshots: 40,
    estimatedFeedback: 20,
    estimatedViewsMin: 3000,
    estimatedViewsMax: 15000,
    bountyXpReward: BOUNTY_REWARD_CONFIG["quick-creator"].totalReward,
    completionBonusXp: BOUNTY_REWARD_CONFIG["quick-creator"].completionBonus,
    rewardConfig: BOUNTY_REWARD_CONFIG["quick-creator"],
    status: "available",
    featured: false,
    recommended: false,
    displayOrder: 1,
    bounties: [
      { title: "Upload 2 Gameplay Clips", description: "Upload 2 gameplay clips tagged with the game", mandatory: true, quantity: 2, order: 1, xp: 500, validation: "manual_review", contentType: "clip" },
      { title: "Upload 2 Screenshots", description: "Upload 2 screenshots from the game", mandatory: true, quantity: 2, order: 2, xp: 250, validation: "manual_review", contentType: "screenshot" },
      { title: "Submit Creator Review", description: "Submit your first impressions via the feedback form", mandatory: true, quantity: 1, order: 3, xp: 500, validation: "form_submission", contentType: "feedback" },
    ],
  },
  {
    name: "Content Boost Campaign",
    slug: "content-boost",
    category: "content_boost",
    description: "Build a reusable collection of gameplay and vertical content.",
    bestUseCase: "Building a library of clips, reels and screenshots for marketing.",
    duration: 14,
    participantCapacity: 0,
    demoKeysRequired: 0,
    fullKeysRequired: 0,
    completionReward: "full_game_key",
    completionRewardDescription: "Full game key awarded after verified completion",
    estimatedClips: 70,
    estimatedReels: 35,
    estimatedScreenshots: 105,
    estimatedFeedback: 35,
    estimatedViewsMin: 10000,
    estimatedViewsMax: 50000,
    bountyXpReward: BOUNTY_REWARD_CONFIG["content-boost"].totalReward,
    completionBonusXp: BOUNTY_REWARD_CONFIG["content-boost"].completionBonus,
    rewardConfig: BOUNTY_REWARD_CONFIG["content-boost"],
    status: "available",
    featured: false,
    recommended: true,
    displayOrder: 2,
    bounties: [
      { title: "Upload 2 Gameplay Clips", description: "Upload 2 gameplay clips tagged with the game", mandatory: true, quantity: 2, order: 1, xp: 750, validation: "manual_review", contentType: "clip" },
      { title: "Upload 3 Vertical Reels", description: "Create and upload 3 vertical gameplay reels", mandatory: true, quantity: 3, order: 2, xp: 1000, validation: "manual_review", contentType: "reel" },
      { title: "Upload 2 Screenshots", description: "Upload 2 screenshots from the game", mandatory: true, quantity: 2, order: 3, xp: 250, validation: "manual_review", contentType: "screenshot" },
      { title: "Submit Creator Review", description: "Submit your impressions via the feedback form", mandatory: true, quantity: 1, order: 4, xp: 1000, validation: "form_submission", contentType: "feedback" },
    ],
  },
  {
    name: "Creator Showcase Campaign",
    slug: "creator-showcase",
    category: "creator_showcase",
    description: "Generate deeper creator coverage through gameplay, streaming and review content.",
    bestUseCase: "Maximum exposure and high-quality creator content.",
    duration: 21,
    participantCapacity: 0,
    demoKeysRequired: 0,
    fullKeysRequired: 0,
    completionReward: "full_game_key",
    completionRewardDescription: "Full game key awarded after verified completion",
    estimatedClips: 50,
    estimatedReels: 25,
    estimatedScreenshots: 75,
    estimatedFeedback: 25,
    estimatedViewsMin: 15000,
    estimatedViewsMax: 80000,
    bountyXpReward: BOUNTY_REWARD_CONFIG["creator-showcase"].totalReward,
    completionBonusXp: BOUNTY_REWARD_CONFIG["creator-showcase"].completionBonus,
    rewardConfig: BOUNTY_REWARD_CONFIG["creator-showcase"],
    status: "available",
    featured: false,
    recommended: false,
    displayOrder: 3,
    bounties: [
      { title: "Upload 3 Gameplay Clips", description: "Upload 3 gameplay clips tagged with the game", mandatory: true, quantity: 3, order: 1, xp: 750, validation: "manual_review", contentType: "clip" },
      { title: "Upload 3 Vertical Reels", description: "Create and upload 3 vertical gameplay reels", mandatory: true, quantity: 3, order: 2, xp: 1250, validation: "manual_review", contentType: "reel" },
      { title: "Upload 3 Screenshots", description: "Upload 3 screenshots from the game", mandatory: true, quantity: 3, order: 3, xp: 250, validation: "manual_review", contentType: "screenshot" },
      { title: "Stream the Game", description: "Stream the game live for at least 30 minutes", mandatory: true, quantity: 1, order: 4, xp: 3500, validation: "stream_duration", contentType: "stream" },
      { title: "Submit Creator Review", description: "Submit a written or video review", mandatory: true, quantity: 1, order: 5, xp: 1250, validation: "form_submission", contentType: "feedback" },
    ],
  },
  {
    name: "Custom Campaign",
    slug: "custom-campaign",
    category: "custom",
    description: "For experienced developers who want full control over campaign settings.",
    bestUseCase: "Custom duration, capacity and targeting for specific needs.",
    duration: 14,
    participantCapacity: 0,
    demoKeysRequired: 0,
    fullKeysRequired: 0,
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

function canonicalTemplateBounties(slug: string, fallback: any[]) {
  const preset = CAMPAIGN_COMMERCIAL_MODEL.presets.find((candidate) => candidate.slug === slug);
  if (!preset?.objectives.length) return fallback;
  return preset.objectives.map((objective, index) => ({
    title: objective.title,
    description: objective.description,
    mandatory: objective.mandatory,
    quantity: objective.quantity,
    order: index + 1,
    xp: objective.xpReward,
    validation: objective.validation,
    contentType: objective.type,
  }));
}

function canonicalTemplateMetrics(slug: string, fallback: any) {
  const preset = CAMPAIGN_COMMERCIAL_MODEL.presets.find((candidate) => candidate.slug === slug);
  if (!preset?.objectives.length || preset.estimatedCreatorMax == null) return fallback;
  const count = (type: CampaignContentType) =>
    preset.objectives
      .filter((objective) => objective.type === type)
      .reduce((total, objective) => total + objective.quantity, 0) * preset.estimatedCreatorMax;
  return {
    estimatedClips: count("clip"),
    estimatedReels: count("reel"),
    estimatedScreenshots: count("screenshot"),
    estimatedFeedback: count("feedback") + count("review"),
  };
}

function toRows(result: any): any[] {
  // drizzle-orm/postgres-js returns a RowList (array-like), not { rows: [] }
  // drizzle-orm/node-postgres returns { rows: [] }
  // Support both shapes.
  if (Array.isArray(result)) return result as any[];
  if (result && Array.isArray(result.rows)) return result.rows;
  return [];
}

async function migrateLegacyCampaignKeys() {
  // Older deployments stored key_value. Encrypt those rows once a key
  // encryption secret is configured, then clear the plaintext column. Failure
  // is deliberately non-fatal so an existing campaign remains readable while
  // operators configure the secret.
  const backfillVersion = process.env.CAMPAIGN_KEY_ENCRYPTION_KEY
    ? 'campaign-v1'
    : process.env.WALLET_ENCRYPTION_KEY
      ? 'wallet-v1'
      : null;
  if (!backfillVersion) {
    console.error('Campaign key backfill deferred: no stable campaign encryption key is configured');
    return;
  }
  const legacyRows = toRows(await db.execute(sql`
    SELECT id, key_value FROM game_keys
    WHERE key_value IS NOT NULL
      AND (key_ciphertext IS NULL OR key_iv IS NULL OR key_auth_tag IS NULL)
  `)) as any[];
  for (const row of legacyRows) {
    try {
      const encrypted = encryptCampaignKey(String(row.key_value), backfillVersion);
      await db.execute(sql`
        UPDATE game_keys
        SET key_ciphertext = ${encrypted.ciphertext},
            key_iv = ${encrypted.iv},
            key_auth_tag = ${encrypted.authTag},
             key_version = ${encrypted.keyVersion},
             keyring_id = ${encrypted.keyringId},
            key_hash = COALESCE(key_hash, ${encrypted.hash}),
            key_value = NULL
        WHERE id = ${row.id}
      `);
    } catch {
      // Never include the key or driver error in logs. Operators can retry
      // this explicit backfill after configuring the active keyring.
      console.error('Campaign key backfill failed; verify the configured versioned encryption key');
    }
  }
}

async function materializeCustomTemplateSnapshot(
  base: any,
  objectives: Record<string, number>,
  ownerId: number,
  estimate: ReturnType<typeof calculateCustomCampaign>,
): Promise<number> {
  const slug = `custom-${ownerId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const [snapshot] = toRows(await db.execute(sql`
    INSERT INTO campaign_templates
      (name, slug, category, description, best_use_case, duration,
       participant_capacity, demo_keys_required, full_keys_required,
       completion_reward, completion_reward_description, bounty_xp_reward,
       completion_bonus_xp, reward_config, status, display_order, objective_config,
        access_method, application_period_days, completion_deadline_days, max_places, requires_access_key)
    VALUES
      (${base.name ?? 'Custom Campaign'}, ${slug}, 'custom',
       ${base.description ?? null}, ${base.best_use_case ?? null},
       ${estimate.deadlineDays}, 0, 0, 0, 'bounty_xp',
       'Calculated Bounty XP reward', ${estimate.totalXp}, ${estimate.completionBonus},
       ${JSON.stringify({ totalReward: estimate.totalXp, completionBonus: estimate.completionBonus })}::jsonb,
        'archived', 0, ${JSON.stringify(objectives)}::jsonb, 'custom_access', 30,
        ${estimate.deadlineDays}, NULL,
        ${base.requires_access_key ?? base.requiresAccessKey ?? true})
    RETURNING id
  `)) as any[];
  const templateId = Number(snapshot.id);
  let order = 0;
  for (const [contentType, rawQuantity] of Object.entries(objectives)) {
    const quantity = Math.floor(Number(rawQuantity));
    const rule = CUSTOM_OBJECTIVE_VALUES[contentType];
    if (!rule || quantity <= 0) continue;
    await db.execute(sql`
      INSERT INTO campaign_template_bounties
        (template_id, title, description, mandatory, quantity, completion_order,
         xp_reward, validation_method, content_type)
      VALUES
        (${templateId}, ${contentType === 'stream' ? 'Livestream' : `Submit ${contentType}`},
         ${`Complete ${quantity} ${contentType} objective${quantity === 1 ? '' : 's'}.`},
         true, ${quantity}, ${order++}, ${rule.unitReward},
         ${contentType === 'stream' ? 'stream_duration' : 'automatic_validation'},
         ${contentType})
    `);
  }
  return templateId;
}

async function seedCampaignTemplates() {
  try {
    for (const t of TEMPLATES) {
      const metrics = canonicalTemplateMetrics(t.slug, t);
      const existing = toRows(await db.execute(sql`SELECT id FROM campaign_templates WHERE slug = ${t.slug}`));
      let templateId: number;
      let archivedTemplateId: number | null = null;

      // Preserve objective rows for any campaign that has already launched.
      // Those rows are referenced by submissions, so a new canonical template
      // is created instead of rewriting the historical template in place.
      if (existing.length > 0) {
        const [usage] = toRows(await db.execute(sql`
          SELECT COUNT(*)::int AS count FROM campaign_instances
          WHERE template_id = ${(existing[0] as any).id}
            AND status NOT IN ('draft', 'cancelled', 'rejected')
        `)) as any[];
        if (Number(usage?.count ?? 0) > 0) {
          archivedTemplateId = Number((existing[0] as any).id);
          await db.execute(sql`
            UPDATE campaign_templates
            SET slug = ${`${t.slug}-legacy-${(existing[0] as any).id}`}, status = 'archived'
            WHERE id = ${(existing[0] as any).id}
          `);
          existing.length = 0;
        }
      }

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
            estimated_clips = ${metrics.estimatedClips},
            estimated_reels = ${metrics.estimatedReels ?? 0},
            estimated_screenshots = ${metrics.estimatedScreenshots},
            estimated_feedback = ${metrics.estimatedFeedback},
            estimated_views_min = ${t.estimatedViewsMin},
            estimated_views_max = ${t.estimatedViewsMax},
            bounty_xp_reward = ${t.bountyXpReward ?? 0},
            completion_bonus_xp = ${t.completionBonusXp ?? 0},
            reward_config = ${JSON.stringify(t.rewardConfig ?? null)}::jsonb,
            access_method = 'demo_to_full',
            completion_deadline_days = ${t.duration},
            application_period_days = 30,
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
              bounty_xp_reward, completion_bonus_xp, reward_config,
              access_method, application_period_days, completion_deadline_days,
             status, featured, recommended, display_order)
          VALUES
            (${t.name}, ${t.slug}, ${t.category}, ${t.description}, ${t.bestUseCase},
             ${t.duration}, ${t.participantCapacity}, ${t.demoKeysRequired}, ${t.fullKeysRequired},
             ${t.completionReward}, ${t.completionRewardDescription},
              ${metrics.estimatedClips}, ${metrics.estimatedReels ?? 0}, ${metrics.estimatedScreenshots}, ${metrics.estimatedFeedback},
             ${t.estimatedViewsMin}, ${t.estimatedViewsMax},
               ${t.bountyXpReward ?? 0}, ${t.completionBonusXp ?? 0}, ${JSON.stringify(t.rewardConfig ?? null)}::jsonb,
              'demo_to_full', 30, ${t.duration},
             ${t.status}, ${t.featured}, ${t.recommended}, ${t.displayOrder})
          RETURNING id
        `));
        templateId = (insertedRows[0] as any).id;
      }

      if (archivedTemplateId) {
        // Never silently repoint an instance that has accepted or may be
        // undergoing review. A future explicit migration workflow can preview
        // and accept these changes per instance.
        if (process.env.CAMPAIGN_TEMPLATE_MIGRATION_ACCEPT === 'true') {
          await db.execute(sql`
            UPDATE campaign_instances
            SET template_id = ${templateId},
                bounty_xp_reward = ${t.bountyXpReward ?? 0},
                completion_bonus_xp = ${t.completionBonusXp ?? 0},
                reward_config = ${JSON.stringify(t.rewardConfig ?? null)}::jsonb,
                updated_at = NOW()
            WHERE template_id = ${archivedTemplateId} AND status = 'draft'
          `);
        }
      }

      for (const b of canonicalTemplateBounties(t.slug, t.bounties)) {
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
           demo_keys_required, full_keys_required, estimated_clips, estimated_screenshots,
           bounty_xp_reward, completion_bonus_xp, reward_config
    FROM campaign_templates WHERE id = ${randomTemplateId}
  `)) as any[];

  if (!tmpl) {
    return { created: false, message: 'Selected template not found' };
  }

  // Template rows no longer promise a fixed creator total. Auto campaigns
  // still need an operational batch size, so derive it from the developer's
  // configured cap and the available key pools.
  const needDemo = Number(tmpl.demo_keys_required) || maxCreators;
  const needFull = Number(tmpl.full_keys_required) || maxCreators;
  const creators = Math.min(maxCreators, Number(tmpl.participant_capacity) || maxCreators);

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
       status, auto_campaign, start_type, artwork_url, participant_capacity,
       bounty_xp_reward, completion_bonus_xp, reward_config, actual_start, end_date)
    VALUES
      (${randomTemplateId}, ${developerUserId}, ${gameName ?? null}, ${gameArtworkUrl ?? null},
       'approved', true, 'asap', ${gameArtworkUrl ?? null}, ${creators},
       ${tmpl.bounty_xp_reward ?? null}, ${tmpl.completion_bonus_xp ?? null},
        ${tmpl.reward_config ? JSON.stringify(tmpl.reward_config) : null}::jsonb,
        NOW(), NOW() + (30 * interval '1 day'))
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
let reminderProcessorRunning = false;

export async function processCampaignParticipantReminders(): Promise<number> {
  if (reminderProcessorRunning) return 0;
  reminderProcessorRunning = true;
  let sent = 0;
  try {
    const participants = toRows(await db.execute(sql`
      SELECT cp.id AS participant_id, cp.instance_id, cp.user_id,
        COALESCE(cp.completion_deadline, cp.deadline) AS completion_deadline,
        ci.campaign_title, ci.reminder_thresholds_hours AS instance_thresholds,
        t.name AS template_name, t.reminder_thresholds_hours AS template_thresholds
      FROM campaign_participants cp
      JOIN campaign_instances ci ON ci.id = cp.instance_id
      JOIN campaign_templates t ON t.id = ci.template_id
      WHERE cp.status NOT IN ('completed', 'completed_and_verified', 'full_game_awarded', 'expired', 'cancelled')
        AND COALESCE(cp.completion_deadline, cp.deadline) > NOW()
    `)) as any[];
    const now = Date.now();
    for (const participant of participants) {
      const deadline = new Date(participant.completion_deadline).getTime();
      if (!Number.isFinite(deadline)) continue;
      const configured = participant.instance_thresholds ?? participant.template_thresholds;
      const thresholds = normalizeCampaignReminderThresholds(configured);
      for (const thresholdHours of thresholds) {
        if (deadline - now > thresholdHours * 60 * 60 * 1000) continue;
        const claimed = await db.transaction(async (tx) => {
          await tx.execute(sql`
            INSERT INTO campaign_participant_reminder_events
              (participant_id, instance_id, threshold_hours, status)
            VALUES (${participant.participant_id}, ${participant.instance_id}, ${thresholdHours}, 'pending')
            ON CONFLICT (participant_id, threshold_hours) DO NOTHING
          `);
          const [event] = toRows(await tx.execute(sql`
            UPDATE campaign_participant_reminder_events
            SET status = 'sending', claimed_at = NOW(), updated_at = NOW()
            WHERE participant_id = ${participant.participant_id}
              AND threshold_hours = ${thresholdHours}
              AND (status = 'pending'
                OR (status = 'sending' AND claimed_at < NOW() - INTERVAL '30 minutes'))
            RETURNING id
          `)) as any[];
          return event;
        });
        if (!claimed) continue;
        try {
          const campaignName = participant.campaign_title || participant.template_name || 'your campaign';
          await createAndPush({
            userId: participant.user_id,
            type: 'campaign_reminder',
            title: 'Campaign deadline reminder',
            message: `${thresholdHours} hours remain to complete ${campaignName}.`,
            actionUrl: `/campaigns/${participant.instance_id}`,
            metadata: { instanceId: participant.instance_id, thresholdHours },
          });
          await db.execute(sql`
            UPDATE campaign_participant_reminder_events
            SET status = 'sent', sent_at = NOW(), last_error = NULL, updated_at = NOW()
            WHERE id = ${claimed.id}
          `);
          sent += 1;
        } catch {
          await db.execute(sql`
            UPDATE campaign_participant_reminder_events
            SET status = 'pending', last_error = 'Notification delivery failed', updated_at = NOW()
            WHERE id = ${claimed.id}
          `);
        }
      }
    }
    return sent;
  } finally {
    reminderProcessorRunning = false;
  }
}

function startAutoCampaignScheduler() {
  if (autoCampaignInterval) return;
  autoCampaignInterval = setInterval(async () => {
    try {
      await processCampaignParticipantReminders();
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
function addUtcMonths(date: Date, months: number) {
  const day = date.getUTCDate();
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()));
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

function subscriptionMonthWindow(startValue: unknown, endValue: unknown, now = new Date()) {
  const start = startValue ? new Date(String(startValue)) : null;
  const subscriptionEnd = endValue ? new Date(String(endValue)) : null;
  if (!start || Number.isNaN(start.getTime()) || start > now) return null;
  let cursor = new Date(start);
  let next = addUtcMonths(cursor, 1);
  while (next <= now) {
    cursor = next;
    next = addUtcMonths(cursor, 1);
  }
  if (subscriptionEnd && !Number.isNaN(subscriptionEnd.getTime()) && subscriptionEnd < next) next = subscriptionEnd;
  if (next <= now) return null;
  return { start: cursor, end: next };
}

function normalizePriorities(value: unknown): Record<CampaignContentType, CampaignPriority> {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(DEFAULT_CAMPAIGN_PRIORITIES).map(([key, fallback]) => [
    key,
    ['high', 'medium', 'off'].includes(String(source[key])) ? source[key] : fallback,
  ])) as Record<CampaignContentType, CampaignPriority>;
}

router.get('/commercial-model', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const [user] = toRows(await db.execute(sql`
      SELECT is_indie_dev_subscriber, indie_dev_subscription_start_date, indie_dev_subscription_end_date
      FROM users WHERE id = ${userId}
    `)) as any[];
    const window = user?.is_indie_dev_subscriber
      ? subscriptionMonthWindow(user.indie_dev_subscription_start_date, user.indie_dev_subscription_end_date)
      : null;
    let used = false;
    let starterInstanceId: number | null = null;
    if (window) {
      const [allowance] = toRows(await db.execute(sql`
        SELECT instance_id FROM campaign_starter_allowances
        WHERE developer_user_id = ${userId} AND period_start = ${window.start.toISOString()}
      `)) as any[];
      used = Boolean(allowance);
      starterInstanceId = allowance?.instance_id ?? null;
    }
    res.json({
      model: CAMPAIGN_COMMERCIAL_MODEL,
      starterAllowance: {
        eligible: Boolean(window),
        available: Boolean(window) && !used,
        used,
        periodStart: window?.start.toISOString() ?? null,
        periodEnd: window?.end.toISOString() ?? null,
        instanceId: starterInstanceId,
      },
    });
  } catch (err) {
    console.error('GET /api/campaigns/commercial-model error:', err);
    res.status(500).json({ error: 'Failed to load campaign allowance' });
  }
});

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
      templateId, campaignTitle, description, regions, platforms,
      gameId, gameName, gameArtworkUrl, gameSteamAppId, gameItchUrl, gameEpicSlug,
      startType, scheduledStart, artworkUrl, accessMethod, accessInstructions,
      applicationPeriodDays, creatorDeadlineDays, maxPlaces, completionRewardType,
      completionRewardKeyRequired, manualApprovalRequired, objectiveSnapshot, reminderThresholdsHours,
      commercialType, budgetPence, contentPriorities,
    } = req.body;
    const normalized = normalizeCampaignInput(req.body);
    const canonicalAccessMethod = normalized.accessMethod ?? accessMethod;
    const canonicalObjectiveSnapshot = normalized.objectiveSnapshot ?? objectiveSnapshot;
    const canonicalInstructions = normalized.accessInstructions ?? accessInstructions;
    const canonicalDeadlineDays = normalized.creatorDeadlineDays ?? creatorDeadlineDays;
    const canonicalRewardKeyRequired = normalized.completionRewardKeyRequired ?? completionRewardKeyRequired;
    const canonicalRequiresAccessKey = normalized.requiresAccessKey ??
      (canonicalAccessMethod === 'custom_access' ? true : undefined);
    const canonicalReminderThresholds = reminderThresholdsHours === undefined
      ? null : normalizeCampaignReminderThresholds(reminderThresholdsHours);
    if (canonicalAccessMethod === 'custom_access' && !canonicalInstructions?.trim()) {
      return res.status(400).json({ error: 'Custom access instructions are required' });
    }
    if (canonicalDeadlineDays != null &&
        (!Number.isInteger(Number(canonicalDeadlineDays)) ||
         Number(canonicalDeadlineDays) < 1 || Number(canonicalDeadlineDays) > 90)) {
      return res.status(400).json({ error: 'Creator deadline must be between 1 and 90 days' });
    }

    if (!templateId) return res.status(400).json({ error: 'templateId is required' });
    if (!gameId) return res.status(400).json({ error: 'An owned gameId is required' });
    if (!Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ error: 'At least one platform is required' });
    }
    const requestedRegions = Array.isArray(regions) ? regions : [regions ?? 'worldwide'];
    if (requestedRegions.some((region: any) => !String(region).trim())) {
      return res.status(400).json({ error: 'Campaign region cannot be empty' });
    }

    const [eligibility] = toRows(await db.execute(sql`
      SELECT role, partner_type, is_indie_dev_subscriber,
        indie_dev_subscription_start_date, indie_dev_subscription_end_date
      FROM users WHERE id = ${userId}
    `)) as any[];
    const eligibleRole = ['developer', 'indie_developer', 'admin', 'moderator'].includes(String(eligibility?.role))
      || String(eligibility?.partner_type ?? '') === 'indie'
      || Boolean(eligibility?.is_indie_dev_subscriber);
    if (!eligibleRole) {
      return res.status(403).json({ error: 'A developer account is required to create campaigns' });
    }
    if (gameId) {
      const [ownedGame] = toRows(await db.execute(sql`
        SELECT id FROM indie_game_profiles
        WHERE user_id = ${userId}
          AND (id = ${Number(gameId)} OR catalog_game_id = ${Number(gameId)})
      `)) as any[];
      if (!ownedGame) return res.status(403).json({ error: 'You do not own this game' });
    }

    const [tmpl] = toRows(await db.execute(sql`
      SELECT id, slug, category, bounty_xp_reward, completion_bonus_xp, reward_config, duration
        , access_method, application_period_days, completion_deadline_days,
          participant_capacity, objective_config, completion_reward
      FROM campaign_templates WHERE id = ${Number(templateId)}
    `));
    if (!tmpl) return res.status(404).json({ error: 'Campaign template not found' });
    let resolvedTemplateId = Number(templateId);
    const resolvedCommercialType = commercialType === 'starter' ? 'starter' : commercialType === 'paid' ? 'paid' : null;
    const priorities = normalizePriorities(contentPriorities);
    let commercialEstimate = null as ReturnType<typeof calculateCampaignEstimate> | null;
    let billingWindow: ReturnType<typeof subscriptionMonthWindow> = null;
    let resolvedBudgetPence: number | null = null;
    if (resolvedCommercialType === 'starter') {
      if (!eligibility?.is_indie_dev_subscriber) {
        return res.status(403).json({ error: 'An active Indie Game Pro subscription is required for a Starter Bounty' });
      }
      billingWindow = subscriptionMonthWindow(
        eligibility.indie_dev_subscription_start_date,
        eligibility.indie_dev_subscription_end_date,
      );
      if (!billingWindow) return res.status(403).json({ error: 'No active Starter Bounty billing period was found' });
      if (String((tmpl as any).slug ?? '') !== CAMPAIGN_COMMERCIAL_MODEL.starter.templateSlug) {
        const [starterTemplate] = toRows(await db.execute(sql`
          SELECT id, slug, category, bounty_xp_reward, completion_bonus_xp, reward_config, duration,
            access_method, application_period_days, completion_deadline_days,
            participant_capacity, objective_config, completion_reward
          FROM campaign_templates
          WHERE slug = ${CAMPAIGN_COMMERCIAL_MODEL.starter.templateSlug} AND status = 'available'
        `)) as any[];
        if (!starterTemplate) return res.status(503).json({ error: 'Starter Bounty template is not configured' });
        resolvedTemplateId = Number(starterTemplate.id);
        Object.assign(tmpl, starterTemplate);
      }
    } else if (resolvedCommercialType === 'paid') {
      resolvedBudgetPence = Number(budgetPence);
      if (!Number.isInteger(resolvedBudgetPence) || resolvedBudgetPence < CAMPAIGN_COMMERCIAL_MODEL.paidMinimumPence) {
        return res.status(400).json({ error: `Paid campaigns require a budget of at least £${CAMPAIGN_COMMERCIAL_MODEL.paidMinimumPence / 100}` });
      }
      const commercialPreset = CAMPAIGN_COMMERCIAL_MODEL.presets.find(
        preset => preset.slug === String((tmpl as any).slug),
      );
      if (commercialPreset?.priceFromPence && resolvedBudgetPence < commercialPreset.priceFromPence) {
        return res.status(400).json({
          error: `${commercialPreset.slug === 'creator-showcase' ? 'Creator Showcase' : 'Content Boost'} campaigns start at £${commercialPreset.priceFromPence / 100}`,
        });
      }
      commercialEstimate = calculateCampaignEstimate(resolvedBudgetPence, priorities);
    }
    let customEstimate: ReturnType<typeof calculateCustomCampaign> | null = null;
    if (String(tmpl.category) === 'custom' && canonicalObjectiveSnapshot && typeof canonicalObjectiveSnapshot === 'object') {
      const custom = calculateCustomCampaign(canonicalObjectiveSnapshot);
      if (custom.warnings.length > 0) {
        return res.status(400).json({ error: 'Invalid campaign objectives', warnings: custom.warnings });
      }
      if (Number((canonicalObjectiveSnapshot as any).stream ?? 0) > 0 &&
          (!Array.isArray(platforms) || platforms.length === 0)) {
        return res.status(400).json({ error: 'Streaming objectives require at least one streaming platform' });
      }
      if (Number((canonicalObjectiveSnapshot as any).stream ?? 0) > 0) {
        const [streamProfile] = toRows(await db.execute(sql`
          SELECT twitch_url, youtube_url FROM indie_game_profiles
          WHERE user_id = ${userId}
            AND (id = ${Number(gameId)} OR catalog_game_id = ${Number(gameId)})
        `)) as any[];
        if (!streamProfile?.twitch_url && !streamProfile?.youtube_url) {
          return res.status(400).json({ error: 'Streaming objectives require a linked Twitch or YouTube channel' });
        }
      }
      customEstimate = custom;
    } else if (String(tmpl.category) === 'custom') {
      return res.status(400).json({ error: 'Custom campaigns require objective quantities' });
    }
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
    if (customEstimate) {
      resolvedTemplateId = await materializeCustomTemplateSnapshot(
         { ...tmpl, requires_access_key: canonicalRequiresAccessKey ?? true },
        canonicalObjectiveSnapshot as Record<string, number>,
        userId,
        customEstimate,
      );
    }

    const [instance] = toRows(await db.execute(sql`
      INSERT INTO campaign_instances
        (template_id, developer_user_id, campaign_title, description, regions, platforms,
         game_id, game_name, game_artwork_url,
         game_steam_app_id, game_itch_url, game_epic_slug,
          artwork_url, start_type, scheduled_start, bounty_xp_reward,
          completion_bonus_xp, reward_config, access_method, access_instructions,
          application_period_days, creator_deadline_days, max_places,
          completion_reward_type, completion_reward_key_required, requires_access_key,
           manual_approval_required, reminder_thresholds_hours, objective_snapshot, lifecycle_state, status)
      VALUES
        (${resolvedTemplateId}, ${userId}, ${campaignTitle?.trim() || null}, ${description?.trim() || null},
         ${regions ?? 'worldwide'}, ${platforms?.length ? platforms : null},
         ${gameId ?? null}, ${gameName ?? null}, ${gameArtworkUrl ?? null},
         ${gameSteamAppId ?? null}, ${gameItchUrl ?? null}, ${gameEpicSlug ?? null},
         ${artworkUrl ?? null}, ${startType ?? 'asap'}, ${scheduledStart ?? null},
          ${customEstimate?.totalXp ?? tmpl.bounty_xp_reward ?? null},
          ${customEstimate?.completionBonus ?? tmpl.completion_bonus_xp ?? null},
          ${tmpl.reward_config ? JSON.stringify(tmpl.reward_config) : null}::jsonb,
          ${canonicalAccessMethod ?? tmpl.access_method ?? 'demo_to_full'},
          ${canonicalInstructions?.trim() || null},
          ${Number(applicationPeriodDays ?? tmpl.application_period_days ?? 30)},
          ${Number(resolvedCommercialType === 'starter'
            ? CAMPAIGN_COMMERCIAL_MODEL.starter.durationDays
            : canonicalDeadlineDays ?? commercialEstimate?.suggestedDurationDays ?? customEstimate?.deadlineDays ?? tmpl.completion_deadline_days ?? tmpl.duration ?? 14)},
          ${Number(resolvedCommercialType === 'starter'
            ? CAMPAIGN_COMMERCIAL_MODEL.starter.creatorPlaces
            : maxPlaces ?? commercialEstimate?.creators.max ?? tmpl.participant_capacity ?? 20)},
          ${completionRewardType ?? tmpl.completion_reward ?? 'bounty_xp'},
          ${canonicalRewardKeyRequired ?? (tmpl.completion_reward === 'full_game_key')},
          ${canonicalRequiresAccessKey ?? true},
          ${manualApprovalRequired ?? false},
           ${canonicalReminderThresholds},
          ${resolvedCommercialType === 'starter'
            ? JSON.stringify(CAMPAIGN_COMMERCIAL_MODEL.starter.estimatedContent)
            : resolvedCommercialType === 'paid' && commercialEstimate
              ? JSON.stringify(commercialEstimate.content)
              : canonicalObjectiveSnapshot
                ? JSON.stringify(canonicalObjectiveSnapshot)
                : (tmpl.objective_config ? JSON.stringify(tmpl.objective_config) : null)}::jsonb,
          'draft', 'draft')
      RETURNING *
    `) as any[]);

    const rewardPoolContributionPence = resolvedCommercialType === 'paid' && resolvedBudgetPence != null
      ? Math.round(resolvedBudgetPence * CAMPAIGN_COMMERCIAL_MODEL.rewardPoolContributionRate)
      : 0;
    await db.execute(sql`
      UPDATE campaign_instances SET
        commercial_type = ${resolvedCommercialType},
        budget_pence = ${resolvedBudgetPence},
        content_priorities = ${resolvedCommercialType === 'paid' ? JSON.stringify(priorities) : null}::jsonb,
        billing_period_start = ${billingWindow?.start.toISOString() ?? null},
        billing_period_end = ${billingWindow?.end.toISOString() ?? null},
        reward_pool_contribution_pence = ${rewardPoolContributionPence},
        estimate_snapshot = COALESCE(
          ${commercialEstimate
            ? JSON.stringify(commercialEstimate)
            : resolvedCommercialType === 'starter'
              ? JSON.stringify({
                  estimatedContent: CAMPAIGN_COMMERCIAL_MODEL.starter.estimatedContent,
                  estimatesGuaranteed: false,
                  methodologyVersion: CAMPAIGN_COMMERCIAL_MODEL.version,
                })
              : null}::jsonb,
          estimate_snapshot
        )
      WHERE id = ${instance.id}
    `);
    if (resolvedCommercialType === 'starter' && billingWindow) {
      const [reserved] = toRows(await db.execute(sql`
        INSERT INTO campaign_starter_allowances
          (developer_user_id, period_start, period_end, instance_id)
        VALUES
          (${userId}, ${billingWindow.start.toISOString()}, ${billingWindow.end.toISOString()}, ${instance.id})
        ON CONFLICT (developer_user_id, period_start) DO NOTHING
        RETURNING id
      `)) as any[];
      if (!reserved) {
        await db.execute(sql`DELETE FROM campaign_instances WHERE id = ${instance.id} AND status = 'draft'`);
        return res.status(409).json({ error: 'Your Starter Bounty has already been used for this billing period' });
      }
    }

    res.status(201).json({
      ...instance,
      commercial_type: resolvedCommercialType,
      budget_pence: resolvedBudgetPence,
      reward_pool_contribution_pence: rewardPoolContributionPence,
      estimate_snapshot: commercialEstimate ?? instance.estimate_snapshot,
    });
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
      campaignTitle, description, regions, platforms,
      gameId, gameName, gameArtworkUrl, gameSteamAppId, gameItchUrl, gameEpicSlug,
      startType, scheduledStart, artworkUrl, status, accessMethod, accessInstructions,
      applicationPeriodDays, creatorDeadlineDays, maxPlaces, completionRewardType,
      completionRewardKeyRequired, manualApprovalRequired, objectiveSnapshot, estimateSnapshot,
      reminderThresholdsHours,
    } = req.body;
    const normalized = normalizeCampaignInput(req.body);
    const canonicalPatchedObjectives = normalized.objectiveSnapshot ?? objectiveSnapshot;
    if ((normalized.accessMethod ?? accessMethod) === 'custom_access' &&
        !(normalized.accessInstructions ?? accessInstructions)?.trim()) {
      return res.status(400).json({ error: 'Custom access instructions are required' });
    }
    const patchedDeadline = normalized.creatorDeadlineDays ?? creatorDeadlineDays;
    const patchedReminderThresholds = reminderThresholdsHours === undefined
      ? null : normalizeCampaignReminderThresholds(reminderThresholdsHours);
    if (patchedDeadline != null &&
        (!Number.isInteger(Number(patchedDeadline)) || Number(patchedDeadline) < 1 || Number(patchedDeadline) > 90)) {
      return res.status(400).json({ error: 'Creator deadline must be between 1 and 90 days' });
    }

    const [existing] = toRows(await db.execute(sql`
      SELECT ci.id, ci.developer_user_id, ci.status, ci.template_id, ci.game_id,
        t.category, t.name, t.description, t.best_use_case
      FROM campaign_instances ci JOIN campaign_templates t ON t.id = ci.template_id
      WHERE ci.id = ${instanceId}
    `)) as any[];
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });
    if (existing.developer_user_id !== userId) return res.status(403).json({ error: 'Forbidden' });
    if (existing.status === 'live') return res.status(400).json({ error: 'Cannot modify a live campaign' });
    if (gameId !== undefined && gameId !== null) {
      const [ownedGame] = toRows(await db.execute(sql`
        SELECT id FROM indie_game_profiles
        WHERE user_id = ${userId}
          AND (id = ${Number(gameId)} OR catalog_game_id = ${Number(gameId)})
      `)) as any[];
      if (!ownedGame) return res.status(403).json({ error: 'You do not own this game' });
    }
    if (platforms !== undefined && (!Array.isArray(platforms) || platforms.length === 0)) {
      return res.status(400).json({ error: 'At least one platform is required' });
    }
    if (regions !== undefined) {
      const requestedRegions = Array.isArray(regions) ? regions : [regions];
      if (requestedRegions.some((region: any) => !String(region).trim())) {
        return res.status(400).json({ error: 'Campaign region cannot be empty' });
      }
    }
    let patchEstimate: ReturnType<typeof calculateCustomCampaign> | null = null;
    let patchTemplateId: number | null = null;
    if (String(existing.category) === 'custom' && canonicalPatchedObjectives) {
      if (Number((canonicalPatchedObjectives as any).stream ?? 0) > 0 &&
          (!Array.isArray(platforms) || platforms.length === 0)) {
        return res.status(400).json({ error: 'Streaming objectives require at least one streaming platform' });
      }
      if (Number((canonicalPatchedObjectives as any).stream ?? 0) > 0) {
        const profileGameId = gameId ?? existing.game_id;
        const [streamProfile] = toRows(await db.execute(sql`
          SELECT twitch_url, youtube_url FROM indie_game_profiles
          WHERE user_id = ${userId}
            AND (id = ${Number(profileGameId)} OR catalog_game_id = ${Number(profileGameId)})
        `)) as any[];
        if (!streamProfile?.twitch_url && !streamProfile?.youtube_url) {
          return res.status(400).json({ error: 'Streaming objectives require a linked Twitch or YouTube channel' });
        }
      }
      patchEstimate = calculateCustomCampaign(canonicalPatchedObjectives);
      if (patchEstimate.warnings.length > 0) {
        return res.status(400).json({ error: 'Invalid campaign objectives', warnings: patchEstimate.warnings });
      }
      patchTemplateId = await materializeCustomTemplateSnapshot(
        existing,
        canonicalPatchedObjectives as Record<string, number>,
        userId,
        patchEstimate,
      );
    }

    const newStatus = status === 'awaiting_review' ? 'awaiting_review' : undefined;
    const submittedAt = newStatus === 'awaiting_review' ? new Date().toISOString() : undefined;

    await db.execute(sql`
      UPDATE campaign_instances SET
        campaign_title = COALESCE(${campaignTitle?.trim() || null}, campaign_title),
        description = COALESCE(${description?.trim() || null}, description),
        regions = COALESCE(${regions ?? null}, regions),
        platforms = COALESCE(${platforms !== undefined ? platforms : null}, platforms),
        game_id = COALESCE(${gameId ?? null}, game_id),
        game_name = COALESCE(${gameName ?? null}, game_name),
        game_artwork_url = COALESCE(${gameArtworkUrl ?? null}, game_artwork_url),
        game_steam_app_id = COALESCE(${gameSteamAppId ?? null}, game_steam_app_id),
        game_itch_url = COALESCE(${gameItchUrl ?? null}, game_itch_url),
        game_epic_slug = COALESCE(${gameEpicSlug ?? null}, game_epic_slug),
        artwork_url = COALESCE(${artworkUrl ?? null}, artwork_url),
        start_type = COALESCE(${startType ?? null}, start_type),
        scheduled_start = COALESCE(${scheduledStart ?? null}, scheduled_start),
        access_method = COALESCE(${normalized.accessMethod ?? accessMethod ?? null}, access_method),
        access_instructions = COALESCE(${(normalized.accessInstructions ?? accessInstructions)?.trim() || null}, access_instructions),
        application_period_days = COALESCE(${applicationPeriodDays ?? null}, application_period_days),
        creator_deadline_days = COALESCE(${normalized.creatorDeadlineDays ?? creatorDeadlineDays ?? patchEstimate?.deadlineDays ?? null}, creator_deadline_days),
        max_places = COALESCE(${maxPlaces ?? null}, max_places),
        completion_reward_type = COALESCE(${completionRewardType ?? null}, completion_reward_type),
        completion_reward_key_required = COALESCE(${normalized.completionRewardKeyRequired ?? completionRewardKeyRequired ?? null}, completion_reward_key_required),
        requires_access_key = COALESCE(${normalized.requiresAccessKey ?? null}, requires_access_key),
        manual_approval_required = COALESCE(${manualApprovalRequired ?? null}, manual_approval_required),
        reminder_thresholds_hours = COALESCE(${patchedReminderThresholds}, reminder_thresholds_hours),
        template_id = COALESCE(${patchTemplateId}, template_id),
        objective_snapshot = COALESCE(${canonicalPatchedObjectives ? JSON.stringify(canonicalPatchedObjectives) : null}::jsonb, objective_snapshot),
        bounty_xp_reward = COALESCE(${patchEstimate?.totalXp ?? null}, bounty_xp_reward),
        completion_bonus_xp = COALESCE(${patchEstimate?.completionBonus ?? null}, completion_bonus_xp),
        estimate_snapshot = COALESCE(${patchEstimate ? JSON.stringify(patchEstimate) : null}::jsonb, estimate_snapshot),
        estimate_snapshot = COALESCE(${estimateSnapshot ? JSON.stringify(estimateSnapshot) : null}::jsonb, estimate_snapshot),
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
    const { keyType, keys, keyPool = 'access', platform } = req.body; // keyType: 'demo' | 'full'

    if (!keyType || !['demo', 'full'].includes(keyType)) return res.status(400).json({ error: 'keyType must be demo or full' });
    if (!['access', 'reward'].includes(keyPool)) return res.status(400).json({ error: 'keyPool must be access or reward' });
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
      SELECT key_hash, key_value FROM game_keys WHERE instance_id = ${instanceId} AND key_type = ${keyType} AND key_pool = ${keyPool}
    `);
    const existingSet = new Set((toRows(existingKeysRes) as any[]).flatMap(r => [
      r.key_hash,
      // Compatibility only for rows awaiting the one-time encryption backfill.
      r.key_value ? hashCampaignKey(r.key_value) : null,
    ].filter(Boolean)));
    const newKeys = cleaned.filter(k => !existingSet.has(hashCampaignKey(k)));
    const alreadyExists = cleaned.length - newKeys.length;

    // Create batch
    const [batch] = toRows(await db.execute(sql`
      INSERT INTO game_key_batches (instance_id, key_type, total_keys, valid_keys, duplicate_keys, invalid_keys)
      VALUES (${instanceId}, ${keyType}, ${total}, ${newKeys.length}, ${duplicates + alreadyExists}, 0)
      RETURNING id
    `)) as any[];

    // Insert individual keys
    for (const keyValue of newKeys) {
      const encrypted = encryptCampaignKey(keyValue);
      await db.execute(sql`
        INSERT INTO game_keys
          (batch_id, instance_id, developer_user_id, key_type, key_pool, platform,
           key_ciphertext, key_iv, key_auth_tag, key_hash, status, key_version, keyring_id)
        VALUES
          (${batch.id}, ${instanceId}, ${userId}, ${keyType}, ${keyPool}, ${platform ?? null},
            ${encrypted.ciphertext}, ${encrypted.iv}, ${encrypted.authTag}, ${encrypted.hash}, 'available',
            ${encrypted.keyVersion}, ${encrypted.keyringId})
        ON CONFLICT DO NOTHING
      `);
    }
    const [inventory] = toRows(await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE key_type = 'demo' AND key_pool = 'access' AND status = 'available') AS access_keys,
        COUNT(*) FILTER (WHERE key_type = 'full' AND key_pool = 'reward' AND status = 'available') AS reward_keys,
        COUNT(*) FILTER (WHERE key_type = 'full' AND key_pool = 'access' AND status = 'available') AS full_access_keys
      FROM game_keys WHERE instance_id = ${instanceId}
    `)) as any[];
    const instanceCapacity = Number(inventory?.access_keys ?? 0) > 0 && Number(inventory?.reward_keys ?? 0) > 0
      ? Math.min(Number(inventory.access_keys), Number(inventory.reward_keys))
      : Math.max(Number(inventory?.full_access_keys ?? 0), Number(inventory?.access_keys ?? 0), Number(inventory?.reward_keys ?? 0));

    res.json({
      added: newKeys.length,
      duplicates: duplicates + alreadyExists,
      total,
      batchId: batch.id,
      capacity: instanceCapacity,
      inventory: {
        accessKeys: Number(inventory?.access_keys ?? 0),
        fullAccessKeys: Number(inventory?.full_access_keys ?? 0),
        completionRewardKeys: Number(inventory?.reward_keys ?? 0),
      },
    });
  } catch (err) {
    console.error('POST /api/campaigns/instances/:id/keys failed');
    res.status(500).json({ error: 'Failed to upload keys' });
  }
});

// Remove an unrevealed key; assigned/revealed/rewarded credentials are
// immutable historical records and cannot be silently recycled.
router.delete('/instances/:id/keys/:keyId', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const instanceId = Number(req.params.id);
    const keyId = Number(req.params.keyId);
    const [removed] = toRows(await db.execute(sql`
      UPDATE game_keys gk
      SET status = 'removed', removed_at = NOW()
      FROM campaign_instances ci
      WHERE gk.id = ${keyId} AND gk.instance_id = ${instanceId}
        AND ci.id = gk.instance_id AND ci.developer_user_id = ${userId}
        AND gk.status = 'available'
      RETURNING gk.id
    `)) as any[];
    if (!removed) return res.status(404).json({ error: 'Available key not found' });
    await db.execute(sql`
      INSERT INTO campaign_key_events
        (key_id, instance_id, actor_user_id, event_type, from_status, to_status)
      VALUES (${removed.id}, ${instanceId}, ${userId}, 'removed', 'available', 'removed')
    `);
    res.json({ success: true, keyId: removed.id });
  } catch {
    res.status(500).json({ error: 'Failed to remove key' });
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
      SET status = 'awaiting_review', submitted_at = NOW(),
          lifecycle_state = 'pending_review', updated_at = NOW()
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
    const [requirements] = toRows(await db.execute(sql`
      SELECT ci.max_places, ci.completion_reward_key_required, ci.requires_access_key,
        ci.access_method, t.access_method AS template_access_method
      FROM campaign_instances ci JOIN campaign_templates t ON t.id = ci.template_id
      WHERE ci.id = ${instanceId}
    `)) as any[];
    if (!requirements) return res.status(404).json({ error: 'Campaign not found' });
    const accessMethod = String(requirements.access_method ?? requirements.template_access_method ?? 'demo_to_full');
    const needsAccess = ['demo_to_full', 'full_game_upfront', 'private_playtest'].includes(accessMethod)
      || (accessMethod === 'custom_access' && requirements.requires_access_key !== false);
    const [inventory] = toRows(await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE key_pool = 'access' AND status = 'available'
          AND ((key_type = 'full' AND ${accessMethod} = 'full_game_upfront')
            OR (key_type = 'demo' AND ${accessMethod} <> 'full_game_upfront'))) AS access_available,
        COUNT(*) FILTER (WHERE key_pool = 'reward' AND key_type = 'full' AND status = 'available') AS reward_available
      FROM game_keys WHERE instance_id = ${instanceId}
    `)) as any[];
    const places = Number(requirements.max_places ?? 0);
    if (places > 0 && needsAccess && Number(inventory?.access_available ?? 0) < places) {
      return res.status(409).json({ error: 'Campaign lacks enough access keys for its configured capacity' });
    }
    if (places > 0 && requirements.completion_reward_key_required !== false &&
        Number(inventory?.reward_available ?? 0) < places) {
      return res.status(409).json({ error: 'Campaign lacks enough completion reward keys for its configured capacity' });
    }
    await db.execute(sql`
      UPDATE campaign_instances
      SET status = 'approved', lifecycle_state = 'accepting',
          end_date = COALESCE(end_date, NOW() + (COALESCE(application_period_days, 30) * interval '1 day')),
          actual_start = COALESCE(actual_start, NOW()),
          approved_at = NOW(), updated_at = NOW(), admin_notes = ${req.body.notes ?? null}
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
    const { keyType, keys, keyPool = 'access', platform } = req.body;
    if (!keyType || !['demo', 'full'].includes(keyType)) {
      return res.status(400).json({ error: 'keyType must be demo or full' });
    }
    if (!['access', 'reward'].includes(keyPool)) {
      return res.status(400).json({ error: 'keyPool must be access or reward' });
    }
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'keys array is required' });
    }

    const trimmed  = keys.map((k: string) => k.trim()).filter((k: string) => k.length > 0);
    const cleaned  = Array.from(new Set(trimmed));

    const existing = toRows(await db.execute(sql`
      SELECT key_hash, key_value FROM game_keys
      WHERE developer_user_id = ${userId} AND key_type = ${keyType}
        AND key_pool = ${keyPool} AND instance_id IS NULL
    `)) as any[];
    const existingSet = new Set(existing.flatMap((r: any) => [
      r.key_hash,
      r.key_value ? hashCampaignKey(r.key_value) : null,
    ].filter(Boolean)));
    const newKeys  = cleaned.filter((k: string) => !existingSet.has(hashCampaignKey(k)));
    const duplicates = cleaned.length - newKeys.length;

    // Create a pool batch (instance_id = NULL)
    const batchRows = toRows(await db.execute(sql`
      INSERT INTO game_key_batches (instance_id, key_type, total_keys, valid_keys, duplicate_keys, invalid_keys)
      VALUES (NULL, ${keyType}, ${trimmed.length}, ${newKeys.length}, ${duplicates}, 0)
      RETURNING id
    `)) as any[];
    const batchId = batchRows[0]?.id ?? null;

    for (const keyValue of newKeys) {
      const encrypted = encryptCampaignKey(keyValue);
      await db.execute(sql`
        INSERT INTO game_keys
          (batch_id, developer_user_id, key_type, key_pool, platform,
           key_ciphertext, key_iv, key_auth_tag, key_hash, status, key_version, keyring_id)
        VALUES
          (${batchId}, ${userId}, ${keyType}, ${keyPool}, ${platform ?? null},
            ${encrypted.ciphertext}, ${encrypted.iv}, ${encrypted.authTag}, ${encrypted.hash}, 'available',
            ${encrypted.keyVersion}, ${encrypted.keyringId})
        ON CONFLICT DO NOTHING
      `);
    }

    res.json({ added: newKeys.length, duplicates, total: trimmed.length });
  } catch (err) {
    console.error('POST /api/campaigns/auto/keys failed');
    res.status(500).json({ error: 'Failed to upload pool keys' });
  }
});

export default router;
