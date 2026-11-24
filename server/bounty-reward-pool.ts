import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { campaignCreatorProgress } from '@shared/campaign-creator-progress';
import { allocateBountyPool, GFT_POOL_SCALE, monthlyRewardPeriod, rewardScore } from '@shared/bounty-reward-pool';
import type { BountyRewardPoolData, BountyRewardShare, BountyRewardStatus } from '@shared/bounty-reward-pool';
import { SEASON_DEFS } from '@shared/season-definitions';
import { db, pool } from './db';
import { calculateLevel } from './level-system';
import { mergeInstanceObjectives } from './campaign-instance-objectives';
import { getGfTransferReceiptStatus, rebroadcastSignedGfTransfer, transferGfTokens } from './gf-token-service';
import { parseStreamCampaignConfig, streamSubmissionIdentities } from './stream-livestream-validation';

type Database = Pick<typeof db, 'execute'>;
type Period = {
  id: string;
  starts_at: Date;
  ends_at: Date;
  xp_units: number;
  gft_units: string;
  mystery_name: string | null;
  status: 'open' | 'paying' | 'distributed';
  empty_policy: 'carry' | 'return';
};
type StoredPeriod = Omit<Period, 'starts_at' | 'ends_at'> & { starts_at: string | Date; ends_at: string | Date };
const periodDates = (record: StoredPeriod): Period => ({
  ...record,
  starts_at: new Date(record.starts_at),
  ends_at: new Date(record.ends_at),
});
type Contribution = { participationId: number; userId: number; score: number; work: { id: number; identity: string }[] };
type Standing = ReturnType<typeof rewardScore> & { userId: number; approved: number };

let schema: Promise<unknown> | undefined;
function ensureRewardPool() {
  schema ??= db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(73901, 0)`);
    await tx.execute(sql`
    CREATE TABLE IF NOT EXISTS bounty_reward_periods (
      id text PRIMARY KEY, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
      xp_units integer NOT NULL CHECK (xp_units >= 0), gft_units bigint NOT NULL CHECK (gft_units >= 0),
      mystery_name text, empty_policy text NOT NULL CHECK (empty_policy IN ('carry','return')),
      status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','paying','distributed')),
      settled_at timestamptz, distributed_at timestamptz, CHECK (ends_at > starts_at)
    )`);
    await tx.execute(sql`CREATE TABLE IF NOT EXISTS bounty_reward_contributions (
      participation_id integer PRIMARY KEY, period_id text NOT NULL REFERENCES bounty_reward_periods(id),
      user_id integer NOT NULL, base_score integer NOT NULL CHECK (base_score > 0),
      approved_work jsonb NOT NULL
    )`);
    await tx.execute(sql`CREATE INDEX IF NOT EXISTS bounty_reward_contributions_period ON bounty_reward_contributions(period_id, user_id)`);
    await tx.execute(sql`CREATE TABLE IF NOT EXISTS bounty_reward_transactions (
      period_id text NOT NULL REFERENCES bounty_reward_periods(id), user_id integer NOT NULL,
      base_score integer NOT NULL, season_bonus integer NOT NULL, level_bonus integer NOT NULL,
      final_score integer NOT NULL, approved_count integer NOT NULL,
      xp_units integer NOT NULL, gft_units bigint NOT NULL, mystery_name text,
      gft_hash text, gft_signed_transaction text, wallet_address text,
      xp_distributed_at timestamptz,
      distributed_at timestamptz, PRIMARY KEY (period_id, user_id)
    )`);
    await tx.execute(sql`ALTER TABLE bounty_reward_transactions ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz`);
  }).catch(error => { schema = undefined; throw error; });
  return schema;
}

function configuredUnits(value: string | undefined, scale = 1) {
  const units = Number(value ?? 0) * scale;
  const limit = scale === 1 ? 2_000_000_000 : 1_000_000_000_000;
  if (!Number.isFinite(units) || units < 0 || units > limit) {
    throw new Error('Invalid bounty reward pool amount');
  }
  const rounded = Math.round(units);
  if (Math.abs(rounded - units) > 0.000001) throw new Error('Invalid bounty reward pool precision');
  return rounded;
}

async function currentPeriod(tx: Database, now: Date): Promise<Period> {
  const month = monthlyRewardPeriod(now);
  const [existing] = await tx.execute<StoredPeriod>(sql`SELECT * FROM bounty_reward_periods WHERE id = ${month.id}`);
  if (existing) return periodDates(existing);
  const xp = configuredUnits(process.env.BOUNTY_REWARD_POOL_XP);
  const gft = configuredUnits(process.env.BOUNTY_REWARD_POOL_GFT, GFT_POOL_SCALE);
  const mystery = process.env.BOUNTY_REWARD_POOL_MYSTERY_PERIOD === month.id
    ? process.env.BOUNTY_REWARD_POOL_MYSTERY?.trim() || null : null;
  const emptyPolicy = process.env.BOUNTY_REWARD_POOL_EMPTY_POLICY === 'carry' ? 'carry' : 'return';
  await tx.execute(sql`
    INSERT INTO bounty_reward_periods (id, starts_at, ends_at, xp_units, gft_units, mystery_name, empty_policy)
    VALUES (${month.id}, ${month.start.toISOString()}, ${month.end.toISOString()}, ${xp}, ${gft}, ${mystery}, ${emptyPolicy})
    ON CONFLICT DO NOTHING
  `);
  const [created] = await tx.execute<StoredPeriod>(sql`SELECT * FROM bounty_reward_periods WHERE id = ${month.id}`);
  return periodDates(created);
}

type Submission = {
  id: number; participant_id: number; bounty_id: number; slot_index?: number; status: string;
  content_type: string; content_data: unknown; content_url?: string; submitted_at: string;
  clip_id?: number; screenshot_id?: number; reel_id?: number; supersedes_submission_id?: number;
  media_source?: string;
};
type Candidate = {
  id: number; user_id: number; status: string; confirmed_terms: unknown; stream_config: unknown;
  objective_snapshot: unknown; objectives: unknown[]; submissions: Submission[];
};

const contentWeights: Record<string, number> = { clip: 100, reel: 125, screenshot: 60, feedback: 100, review: 125, bug: 100 };

function workIdentities(submission: Submission) {
  const mediaId = submission.clip_id ?? submission.reel_id ?? submission.screenshot_id;
  if (mediaId != null) {
    const identities = [`media:${submission.screenshot_id ? 'screenshot' : 'video'}:${mediaId}`];
    const source = submission.media_source?.split(/[?#]/, 1)[0];
    if (source) identities.push(`source:${createHash('sha256').update(source).digest('hex')}`);
    return identities;
  }
  if (['stream', 'livestream'].includes(submission.content_type)) {
    return streamSubmissionIdentities(submission.content_data, submission.content_url);
  }
  const content = submission.content_data as { text?: string } | null;
  const text = typeof content === 'string' ? content : content?.text ?? submission.content_url;
  if (typeof text !== 'string' || !text) return [];
  const normalized = text.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  return normalized ? [`${submission.content_type}:${createHash('sha256').update(normalized).digest('hex')}`] : [];
}

async function approvedContributions(tx: Database, period: Period) {
  const candidates = await tx.execute<Candidate>(sql`
    SELECT p.id, p.user_id, p.status, ci.confirmed_terms, ci.stream_config, ci.objective_snapshot,
      (SELECT COALESCE(jsonb_agg(to_jsonb(o)), '[]'::jsonb)
        FROM campaign_template_bounties o WHERE o.template_id = ci.template_id) AS objectives,
      (SELECT COALESCE(jsonb_agg(to_jsonb(s) || jsonb_build_object('media_source', COALESCE(c.video_url, shot.image_url))
          ORDER BY s.submitted_at, s.id), '[]'::jsonb)
        FROM campaign_bounty_submissions s
        LEFT JOIN clips c ON c.id = COALESCE(s.clip_id, s.reel_id)
        LEFT JOIN screenshots shot ON shot.id = s.screenshot_id
        WHERE s.instance_id = p.instance_id AND s.participant_id = p.user_id) AS submissions
    FROM campaign_participants p
    JOIN campaign_instances ci ON ci.id = p.instance_id
    WHERE p.status IN ('completed','completed_and_verified','full_game_awarded')
      AND p.user_id IS DISTINCT FROM ci.developer_user_id
      AND NOT EXISTS (SELECT 1 FROM bounty_reward_contributions saved WHERE saved.participation_id = p.id)
      AND EXISTS (
        SELECT 1 FROM campaign_bounty_submissions s
        WHERE s.instance_id = p.instance_id AND s.participant_id = p.user_id AND s.status = 'approved'
          AND s.submitted_at >= (${period.starts_at.toISOString()}::timestamptz AT TIME ZONE 'UTC')
          AND s.submitted_at < (${period.ends_at.toISOString()}::timestamptz AT TIME ZONE 'UTC')
      )
    ORDER BY p.id
  `);
  if (!candidates.length) return [];
  const previous = await tx.execute<{ user_id: number; identity: string }>(sql`
    SELECT c.user_id, item->>'identity' AS identity
    FROM bounty_reward_contributions c
    CROSS JOIN LATERAL jsonb_array_elements(c.approved_work) item
    WHERE c.user_id IN (SELECT jsonb_array_elements_text(${JSON.stringify(candidates.map(c => c.user_id))}::jsonb)::integer)
  `);
  const seen = new Set(previous.map(item => `${item.user_id}:${item.identity}`));
  const contributions: Contribution[] = [];

  for (const candidate of candidates) {
    const objectives = mergeInstanceObjectives(candidate.objectives, candidate.objective_snapshot);
    const progress = campaignCreatorProgress({ campaign: candidate, objectives, submissions: candidate.submissions, rewards: [] }, candidate);
    if (!progress.completed) continue;
    const required = objectives.filter(objective => objective.mandatory !== false).map(objective => ({
      type: String(objective.content_type),
      work: (progress.approved as Submission[]).filter(item => item.bounty_id === Number(objective.id)),
      quantity: Number(objective.quantity),
    }));
    const prepared = required.map(objective => ({
      ...objective,
      // A verified stream may use several sessions to meet its one duration requirement.
      work: ['stream', 'livestream'].includes(objective.type) ? objective.work : objective.work.slice(0, objective.quantity),
    }));
    const submittedAt = Math.max(...prepared.flatMap(objective => objective.work.map(item => Date.parse(item.submitted_at + (/[Zz]|[+-]\d\d:\d\d$/.test(item.submitted_at) ? '' : 'Z')))));
    if (!(submittedAt >= period.starts_at.getTime() && submittedAt < period.ends_at.getTime())) continue;
    const contribution: Contribution = { participationId: candidate.id, userId: candidate.user_id, score: 0, work: [] };
    for (const objective of prepared) {
      const isStream = ['stream', 'livestream'].includes(objective.type);
      const work: Contribution['work'] = [];
      const objectiveIdentities = new Set<string>();
      let unique = 0;
      for (const item of objective.work) {
        const identities = workIdentities(item);
        if (!identities.length || identities.some(identity =>
          objectiveIdentities.has(identity) || seen.has(`${candidate.user_id}:${identity}`))) continue;
        for (const identity of identities) {
          objectiveIdentities.add(identity);
          work.push({ id: item.id, identity });
        }
        unique += 1;
      }
      if (isStream) {
        // A reused session must not earn points for the entire required stream.
        if (unique !== objective.work.length || unique === 0) continue;
        contribution.score += Math.ceil((parseStreamCampaignConfig(candidate.stream_config)?.requiredMinutes ?? 30) / 30) * 100;
      } else {
        const weight = contentWeights[objective.type];
        if (!weight) continue;
        contribution.score += unique * weight;
      }
      for (const item of work) {
        seen.add(`${candidate.user_id}:${item.identity}`);
        contribution.work.push(item);
      }
    }
    if (contribution.score > 0) contributions.push(contribution);
  }
  return contributions;
}

async function awaitingApprovals(tx: Database, period: Period, userId?: number) {
  const filter = userId == null ? sql`` : sql`AND p.user_id = ${userId}`;
  const [pending] = (await tx.execute<{ count: number }>(sql`
    SELECT count(*)::integer AS count
    FROM campaign_bounty_submissions s
    JOIN campaign_participants p ON p.instance_id = s.instance_id AND p.user_id = s.participant_id
    JOIN campaign_instances ci ON ci.id = s.instance_id
    WHERE s.status IN ('pending','awaiting_review','under_review')
      AND p.status IN ('submitted_for_review','in_progress','active','changes_requested','access_accepted','joined')
      AND p.user_id IS DISTINCT FROM ci.developer_user_id
      AND s.submitted_at >= (${period.starts_at.toISOString()}::timestamptz AT TIME ZONE 'UTC')
      AND s.submitted_at < (${period.ends_at.toISOString()}::timestamptz AT TIME ZONE 'UTC')
      AND NOT EXISTS (SELECT 1 FROM campaign_bounty_submissions revision WHERE revision.supersedes_submission_id = s.id)
      ${filter}
  `));
  return pending.count;
}

async function standings(tx: Database, period: Period, contributions: Contribution[]) {
  const scores = new Map<number, { base: number; approved: number }>();
  for (const { userId, score } of contributions) {
    const creator = scores.get(userId) ?? { base: 0, approved: 0 };
    scores.set(userId, { base: creator.base + score, approved: creator.approved + 1 });
  }
  if (!scores.size) return [];
  const levels = await tx.execute<{ id: number; level: number }>(sql`
    SELECT id, level FROM users WHERE id IN (SELECT jsonb_array_elements_text(${JSON.stringify(Array.from(scores.keys()))}::jsonb)::integer)
  `);
  const season = SEASON_DEFS.find(season => (season.months as readonly string[]).includes(period.id));
  const seasonScores = new Map(Array.from(scores).map(([id, score]) => [id, score.base]));
  if (season) {
    const previous = await tx.execute<{ user_id: number; score: number }>(sql`
      SELECT user_id, sum(base_score)::integer AS score FROM bounty_reward_contributions
      WHERE period_id < ${period.id} AND period_id IN (SELECT jsonb_array_elements_text(${JSON.stringify(season.months)}::jsonb))
      GROUP BY user_id
    `);
    for (const item of previous) seasonScores.set(item.user_id, (seasonScores.get(item.user_id) ?? 0) + item.score);
  }
  // Season placement is based on approved bounty work, rather than social leaderboard points.
  const seasonTotals = Array.from(seasonScores.values()).sort((left, right) => right - left);
  return levels.map<Standing>(({ id, level }) => {
    const score = scores.get(id)!;
    const rank = season ? seasonTotals.indexOf(seasonScores.get(id)!) + 1 : undefined;
    return { userId: id, approved: score.approved, ...rewardScore(score.base, level, rank) };
  });
}

type Transaction = {
  period_id: string; user_id: number; final_score: number; approved_count: number; base_score: number;
  season_bonus: number; level_bonus: number; xp_units: number; gft_units: string;
  mystery_name: string | null; gft_hash: string | null; gft_signed_transaction: string | null;
  distributed_at: Date | null;
};

export async function settleBountyRewardPeriod(tx: Database, periodId: string) {
  const [record] = await tx.execute<StoredPeriod>(sql`
    SELECT * FROM bounty_reward_periods WHERE id = ${periodId} AND ends_at <= NOW() FOR UPDATE
  `);
  if (record?.status !== 'open') return true;
  const period = periodDates(record);
  if (await awaitingApprovals(tx, period)) return false;

  const contributions = await approvedContributions(tx, period);
  const creators = await standings(tx, period, contributions);
  const eligible = new Set(creators.map(item => item.userId));
  if (!eligible.size) {
    if (period.empty_policy === 'carry') {
      const next = await currentPeriod(tx, period.ends_at);
      await tx.execute(sql`
        UPDATE bounty_reward_periods SET xp_units = xp_units + ${period.xp_units},
          gft_units = gft_units + ${period.gft_units}::bigint,
          mystery_name = COALESCE(mystery_name, ${period.mystery_name})
        WHERE id = ${next.id} AND status = 'open'
      `);
    }
    await tx.execute(sql`
      UPDATE bounty_reward_periods SET status = 'distributed', settled_at = NOW(), distributed_at = NOW()
      WHERE id = ${period.id}
    `);
    return true;
  }

  const xp = allocateBountyPool(period.xp_units, creators.map(item => ({ ...item, score: item.total })));
  const gft = allocateBountyPool(Number(period.gft_units), creators.map(item => ({ ...item, score: item.total })));
  for (const item of contributions) {
    if (!eligible.has(item.userId)) continue;
    await tx.execute(sql`
      INSERT INTO bounty_reward_contributions (participation_id, period_id, user_id, base_score, approved_work)
      VALUES (${item.participationId}, ${period.id}, ${item.userId}, ${item.score}, ${JSON.stringify(item.work)}::jsonb)
    `);
  }
  for (const item of creators) {
    await tx.execute(sql`
      INSERT INTO bounty_reward_transactions
        (period_id, user_id, base_score, season_bonus, level_bonus, final_score, approved_count, xp_units, gft_units, mystery_name)
      VALUES (${period.id}, ${item.userId}, ${item.base}, ${item.seasonBonus}, ${item.levelBonus},
        ${item.total}, ${item.approved}, ${xp.get(item.userId) ?? 0}, ${gft.get(item.userId) ?? 0}, ${period.mystery_name})
    `);
  }
  await tx.execute(sql`
    UPDATE bounty_reward_periods SET status = 'paying', settled_at = NOW() WHERE id = ${period.id}
  `);
  return true;
}

async function lockPeriod(periodId: string) {
  return db.transaction(async tx => {
    await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`);
    return settleBountyRewardPeriod(tx, periodId);
  });
}

async function confirmGft(reward: Transaction, wallet: string | null) {
  if (Number(reward.gft_units) === 0) return true;
  if (process.env.NODE_ENV !== 'production' || process.env.BOUNTY_REWARD_POOL_GFT_ENABLED !== 'true') return false;
  if (reward.gft_hash) {
    const status = await getGfTransferReceiptStatus(reward.gft_hash);
    if (status === 'success') return true;
    if (status === 'reverted') {
      await db.execute(sql`
        UPDATE bounty_reward_transactions SET gft_hash = NULL, gft_signed_transaction = NULL, wallet_address = NULL
        WHERE period_id = ${reward.period_id} AND user_id = ${reward.user_id}
      `);
    } else if (reward.gft_signed_transaction) {
      // Resending the same signed transaction retains the same hash.
      await rebroadcastSignedGfTransfer(reward.gft_signed_transaction).catch(() => undefined);
    }
    return false;
  }
  if (!wallet || !/^0x[0-9a-f]{40}$/i.test(wallet)) return false;
  const transfer = await transferGfTokens(wallet, Number(reward.gft_units) / GFT_POOL_SCALE, {
    onPrepared: async (hash, signed) => {
      // Persist the signed transaction before the treasury broadcasts it.
      await db.execute(sql`
        UPDATE bounty_reward_transactions SET gft_hash = ${hash}, gft_signed_transaction = ${signed}, wallet_address = ${wallet}
        WHERE period_id = ${reward.period_id} AND user_id = ${reward.user_id}
      `);
    },
  });
  return transfer.success;
}

async function deliverReward(periodId: string, userId: number) {
  const connection = await pool.reserve();
  // This session-level lock spans the durable signing write and broadcast.
  // PostgreSQL also releases it if the worker dies.
  const lockName = `bounty-pool-payout:${periodId}:${userId}`;
  try {
    const [lock] = await connection`SELECT pg_try_advisory_lock(hashtext(${lockName}), 73901) AS acquired`;
    if (!lock.acquired) return;
    const reward = await db.transaction(async tx => {
      const [reward] = await tx.execute<Transaction & { xp_distributed_at: Date | null }>(sql`
        SELECT * FROM bounty_reward_transactions
        WHERE period_id = ${periodId} AND user_id = ${userId} AND distributed_at IS NULL
        FOR UPDATE
      `);
      if (!reward) return;
      await tx.execute(sql`
        UPDATE bounty_reward_transactions SET last_attempt_at = NOW() WHERE period_id = ${periodId} AND user_id = ${userId}
      `);
      const [account] = await tx.execute<{ total_xp: number; wallet_address: string | null }>(sql`
        SELECT total_xp, wallet_address FROM users WHERE id = ${userId} FOR UPDATE
      `);
      if (!account) return;
      if (!reward.xp_distributed_at) {
        if (reward.xp_units > 0) {
          const total = Number(account.total_xp) + reward.xp_units;
          await tx.execute(sql`
            INSERT INTO user_xp_history (user_id, xp_amount, source, description, dedupe_key)
            VALUES (${userId}, ${reward.xp_units}, 'bounty_reward_pool', 'Monthly Bounty Reward Pool', ${`bounty-pool:${periodId}:${userId}`})
          `);
          await tx.execute(sql`UPDATE users SET total_xp = ${total}, level = ${calculateLevel(total)} WHERE id = ${userId}`);
        }
        await tx.execute(sql`
          UPDATE bounty_reward_transactions SET xp_distributed_at = NOW() WHERE period_id = ${periodId} AND user_id = ${userId}
        `);
      }
      return { ...reward, wallet: account.wallet_address?.trim() ?? null };
    });
    if (!reward || !await confirmGft(reward, reward.wallet)) return;

    await db.transaction(async tx => {
      if (reward.xp_units > 0 || Number(reward.gft_units) > 0 || reward.mystery_name) {
        await tx.execute(sql`
          INSERT INTO notifications (user_id, type, title, message, action_url)
          VALUES (${userId}, 'bounty_reward_pool', 'Your Reward Pool rewards are ready',
            'See your final share and rewards in the Bounty Hub.', '/bounties?tab=reward-pool')
        `);
      }
      await tx.execute(sql`
        UPDATE bounty_reward_transactions SET distributed_at = NOW(), gft_signed_transaction = NULL
        WHERE period_id = ${periodId} AND user_id = ${userId}
      `);
    });
  } finally {
    try { await connection`SELECT pg_advisory_unlock(hashtext(${lockName}), 73901)`; }
    finally { connection.release(); }
  }
}

let running = false;
export async function processBountyRewardPools() {
  if (running) return;
  running = true;
  try {
    await ensureRewardPool();
    await currentPeriod(db, new Date());
    // Carry-forward must settle in chronological order.
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const [closed] = (await db.execute<{ id: string }>(sql`
        SELECT id FROM bounty_reward_periods WHERE status = 'open' AND ends_at <= NOW() ORDER BY ends_at LIMIT 1
      `));
      if (!closed || !await lockPeriod(closed.id)) break;
    }
    const pending = await db.execute<{ period_id: string; user_id: number }>(sql`
      SELECT r.period_id, r.user_id
      FROM bounty_reward_transactions r JOIN users u ON u.id = r.user_id
      WHERE r.distributed_at IS NULL
        AND (r.xp_distributed_at IS NULL OR r.gft_units = 0 OR (
          ${process.env.NODE_ENV === 'production' && process.env.BOUNTY_REWARD_POOL_GFT_ENABLED === 'true'}
          AND (r.gft_hash IS NOT NULL OR u.wallet_address ~ '^0x[0-9a-fA-F]{40}$')
        ))
      ORDER BY r.last_attempt_at NULLS FIRST, r.period_id, r.user_id LIMIT 25
    `);
    for (const reward of pending) {
      await deliverReward(reward.period_id, reward.user_id).catch(error => console.error('[Bounty Reward Pool] Payout failed:', error));
    }
    await db.execute(sql`
      UPDATE bounty_reward_periods p SET status = 'distributed', distributed_at = NOW()
      WHERE p.status = 'paying' AND NOT EXISTS (
        SELECT 1 FROM bounty_reward_transactions r WHERE r.period_id = p.id AND r.distributed_at IS NULL
      )
    `);
  } finally {
    running = false;
  }
}

export async function getBountyRewardPool(userId?: number): Promise<BountyRewardPoolData> {
  await ensureRewardPool();
  const now = new Date();
  const period = await currentPeriod(db, now);
  return db.transaction(async tx => {
    await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`);
    let personal: BountyRewardShare | null = null;
    if (userId != null) {
      const creators = await standings(tx, period, await approvedContributions(tx, period));
      const own = creators.find(item => item.userId === userId);
      const total = creators.reduce((sum, creator) => sum + creator.total, 0);
      const awaiting = await awaitingApprovals(tx, period, userId);
      personal = {
        base: own?.base ?? 0, levelBonus: own?.levelBonus ?? 0, seasonBonus: own?.seasonBonus ?? 0,
        total: own?.total ?? 0, approved: own?.approved ?? 0, awaiting,
        share: own && total > 0 ? own.total / total : 0,
        status: own ? 'Eligible' : 'Not yet eligible',
      };
    }
    const closing = await tx.execute<{ id: string; starts_at: string | Date; status: string }>(sql`
      SELECT p.id, p.starts_at, p.status
      FROM bounty_reward_periods p
      WHERE p.id < ${period.id} AND p.status = 'open'
      UNION ALL
      SELECT p.id, p.starts_at, p.status FROM bounty_reward_periods p
      JOIN bounty_reward_transactions r ON r.period_id = p.id
      WHERE p.id < ${period.id} AND p.status = 'paying' AND r.user_id = ${userId ?? null} AND r.distributed_at IS NULL
      ORDER BY id DESC LIMIT 12
    `);
    const history = await tx.execute<{
      id: string; starts_at: string | Date; xp: string; gft: string; eligible: number; total: string; mystery_name: string | null;
      own: Transaction | null;
    }>(sql`
      SELECT p.id, p.starts_at, totals.xp, totals.gft, totals.eligible, totals.total,
        CASE WHEN p.settled_at IS NOT NULL AND totals.eligible > 0 THEN p.mystery_name ELSE NULL END AS mystery_name,
        (SELECT to_jsonb(own) - 'gft_signed_transaction' - 'gft_hash' - 'wallet_address'
          FROM bounty_reward_transactions own WHERE own.period_id = p.id AND own.user_id = ${userId ?? null}) AS own
      FROM bounty_reward_periods p
      CROSS JOIN LATERAL (
        SELECT COALESCE(sum(xp_units) FILTER (WHERE xp_distributed_at IS NOT NULL), 0) AS xp,
          COALESCE(sum(gft_units) FILTER (WHERE distributed_at IS NOT NULL), 0) AS gft,
          count(*)::integer AS eligible, COALESCE(sum(final_score), 0) AS total
        FROM bounty_reward_transactions WHERE period_id = p.id
      ) totals
      WHERE p.status = 'distributed' OR (p.status = 'paying' AND totals.eligible > 0)
      ORDER BY p.id DESC LIMIT 12
    `);
    return {
      current: { id: period.id, start: period.starts_at.toISOString(), end: period.ends_at.toISOString(),
        xp: period.xp_units, gft: Number(period.gft_units) / GFT_POOL_SCALE, hasMysteryReward: Boolean(period.mystery_name) },
      personal,
      closing: closing.map(item => ({
        id: item.id, start: new Date(item.starts_at).toISOString(),
        status: (item.status === 'paying' ? 'Reward pending' : 'Calculating final share') as BountyRewardStatus,
      })),
      previous: history.map(item => ({
        id: item.id, start: new Date(item.starts_at).toISOString(), xp: Number(item.xp), gft: Number(item.gft) / GFT_POOL_SCALE,
        eligibleCreators: item.eligible, totalScore: Number(item.total), mystery: item.mystery_name,
        personal: item.own ? {
          base: item.own.base_score, seasonBonus: item.own.season_bonus, levelBonus: item.own.level_bonus,
          total: item.own.final_score, approved: item.own.approved_count, awaiting: 0,
          share: Number(item.total) > 0 ? item.own.final_score / Number(item.total) : 0,
          xp: item.own.xp_units, gft: Number(item.own.gft_units) / GFT_POOL_SCALE, mystery: item.own.mystery_name,
          status: item.own.distributed_at ? 'Distributed' : 'Reward pending',
        } : null,
      })),
    };
  });
}

// A shared revision check lets streams see committed changes from any server
// or funding process without using a dedicated database connection per viewer.
export async function getBountyRewardPoolRevision(database: Database = db, now = new Date()) {
  if (database === db) await ensureRewardPool();
  const { id } = monthlyRewardPeriod(now);
  const [row] = await database.execute<{ revision: string }>(sql`
    SELECT md5(COALESCE(jsonb_agg(
      jsonb_build_array(p.id, p.xp_units, p.gft_units, p.mystery_name, p.status,
        awards.xp_received, awards.rewards_received) ORDER BY p.id
    )::text, '[]')) AS revision
    FROM (SELECT * FROM bounty_reward_periods WHERE id <= ${id} ORDER BY id DESC LIMIT 13) p
    CROSS JOIN LATERAL (
      SELECT count(xp_distributed_at) AS xp_received, count(distributed_at) AS rewards_received
      FROM bounty_reward_transactions WHERE period_id = p.id
    ) awards
  `);
  return `${id}:${row.revision}`;
}
