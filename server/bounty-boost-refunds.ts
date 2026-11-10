import { sql } from 'drizzle-orm';
import { db } from './db';
import { getUncachableStripeClient } from './stripeClient';
import { unusedBoostRewards } from '../shared/bounty-discovery';
const rows=(r:any):any[]=>r.rows??r;
export async function ensureBoostRefunds(tx:any) {
  await tx.execute(sql`CREATE TABLE IF NOT EXISTS bounty_boost_refunds (
    campaign_id INTEGER PRIMARY KEY REFERENCES campaign_instances(id), developer_id INTEGER NOT NULL REFERENCES users(id),
    amount_pence INTEGER NOT NULL CHECK(amount_pence>=0),currency TEXT NOT NULL DEFAULT 'gbp',status TEXT NOT NULL DEFAULT 'pending',
    last_error TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),completed_at TIMESTAMPTZ)`);
  await tx.execute(sql`CREATE TABLE IF NOT EXISTS bounty_boost_refund_charges (
    campaign_id INTEGER NOT NULL REFERENCES bounty_boost_refunds(campaign_id),charge_id TEXT NOT NULL,
    amount_pence INTEGER NOT NULL CHECK(amount_pence>0),stripe_refund_id TEXT UNIQUE,status TEXT NOT NULL DEFAULT 'pending',
    PRIMARY KEY(campaign_id,charge_id))`);
}
// Only new Boosts use these terms; historical campaign rewards keep their original allocation.
export async function reserveUnusedBoostRefund(tx:any,data:any,funding:any,completed:number) {
  if(data.campaign.management_data?.unused_reward_policy!=='refund-uncompleted-v1')return false;
  const amount=unusedBoostRewards(Number(funding.creator_pool_pence),Number(funding.payout_per_creator_pence),completed,Number(funding.creator_capacity));
  await tx.execute(sql`INSERT INTO bounty_boost_refunds(campaign_id,developer_id,amount_pence,currency,status)
    VALUES(${data.campaign.id},${data.campaign.developer_user_id},${amount},${funding.currency},${amount?'pending':'not_needed'}) ON CONFLICT DO NOTHING`);
  return true;
}
export async function dispatchUnusedBoostRefunds(dependencies?:{database?:any;stripe?:()=>Promise<any>}) {
  const database=dependencies?.database??db;
  const stripeClient=dependencies?.stripe??getUncachableStripeClient;
  const refunds=rows(await database.execute(sql`SELECT r.*,f.stripe_charge_id FROM bounty_boost_refunds r JOIN campaign_funding_allocations f ON f.campaign_id=r.campaign_id WHERE r.status IN('pending','processing','failed') ORDER BY r.created_at LIMIT 10`));
  for(const refund of refunds) {
    try {
      const stripe=await stripeClient();
      // Serialize workers and retain each exact per-charge amount before contacting Stripe.
      await database.transaction(async (tx:any)=>{
        await tx.execute(sql`SELECT campaign_id FROM bounty_boost_refunds WHERE campaign_id=${refund.campaign_id} FOR UPDATE`);
        const planned=rows(await tx.execute(sql`SELECT * FROM bounty_boost_refund_charges WHERE campaign_id=${refund.campaign_id}`));
        let remaining=Number(refund.amount_pence)-planned.reduce((sum,r)=>sum+Number(r.amount_pence),0);
        if(remaining>0) {
          const extra=rows(await tx.execute(sql`SELECT stripe_charge_id FROM campaign_capacity_payments WHERE campaign_id=${refund.campaign_id} AND status='fulfilled' AND stripe_charge_id IS NOT NULL ORDER BY created_at`));
          for(const id of Array.from(new Set<string>([refund.stripe_charge_id,...extra.map(e=>e.stripe_charge_id)]))) {
            if(!remaining||planned.some(p=>p.charge_id===id))continue;
            const charge=await stripe.charges.retrieve(id);
            if(charge.currency!==refund.currency)throw new Error('Refund currency requires review');
            const amount=Math.min(remaining,charge.amount-charge.amount_refunded);
            if(amount>0){await tx.execute(sql`INSERT INTO bounty_boost_refund_charges(campaign_id,charge_id,amount_pence) VALUES(${refund.campaign_id},${id},${amount}) ON CONFLICT DO NOTHING`);remaining-=amount;}
          }
          if(remaining>0)throw new Error('Refund requires payment review: insufficient refundable balance');
        }
        await tx.execute(sql`UPDATE bounty_boost_refunds SET status='processing',last_error=NULL WHERE campaign_id=${refund.campaign_id}`);
      });
      const charges=rows(await database.execute(sql`SELECT * FROM bounty_boost_refund_charges WHERE campaign_id=${refund.campaign_id} AND status<>'succeeded'`));
      for(const charge of charges) {
        const result=charge.stripe_refund_id?await stripe.refunds.retrieve(charge.stripe_refund_id):await stripe.refunds.create({charge:charge.charge_id,amount:Number(charge.amount_pence),metadata:{campaignId:String(refund.campaign_id),reason:'unused_creator_rewards'}},{idempotencyKey:`boost-unused-${refund.campaign_id}-${charge.charge_id}`});
        await database.execute(sql`UPDATE bounty_boost_refund_charges SET stripe_refund_id=${result.id},status=${result.status??'pending'} WHERE campaign_id=${refund.campaign_id} AND charge_id=${charge.charge_id}`);
        if(result.status==='failed'||result.status==='canceled')throw new Error('Payment provider could not complete the refund; support review is required');
      }
      await database.transaction(async (tx:any)=>{
        const [saved]=rows(await tx.execute(sql`SELECT * FROM bounty_boost_refunds WHERE campaign_id=${refund.campaign_id} FOR UPDATE`));
        const [pending]=rows(await tx.execute(sql`SELECT 1 FROM bounty_boost_refund_charges WHERE campaign_id=${refund.campaign_id} AND status<>'succeeded' LIMIT 1`));
        if(!pending&&saved.status!=='refunded') {
          await tx.execute(sql`UPDATE bounty_boost_refunds SET status='refunded',completed_at=NOW() WHERE campaign_id=${refund.campaign_id}`);
          await tx.execute(sql`INSERT INTO notifications(user_id,type,title,message,action_url) VALUES(${refund.developer_id},'campaign_activity','Unused Bounty Boost rewards refunded',${`${(Number(refund.amount_pence)/100).toFixed(2)} ${refund.currency.toUpperCase()} in unused creator rewards has been refunded to your original payment method.`},${`/game-dashboard?tab=campaigns&viewCampaign=${refund.campaign_id}`})`);
        }
      });
    } catch(error:any) {await database.execute(sql`UPDATE bounty_boost_refunds SET status='failed',last_error=${String(error.message??error).slice(0,500)} WHERE campaign_id=${refund.campaign_id} AND status<>'refunded'`);}
  }
}
