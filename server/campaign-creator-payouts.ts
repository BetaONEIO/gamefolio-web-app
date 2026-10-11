import type Stripe from 'stripe';
import { sql } from 'drizzle-orm';
import { db } from './db';
import { getUncachableStripeClient } from './stripeClient';
import { calculateCampaignFunding } from '@shared/campaign-funding';

const rows = (result: any): any[] => result?.rows ?? result ?? [];

export async function ensureCampaignPayoutTables() {
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled BOOLEAN NOT NULL DEFAULT false`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_connect_account_unique ON users (stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS campaign_funding_allocations (
    campaign_id INTEGER PRIMARY KEY REFERENCES campaign_instances(id) ON DELETE CASCADE,
    gross_amount_pence INTEGER NOT NULL CHECK (gross_amount_pence >= 0),
    platform_fee_pence INTEGER NOT NULL CHECK (platform_fee_pence >= 0),
    creator_pool_pence INTEGER NOT NULL CHECK (creator_pool_pence >= 0),
    creator_capacity INTEGER NOT NULL CHECK (creator_capacity > 0),
    payout_per_creator_pence INTEGER NOT NULL CHECK (payout_per_creator_pence >= 0),
    rounding_remainder_pence INTEGER NOT NULL DEFAULT 0 CHECK (rounding_remainder_pence >= 0),
    stripe_payment_intent_id TEXT NOT NULL UNIQUE, stripe_charge_id TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'gbp', status TEXT NOT NULL DEFAULT 'funded',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (platform_fee_pence + creator_pool_pence = gross_amount_pence),
    CHECK (payout_per_creator_pence * creator_capacity + rounding_remainder_pence = creator_pool_pence)
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS campaign_creator_payouts (
    id BIGSERIAL PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaign_instances(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES campaign_participants(id) ON DELETE CASCADE,
    creator_user_id INTEGER NOT NULL REFERENCES users(id), amount_pence INTEGER NOT NULL CHECK (amount_pence >= 0),
    currency TEXT NOT NULL DEFAULT 'gbp', stripe_connect_account_id TEXT, stripe_transfer_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT,
    paid_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, participant_id)
  )`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS campaign_creator_payouts_creator_status_idx ON campaign_creator_payouts (creator_user_id, status)`);
}

async function chargeIdForSession(stripe: Stripe, session: Stripe.Checkout.Session): Promise<{ paymentIntentId: string; chargeId: string }> {
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  if (!paymentIntentId) throw new Error('Missing campaign PaymentIntent');
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
  const chargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id;
  if (!chargeId) throw new Error('Missing campaign charge');
  return { paymentIntentId, chargeId };
}

export async function recordCampaignFunding(session: Stripe.Checkout.Session, campaignId: number) {
  await ensureCampaignPayoutTables();
  const [campaign] = rows(await db.execute(sql`SELECT max_places FROM campaign_instances WHERE id = ${campaignId}`));
  if (!campaign) throw new Error('Campaign not found');
  // The campaign budget is the pre-tax subtotal. Tax collected by Stripe is
  // not platform revenue and must never be allocated to creators.
  const amount = session.amount_subtotal;
  if (amount == null) throw new Error('Missing campaign payment subtotal');
  const allocation = calculateCampaignFunding(amount, Number(campaign.max_places));
  const stripe = await getUncachableStripeClient();
  const ids = await chargeIdForSession(stripe, session);
  await db.execute(sql`INSERT INTO campaign_funding_allocations
    (campaign_id, gross_amount_pence, platform_fee_pence, creator_pool_pence, creator_capacity,
     payout_per_creator_pence, rounding_remainder_pence, stripe_payment_intent_id, stripe_charge_id)
    VALUES (${campaignId}, ${allocation.grossAmountPence}, ${allocation.platformFeePence}, ${allocation.creatorPoolPence},
      ${allocation.creatorCapacity}, ${allocation.payoutPerCreatorPence}, ${allocation.roundingRemainderPence},
      ${ids.paymentIntentId}, ${ids.chargeId})
    ON CONFLICT (campaign_id) DO NOTHING`);
  await db.execute(sql`UPDATE campaign_instances SET reward_pool_contribution_pence = ${allocation.creatorPoolPence} WHERE id = ${campaignId}`);
  return allocation;
}

export async function refreshCreatorConnectStatus(userId: number) {
  await ensureCampaignPayoutTables();
  const [user] = rows(await db.execute(sql`SELECT stripe_connect_account_id FROM users WHERE id = ${userId}`));
  if (!user?.stripe_connect_account_id) return { accountId: null, detailsSubmitted: false, payoutsEnabled: false };
  const stripe = await getUncachableStripeClient();
  const account = await stripe.accounts.retrieve(user.stripe_connect_account_id);
  const payoutsEnabled = account.payouts_enabled === true && account.capabilities?.transfers === 'active';
  await db.execute(sql`UPDATE users SET stripe_connect_details_submitted = ${account.details_submitted === true},
    stripe_connect_payouts_enabled = ${payoutsEnabled} WHERE id = ${userId}`);
  return { accountId: account.id, detailsSubmitted: account.details_submitted === true, payoutsEnabled };
}

export async function createCreatorConnectOnboarding(user: { id: number; email?: string | null }, origin: string) {
  await ensureCampaignPayoutTables();
  const [stored] = rows(await db.execute(sql`SELECT stripe_connect_account_id FROM users WHERE id = ${user.id}`));
  const stripe = await getUncachableStripeClient();
  let accountId = stored?.stripe_connect_account_id as string | null;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express', email: user.email ?? undefined,
      capabilities: { transfers: { requested: true } },
      metadata: { gamefolioUserId: String(user.id) },
    }, { idempotencyKey: `gamefolio-connect-user-${user.id}` });
    accountId = account.id;
    await db.execute(sql`UPDATE users SET stripe_connect_account_id = ${accountId} WHERE id = ${user.id} AND stripe_connect_account_id IS NULL`);
  }
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/settings?stripeConnect=refresh`,
    return_url: `${origin}/settings?stripeConnect=return`,
    type: 'account_onboarding',
  });
  return link.url;
}

export async function createCreatorConnectDashboardLink(userId: number) {
  const status = await refreshCreatorConnectStatus(userId);
  if (!status.accountId) throw new Error('Connect a payout account first');
  const stripe = await getUncachableStripeClient();
  return (await stripe.accounts.createLoginLink(status.accountId)).url;
}

export async function payCompletedCampaignParticipant(campaignId: number, participantId: number, creatorUserId: number) {
  await ensureCampaignPayoutTables();
  const [funding] = rows(await db.execute(sql`SELECT * FROM campaign_funding_allocations WHERE campaign_id = ${campaignId}`));
  if (!funding) return { status: 'not_funded' as const };
  await db.execute(sql`INSERT INTO campaign_creator_payouts (campaign_id, participant_id, creator_user_id, amount_pence)
    VALUES (${campaignId}, ${participantId}, ${creatorUserId}, ${funding.payout_per_creator_pence})
    ON CONFLICT (campaign_id, participant_id) DO NOTHING`);
  const [payout] = rows(await db.execute(sql`SELECT * FROM campaign_creator_payouts WHERE campaign_id = ${campaignId} AND participant_id = ${participantId}`));
  if (payout?.status === 'paid') return { status: 'paid' as const, transferId: payout.stripe_transfer_id };
  const status = await refreshCreatorConnectStatus(creatorUserId);
  if (!status.accountId || !status.payoutsEnabled) {
    await db.execute(sql`UPDATE campaign_creator_payouts SET status = 'requires_onboarding',
      stripe_connect_account_id = ${status.accountId}, updated_at = NOW() WHERE id = ${payout.id}`);
    return { status: 'requires_onboarding' as const };
  }
  if (Number(payout.amount_pence) === 0) return { status: 'zero_amount' as const };
  await db.execute(sql`UPDATE campaign_creator_payouts SET status = 'processing', attempts = attempts + 1,
    stripe_connect_account_id = ${status.accountId}, last_error = NULL, updated_at = NOW()
    WHERE id = ${payout.id} AND status <> 'paid'`);
  try {
    const stripe = await getUncachableStripeClient();
    const transfer = await stripe.transfers.create({
      amount: Number(payout.amount_pence), currency: funding.currency,
      destination: status.accountId, source_transaction: funding.stripe_charge_id,
      transfer_group: `campaign_${campaignId}`,
      metadata: { campaignId: String(campaignId), participantId: String(participantId), creatorUserId: String(creatorUserId) },
    }, { idempotencyKey: `campaign-${campaignId}-participant-${participantId}-payout` });
    await db.execute(sql`UPDATE campaign_creator_payouts SET status = 'paid', stripe_transfer_id = ${transfer.id},
      paid_at = NOW(), updated_at = NOW() WHERE id = ${payout.id}`);
    return { status: 'paid' as const, transferId: transfer.id };
  } catch (error: any) {
    await db.execute(sql`UPDATE campaign_creator_payouts SET status = 'failed', last_error = ${String(error?.message ?? error).slice(0, 1000)},
      updated_at = NOW() WHERE id = ${payout.id}`);
    throw error;
  }
}

export async function retryCreatorPendingPayouts(userId: number) {
  await ensureCampaignPayoutTables();
  const pending = rows(await db.execute(sql`SELECT campaign_id, participant_id FROM campaign_creator_payouts
    WHERE creator_user_id = ${userId} AND status IN ('pending','requires_onboarding','failed') ORDER BY created_at LIMIT 20`));
  return Promise.allSettled(pending.map(p => payCompletedCampaignParticipant(Number(p.campaign_id), Number(p.participant_id), userId)));
}
