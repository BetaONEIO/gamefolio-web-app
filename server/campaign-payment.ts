import { db } from './db';
import { sql } from 'drizzle-orm';
import type Stripe from 'stripe';
import { activatePaidCampaignInTransaction } from './campaign-paid-setup';
import { isVerifiedCampaignPayment } from './campaign-payment-verification';

const rows = (result: any): any[] => result.rows ?? result;
let tableReady: Promise<unknown> | null = null;
export async function ensureCampaignPaymentTable() {
  if (!tableReady) tableReady = (async()=>{await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS confirmed_terms JSONB`);return db.execute(sql`CREATE TABLE IF NOT EXISTS campaign_payments (
    campaign_id INTEGER PRIMARY KEY REFERENCES campaign_instances(id),
    developer_id INTEGER NOT NULL, expected_pence INTEGER NOT NULL,
    session_id TEXT UNIQUE, transaction_id TEXT UNIQUE, amount_paid INTEGER,
    status TEXT NOT NULL DEFAULT 'awaiting_payment', last_error TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);})().catch(error => { tableReady = null; throw error; });
  await tableReady;
}
export async function fulfilCampaignPayment(session: Stripe.Checkout.Session) {
  await ensureCampaignPaymentTable();
  const [payment] = rows(await db.execute(sql`SELECT * FROM campaign_payments WHERE session_id = ${session.id}`));
  if (!payment || !isVerifiedCampaignPayment(session, payment)) throw new Error('Campaign payment verification failed');
  // Persist the trusted receipt separately: setup rollback never loses payment evidence.
  const transaction = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  if (!transaction) throw new Error('Missing payment transaction');
  await db.execute(sql`UPDATE campaign_payments SET transaction_id = ${transaction}, amount_paid = ${session.amount_total},
    status = CASE WHEN status = 'fulfilled' THEN status ELSE 'setup_processing' END, updated_at = NOW()
    WHERE campaign_id = ${payment.campaign_id}`);
  await activatePaidCampaign(Number(payment.campaign_id));
}
export async function activatePaidCampaign(id: number) {
  try {
    await db.transaction(tx => activatePaidCampaignInTransaction(tx, id));
  } catch (error: any) {
    await db.execute(sql`UPDATE campaign_payments SET status = 'setup_processing', last_error = ${error.message}, updated_at = NOW() WHERE campaign_id = ${id} AND status <> 'fulfilled'`);
    throw error;
  }
}
export async function processPaidCampaigns() {
  await ensureCampaignPaymentTable();
  // Repair only drafts with a durable, already-verified payment receipt. Never infer payment from setup completion.
  await db.execute(sql`UPDATE campaign_payments cp SET status = 'setup_processing', updated_at = NOW() FROM campaign_instances ci WHERE ci.id = cp.campaign_id AND ci.status = 'draft' AND cp.status = 'fulfilled' AND cp.transaction_id IS NOT NULL`);
  const pending = rows(await db.execute(sql`SELECT campaign_id FROM campaign_payments WHERE status = 'setup_processing' AND transaction_id IS NOT NULL ORDER BY updated_at LIMIT 20`));
  for (const item of pending) await activatePaidCampaign(Number(item.campaign_id)).catch(() => {});
  await db.execute(sql`UPDATE campaign_instances SET status = 'live', lifecycle_state = 'accepting', updated_at = NOW()
    WHERE status = 'scheduled' AND actual_start <= NOW() AT TIME ZONE 'UTC'
    AND id IN (SELECT campaign_id FROM campaign_payments WHERE status = 'fulfilled')`);
}
