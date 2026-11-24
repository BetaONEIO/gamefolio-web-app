import test from 'node:test';
import assert from 'node:assert/strict';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { activatePaidCampaignInTransaction } from '../server/campaign-paid-setup';
import { isVerifiedCampaignPayment } from '../server/campaign-payment-verification';
import { loadIsolatedService } from './helpers/isolated-typescript';

const dialect = new PgDialect();

async function fixture() {
  const receipt = {
    campaign_id: 12, developer_id: 7, expected_pence: 5000,
    session_id: 'cs_campaign', transaction_id: null as string | null,
    status: 'awaiting_payment',
  };
  const session = {
    id: receipt.session_id, payment_intent: 'pi_campaign', payment_status: 'paid',
    currency: 'gbp', amount_subtotal: 5000, amount_total: 6000,
    metadata: { type: 'campaign', campaignId: '12', developerId: '7', expectedPence: '5000' },
  };
  const state = { funding: null as any, fundingFailures: 1, activations: 0, retrievals: 0, fundingAttempts: 0 };
  const database: any = {
    transaction: async (run: any) => run(database),
    execute: async (query: any) => {
      const { sql: text, params } = dialect.sqlToQuery(query);
      if (text.includes('SELECT * FROM campaign_payments')) return [receipt];
      if (text.includes('SELECT campaign_id, session_id')) return receipt.status === 'setup_processing' ? [receipt] : [];
      if (text.includes('SELECT * FROM campaign_instances')) return [{ developer_user_id: 7, max_places: 2, requires_access_key: false, start_type: 'asap' }];
      if (text.includes('FROM campaign_funding_allocations')) return state.funding ? [state.funding] : [];
      if (text.includes('SET transaction_id =')) {
        receipt.transaction_id = String(params[0]);
        if (receipt.status !== 'fulfilled') receipt.status = 'setup_processing';
      }
      if (text.includes('UPDATE campaign_instances SET status = $1')) {
        assert.ok(state.funding, 'publication must follow durable funding');
        state.activations++;
      }
      if (text.includes("SET status = 'fulfilled'")) receipt.status = 'fulfilled';
      return [];
    },
  };
  const service = await loadIsolatedService(new URL('../server/campaign-payment.ts', import.meta.url), {
    './db': { db: database },
    'drizzle-orm': { sql },
    './campaign-paid-setup': { activatePaidCampaignInTransaction },
    './campaign-payment-verification': { isVerifiedCampaignPayment },
    './campaign-creator-payouts': {
      recordCampaignFunding: async () => {
        state.fundingAttempts++;
        if (state.fundingFailures-- > 0) throw new Error('Stripe charge lookup timed out');
        state.funding ??= { stripe_payment_intent_id: 'pi_campaign', gross_amount_pence: 5000, creator_capacity: 2, status: 'funded' };
      },
    },
    './stripeClient': {
      getUncachableStripeClient: async () => ({ checkout: { sessions: { retrieve: async (id: string) => {
        assert.equal(id, receipt.session_id);
        state.retrievals++;
        return session;
      } } } }),
    },
  });
  return { receipt, session, state, service };
}

test('worker repairs funding after a receipt survives a failed Stripe lookup', async () => {
  const { receipt, session, state, service } = await fixture();
  await assert.rejects(service.fulfilCampaignPayment(session), /charge lookup timed out/);
  assert.equal(receipt.transaction_id, 'pi_campaign');
  assert.equal(receipt.status, 'setup_processing');
  assert.equal(state.activations, 0);

  await service.processPaidCampaigns();
  assert.equal(state.retrievals, 1);
  assert.equal(state.fundingAttempts, 2);
  assert.equal(receipt.status, 'fulfilled');
  assert.equal(state.activations, 1);

  await service.fulfilCampaignPayment(session);
  await service.processPaidCampaigns();
  assert.equal(state.activations, 1, 'replayed delivery must not publish twice');
});

test('a repeated funding failure keeps setup pending until a later retry succeeds', async () => {
  const { receipt, session, state, service } = await fixture();
  state.fundingFailures = 2;
  await assert.rejects(service.fulfilCampaignPayment(session));
  await service.processPaidCampaigns();
  assert.equal(receipt.status, 'setup_processing');
  assert.equal(state.activations, 0);
  assert.equal(state.funding, null);
  await service.processPaidCampaigns();
  assert.equal(receipt.status, 'fulfilled');
  assert.equal(state.activations, 1);
});

test('recovery re-verifies the retrieved session before funding or publication', async () => {
  const { receipt, session, state, service } = await fixture();
  await assert.rejects(service.fulfilCampaignPayment(session));
  session.metadata.expectedPence = '1';
  await service.processPaidCampaigns();
  assert.equal(receipt.status, 'setup_processing');
  assert.equal(state.fundingAttempts, 1);
  assert.equal(state.activations, 0);
});
