import { sql } from 'drizzle-orm';
import { SEASON_DEFS } from '@shared/season-definitions';
import { campaignRewardAllocation, allocateContributionPool } from '@shared/campaign-reward-allocation';
const rows=(r:any):any[]=>r.rows??r;
export async function ensureSeasonPool(tx:any) {
  await tx.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS reward_pool_completed_at TIMESTAMPTZ`);
  await tx.execute(sql`CREATE TABLE IF NOT EXISTS campaign_season_contributions (
    campaign_id INTEGER PRIMARY KEY REFERENCES campaign_instances(id), season_number INTEGER NOT NULL,
    price_pence INTEGER NOT NULL CHECK(price_pence>=0), platform_pence INTEGER NOT NULL,
    pool_pence INTEGER NOT NULL, transaction_id TEXT NOT NULL UNIQUE, completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK(platform_pence+pool_pence=price_pence))`);
  await tx.execute(sql`CREATE TABLE IF NOT EXISTS campaign_season_scores (
    campaign_id INTEGER NOT NULL REFERENCES campaign_instances(id),creator_id INTEGER NOT NULL REFERENCES users(id),
    season_number INTEGER NOT NULL, approved_xp INTEGER NOT NULL CHECK(approved_xp>=0),
    PRIMARY KEY(campaign_id,creator_id))`);
  await tx.execute(sql`CREATE TABLE IF NOT EXISTS campaign_season_settlements (
    season_number INTEGER PRIMARY KEY, pool_pence INTEGER NOT NULL, total_xp BIGINT NOT NULL,
    allocations JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'calculated', locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
}
export async function creditCompletedCampaign(tx:any,campaign:any) {
  if(campaign.status!=='completed' || !campaign.reward_pool_completed_at)return;
  const [existing]=rows(await tx.execute(sql`SELECT campaign_id FROM campaign_season_contributions WHERE campaign_id=${campaign.id}`));
  if(existing)return;
  const [payment]=rows(await tx.execute(sql`SELECT * FROM campaign_payments WHERE campaign_id=${campaign.id} AND status='fulfilled' AND transaction_id IS NOT NULL FOR UPDATE`));
  if(!payment)return;
  const now=new Date(campaign.reward_pool_completed_at);
  const season=SEASON_DEFS.find(s=>(s.months as readonly string[]).includes(now.toISOString().slice(0,7)));
  if(!season)throw new Error('No configured reward season for campaign completion');
  await tx.execute(sql`SELECT pg_advisory_xact_lock(73080, ${season.num})`);
  const [locked]=rows(await tx.execute(sql`SELECT season_number FROM campaign_season_settlements WHERE season_number=${season.num}`));
  if(locked)throw new Error('Reward season is already locked');
  const split=campaignRewardAllocation(Number(payment.expected_pence));
  await tx.execute(sql`INSERT INTO campaign_season_contributions(campaign_id,season_number,price_pence,platform_pence,pool_pence,transaction_id)
    VALUES(${campaign.id},${season.num},${split.campaignPricePence},${split.platformPence},${split.creatorPoolPence},${payment.transaction_id}) ON CONFLICT DO NOTHING`);
  await tx.execute(sql`INSERT INTO campaign_season_scores(campaign_id,creator_id,season_number,approved_xp)
    SELECT ${campaign.id},p.user_id,${season.num},SUM(e.amount)::integer FROM campaign_reward_events e
    JOIN campaign_participants p ON p.id=e.participant_id AND p.instance_id=e.instance_id
    WHERE e.instance_id=${campaign.id} AND e.status='awarded' AND e.reward_type='completion' AND e.amount>0
    GROUP BY p.user_id ON CONFLICT DO NOTHING`);
  await tx.execute(sql`UPDATE campaign_instances SET reward_pool_contribution_pence=${split.creatorPoolPence} WHERE id=${campaign.id}`);
}
export async function seasonPoolSummary(tx:any,seasonNumber:number,creatorId:number) {
  const [totals]=rows(await tx.execute(sql`SELECT COALESCE(SUM(pool_pence),0)::bigint AS pool FROM campaign_season_contributions WHERE season_number=${seasonNumber}`));
  const scores=rows(await tx.execute(sql`SELECT creator_id, SUM(approved_xp)::bigint AS xp FROM campaign_season_scores WHERE season_number=${seasonNumber} GROUP BY creator_id`));
  const totalXp=scores.reduce((sum,c)=>sum+Number(c.xp),0), own=scores.find(c=>Number(c.creator_id)===creatorId);
  const [settlement]=rows(await tx.execute(sql`SELECT * FROM campaign_season_settlements WHERE season_number=${seasonNumber}`));
  const allocation=settlement?.allocations??allocateContributionPool(Number(totals.pool),scores.map(c=>({creatorId:Number(c.creator_id),approvedScore:Number(c.xp)})));
  return {seasonNumber,poolPence:Number(totals.pool),totalApprovedXp:totalXp,approvedXp:Number(own?.xp??0),share:totalXp?Number(own?.xp??0)/totalXp:0,
    estimatedPence:allocation.payouts.find((p:any)=>p.creatorId===creatorId)?.amountPence??0,status:settlement?.status??'accruing',allocation};
}
