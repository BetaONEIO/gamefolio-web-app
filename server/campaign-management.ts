import {resolveCampaignCompletionXp} from './campaign-completion-xp';
import {getBountyRewardConfig} from '@shared/bounty-rewards';
import {computeCampaignTotalXP,type XPTier} from './bounty-xp-service';
import {campaignCreatorProgress} from '@shared/campaign-creator-progress';
import {COMPLETE_PARTICIPANTS,RELEASED_PARTICIPANTS} from '@shared/campaign-management';
import {ensureDeveloperNotifications,syncDeveloperNotifications,deliverCampaignEmails} from './campaign-developer-notifications';
import { ensureSeasonPool, creditCompletedCampaign } from './campaign-season-pool';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { campaignHasActivity, campaignMetrics, campaignObjectiveDefinitions, nextCampaignStatus } from '@shared/campaign-management';
import { ensureCampaignPaymentTable } from './campaign-payment';
const rows=(result:any):any[]=>result.rows??result;
let ready:Promise<unknown>|null=null;
export async function ensureCampaignManagement() {
  await ensureCampaignPaymentTable();
  if (!ready) ready=(async()=>{
    await ensureSeasonPool(db);
    await ensureDeveloperNotifications();
    await db.execute(sql`ALTER TABLE campaign_participants ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS campaign_submission_problems (
      id SERIAL PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaign_instances(id),
      creator_id INTEGER NOT NULL REFERENCES users(id), reporter_id INTEGER NOT NULL REFERENCES users(id),
      reason TEXT NOT NULL, notes TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP`);
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP`);
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS cancellation_reason TEXT`);
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS applications_paused BOOLEAN NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS confirmed_terms JSONB`);
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS management_data JSONB NOT NULL DEFAULT '{}'::jsonb`);
    await db.execute(sql`ALTER TABLE campaign_instances ADD COLUMN IF NOT EXISTS draft_setup JSONB`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS campaign_creator_thanks (
      id SERIAL PRIMARY KEY, campaign_id INTEGER NOT NULL REFERENCES campaign_instances(id),
      creator_id INTEGER NOT NULL REFERENCES users(id), developer_id INTEGER NOT NULL REFERENCES users(id),
      message VARCHAR(300) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(campaign_id,creator_id,developer_id), CHECK(creator_id<>developer_id))`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS campaign_management_events (
      id SERIAL PRIMARY KEY, instance_id INTEGER NOT NULL REFERENCES campaign_instances(id), event_type TEXT NOT NULL,
      actor_user_id INTEGER, detail TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW())`);
    await db.execute(sql`ALTER TABLE campaign_management_events ADD COLUMN IF NOT EXISTS metadata JSONB`);
  })().catch(e=>{ready=null;throw e;});
  await ready;
}
export async function campaignEvent(tx:any,id:number,type:string,actor:number|null,detail:string|null=null) {
  await tx.execute(sql`INSERT INTO campaign_management_events (instance_id,event_type,actor_user_id,detail) VALUES (${id},${type},${actor},${detail})`);
}
export async function campaignRecords(tx:any,id:number) {
  const [campaign]=rows(await tx.execute(sql`SELECT ci.*, t.name AS template_name, t.slug AS template_slug,t.bounty_xp_reward AS template_xp_reward,t.xp_tier AS template_xp_tier,
    cp.status AS payment_status, cp.amount_paid, cp.transaction_id AS payment_reference, cp.last_error AS payment_error, igp.id AS profile_game_id,igp.available_regions AS profile_regions,igp.platforms AS profile_platforms,
    COALESCE(ci.game_artwork_url, igp.capsule_image_url, igp.header_image_url, ci.artwork_url) AS hero_artwork_url
    FROM campaign_instances ci JOIN campaign_templates t ON t.id=ci.template_id
    LEFT JOIN campaign_payments cp ON cp.campaign_id=ci.id
    LEFT JOIN LATERAL (SELECT id, capsule_image_url, header_image_url,available_regions,platforms FROM indie_game_profiles WHERE user_id=ci.developer_user_id AND catalog_game_id=ci.game_id ORDER BY is_primary DESC,id DESC LIMIT 1) igp ON true
    WHERE ci.id=${id}`));
  if(!campaign) return null;
  if(!campaign.confirmed_terms && ['scheduled','live','in_progress','under_review','completed','cancelled'].includes(campaign.status)) {
    const terms={...campaign,confirmed_at:campaign.approved_at??campaign.created_at};
    if(campaign.regions==null&&campaign.platforms==null){terms.regions=campaign.profile_regions;terms.platforms=campaign.profile_platforms;}
    delete terms.management_data; delete terms.confirmed_terms;
    await tx.execute(sql`UPDATE campaign_instances SET confirmed_terms=COALESCE(confirmed_terms,${JSON.stringify(terms)}::jsonb) WHERE id=${id}`);
    campaign.confirmed_terms=terms;
  }
  campaign.expected_completion_xp=resolveCampaignCompletionXp({instanceAmount:campaign.bounty_xp_reward,templateAmount:campaign.template_xp_reward,configuredAmount:getBountyRewardConfig(campaign.template_slug)?.totalReward,tierAmount:computeCampaignTotalXP((campaign.template_xp_tier??'standard') as XPTier),multiplier:campaign.xp_event_multiplier??1});
  const participants=rows(await tx.execute(sql`SELECT p.*,u.username,u.display_name,u.avatar_url FROM campaign_participants p JOIN users u ON u.id=p.user_id WHERE p.instance_id=${id} ORDER BY p.joined_at`));
  const submissions=rows(await tx.execute(sql`SELECT s.*,u.username,u.display_name, c.video_url AS video_url,
    COALESCE(c.thumbnail_url, sc.thumbnail_url,sc.image_url) AS thumbnail_url, sc.image_url,
    c.views AS views, c.duration AS duration, COALESCE(c.title,sc.title) AS media_title
    FROM campaign_bounty_submissions s JOIN users u ON u.id=s.participant_id
    LEFT JOIN clips c ON c.id=COALESCE(s.clip_id,s.reel_id) LEFT JOIN screenshots sc ON sc.id=s.screenshot_id
    WHERE s.instance_id=${id} ORDER BY s.submitted_at DESC`));
  const keys=rows(await tx.execute(sql`SELECT g.id,g.key_type,g.key_pool,CASE WHEN g.instance_id=${id} THEN g.status ELSE 'released' END AS status,
    CASE WHEN g.instance_id=${id} THEN g.assigned_user_id END AS assigned_user_id,
    CASE WHEN g.instance_id=${id} THEN g.assigned_participant_id END AS assigned_participant_id,
    CASE WHEN g.instance_id=${id} THEN g.assigned_at END AS assigned_at,
    CASE WHEN g.instance_id=${id} THEN g.revealed_at END AS revealed_at,
    CASE WHEN g.instance_id=${id} THEN g.rewarded_at END AS rewarded_at,
    CASE WHEN g.instance_id=${id} THEN g.removed_at END AS removed_at
    FROM game_keys g WHERE g.instance_id=${id} OR EXISTS (SELECT 1 FROM campaign_key_events e WHERE e.key_id=g.id AND e.instance_id=${id}) OR EXISTS (SELECT 1 FROM game_key_batches b WHERE b.id=g.batch_id AND b.instance_id=${id}) ORDER BY g.id`));
  const rewards=rows(await tx.execute(sql`SELECT id,participant_id,reward_type,amount,status,key_id,created_at,updated_at FROM campaign_reward_events WHERE instance_id=${id} ORDER BY created_at`));
  const template=rows(await tx.execute(sql`SELECT id,title,description,quantity,content_type,mandatory,completion_order FROM campaign_template_bounties WHERE template_id=${campaign.template_id} ORDER BY completion_order`));
  const objectives=campaignObjectiveDefinitions(template,campaign.objective_snapshot);
  const metrics=campaignMetrics(campaign,participants,submissions,keys,rewards,objectives);
  return {campaign,participants,submissions,keys,rewards,objectives,metrics};
}
export async function reconcileCampaign(tx:any,data:NonNullable<Awaited<ReturnType<typeof campaignRecords>>>) {
  const {campaign,participants,submissions,keys,rewards}=data;
  let next=nextCampaignStatus(campaign,participants,submissions,keys,rewards);
  if(next==='completed'&&participants.some(p=>!RELEASED_PARTICIPANTS.includes(p.status)&&(!COMPLETE_PARTICIPANTS.includes(p.status)||!campaignCreatorProgress(data,p).completed)))next='under_review';
  // Unpaid legacy review drafts retain their existing approval workflow.
  if (['scheduled','live','in_progress','under_review','completed','approved'].includes(campaign.status) && next!==campaign.status) {
    await tx.execute(sql`UPDATE campaign_instances SET status=${next}, lifecycle_state=${next==='live'?'accepting':next},reward_pool_completed_at=CASE WHEN ${next}='completed' THEN COALESCE(reward_pool_completed_at,NOW()) ELSE reward_pool_completed_at END,updated_at=NOW() WHERE id=${campaign.id}`);
    await campaignEvent(tx,campaign.id,`campaign_${next}`,null);
    campaign.status=next;
    if(next==='completed') { const [stamp]=rows(await tx.execute(sql`SELECT reward_pool_completed_at FROM campaign_instances WHERE id=${campaign.id}`)); campaign.reward_pool_completed_at=stamp.reward_pool_completed_at; }
  }
  await creditCompletedCampaign(tx,campaign);
  await syncDeveloperNotifications(tx,data);
  return data;
}
export async function processManagedCampaigns() {
  await ensureCampaignManagement();
  const ids=rows(await db.execute(sql`SELECT id FROM campaign_instances WHERE status IN ('scheduled','live','in_progress','under_review','completed') AND (status<>'completed' OR reward_pool_completed_at IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM campaign_season_contributions sc WHERE sc.campaign_id=campaign_instances.id) ORDER BY id`));
  for (const {id} of ids) await db.transaction(async tx=>{
    await tx.execute(sql`SELECT id FROM campaign_instances WHERE id=${id} FOR UPDATE`);
    const data=await campaignRecords(tx,id);if(data)await reconcileCampaign(tx,data);
  });
  await deliverCampaignEmails();
}
export async function notifyCampaignActivity(id:number){
 await ensureCampaignManagement();await db.transaction(async tx=>{await tx.execute(sql`SELECT id FROM campaign_instances WHERE id=${id} FOR UPDATE`);const data=await campaignRecords(tx,id);if(data)await syncDeveloperNotifications(tx,data);});
}
export function cancellationAllowed(data:NonNullable<Awaited<ReturnType<typeof campaignRecords>>>) {
  return ['scheduled','live'].includes(data.campaign.status) && !campaignHasActivity(data.participants,data.submissions,data.keys,data.rewards);
}
