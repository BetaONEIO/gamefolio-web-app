import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import * as rewards from '../shared/bounty-reward-pool';
import { loadIsolatedService } from './helpers/isolated-typescript';

async function fixture(acquired: boolean) {
  const dialect = new PgDialect();
  const calls: { query: string; params: unknown[] }[] = [];
  const state = { released: 0, delivered: 0 };
  const period = rewards.monthlyRewardPeriod(new Date());
  const database: any = {
    transaction: async (run: any) => run(database),
    execute: async (query: any) => {
      const { sql: text } = dialect.sqlToQuery(query);
      if (text.includes('SELECT * FROM bounty_reward_periods WHERE id')) {
        return [{ id: period.id, starts_at: period.start, ends_at: period.end }];
      }
      if (text.includes('SELECT r.period_id, r.user_id')) return [{ period_id: '2026-10', user_id: 7 }];
      if (text.includes('SELECT * FROM bounty_reward_transactions')) {
        assert.equal(acquired, true, 'only the lock holder may deliver rewards');
        return [{ period_id: '2026-10', user_id: 7, xp_units: 0, gft_units: '0' }];
      }
      if (text.includes('SELECT total_xp, wallet_address FROM users')) return [{ total_xp: 10, wallet_address: null }];
      if (text.includes('SET distributed_at = NOW(), gft_signed_transaction')) state.delivered++;
      return [];
    },
  };
  // The restored pg adapter exposes a reserved client object, not a SQL tag.
  const connection = {
    unsafe: async (query: string, params: unknown[]) => {
      calls.push({ query, params });
      return query.includes('pg_try_advisory_lock') ? [{ acquired }] : [];
    },
    release: () => { state.released++; },
  };
  const unused = () => { throw new Error('Unexpected external reward operation'); };
  const service = await loadIsolatedService(new URL('../server/bounty-reward-pool.ts', import.meta.url), {
    'node:crypto': { createHash },
    'drizzle-orm': { sql },
    '@shared/campaign-creator-progress': { campaignCreatorProgress: unused },
    '@shared/bounty-reward-pool': rewards,
    '@shared/season-definitions': { SEASON_DEFS: [] },
    './db': { db: database, pool: { reserve: async () => connection } },
    './level-system': { calculateLevel: unused },
    './campaign-instance-objectives': { mergeInstanceObjectives: unused },
    './gf-token-service': { getGfTransferReceiptStatus: unused, rebroadcastSignedGfTransfer: unused, transferGfTokens: unused },
    './stream-livestream-validation': { parseStreamCampaignConfig: unused, streamSubmissionIdentities: unused },
  });
  return { service, calls, state };
}

for (const acquired of [false, true]) {
  test(`reward delivery uses and releases a reserved pg client when lock acquired=${acquired}`, async () => {
    const { service, calls, state } = await fixture(acquired);
    await service.processBountyRewardPools();
    assert.deepEqual(calls, [
      { query: 'SELECT pg_try_advisory_lock(hashtext($1), 73901) AS acquired', params: ['bounty-pool-payout:2026-10:7'] },
      { query: 'SELECT pg_advisory_unlock(hashtext($1), 73901)', params: ['bounty-pool-payout:2026-10:7'] },
    ]);
    assert.equal(state.released, 1);
    assert.equal(state.delivered, acquired ? 1 : 0);
  });
}
