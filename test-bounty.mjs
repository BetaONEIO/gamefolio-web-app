import { db } from './server/db/index.js';
import { sql } from 'drizzle-orm';

async function createTestBounty() {
  const result = await db.execute(sql`
    INSERT INTO game_bounties
      (game_id, created_by_user_id, title, campaign_title, description,
       reward_type, reward_value, key_count, creator_slots, difficulty, end_date,
       max_participants, required_clips, required_reels, required_screenshots, required_views,
       xp_join, xp_per_clip, xp_per_reel, xp_per_screenshot, xp_view_milestone, xp_completion_bonus,
       total_xp_available, demo_keys_remaining, full_keys_remaining, completion_badge,
       demo_key_pool, full_key_pool, status)
    VALUES
      (7, 154, 'Test Creator Campaign', 'Alpha Tester Week', 'Upload clips and reels to earn XP and unlock full game keys!',
       'game_key', 'FULL-KEY-001', 2, 5, 'medium', '2026-12-31',
       5, 1, 1, 0, 100,
       500, 1000, 2500, 200, 2500, 5000,
       11700, 3, 2, 'Alpha Tester',
       ${JSON.stringify(['DEMO-001', 'DEMO-002', 'DEMO-003'])},
       ${JSON.stringify(['FULL-001', 'FULL-002'])},
       'active')
    RETURNING id
  `);
  const rows = result.rows || result;
  console.log('Created bounty ID:', rows[0]?.id);
}

createTestBounty().catch(e => console.error(e));
