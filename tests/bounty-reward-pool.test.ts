import assert from 'node:assert/strict';
import test from 'node:test';
import { sql } from 'drizzle-orm';
import { allocateBountyPool, GFT_POOL_SCALE, monthlyRewardPeriod, rewardScore } from '../shared/bounty-reward-pool';

test('monthly boundaries are UTC and a single creator receives the entire configured pool', () => {
  const month = monthlyRewardPeriod(new Date('2026-11-30T23:59:59.999Z'));
  assert.equal(month.id, '2026-11');
  assert.equal(month.end.toISOString(), '2026-12-01T00:00:00.000Z');
  const amount = 10_000 * GFT_POOL_SCALE;
  assert.equal(allocateBountyPool(amount, [{ userId: 1, score: 150 }]).get(1), amount);
  const split = allocateBountyPool(10, [{ userId: 4, score: 50 }, { userId: 2, score: 50 }, { userId: 6, score: 50 }]);
  assert.deepEqual(Array.from(split.entries()), [[2, 4], [4, 3], [6, 3]]);
  assert.equal(allocateBountyPool(10, [{ userId: 2, score: 0 }]).size, 0);
  assert.deepEqual(rewardScore(400, 200, 1), { base: 400, seasonBonus: 20, levelBonus: 20, total: 440 });
});

test('settlement waits for approval and creates one durable allocation for unique approved work', {
  skip: process.env.TEST_BOUNTY_REWARD_POOL_POSTGRES !== '1',
}, async () => {
  const { db, pool } = await import('../server/db');
  const { getBountyRewardPoolRevision, settleBountyRewardPeriod } = await import('../server/bounty-reward-pool');
  try {
    await db.transaction(async tx => {
      // Every queried table is shadowed with a transaction-local fixture.
      const fixture = [
        'CREATE TEMP TABLE bounty_reward_periods(id text primary key, starts_at timestamptz, ends_at timestamptz, xp_units int, gft_units bigint, mystery_name text, empty_policy text, status text, settled_at timestamptz, distributed_at timestamptz) ON COMMIT DROP',
        'CREATE TEMP TABLE bounty_reward_contributions(participation_id int primary key, period_id text, user_id int, base_score int, approved_work jsonb) ON COMMIT DROP',
        'CREATE TEMP TABLE bounty_reward_transactions(period_id text, user_id int, base_score int, season_bonus int, level_bonus int, final_score int, approved_count int, xp_units int, gft_units bigint, mystery_name text, xp_distributed_at timestamptz, distributed_at timestamptz, PRIMARY KEY(period_id, user_id)) ON COMMIT DROP',
        'CREATE TEMP TABLE users(id int, level int) ON COMMIT DROP',
        'CREATE TEMP TABLE campaign_instances(id int, developer_user_id int, template_id int, confirmed_terms jsonb, stream_config jsonb, objective_snapshot jsonb) ON COMMIT DROP',
        'CREATE TEMP TABLE campaign_participants(id int, instance_id int, user_id int, status text) ON COMMIT DROP',
        'CREATE TEMP TABLE campaign_template_bounties(id int, template_id int, quantity int, mandatory bool, content_type text) ON COMMIT DROP',
        'CREATE TEMP TABLE campaign_bounty_submissions(id int, instance_id int, participant_id int, bounty_id int, submitted_at timestamp, status text, supersedes_submission_id int, content_type text, content_data jsonb, clip_id int, reel_id int, screenshot_id int) ON COMMIT DROP',
        'CREATE TEMP TABLE clips(id int, video_url text) ON COMMIT DROP',
        'CREATE TEMP TABLE screenshots(id int, image_url text) ON COMMIT DROP',
        "INSERT INTO bounty_reward_periods VALUES ('2026-10', '2026-10-01', '2026-11-01', 0, 0, NULL, 'return', 'open', NULL, NULL)",
        'INSERT INTO users VALUES (7, 99), (8, 1)',
        "INSERT INTO campaign_instances VALUES (21, 99, 10, NULL, NULL, NULL), (22, 99, 10, NULL, NULL, NULL), (23, 99, 10, NULL, NULL, NULL)",
        "INSERT INTO campaign_participants VALUES (31, 21, 7, 'submitted_for_review'), (32, 22, 7, 'completed_and_verified'), (33, 23, 8, 'joined')",
        "INSERT INTO campaign_template_bounties VALUES (41, 10, 1, true, 'review')",
        `INSERT INTO campaign_bounty_submissions VALUES
          (51, 21, 7, 41, '2026-10-25', 'under_review', NULL, 'review', '{"text":"A review","rating":5}', NULL, NULL, NULL),
          (52, 22, 7, 41, '2026-10-26', 'approved', NULL, 'review', '{"text":"a  REVIEW","rating":4}', NULL, NULL, NULL)`,
      ];
      for (const statement of fixture) await tx.execute(sql.raw(statement));

      const now = new Date('2026-11-11T00:00:00Z');
      const unfundedRevision = await getBountyRewardPoolRevision(tx, now);
      await tx.execute(sql`UPDATE bounty_reward_periods SET xp_units = 250000, gft_units = 10000000000, mystery_name = 'Mystery badge'`);
      const fundedRevision = await getBountyRewardPoolRevision(tx, now);
      assert.notEqual(fundedRevision, unfundedRevision);
      assert.equal(await getBountyRewardPoolRevision(tx, now), fundedRevision);

      assert.equal(await settleBountyRewardPeriod(tx, '2026-10'), false);
      assert.equal((await tx.execute(sql`SELECT 1 FROM bounty_reward_transactions`)).length, 0);
      await tx.execute(sql`UPDATE campaign_bounty_submissions SET status = 'approved' WHERE id = 51`);
      await tx.execute(sql`UPDATE campaign_participants SET status = 'completed_and_verified' WHERE id = 31`);
      assert.equal(await settleBountyRewardPeriod(tx, '2026-10'), true);
      assert.equal(await settleBountyRewardPeriod(tx, '2026-10'), true);
      const awards = await tx.execute(sql`SELECT * FROM bounty_reward_transactions`);
      assert.equal(awards.length, 1);
      assert.equal(awards[0].user_id, 7);
      assert.equal(awards[0].base_score, 125);
      assert.equal(awards[0].final_score, 137);
      assert.equal(awards[0].approved_count, 1);
      assert.equal(awards[0].xp_units, 250000);
      assert.equal(Number(awards[0].gft_units), 10000000000);
      assert.equal(awards[0].mystery_name, 'Mystery badge');
      const settlingRevision = await getBountyRewardPoolRevision(tx, now);
      await tx.execute(sql`UPDATE bounty_reward_transactions SET xp_distributed_at = NOW()`);
      const xpPaidRevision = await getBountyRewardPoolRevision(tx, now);
      assert.notEqual(xpPaidRevision, settlingRevision);
      await tx.execute(sql`UPDATE bounty_reward_transactions SET distributed_at = NOW()`);
      assert.notEqual(await getBountyRewardPoolRevision(tx, now), xpPaidRevision);
    });
  } finally {
    await pool.end();
  }
});
