import express from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = express.Router();

async function ensureBountyTables() {
  try {
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
  } catch (err) {
    console.error('Failed to create bounty tables:', err);
  }
}

ensureBountyTables();

router.get('/:gameId/bounties', async (req, res) => {
  try {
    const gameId = parseInt(req.params.gameId);
    if (isNaN(gameId)) return res.status(400).json({ message: 'Invalid game ID' });
    const result = await db.execute(sql`
      SELECT
        gb.id, gb.game_id AS "gameId", gb.created_by_user_id AS "createdByUserId",
        gb.title, gb.description, gb.reward_type AS "rewardType", gb.reward_value AS "rewardValue",
        gb.key_count AS "keyCount", gb.creator_slots AS "creatorSlots", gb.difficulty,
        gb.end_date AS "endDate", gb.status, gb.created_at AS "createdAt",
        COUNT(gba.id)::int AS "participantCount",
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

router.post('/:gameId/bounties', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const gameId = parseInt(req.params.gameId);
    if (isNaN(gameId)) return res.status(400).json({ message: 'Invalid game ID' });
    const userId = (req.user as any).id;
    const { title, description, rewardType, rewardValue, keyCount, creatorSlots, difficulty, endDate } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });
    const result = await db.execute(sql`
      INSERT INTO game_bounties
        (game_id, created_by_user_id, title, description, reward_type, reward_value, key_count, creator_slots, difficulty, end_date)
      VALUES
        (${gameId}, ${userId}, ${title.trim()}, ${description || null}, ${rewardType || 'game_key'},
         ${rewardValue || null}, ${parseInt(keyCount) || 0}, ${parseInt(creatorSlots) || 10},
         ${difficulty || 'medium'}, ${endDate ? new Date(endDate) : null})
      RETURNING
        id, game_id AS "gameId", created_by_user_id AS "createdByUserId",
        title, description, reward_type AS "rewardType", reward_value AS "rewardValue",
        key_count AS "keyCount", creator_slots AS "creatorSlots", difficulty,
        end_date AS "endDate", status, created_at AS "createdAt"
    `);
    const row = ((result as any).rows ?? result)[0];
    res.status(201).json(row);
  } catch (err) {
    console.error('Error creating bounty:', err);
    res.status(500).json({ message: 'Failed to create bounty' });
  }
});

router.post('/bounties/:bountyId/accept', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const bountyId = parseInt(req.params.bountyId);
    if (isNaN(bountyId)) return res.status(400).json({ message: 'Invalid bounty ID' });
    const userId = (req.user as any).id;
    const existing = await db.execute(sql`
      SELECT id FROM game_bounty_acceptances WHERE bounty_id = ${bountyId} AND user_id = ${userId}
    `);
    const existingRows = (existing as any).rows ?? existing;
    if (existingRows.length > 0) {
      return res.status(400).json({ message: 'Already accepted this bounty' });
    }
    await db.execute(sql`
      INSERT INTO game_bounty_acceptances (bounty_id, user_id) VALUES (${bountyId}, ${userId})
    `);
    res.json({ success: true });
  } catch (err) {
    console.error('Error accepting bounty:', err);
    res.status(500).json({ message: 'Failed to accept bounty' });
  }
});

router.get('/:gameId/bounty-stats', async (req, res) => {
  try {
    const gameId = parseInt(req.params.gameId);
    if (isNaN(gameId)) return res.status(400).json({ message: 'Invalid game ID' });
    const result = await db.execute(sql`
      SELECT
        COUNT(DISTINCT CASE WHEN gb.status = 'active' THEN gb.id END)::int AS "activeBounties",
        COUNT(DISTINCT gba.user_id)::int AS "creatorsJoined",
        COALESCE(SUM(CASE WHEN gb.status = 'active' THEN gb.key_count ELSE 0 END), 0)::int AS "keysAvailable"
      FROM game_bounties gb
      LEFT JOIN game_bounty_acceptances gba ON gba.bounty_id = gb.id AND gba.status = 'active'
      WHERE gb.game_id = ${gameId}
    `);
    const rows = (result as any).rows ?? result;
    res.json(rows[0] ?? { activeBounties: 0, creatorsJoined: 0, keysAvailable: 0 });
  } catch (err) {
    console.error('Error fetching bounty stats:', err);
    res.json({ activeBounties: 0, creatorsJoined: 0, keysAvailable: 0 });
  }
});

export default router;
