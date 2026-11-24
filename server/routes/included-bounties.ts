import express from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { ensureCampaignManagement, campaignRecords } from '../campaign-management';
import { bountyRows as rows, ensureIncludedBounties, includedPlan, includedInventory, openDiscoveryInTransaction, changeDiscoveryPreference, changeDiscoveryAccess, syncIncludedBounties, setIncludedAvailability } from '../included-bounties';
import { contextualBoost } from '../../shared/bounty-discovery';
import { discoveryAnalytics, recordBountyFunnel } from '../bounty-funnel';
import { bountyKeyType, includedStatus } from '../../shared/included-bounty';
import { bountyGameAvailabilityIssue } from '@shared/bounty-game-availability';

export const includedBountiesRouter = express.Router();
includedBountiesRouter.use(async (req:any,res,next) => {
  if (!req.isAuthenticated?.() || !req.user) return res.status(401).json({error:'Sign in to manage your game’s bounties'});
  try { await ensureCampaignManagement(); await ensureIncludedBounties(); next(); } catch { res.status(503).json({error:'Bounties are temporarily unavailable. Please try again.'}); }
});
const fail = (res:any,error:any) => res.status(error.statusCode??400).json({error:error.message?.startsWith('Failed query:')?'Could not save your bounty. Please try again.':error.message??'Could not save your bounty'});

// Adopt a live historical included instance by reference, retaining every saved objective/reward.
async function adoptExisting(developerId:number,profileGameId?:number) {
  await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(48391,${developerId})`);
    const [existing] = rows(await tx.execute(sql`SELECT id FROM included_bounty_programmes WHERE developer_user_id=${developerId} AND ${profileGameId?sql`profile_game_id=${profileGameId}`:sql`true`}`));
    if (existing) return;
    const plan = await includedPlan(tx,developerId);
    if (!plan.period) return;
    const [campaign] = rows(await tx.execute(sql`SELECT ci.*,p.id AS profile_id FROM campaign_instances ci JOIN indie_game_profiles p ON p.catalog_game_id=ci.game_id AND p.user_id=ci.developer_user_id
      WHERE ci.developer_user_id=${developerId} AND ci.commercial_type IN ('starter','included') AND ci.status IN ('live','approved','in_progress','under_review','completed')
      AND ${profileGameId?sql`p.id=${profileGameId}`:sql`true`} AND COALESCE(ci.billing_period_start,ci.actual_start,ci.created_at)>=${plan.period.start.toISOString()} ORDER BY ci.id DESC LIMIT 1`));
    if (!campaign || !['full_game_upfront','private_playtest','free_to_play','public_demo'].includes(campaign.access_method)) return;
    const [programme] = rows(await tx.execute(sql`INSERT INTO included_bounty_programmes(developer_user_id,profile_game_id,game_id,access_method,next_outcome,is_open)
      VALUES(${developerId},${campaign.profile_id},${campaign.game_id},${campaign.access_method},${campaign.stream_config?'stream':'content'},${!campaign.applications_paused}) RETURNING id`));
    await tx.execute(sql`INSERT INTO campaign_starter_allowances(developer_user_id,period_start,period_end,instance_id) VALUES(${developerId},${plan.period.start.toISOString()},${plan.period.end.toISOString()},${campaign.id}) ON CONFLICT DO NOTHING`);
    await tx.execute(sql`INSERT INTO included_bounty_months(programme_id,period_start,period_end,outcome,instance_id,legacy) VALUES(${programme.id},${plan.period.start.toISOString()},${plan.period.end.toISOString()},${campaign.stream_config?'stream':'content'},${campaign.id},true)`);
  });
}
includedBountiesRouter.get('/context',async(req:any,res) => {
  try {
    const developerId=Number(req.user.id);
    const profileGameId=Number(req.query.gameId)||undefined;
    await adoptExisting(developerId,profileGameId);
    await syncIncludedBounties(developerId);
    const plan=await includedPlan(db,developerId);
    const games=rows(await db.execute(sql`SELECT p.id,p.catalog_game_id,p.game_name,p.release_status,p.header_image_url,p.capsule_image_url,p.screenshot_urls,p.platforms,p.available_regions,p.access_method,p.is_free,p.release_date,p.short_description,g.image_url AS catalog_image_url FROM indie_game_profiles p LEFT JOIN games g ON g.id=p.catalog_game_id WHERE p.user_id=${developerId} ORDER BY p.is_primary DESC,p.id`));
    for (const game of games) game.inventory=await includedInventory(db,developerId,game.catalog_game_id??0);
    const [programme]=rows(await db.execute(sql`SELECT * FROM included_bounty_programmes WHERE developer_user_id=${developerId} AND ${profileGameId?sql`profile_game_id=${profileGameId}`:sql`true`} ORDER BY id LIMIT 1`));
    let activity:any=null,history:any[]=[],opportunities:any[]=[],feed:any[]=[],analytics:any={},boost:any=null,refunds:any[]=[];
    if(programme) {
      opportunities=rows(await db.execute(sql`SELECT o.*,ci.campaign_title,ci.status,ci.applications_paused,ci.creator_deadline_days,ci.bounty_xp_reward FROM included_bounty_opportunities o JOIN campaign_instances ci ON ci.id=o.instance_id WHERE o.programme_id=${programme.id} ORDER BY o.created_at,o.opportunity_type`));
      // Map all historical included instances without rewriting saved objectives or rewards.
      history=rows(await db.execute(sql`SELECT ci.id AS instance_id,ci.campaign_title,ci.status,ci.actual_start,ci.end_date FROM campaign_instances ci WHERE ci.developer_user_id=${developerId} AND ci.game_id=${programme.game_id} AND ci.commercial_type IN('starter','included') AND ci.status NOT IN('draft','changes_requested') AND NOT EXISTS(SELECT 1 FROM included_bounty_opportunities o WHERE o.instance_id=ci.id) ORDER BY ci.id DESC`));
      const ids=Array.from(new Set<number>([...opportunities,...history].map(o=>Number(o.instance_id))));
      const records=(await Promise.all(ids.map(id=>campaignRecords(db,id)))).filter((record):record is NonNullable<typeof record>=>!!record&&Number(record.campaign.developer_user_id)===developerId);
      if(records.length)activity={campaign:records[0].campaign,participants:records.flatMap(r=>r.participants),submissions:records.flatMap(r=>r.submissions.filter(s=>s.status!=='staged')),objectives:records.flatMap(r=>r.objectives),problems:records.flatMap(r=>r.problems),recordsByInstance:Object.fromEntries(records.map(r=>[r.campaign.id,{...r,submissions:r.submissions.filter(s=>s.status!=='staged'),keys:[],rewards:[]}]))};
      if(ids.length) {
        const scope=sql`IN(${sql.join(ids.map(id=>sql`${id}`),sql`,`)})`;
        feed=rows(await db.execute(sql`SELECT * FROM (
          SELECT 'join-'||p.id AS id,'creator_joined' AS type,p.joined_at AS at,u.username,NULL::text AS detail FROM campaign_participants p JOIN users u ON u.id=p.user_id WHERE p.instance_id ${scope}
          UNION ALL SELECT 'key-'||k.id,k.event_type,k.created_at,u.username,NULL::text FROM campaign_key_events k LEFT JOIN campaign_participants p ON p.id=k.participant_id LEFT JOIN users u ON u.id=p.user_id WHERE k.instance_id ${scope} AND k.event_type IN('reserved','revealed','issued')
          UNION ALL SELECT 'submission-'||s.id,'content_submitted',s.submitted_at,u.username,s.content_type FROM campaign_bounty_submissions s JOIN users u ON u.id=s.participant_id WHERE s.instance_id ${scope} AND s.status<>'staged'
          UNION ALL SELECT 'review-'||r.id,CASE WHEN r.verdict='approved' THEN 'submission_approved' ELSE r.verdict END,r.created_at,u.username,r.notes FROM campaign_bounty_submission_reviews r JOIN campaign_bounty_submissions s ON s.id=r.submission_id JOIN users u ON u.id=s.participant_id WHERE s.instance_id ${scope}
          UNION ALL SELECT 'reward-'||r.id,'reward_distributed',r.updated_at,u.username,r.amount::text||' XP' FROM campaign_reward_events r JOIN campaign_participants p ON p.id=r.participant_id JOIN users u ON u.id=p.user_id WHERE r.instance_id ${scope} AND r.status='awarded'
          UNION ALL SELECT 'event-'||e.id,e.event_type,e.created_at,u.username,e.detail FROM campaign_management_events e LEFT JOIN users u ON u.id=e.actor_user_id WHERE e.instance_id ${scope} AND e.event_type IN('submission_approved','changes_requested','stream_started','stream_completed','reward_awarded','submission_changes_requested')
        ) events ORDER BY at DESC NULLS LAST LIMIT 30`));
      }
      // Stream timestamps come from submitted verification evidence, never estimates.
      for(const submission of activity?.submissions??[])if(submission.content_type==='stream') {
        let evidence=submission.content_data;try{if(typeof evidence==='string')evidence=JSON.parse(evidence);}catch{continue;}
        for(const session of evidence?.sessions??[]) {
          if(session.startedAt&&Number.isFinite(Date.parse(session.startedAt)))feed.push({id:`stream-start-${submission.id}-${session.startedAt}`,type:'stream_started',at:session.startedAt,username:submission.username});
          if(evidence.verificationStatus==='verified'&&session.endedAt&&Number.isFinite(Date.parse(session.endedAt)))feed.push({id:`stream-end-${submission.id}-${session.endedAt}`,type:'stream_completed',at:session.endedAt,username:submission.username});
        }
      }
      feed=feed.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,30);
      analytics=await discoveryAnalytics(db,programme.id,ids);
      refunds=rows(await db.execute(sql`SELECT r.campaign_id,r.amount_pence,r.currency,r.status,ci.campaign_title FROM bounty_boost_refunds r JOIN campaign_instances ci ON ci.id=r.campaign_id WHERE ci.developer_user_id=${developerId} AND ci.game_id=${programme.game_id} ORDER BY r.created_at DESC LIMIT 10`));
      const game=games.find(game=>Number(game.id)===Number(programme.profile_game_id));
      const type=bountyKeyType(programme.access_method);
      programme.inventory=game?.inventory??await includedInventory(db,developerId,programme.game_id);
      programme.status=programme.opted_out_at?'Opted out':includedStatus(programme.is_open,plan.eligible,type,type?Number(programme.inventory[type]?.available??0):0,false);
      if (programme.is_open && programme.model_version === 'discovery-v2' && bountyGameAvailabilityIssue(game?.platforms, game?.available_regions)) {
        programme.status = 'Game Profile incomplete';
      }
      const submissions=(activity?.submissions??[]).filter((s:any)=>!(activity?.submissions??[]).some((n:any)=>Number(n.supersedes_submission_id)===Number(s.id)));
      const participants=(activity?.participants??[]).map((p:any)=>({...p,has_submission:submissions.some((s:any)=>Number(s.instance_id)===Number(p.instance_id)&&Number(s.participant_id)===Number(p.user_id)&&s.status!=='staged')}));
      boost=contextualBoost({approved:submissions.filter((s:any)=>s.status==='approved'),participants,listingOpens:Number(analytics.listing_open??0),releaseDate:game?.release_date});
    }
    const [seen]=rows(await db.execute(sql`SELECT 1 FROM included_bounty_introductions WHERE user_id=${developerId}`));
    res.json({entitlement:{eligible:plan.eligible,periodStart:plan.period?.start.toISOString()??null,periodEnd:plan.period?.end.toISOString()??null},games,programme:programme??null,activity,history,opportunities,feed,analytics,boost,refunds,explained:!!seen});
  } catch(error) { console.error('Included bounty context failed',error);res.status(503).json({error:'Could not load bounties. Please try again.'}); }
});
includedBountiesRouter.post('/introduction',async(req:any,res) => {
  try { await db.execute(sql`INSERT INTO included_bounty_introductions(user_id) VALUES(${req.user.id}) ON CONFLICT DO NOTHING`);res.json({seen:true}); } catch {res.status(503).json({error:'Could not save your introduction preference'});}
});
includedBountiesRouter.post('/activate',async(req:any,res) => {
  try {
    if(!Number.isSafeInteger(req.body.profileGameId)||req.body.profileGameId<1||!['both','content','stream'].includes(req.body.preference??'both')||!['private_playtest','full_game_upfront','free_to_play'].includes(req.body.access)) return res.status(400).json({error:'Choose a game and game access'});
    const result=await db.transaction(tx=>openDiscoveryInTransaction(tx,Number(req.user.id),{...req.body,preference:req.body.preference??'both'}));
    res.status(result.repeated?200:201).json({programmeId:result.programme.id,});
  } catch(error) { fail(res,error); }
});
includedBountiesRouter.patch('/availability',async(req:any,res) => {
  try {
    if(typeof req.body.open!=='boolean'||req.body.optOut!=null&&typeof req.body.optOut!=='boolean'||req.body.optOut===true&&req.body.open) return res.status(400).json({error:'Choose whether bounties are open'});
    await db.transaction(tx => setIncludedAvailability(tx,Number(req.user.id),req.body.open,req.body.optOut===true,Number(req.body.profileGameId)||undefined));
    await syncIncludedBounties(req.user.id);
    res.json({success:true});
  } catch(error) { fail(res,error); }
});
includedBountiesRouter.patch('/access',async(req:any,res)=>{
  try { await db.transaction(tx=>changeDiscoveryAccess(tx,Number(req.user.id),req.body.profileGameId,req.body.access));res.json({success:true}); } catch(error) {fail(res,error);}
});
includedBountiesRouter.patch('/preference',async(req:any,res)=>{
  try { await db.transaction(tx=>changeDiscoveryPreference(tx,Number(req.user.id),req.body.preference,Number(req.body.profileGameId)||undefined));res.json({success:true}); } catch(error) {fail(res,error);}
});
includedBountiesRouter.post('/boost-event',async(req:any,res)=>{
  try {
    if(!['boost_prompt_shown','boost_prompt_clicked'].includes(req.body.type)||!['first-approved','expired-claim','release','strong-interest','successful-clip','successful-reel','successful-stream'].includes(req.body.prompt))return res.status(400).json({error:'Invalid boost event'});
    const [programme]=rows(await db.execute(sql`SELECT id FROM included_bounty_programmes WHERE developer_user_id=${req.user.id} AND id=${Number(req.body.programmeId)||0}`));
    if(!programme)return res.status(404).json({error:'Bounty not found'});
    await recordBountyFunnel(db,{programmeId:programme.id,type:req.body.type,actor:req.user.id,key:`${programme.id}:${req.body.type}:${req.body.prompt}:${new Date().toISOString().slice(0,10)}`});res.json({success:true});
  } catch(error) {fail(res,error);}
});
