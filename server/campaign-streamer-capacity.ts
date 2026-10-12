import { RELEASED_PARTICIPANTS } from '@shared/campaign-management';
import { isVerifiedCapacityPayment } from './campaign-payment-verification';
import { db } from './db';
import { sql } from 'drizzle-orm';
import type Stripe from 'stripe';
import { randomUUID } from 'node:crypto';
import { getUncachableStripeClient } from './stripeClient';
import { calculateStreamCampaignPricePence } from '@shared/campaign-commercial-model';
import { streamerCapacityError } from '@shared/streamer-capacity';
import { calculateCampaignFunding } from '@shared/campaign-funding';
const rows=(r:any):any[]=>r.rows??r;
let ready:Promise<void>|null=null;
export async function ensureStreamerCapacity() {
  if(!ready)ready=(async()=>{
    await db.execute(sql`CREATE TABLE IF NOT EXISTS campaign_streamer_enquiries (
      id BIGSERIAL PRIMARY KEY, developer_id INTEGER NOT NULL REFERENCES users(id), game_name TEXT NOT NULL,
      minutes INTEGER NOT NULL, requested_places INTEGER NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'requested', approved_by INTEGER REFERENCES users(id), created_at TIMESTAMP DEFAULT NOW())`);
    await db.execute(sql`ALTER TABLE campaign_funding_allocations ADD COLUMN IF NOT EXISTS has_capacity_payments BOOLEAN NOT NULL DEFAULT false`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS campaign_capacity_payments (
      id TEXT PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaign_instances(id), developer_id INTEGER NOT NULL,
      original_places INTEGER NOT NULL,target_places INTEGER NOT NULL,expected_pence INTEGER NOT NULL,
      session_id TEXT UNIQUE,transaction_id TEXT UNIQUE,stripe_charge_id TEXT,status TEXT NOT NULL DEFAULT 'awaiting_payment',
      amount_paid INTEGER,created_at TIMESTAMP DEFAULT NOW(), fulfilled_at TIMESTAMP)`);
    await db.execute(sql`ALTER TABLE campaign_capacity_payments ADD COLUMN IF NOT EXISTS amount_paid INTEGER`);
  })().catch(e=>{ready=null;throw e;});
  await ready;
}
function live(c:any) {
  if(!['live','in_progress','scheduled'].includes(c.status)||c.end_date&&new Date(c.end_date)<=new Date())throw new Error('Only campaigns that have not ended can add streamer places.');
}
async function allocateKeys(tx:any,c:any,target:number,apply=false) {
  const participants=rows(await tx.execute(sql`SELECT id,status,full_key_id FROM campaign_participants WHERE instance_id=${c.id}`));
  for(const pool of ['access','reward']) {
    if(pool==='access'&&c.requires_access_key===false||pool==='reward'&&!c.completion_reward_key_required)continue;
    const type=pool==='reward'||c.access_method==='full_game_upfront'?'full':'demo';
    const needed=pool==='access'?Math.max(0,target-participants.filter(p=>!RELEASED_PARTICIPANTS.includes(p.status)).length):Math.max(0,target-participants.filter(p=>p.full_key_id).length);
    const keys=rows(await tx.execute(sql`SELECT id FROM game_keys WHERE developer_user_id=${c.developer_user_id}
      AND game_id=${c.game_id} AND key_pool=${pool} AND key_type=${type} AND removed_at IS NULL AND revealed_at IS NULL
      AND assigned_user_id IS NULL AND assigned_participant_id IS NULL
      AND ((instance_id=${c.id} AND status IN ('available','reserved')) OR (instance_id IS NULL AND status='available'))
      ORDER BY instance_id NULLS LAST,id LIMIT ${needed} FOR UPDATE SKIP LOCKED`));
    if(keys.length<needed)throw new Error(`Add enough eligible ${pool} keys before increasing capacity.`);
    if(apply&&keys.length)await tx.execute(sql`UPDATE game_keys SET instance_id=${c.id},status='reserved' WHERE id=ANY(${keys.map(k=>Number(k.id))}::int[])`);
  }
}
export async function startStreamerCapacityPayment(campaignId:number,developerId:number,target:number,origin:string) {
  await ensureStreamerCapacity();
  const error=streamerCapacityError(target);if(error)throw new Error(error);
  return db.transaction(async tx=>{
    const [c]=rows(await tx.execute(sql`SELECT ci.*,t.slug FROM campaign_instances ci JOIN campaign_templates t ON t.id=ci.template_id WHERE ci.id=${campaignId} AND ci.developer_user_id=${developerId} FOR UPDATE OF ci`));
    if(!c||c.slug!=='stream-spotlight')throw new Error('Stream Spotlight campaign not found.');live(c);
    if(target<=Number(c.max_places))throw new Error('Choose more places than the current capacity. Capacity cannot be reduced.');
    const [funding]=rows(await tx.execute(sql`SELECT * FROM campaign_funding_allocations WHERE campaign_id=${campaignId} FOR UPDATE`));
    if(!funding||funding.status!=='funded')throw new Error('Campaign funding must be confirmed first.');
    const [settled]=rows(await tx.execute(sql`SELECT id FROM campaign_reward_transactions WHERE campaign_id=${campaignId} AND reward_type='campaign_completion_bonus' LIMIT 1`));
    if(settled)throw new Error('Campaign rewards have already been settled.');
    await allocateKeys(tx,c,target);
    const stripe=await getUncachableStripeClient();
    const pending=rows(await tx.execute(sql`SELECT * FROM campaign_capacity_payments WHERE campaign_id=${campaignId} AND status IN ('awaiting_payment','keys_required') ORDER BY created_at DESC`));
    for(const p of pending){if(!p.session_id)continue;const previous=await stripe.checkout.sessions.retrieve(p.session_id);if(previous.payment_status==='paid')return {checkoutUrl:`${origin}/game-dashboard?tab=campaigns&campaignSub=my&viewCampaign=${campaignId}&capacityPayment=${p.id}`};if(previous.status==='open'){if(Number(p.target_places)===target)return {checkoutUrl:previous.url};await stripe.checkout.sessions.expire(previous.id);}await tx.execute(sql`UPDATE campaign_capacity_payments SET status='cancelled' WHERE id=${p.id}`);}
    const amount=calculateStreamCampaignPricePence(target-Number(c.max_places),Number(c.stream_config?.requiredMinutes??60),c.estimate_snapshot?.methodologyVersion);
    const next=calculateCampaignFunding(Number(funding.gross_amount_pence)+amount,target);
    if(next.payoutPerCreatorPence!==Number(funding.payout_per_creator_pence))throw new Error('This legacy campaign requires a custom capacity quote to preserve creator rewards.');
    const id=randomUUID(),metadata={type:'campaign_capacity',capacityPaymentId:id,campaignId:String(campaignId),developerId:String(developerId)};
    const session=await stripe.checkout.sessions.create({mode:'payment',adaptive_pricing:{enabled:true},automatic_tax:{enabled:true},billing_address_collection:'required',line_items:[{quantity:1,price_data:{currency:'gbp',unit_amount:amount,tax_behavior:'exclusive',product_data:{name:`${target-Number(c.max_places)} additional streamer places`}}}],metadata,payment_intent_data:{metadata,transfer_group:`campaign_${campaignId}`},success_url:`${origin}/game-dashboard?tab=campaigns&campaignSub=my&viewCampaign=${campaignId}&capacityPayment=${id}`,cancel_url:`${origin}/game-dashboard?tab=campaigns&campaignSub=my&viewCampaign=${campaignId}`},{idempotencyKey:`campaign-capacity-${id}`});
    await tx.execute(sql`INSERT INTO campaign_capacity_payments(id,campaign_id,developer_id,original_places,target_places,expected_pence,session_id) VALUES(${id},${campaignId},${developerId},${c.max_places},${target},${amount},${session.id})`);
    return {checkoutUrl:session.url};
  });
}
export async function fulfilStreamerCapacityPayment(session:Stripe.Checkout.Session) {
  await ensureStreamerCapacity();
  const stripe=await getUncachableStripeClient();
  const intent=typeof session.payment_intent==='string'?await stripe.paymentIntents.retrieve(session.payment_intent):session.payment_intent;
  const charge=typeof intent?.latest_charge==='string'?intent.latest_charge:intent?.latest_charge?.id;
  if(!intent?.id||!charge)throw new Error('Missing confirmed capacity payment receipt.');
  await db.transaction(async tx=>{
    const [initial]=rows(await tx.execute(sql`SELECT campaign_id FROM campaign_capacity_payments WHERE session_id=${session.id}`));
    if(!initial)throw new Error('Capacity payment not found.');
    const [c]=rows(await tx.execute(sql`SELECT * FROM campaign_instances WHERE id=${initial.campaign_id} FOR UPDATE`));
    const [p]=rows(await tx.execute(sql`SELECT * FROM campaign_capacity_payments WHERE session_id=${session.id} FOR UPDATE`));
    if(!p||!isVerifiedCapacityPayment(session,p))throw new Error('Capacity payment verification failed.');
    if(p.status==='fulfilled')return;
    try{live(c);}catch{await tx.execute(sql`UPDATE campaign_capacity_payments SET status='refund_required',transaction_id=${intent.id},stripe_charge_id=${charge} WHERE id=${p.id}`);return;}
    if(Number(c.max_places)!==Number(p.original_places)||streamerCapacityError(Number(p.target_places)))throw new Error('Capacity changed while payment was pending.');
    const [funding]=rows(await tx.execute(sql`SELECT * FROM campaign_funding_allocations WHERE campaign_id=${p.campaign_id} FOR UPDATE`));
    // If inventory changed during payment, retain a durable receipt for retry/refund; never publish unfunded places.
    try{await allocateKeys(tx,c,Number(p.target_places),true);}catch{await tx.execute(sql`UPDATE campaign_capacity_payments SET status='keys_required',transaction_id=${intent.id},stripe_charge_id=${charge} WHERE id=${p.id}`);return;}
    const next=calculateCampaignFunding(Number(funding.gross_amount_pence)+Number(p.expected_pence),Number(p.target_places));
    await tx.execute(sql`UPDATE campaign_funding_allocations SET gross_amount_pence=${next.grossAmountPence},platform_fee_pence=${next.platformFeePence},creator_pool_pence=${next.creatorPoolPence},creator_capacity=${p.target_places},payout_per_creator_pence=${next.payoutPerCreatorPence},rounding_remainder_pence=${next.roundingRemainderPence},has_capacity_payments=true,updated_at=NOW() WHERE campaign_id=${p.campaign_id}`);
    await tx.execute(sql`INSERT INTO campaign_reward_transactions(campaign_id,reward_type,amount,currency,status,idempotency_key,calculation_version) VALUES(${p.campaign_id},'platform_campaign_fee',${Math.round(Number(p.expected_pence)*.2)},'gbp','allocated',${`campaign-capacity-${p.id}-fee`},${funding.calculation_version}) ON CONFLICT(idempotency_key) DO NOTHING`);
    await tx.execute(sql`UPDATE campaign_instances SET max_places=${p.target_places},budget_pence=budget_pence+${p.expected_pence},updated_at=NOW() WHERE id=${p.campaign_id}`);
    await tx.execute(sql`UPDATE campaign_capacity_payments SET status='fulfilled',amount_paid=${session.amount_total},transaction_id=${intent.id},stripe_charge_id=${charge},fulfilled_at=NOW() WHERE id=${p.id}`);
    await tx.execute(sql`INSERT INTO campaign_management_events(instance_id,actor_user_id,event_type,detail) VALUES(${p.campaign_id},${p.developer_id},'places_increased',${`${p.original_places} → ${p.target_places} places; verified additional payment ${p.expected_pence} GBP minor units`})`);
  });
}
