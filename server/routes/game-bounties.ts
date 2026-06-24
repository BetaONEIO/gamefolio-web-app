import express from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { XPService } from '../xp-service';

const router = express.Router();

async function ensureBountyTables() {
  try {
    // Base tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS game_bounties (
        id SERIAL PRIMARY KEY,
        game_id INTEGER NOT NULL,
        created_by_user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        reward_type TEXT NOT NULL DEFAULT 'game_key',
        reward_value TEXT,
        key_count INTEGER DEFAULT 0,
        creator_slots INTEGER DEFAULT 10,
        difficulty TEXT DEFAULT 'medium',
        end_date TIMESTAMP,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS game_bounty_acceptances (
        id SERIAL PRIMARY KEY,
        bounty_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    // Migration: add new columns to game_bounties
    await db.execute(sql`
      ALTER TABLE game_bounties
      ADD COLUMN IF NOT EXISTS campaign_title TEXT,
      ADD COLUMN IF NOT EXISTS demo_key_pool TEXT,
      ADD COLUMN IF NOT EXISTS full_key_pool TEXT,
      ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 10,
      ADD COLUMN IF NOT EXISTS required_clips INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS required_reels INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS required_screenshots INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS required_views INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS xp_join INTEGER DEFAULT 500,
      ADD COLUMN IF NOT EXISTS xp_per_clip INTEGER DEFAULT 1000,
      ADD COLUMN IF NOT EXISTS xp_per_reel INTEGER DEFAULT 2500,
      ADD COLUMN IF NOT EXISTS xp_per_screenshot INTEGER DEFAULT 200,
      ADD COLUMN IF NOT EXISTS xp_view_milestone INTEGER DEFAULT 2500,
      ADD COLUMN IF NOT EXISTS xp_completion_bonus INTEGER DEFAULT 5000,
      ADD COLUMN IF NOT EXISTS total_xp_available INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS demo_keys_remaining INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS full_keys_remaining INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS completion_badge TEXT
    `);
    // Migration: add new columns to game_bounty_acceptances
    await db.execute(sql`
      ALTER TABLE game_bounty_acceptances
      ADD COLUMN IF NOT EXISTS demo_key TEXT,
      ADD COLUMN IF NOT EXISTS full_key TEXT,
      ADD COLUMN IF NOT EXISTS clips_uploaded INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS reels_uploaded INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS screenshots_uploaded INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_views INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS xp_earned INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS completed_badge_awarded BOOLEAN DEFAULT FALSE
    `);
    // Create unique constraint on join
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bounty_user_unique') THEN
          ALTER TABLE game_bounty_acceptances ADD CONSTRAINT bounty_user_unique UNIQUE (bounty_id, user_id);
        END IF;
      END $$;
    `);
  } catch (err) {
    console.error('Failed to create bounty tables:', err);
  }
}

ensureBountyTables();

// List bounties for a game
router.get('/:gameId/bounties', async (req, res) => {
  try {
    const gameId = parseInt(req.params.gameId);
    if (isNaN(gameId)) return res.status(400).json({ message: 'Invalid game ID' });
    const result = await db.execute(sql`
      SELECT
        gb.id, gb.game_id AS "gameId", gb.created_by_user_id AS "createdByUserId",
        gb.title, gb.campaign_title AS "campaignTitle", gb.description,
        gb.reward_type AS "rewardType", gb.reward_value AS "rewardValue",
        gb.key_count AS "keyCount", gb.creator_slots AS "creatorSlots", gb.difficulty,
        gb.end_date AS "endDate", gb.status,
        gb.max_participants AS "maxParticipants",
        gb.required_clips AS "requiredClips", gb.required_reels AS "requiredReels",
        gb.required_screenshots AS "requiredScreenshots", gb.required_views AS "requiredViews",
        gb.xp_join AS "xpJoin", gb.xp_per_clip AS "xpPerClip", gb.xp_per_reel AS "xpPerReel",
        gb.xp_per_screenshot AS "xpPerScreenshot", gb.xp_view_milestone AS "xpViewMilestone",
        gb.xp_completion_bonus AS "xpCompletionBonus", gb.total_xp_available AS "totalXpAvailable",
        gb.demo_keys_remaining AS "demoKeysRemaining", gb.full_keys_remaining AS "fullKeysRemaining",
        gb.completion_badge AS "completionBadge",
        COUNT(DISTINCT gba.user_id)::int AS "participantCount",
        u.username AS "creatorUsername"
      FROM game_bounties gb
      LEFT JOIN game_bounty_acceptances gba ON gba.bounty_id = gb.id AND gba.status = 'active'
      LEFT JOIN users u ON u.id = gb.created_by_user_id
      WHERE gb.game_id = ${gameId} AND gb.status != 'cancelled'
      GROUP BY gb.id, u.username
      ORDER BY gb.created_at DESC
    `);
    res.json((result as any).rows ?? result);
  } catch (err) {
    console.error('Error fetching bounties:', err);
    res.json([]);
  }
});

// Create a bounty campaign
router.post('/:gameId/bounties', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const gameId = parseInt(req.params.gameId);
    if (isNaN(gameId)) return res.status(400).json({ message: 'Invalid game ID' });
    const userId = (req.user as any).id;
    const {
      title, description, campaignTitle,
      demoKeyPool, fullKeyPool,
      maxParticipants, endDate,
      requiredClips, requiredReels, requiredScreenshots, requiredViews,
      xpJoin, xpPerClip, xpPerReel, xpPerScreenshot, xpViewMilestone, xpCompletionBonus,
      completionBadge,
    } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });

    const demoKeys = Array.isArray(demoKeyPool) ? demoKeyPool : [];
    const fullKeys = Array.isArray(fullKeyPool) ? fullKeyPool : [];

    const totalXp = (xpJoin || 500) + (demoKeys.length * (xpPerClip || 1000)) + (fullKeys.length * (xpPerReel || 2500)) + ((xpPerScreenshot || 200) * (requiredScreenshots || 0)) + (xpViewMilestone || 2500) + (xpCompletionBonus || 5000);

    const result = await db.execute(sql`
      INSERT INTO game_bounties
        (game_id, created_by_user_id, title, campaign_title, description,
         reward_type, reward_value, key_count, creator_slots, difficulty, end_date,
         max_participants, required_clips, required_reels, required_screenshots, required_views,
         xp_join, xp_per_clip, xp_per_reel, xp_per_screenshot, xp_view_milestone, xp_completion_bonus,
         total_xp_available, demo_keys_remaining, full_keys_remaining, completion_badge)
      VALUES
        (${gameId}, ${userId}, ${title.trim()}, ${campaignTitle || null}, ${description || null},
         'game_key', ${fullKeys.length > 0 ? fullKeys[0] : null}, ${fullKeys.length}, ${maxParticipants || 10},
         'medium', ${endDate ? new Date(endDate) : null},
         ${maxParticipants || 10}, ${requiredClips || 0}, ${requiredReels || 0}, ${requiredScreenshots || 0}, ${requiredViews || 0},
         ${xpJoin || 500}, ${xpPerClip || 1000}, ${xpPerReel || 2500}, ${xpPerScreenshot || 200}, ${xpViewMilestone || 2500}, ${xpCompletionBonus || 5000},
         ${totalXp}, ${demoKeys.length}, ${fullKeys.length}, ${completionBadge || null})
      RETURNING
        id, game_id AS "gameId", created_by_user_id AS "createdByUserId",
        title, campaign_title AS "campaignTitle", description,
        max_participants AS "maxParticipants",
        required_clips AS "requiredClips", required_reels AS "requiredReels",
        required_screenshots AS "requiredScreenshots", required_views AS "requiredViews",
        xp_join AS "xpJoin", xp_per_clip AS "xpPerClip", xp_per_reel AS "xpPerReel",
        xp_per_screenshot AS "xpPerScreenshot", xp_view_milestone AS "xpViewMilestone",
        xp_completion_bonus AS "xpCompletionBonus", total_xp_available AS "totalXpAvailable",
        demo_keys_remaining AS "demoKeysRemaining", full_keys_remaining AS "fullKeysRemaining",
        completion_badge AS "completionBadge", end_date AS "endDate", status, created_at AS "createdAt"
    `);
    const row = ((result as any).rows ?? result)[0];
    // Store demo keys in a separate key pool (serialized in description or as JSON)
    if (demoKeys.length > 0) {
      await db.execute(sql`
        UPDATE game_bounties SET demo_key_pool = ${JSON.stringify(demoKeys)} WHERE id = ${row.id}
      `);
    }
    if (fullKeys.length > 0) {
      await db.execute(sql`
        UPDATE game_bounties SET full_key_pool = ${JSON.stringify(fullKeys)} WHERE id = ${row.id}
      `);
    }
    res.status(201).json({ ...row, demoKeys: demoKeys.length, fullKeys: fullKeys.length });
  } catch (err) {
    console.error('Error creating bounty:', err);
    res.status(500).json({ message: 'Failed to create bounty' });
  }
});

// Join a campaign (creator)
router.post('/bounties/:bountyId/join', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const bountyId = parseInt(req.params.bountyId);
    if (isNaN(bountyId)) return res.status(400).json({ message: 'Invalid bounty ID' });
    const userId = (req.user as any).id;

    const bounty = await db.execute(sql`
      SELECT demo_key_pool, full_key_pool, demo_keys_remaining, max_participants, xp_join, status
      FROM game_bounties WHERE id = ${bountyId}
    `);
    const bountyRows = (bounty as any).rows ?? bounty;
    if (bountyRows.length === 0) return res.status(404).json({ message: 'Bounty not found' });
    const b = bountyRows[0];
    if (b.status !== 'active') return res.status(400).json({ message: 'Campaign is not active' });
    if (b.demo_keys_remaining <= 0) return res.status(400).json({ message: 'No demo keys remaining' });

    const participantCount = await db.execute(sql`
      SELECT COUNT(*)::int as count FROM game_bounty_acceptances WHERE bounty_id = ${bountyId} AND status = 'active'
    `);
    const pc = ((participantCount as any).rows ?? participantCount)[0];
    if (pc.count >= b.max_participants) return res.status(400).json({ message: 'Campaign is full' });

    const existing = await db.execute(sql`
      SELECT id FROM game_bounty_acceptances WHERE bounty_id = ${bountyId} AND user_id = ${userId}
    `);
    const existingRows = (existing as any).rows ?? existing;
    if (existingRows.length > 0) {
      return res.status(400).json({ message: 'Already joined this campaign' });
    }

    // Assign a demo key
    let demoKey: string | null = null;
    if (b.demo_key_pool) {
      try {
        const pool = JSON.parse(b.demo_key_pool);
        if (Array.isArray(pool) && pool.length > 0) {
          demoKey = pool[0];
          const remaining = pool.slice(1);
          await db.execute(sql`
            UPDATE game_bounties
            SET demo_key_pool = ${JSON.stringify(remaining)}, demo_keys_remaining = ${remaining.length}
            WHERE id = ${bountyId}
          `);
        }
      } catch (e) {
        console.error('Failed to parse demo key pool:', e);
      }
    }

    await db.execute(sql`
      INSERT INTO game_bounty_acceptances (bounty_id, user_id, demo_key, status)
      VALUES (${bountyId}, ${userId}, ${demoKey}, 'active')
    `);

    // Award join XP
    if (b.xp_join && b.xp_join > 0) {
      await XPService.awardXP(userId, b.xp_join, 'other', `Joined "${b.title || 'Campaign'}" and claimed demo key`);
    }

    res.json({ success: true, demoKey });
  } catch (err) {
    console.error('Error joining bounty:', err);
    res.status(500).json({ message: 'Failed to join campaign' });
  }
});

// Get creator campaign status
router.get('/bounties/:bountyId/me', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const bountyId = parseInt(req.params.bountyId);
    const userId = (req.user as any).id;

    const result = await db.execute(sql`
      SELECT
        gba.id, gba.bounty_id AS "bountyId", gba.user_id AS "userId",
        gba.demo_key AS "demoKey", gba.full_key AS "fullKey",
        gba.clips_uploaded AS "clipsUploaded", gba.reels_uploaded AS "reelsUploaded",
        gba.screenshots_uploaded AS "screenshotsUploaded", gba.total_views AS "totalViews",
        gba.xp_earned AS "xpEarned", gba.progress_percent AS "progressPercent",
        gba.status, gba.joined_at AS "joinedAt", gba.completed_at AS "completedAt",
        gba.completed_badge_awarded AS "completedBadgeAwarded",
        gb.title, gb.campaign_title AS "campaignTitle", gb.description,
        gb.required_clips AS "requiredClips", gb.required_reels AS "requiredReels",
        gb.required_screenshots AS "requiredScreenshots", gb.required_views AS "requiredViews",
        gb.xp_join AS "xpJoin", gb.xp_per_clip AS "xpPerClip", gb.xp_per_reel AS "xpPerReel",
        gb.xp_per_screenshot AS "xpPerScreenshot", gb.xp_view_milestone AS "xpViewMilestone",
        gb.xp_completion_bonus AS "xpCompletionBonus", gb.total_xp_available AS "totalXpAvailable",
        gb.completion_badge AS "completionBadge", gb.full_keys_remaining AS "fullKeysRemaining",
        gb.end_date AS "endDate", gb.status AS "bountyStatus"
      FROM game_bounty_acceptances gba
      JOIN game_bounties gb ON gb.id = gba.bounty_id
      WHERE gba.bounty_id = ${bountyId} AND gba.user_id = ${userId}
    `);
    const rows = (result as any).rows ?? result;
    if (rows.length === 0) return res.status(404).json({ message: 'Not joined' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching my bounty status:', err);
    res.status(500).json({ message: 'Failed to fetch status' });
  }
});

// Check progress and award XP for uploaded content
router.post('/bounties/:bountyId/check-progress', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const bountyId = parseInt(req.params.bountyId);
    const userId = (req.user as any).id;

    const bounty = await db.execute(sql`
      SELECT game_id, required_clips, required_reels, required_screenshots, required_views,
             xp_per_clip, xp_per_reel, xp_per_screenshot, xp_view_milestone,
             xp_completion_bonus, xp_join, completion_badge, full_keys_remaining,
             title, full_key_pool
      FROM game_bounties WHERE id = ${bountyId}
    `);
    const b = ((bounty as any).rows ?? bounty)[0];
    if (!b) return res.status(404).json({ message: 'Bounty not found' });

    const acc = await db.execute(sql`
      SELECT clips_uploaded, reels_uploaded, screenshots_uploaded, total_views, xp_earned, status
      FROM game_bounty_acceptances WHERE bounty_id = ${bountyId} AND user_id = ${userId}
    `);
    const a = ((acc as any).rows ?? acc)[0];
    if (!a) return res.status(404).json({ message: 'Not joined' });

    const gameId = b.game_id;

    // Count clips for this game by this user
    const clipsRes = await db.execute(sql`
      SELECT COUNT(*)::int as count, COALESCE(SUM(views), 0)::int as total_views
      FROM clips WHERE game_id = ${gameId} AND user_id = ${userId}
    `);
    const c = ((clipsRes as any).rows ?? clipsRes)[0];
    const clipCount = c.count;
    const reelCount = c.count; // reels are clips too in this schema; distinguish by type
    const clipViews = c.total_views;

    // Count screenshots
    const ssRes = await db.execute(sql`
      SELECT COUNT(*)::int as count FROM screenshots WHERE game_id = ${gameId} AND user_id = ${userId}
    `);
    const ssCount = ((ssRes as any).rows ?? ssRes)[0].count;

    // Calculate XP delta
    let xpDelta = 0;
    let xpDesc = [];

    const oldClips = a.clips_uploaded || 0;
    const newClipXp = Math.min(clipCount, b.required_clips || 0) * (b.xp_per_clip || 1000);
    const oldClipXp = Math.min(oldClips, b.required_clips || 0) * (b.xp_per_clip || 1000);
    const clipXp = newClipXp - oldClipXp;
    if (clipXp > 0) { xpDelta += clipXp; xpDesc.push(`${clipXp} XP for clips`); }

    const oldReels = a.reels_uploaded || 0;
    const newReelXp = Math.min(reelCount, b.required_reels || 0) * (b.xp_per_reel || 2500);
    const oldReelXp = Math.min(oldReels, b.required_reels || 0) * (b.xp_per_reel || 2500);
    const reelXp = newReelXp - oldReelXp;
    if (reelXp > 0) { xpDelta += reelXp; xpDesc.push(`${reelXp} XP for reels`); }

    const oldSs = a.screenshots_uploaded || 0;
    const newSsXp = Math.min(ssCount, b.required_screenshots || 0) * (b.xp_per_screenshot || 200);
    const oldSsXp = Math.min(oldSs, b.required_screenshots || 0) * (b.xp_per_screenshot || 200);
    const ssXp = newSsXp - oldSsXp;
    if (ssXp > 0) { xpDelta += ssXp; xpDesc.push(`${ssXp} XP for screenshots`); }

    // View milestone
    const viewMilestone = b.required_views || 0;
    const viewMilestoneXp = b.xp_view_milestone || 0;
    const oldViewHit = (a.total_views || 0) >= viewMilestone;
    const newViewHit = clipViews >= viewMilestone;
    if (!oldViewHit && newViewHit && viewMilestoneXp > 0) {
      xpDelta += viewMilestoneXp;
      xpDesc.push(`${viewMilestoneXp} XP for view milestone`);
    }

    // Check completion
    let completed = false;
    let fullKey = null;
    if (a.status !== 'completed') {
      const clipsDone = clipCount >= (b.required_clips || 0);
      const reelsDone = reelCount >= (b.required_reels || 0);
      const ssDone = ssCount >= (b.required_screenshots || 0);
      const viewsDone = clipViews >= (b.required_views || 0);
      if (clipsDone && reelsDone && ssDone && viewsDone) {
        completed = true;
        // Award completion XP
        if ((b.xp_completion_bonus || 0) > 0) {
          xpDelta += b.xp_completion_bonus;
          xpDesc.push(`${b.xp_completion_bonus} XP completion bonus`);
        }
        // Assign full key
        if (b.full_keys_remaining > 0 && b.full_key_pool) {
          try {
            const pool = JSON.parse(b.full_key_pool);
            if (Array.isArray(pool) && pool.length > 0) {
              fullKey = pool[0];
              const remaining = pool.slice(1);
              await db.execute(sql`
                UPDATE game_bounties
                SET full_key_pool = ${JSON.stringify(remaining)}, full_keys_remaining = ${remaining.length}
                WHERE id = ${bountyId}
              `);
            }
          } catch (e) {
            console.error('Failed to parse full key pool:', e);
          }
        }
      }
    }

    // Award XP
    if (xpDelta > 0) {
      await XPService.awardXP(userId, xpDelta, 'other', xpDesc.join(', '));
    }

    // Calculate progress
    const totalRequired = (b.required_clips || 0) + (b.required_reels || 0) + (b.required_screenshots || 0) + (b.required_views || 0 ? 1 : 0);
    const totalDone = Math.min(clipCount, b.required_clips || 0) + Math.min(reelCount, b.required_reels || 0) + Math.min(ssCount, b.required_screenshots || 0) + (clipViews >= (b.required_views || 0) ? 1 : 0);
    const progressPercent = totalRequired > 0 ? Math.round((totalDone / totalRequired) * 100) : 0;

    const newXpEarned = (a.xp_earned || 0) + xpDelta;

    await db.execute(sql`
      UPDATE game_bounty_acceptances
      SET clips_uploaded = ${clipCount}, reels_uploaded = ${reelCount},
          screenshots_uploaded = ${ssCount}, total_views = ${clipViews},
          xp_earned = ${newXpEarned}, progress_percent = ${progressPercent},
          status = ${completed ? 'completed' : 'active'},
          completed_at = ${completed ? new Date() : null},
          full_key = ${fullKey}
      WHERE bounty_id = ${bountyId} AND user_id = ${userId}
    `);

    if (completed && b.completion_badge && !a.completed_badge_awarded) {
      await db.execute(sql`
        UPDATE game_bounty_acceptances
        SET completed_badge_awarded = TRUE
        WHERE bounty_id = ${bountyId} AND user_id = ${userId}
      `);
      // Add badge to user_badges table (if exists)
      try {
        await db.execute(sql`
          INSERT INTO user_badges (user_id, badge_type, badge_name, earned_at)
          VALUES (${userId}, 'campaign', ${b.completion_badge}, NOW())
          ON CONFLICT DO NOTHING
        `);
      } catch (e) {
        // user_badges may not exist
      }
    }

    res.json({
      success: true,
      xpEarned: xpDelta,
      xpTotal: newXpEarned,
      progressPercent,
      completed,
      fullKey,
      clips: clipCount,
      reels: reelCount,
      screenshots: ssCount,
      views: clipViews,
    });
  } catch (err) {
    console.error('Error checking progress:', err);
    res.status(500).json({ message: 'Failed to check progress' });
  }
});

// Claim full key (explicit endpoint)
router.post('/bounties/:bountyId/claim-full-key', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const bountyId = parseInt(req.params.bountyId);
    const userId = (req.user as any).id;

    const acc = await db.execute(sql`
      SELECT full_key, status, completed_at, progress_percent
      FROM game_bounty_acceptances WHERE bounty_id = ${bountyId} AND user_id = ${userId}
    `);
    const a = ((acc as any).rows ?? acc)[0];
    if (!a) return res.status(404).json({ message: 'Not joined' });
    if (a.status !== 'completed') return res.status(400).json({ message: 'Campaign not completed yet' });
    if (a.full_key) return res.json({ success: true, fullKey: a.full_key, alreadyClaimed: true });

    // Try to assign a key if not already assigned
    const bounty = await db.execute(sql`
      SELECT full_key_pool, full_keys_remaining, title FROM game_bounties WHERE id = ${bountyId}
    `);
    const b = ((bounty as any).rows ?? bounty)[0];
    let fullKey: string | null = null;
    if (b.full_keys_remaining > 0 && b.full_key_pool) {
      try {
        const pool = JSON.parse(b.full_key_pool);
        if (Array.isArray(pool) && pool.length > 0) {
          fullKey = pool[0];
          const remaining = pool.slice(1);
          await db.execute(sql`
            UPDATE game_bounties SET full_key_pool = ${JSON.stringify(remaining)}, full_keys_remaining = ${remaining.length}
            WHERE id = ${bountyId}
          `);
          await db.execute(sql`
            UPDATE game_bounty_acceptances SET full_key = ${fullKey}
            WHERE bounty_id = ${bountyId} AND user_id = ${userId}
          `);
        }
      } catch (e) {
        console.error('Failed to parse full key pool:', e);
      }
    }

    if (!fullKey) return res.status(400).json({ message: 'No full keys available' });
    res.json({ success: true, fullKey });
  } catch (err) {
    console.error('Error claiming full key:', err);
    res.status(500).json({ message: 'Failed to claim full key' });
  }
});

// Developer dashboard
router.get('/bounties/:bountyId/dashboard', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const bountyId = parseInt(req.params.bountyId);
    const userId = (req.user as any).id;

    const ownership = await db.execute(sql`
      SELECT created_by_user_id FROM game_bounties WHERE id = ${bountyId}
    `);
    const owner = ((ownership as any).rows ?? ownership)[0];
    if (!owner) return res.status(404).json({ message: 'Bounty not found' });
    if (owner.created_by_user_id !== userId) return res.status(403).json({ message: 'Forbidden' });

    const stats = await db.execute(sql`
      SELECT
        COUNT(*)::int as "totalParticipants",
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as "completedCount",
        COALESCE(SUM(clips_uploaded), 0)::int as "totalClips",
        COALESCE(SUM(reels_uploaded), 0)::int as "totalReels",
        COALESCE(SUM(screenshots_uploaded), 0)::int as "totalScreenshots",
        COALESCE(SUM(total_views), 0)::int as "totalViews",
        COALESCE(SUM(xp_earned), 0)::int as "totalXPEarned"
      FROM game_bounty_acceptances WHERE bounty_id = ${bountyId}
    `);
    const s = ((stats as any).rows ?? stats)[0];

    const bounty = await db.execute(sql`
      SELECT
        title, campaign_title AS "campaignTitle", description,
        demo_keys_remaining AS "demoKeysRemaining", full_keys_remaining AS "fullKeysRemaining",
        max_participants AS "maxParticipants", total_xp_available AS "totalXpAvailable",
        end_date AS "endDate", status
      FROM game_bounties WHERE id = ${bountyId}
    `);
    const b = ((bounty as any).rows ?? bounty)[0];

    const participants = await db.execute(sql`
      SELECT
        gba.user_id AS "userId", u.username, u.display_name AS "displayName", u.avatar_url AS "avatarUrl",
        gba.clips_uploaded AS "clipsUploaded", gba.reels_uploaded AS "reelsUploaded",
        gba.screenshots_uploaded AS "screenshotsUploaded", gba.total_views AS "totalViews",
        gba.xp_earned AS "xpEarned", gba.progress_percent AS "progressPercent",
        gba.status, gba.completed_at AS "completedAt", gba.demo_key AS "demoKey", gba.full_key AS "fullKey"
      FROM game_bounty_acceptances gba
      JOIN users u ON u.id = gba.user_id
      WHERE gba.bounty_id = ${bountyId}
      ORDER BY gba.progress_percent DESC, gba.xp_earned DESC
    `);
    const p = (participants as any).rows ?? participants;

    const completionRate = s.totalParticipants > 0 ? Math.round((s.completedCount / s.totalParticipants) * 100) : 0;

    res.json({
      bounty: b,
      stats: {
        ...s,
        completionRate,
        demoKeysDistributed: (b.maxParticipants || 0) - (b.demoKeysRemaining || 0),
        fullKeysUnlocked: (b.maxParticipants || 0) - (b.fullKeysRemaining || 0),
      },
      participants: p,
    });
  } catch (err) {
    console.error('Error fetching dashboard:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard' });
  }
});

// Legacy accept endpoint (redirects to join)
router.post('/bounties/:bountyId/accept', async (req, res) => {
  // Forward to join logic
  req.params.bountyId = req.params.bountyId;
  return router.handle(req, res, () => {
    res.status(404).json({ message: 'Use /join instead' });
  });
});

// Bounty stats for a game
router.get('/:gameId/bounty-stats', async (req, res) => {
  try {
    const gameId = parseInt(req.params.gameId);
    if (isNaN(gameId)) return res.status(400).json({ message: 'Invalid game ID' });
    const result = await db.execute(sql`
      SELECT
        COUNT(DISTINCT CASE WHEN gb.status = 'active' THEN gb.id END)::int AS "activeBounties",
        COUNT(DISTINCT gba.user_id)::int AS "creatorsJoined",
        COALESCE(SUM(CASE WHEN gb.status = 'active' THEN gb.demo_keys_remaining ELSE 0 END), 0)::int AS "demoKeysAvailable",
        COALESCE(SUM(CASE WHEN gb.status = 'active' THEN gb.full_keys_remaining ELSE 0 END), 0)::int AS "fullKeysAvailable"
      FROM game_bounties gb
      LEFT JOIN game_bounty_acceptances gba ON gba.bounty_id = gb.id AND gba.status = 'active'
      WHERE gb.game_id = ${gameId}
    `);
    const rows = (result as any).rows ?? result;
    res.json(rows[0] ?? { activeBounties: 0, creatorsJoined: 0, demoKeysAvailable: 0, fullKeysAvailable: 0 });
  } catch (err) {
    console.error('Error fetching bounty stats:', err);
    res.json({ activeBounties: 0, creatorsJoined: 0, demoKeysAvailable: 0, fullKeysAvailable: 0 });
  }
});

export default router;
