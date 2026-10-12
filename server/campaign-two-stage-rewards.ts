import { sql } from 'drizzle-orm';
import { db } from './db';
import { getUncachableStripeClient } from './stripeClient';
import { allocateCampaignCompletionRewards, CAMPAIGN_REWARD_VERSION } from '@shared/campaign-reward-allocation';
import { campaignCreatorProgress } from '@shared/campaign-creator-progress';
const rows=(r:any):any[]=>r?.rows??r??[];
let ready:Promise<void>|null=null;
export async function ensureTwoStageRewards(){
 if(!ready)ready=(async()=>{
  await db.execute(sql`CREATE TABLE IF NOT EXISTS campaign_reward_transactions (
   id BIGSERIAL PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaign_instances(id),
   participant_id INTEGER REFERENCES campaign_participants(id), creator_user_id INTEGER REFERENCES users(id),
   reward_type TEXT NOT NULL CHECK(reward_type IN ('bounty_xp_reward','guaranteed_creator_reward','campaign_completion_bonus','campaign_reward_refund','platform_campaign_fee')),
   amount BIGINT NOT NULL CHECK(amount>=0), currency TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'reserved',
   idempotency_key TEXT NOT NULL UNIQUE, calculation_version TEXT NOT NULL,
   stripe_transfer_id TEXT UNIQUE, last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), paid_at TIMESTAMPTZ,
   UNIQUE(campaign_id,participant_id,reward_type))`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS campaign_cash_reward_notifications(event_key TEXT PRIMARY KEY,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
 })().catch(e=>{ready=null;throw e;});
 await ready;
}
/** Called inside the campaign lifecycle transaction, after the existing objective/stream closure guard. */
export async function reserveCompletionRewards(tx:any,data:any){
 const [funding]=rows(await tx.execute(sql`SELECT * FROM campaign_funding_allocations WHERE campaign_id=${data.campaign.id} FOR UPDATE`));
 if(funding?.calculation_version!==CAMPAIGN_REWARD_VERSION)return false;
 if(data.campaign.status!=='completed')return true;
 if(data.participants.some((p:any)=>!['expired','rejected','cancelled','withdrawn','removed'].includes(p.status)&&!campaignCreatorProgress(data,p).completed))throw new Error('Resolve all active creator work before reward settlement');
 if(data.submissions.some((s:any)=>['staged','awaiting_review','pending','under_review','changes_requested'].includes(s.status)&&!data.submissions.some((n:any)=>Number(n.supersedes_submission_id)===Number(s.id))&&!data.participants.some((p:any)=>Number(p.user_id)===Number(s.participant_id)&&['expired','rejected','cancelled','withdrawn','removed'].includes(p.status))))throw new Error('Resolve pending submissions before reward settlement');
 const eligible=data.participants.filter((p:any)=>campaignCreatorProgress(data,p).completed);
 // No automatic refund: zero-completion campaigns retain the existing cancellation/refund policy.
 if(!eligible.length)return true;
 const allocations=allocateCampaignCompletionRewards(Number(funding.gross_amount_pence),Number(funding.creator_capacity),eligible.map((p:any)=>Number(p.id)));
 for(const a of allocations){
  const participant=eligible.find((p:any)=>Number(p.id)===a.participantId);
  // Recover an approval reservation if the approval worker stopped before inserting it.
  await tx.execute(sql`INSERT INTO campaign_creator_payouts(campaign_id,participant_id,creator_user_id,amount_pence)
   VALUES(${data.campaign.id},${a.participantId},${participant.user_id},${a.guaranteedPence}) ON CONFLICT(campaign_id,participant_id) DO NOTHING`);
  await tx.execute(sql`INSERT INTO campaign_reward_transactions(campaign_id,participant_id,creator_user_id,reward_type,amount,currency,status,idempotency_key,calculation_version)
   VALUES(${data.campaign.id},${a.participantId},${participant.user_id},'campaign_completion_bonus',${a.bonusPence},${funding.currency},${a.bonusPence===0?'no_additional_bonus':'reserved'},${`campaign-${data.campaign.id}-participant-${a.participantId}-completion-bonus`},${CAMPAIGN_REWARD_VERSION}) ON CONFLICT DO NOTHING`);
  await notifyCashReward(tx,`bonus-reserved:${data.campaign.id}:${a.participantId}`,data.campaign.id,Number(participant.user_id),'Campaign rewards finalised',a.bonusPence?`Your completion bonus of £${(a.bonusPence/100).toFixed(2)} is reserved for payment. Check your payout status.`:'Your final share equals your guaranteed reward. No additional completion bonus is due.');
 }
 return true;
}
/** Money is sent only after allocation commits; Stripe's stable key protects retries/crash recovery. */
export async function dispatchCompletionRewards(userId?:number){
 await ensureTwoStageRewards();
 const pending=rows(await db.execute(sql`SELECT r.*,f.stripe_charge_id,f.has_capacity_payments,u.stripe_connect_account_id FROM campaign_reward_transactions r
  JOIN campaign_funding_allocations f ON f.campaign_id=r.campaign_id JOIN users u ON u.id=r.creator_user_id
  WHERE r.reward_type='campaign_completion_bonus' AND r.status IN ('reserved','requires_onboarding','failed','processing')
  AND (${userId??null}::integer IS NULL OR r.creator_user_id=${userId??null}) ORDER BY r.id LIMIT 100`));
 for(const reward of pending){
  try{
   if(!reward.stripe_connect_account_id){await db.execute(sql`UPDATE campaign_reward_transactions SET status='requires_onboarding' WHERE id=${reward.id} AND status<>'paid'`);continue;}
   const stripe=await getUncachableStripeClient();
   const account=await stripe.accounts.retrieve(reward.stripe_connect_account_id);
   if(!account.payouts_enabled||account.capabilities?.transfers!=='active'){await db.execute(sql`UPDATE campaign_reward_transactions SET status='requires_onboarding' WHERE id=${reward.id} AND status<>'paid'`);continue;}
   await db.execute(sql`UPDATE campaign_reward_transactions SET status='processing',last_error=NULL WHERE id=${reward.id} AND status<>'paid'`);
   const transfer=await stripe.transfers.create({amount:Number(reward.amount),currency:reward.currency,destination:account.id,source_transaction:reward.has_capacity_payments?undefined:reward.stripe_charge_id,transfer_group:`campaign_${reward.campaign_id}`,metadata:{campaignId:String(reward.campaign_id),participantId:String(reward.participant_id),rewardType:'campaign_completion_bonus'}},{idempotencyKey:reward.idempotency_key});
   await db.transaction(async tx=>{await tx.execute(sql`UPDATE campaign_reward_transactions SET status='paid',stripe_transfer_id=${transfer.id},paid_at=NOW(),last_error=NULL WHERE id=${reward.id}`);await notifyCashReward(tx,`bonus-paid:${reward.id}`,Number(reward.campaign_id),Number(reward.creator_user_id),'Completion bonus paid',`Your £${(Number(reward.amount)/100).toFixed(2)} completion bonus has been transferred to your connected payout account.`);});
  }catch(e:any){await db.execute(sql`UPDATE campaign_reward_transactions SET status='failed',last_error=${String(e?.message??e).slice(0,1000)} WHERE id=${reward.id} AND status<>'paid'`);}
 }
}
export async function syncApprovalRewardAudit(campaignId:number,participantId:number){
 await ensureTwoStageRewards();
 await db.execute(sql`INSERT INTO campaign_reward_transactions(campaign_id,participant_id,creator_user_id,reward_type,amount,currency,status,idempotency_key,calculation_version,stripe_transfer_id,paid_at)
  SELECT p.campaign_id,p.participant_id,p.creator_user_id,'guaranteed_creator_reward',p.amount_pence,p.currency,p.status,
   'campaign-'||p.campaign_id||'-participant-'||p.participant_id||'-payout',f.calculation_version,p.stripe_transfer_id,p.paid_at
  FROM campaign_creator_payouts p JOIN campaign_funding_allocations f ON f.campaign_id=p.campaign_id
  WHERE p.campaign_id=${campaignId} AND p.participant_id=${participantId} AND f.calculation_version=${CAMPAIGN_REWARD_VERSION}
  ON CONFLICT(idempotency_key) DO UPDATE SET status=EXCLUDED.status,stripe_transfer_id=EXCLUDED.stripe_transfer_id,paid_at=EXCLUDED.paid_at`);
 await db.execute(sql`INSERT INTO campaign_reward_transactions(campaign_id,participant_id,creator_user_id,reward_type,amount,currency,status,idempotency_key,calculation_version,paid_at)
  SELECT e.instance_id,e.participant_id,p.user_id,'bounty_xp_reward',e.amount,'XP','awarded',
  'campaign-'||e.instance_id||'-participant-'||e.participant_id||'-xp',f.calculation_version,e.updated_at
  FROM campaign_reward_events e JOIN campaign_participants p ON p.id=e.participant_id
  JOIN campaign_funding_allocations f ON f.campaign_id=e.instance_id
  WHERE e.instance_id=${campaignId} AND e.participant_id=${participantId} AND e.reward_type='completion' AND e.status='awarded' AND f.calculation_version=${CAMPAIGN_REWARD_VERSION}
  ON CONFLICT DO NOTHING`);
}
export async function creatorCampaignRewardSummary(campaignId:number,participantId?:number){
 const [f]=rows(await db.execute(sql`SELECT * FROM campaign_funding_allocations WHERE campaign_id=${campaignId} AND calculation_version=${CAMPAIGN_REWARD_VERSION}`));
 if(!f)return null;
 const transactions=participantId?rows(await db.execute(sql`SELECT reward_type,amount,currency,status,paid_at FROM campaign_reward_transactions WHERE campaign_id=${campaignId} AND participant_id=${participantId}`)):[];
 return {version:f.calculation_version,totalPence:Number(f.gross_amount_pence),creatorPoolPence:Number(f.creator_pool_pence),capacity:Number(f.creator_capacity),guaranteedPence:Number(f.payout_per_creator_pence),maximumBonusPence:Number(f.creator_pool_pence)-Number(f.payout_per_creator_pence),transactions};
}

async function notifyCashReward(tx:any,eventKey:string,campaignId:number,userId:number,title:string,message:string){
 const claimed=rows(await tx.execute(sql`INSERT INTO campaign_cash_reward_notifications(event_key) VALUES(${eventKey}) ON CONFLICT DO NOTHING RETURNING event_key`));
 if(!claimed.length)return;
 await tx.execute(sql`INSERT INTO notifications(user_id,type,title,message,action_url,metadata)
  VALUES(${userId},'bounty_review',${title},${message},${`/bounties?campaign=${campaignId}`},${JSON.stringify({campaignId,rewardEvent:eventKey})}::json)`);
}
