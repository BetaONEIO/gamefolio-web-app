import {libraryPublicationAllowed} from '@shared/game-content-library';
import {gameLibrary,ensureGameLibrary} from '../game-content-library';
import {getCampaignDownload,prepareCampaignDownload} from '../campaign-download-jobs';
import {createAndPush} from '../notification-service';
import {canEndCampaignEarly} from '@shared/campaign-early-completion';
import {CAMPAIGN_EMAIL_CATEGORIES} from '../campaign-developer-notifications';
import { campaignCreatorProgress } from '@shared/campaign-creator-progress';
import { validateCampaignThanks, canEditCampaignThanks } from '@shared/campaign-thanks';
import { isEligibleCampaignInvitation } from '@shared/campaign-invite-eligibility';
import { getConnectedStreamChannels } from '../stream-livestream-validation';
import { getUncachableStripeClient } from '../stripeClient';
import { isVisibleConfirmedCampaign, canDiscardCampaignSetup } from '@shared/campaign-presentation';
import { seasonPoolSummary } from '../campaign-season-pool';
import { SEASON_DEFS } from '@shared/season-definitions';
import express from 'express';
import { decryptCampaignKey } from '../campaign-key-security';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { ensureCampaignManagement, campaignRecords, reconcileCampaign, campaignEvent, cancellationAllowed } from '../campaign-management';
import { campaignMetrics, managedCampaignStatus } from '@shared/campaign-management';
import { CAMPAIGN_COMMERCIAL_MODEL } from '@shared/campaign-commercial-model';
import { validateWorkspaceChanges } from '@shared/campaign-workspace';
const router=express.Router();
const rows=(result:any):any[]=>result.rows??result;
router.use((req,res,next)=>{if(!req.isAuthenticated?.()||!req.user)return res.status(401).json({error:'Unauthorized'});next();});
router.get('/notification-settings',async(req,res)=>{try{await ensureCampaignManagement();const [row]=rows(await db.execute(sql`SELECT preferences FROM campaign_email_preferences WHERE user_id=${req.user!.id}`));res.json(Object.fromEntries(CAMPAIGN_EMAIL_CATEGORIES.map(key=>[key,row?.preferences?.[key]===true])));}catch(e){fail(res,e);}});
router.patch('/notification-settings',async(req,res)=>{try{await ensureCampaignManagement();if(!req.body||typeof req.body!=='object'||Object.keys(req.body).some(key=>!CAMPAIGN_EMAIL_CATEGORIES.includes(key as any)||typeof req.body[key]!=='boolean'))return res.status(400).json({error:'Invalid email preferences'});const preferences=Object.fromEntries(CAMPAIGN_EMAIL_CATEGORIES.map(key=>[key,req.body[key]===true]));await db.execute(sql`INSERT INTO campaign_email_preferences(user_id,preferences) VALUES(${req.user!.id},${JSON.stringify(preferences)}::jsonb) ON CONFLICT(user_id) DO UPDATE SET preferences=EXCLUDED.preferences`);res.json(preferences);}catch(e){fail(res,e);}});
router.get('/notification-count',async(req,res)=>{try{const [row]=rows(await db.execute(sql`SELECT COUNT(*)::int AS count FROM notifications WHERE user_id=${req.user!.id} AND type='campaign_activity' AND is_read=false`));res.json(row);}catch(e){fail(res,e);}});
router.get('/season-rewards',async(req,res)=>{try{
  await ensureCampaignManagement();
  const month=new Date().toISOString().slice(0,7);
  const season=SEASON_DEFS.find(s=>(s.months as readonly string[]).includes(month));
  if(!season)return res.status(409).json({error:'Reward season is not configured'});
  const summary=await seasonPoolSummary(db,season.num,req.user!.id);
  const {allocation,...publicSummary}=summary;
  res.json({...publicSummary,name:season.name,dateRange:season.dateRange});
}catch(e){res.status(500).json({error:'Reward pool could not be loaded'});}});
router.post('/season-rewards/:season/settle',async(req,res)=>{try{
  const [account]=rows(await db.execute(sql`SELECT role FROM users WHERE id=${req.user!.id}`));
  if(account?.role!=='admin')return res.status(403).json({error:'Administrator access required'});
  await ensureCampaignManagement();
  const season=SEASON_DEFS.find(s=>s.num===Number(req.params.season));
  if(!season)return res.status(400).json({error:'Unknown season'});
  const [year,month]=season.months[season.months.length-1].split('-').map(Number);
  const reviewEnds=Date.UTC(year,month,8);
  if(Date.now()<reviewEnds)return res.status(409).json({error:'Season must end and its seven-day review window must finish first'});
  const result=await db.transaction(async tx=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(73080,${season.num})`);
    const [invalid]=rows(await tx.execute(sql`SELECT 1 FROM campaign_season_contributions c JOIN campaign_payments p ON p.campaign_id=c.campaign_id WHERE c.season_number=${season.num} AND p.status<>'fulfilled' LIMIT 1`));
    if(invalid)throw new Error('Payment adjustments require review before settlement');
    const summary=await seasonPoolSummary(tx,season.num,req.user!.id);
    await tx.execute(sql`INSERT INTO campaign_season_settlements(season_number,pool_pence,total_xp,allocations) VALUES(${season.num},${summary.poolPence},${summary.totalApprovedXp},${JSON.stringify(summary.allocation)}::jsonb) ON CONFLICT DO NOTHING`);
    return {seasonNumber:season.num,status:'calculated',...summary.allocation};
  });res.json(result);
}catch(e){res.status(409).json({error:e instanceof Error?e.message:'Settlement failed'});}});
function idFrom(req:any){const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)throw Object.assign(new Error('A valid campaign ID is required'),{status:400});return id;}
async function owned(tx:any,id:number,userId:number){const [c]=rows(await tx.execute(sql`SELECT * FROM campaign_instances WHERE id=${id} AND developer_user_id=${userId} FOR UPDATE`));if(!c)throw Object.assign(new Error('Campaign not found'),{status:404});return c;}
const fail=(res:any,e:any)=>res.status(e.status??500).json({error:e.status?e.message:'Campaign request could not be completed'});
async function detail(id:number,user:number){return db.transaction(async tx=>{await owned(tx,id,user);const data=await campaignRecords(tx,id);return reconcileCampaign(tx,data!);});}
router.post('/instances/:id/downloads',async(req,res)=>{try{await ensureCampaignManagement();const id=idFrom(req);const ids=Array.isArray(req.body.submissionIds)?req.body.submissionIds.map(Number):[];if(!ids.length||ids.length>500||ids.some((n:number)=>!Number.isSafeInteger(n)||n<1)||new Set(ids).size!==ids.length)return res.status(400).json({error:'Select up to 500 approved submissions'});const data=await detail(id,req.user!.id);const job=prepareCampaignDownload(req.user!.id,data,ids);res.status(202).json({id:job.id,status:job.status,expiresAt:job.expiresAt});}catch(e){fail(res,e);}});
router.get('/downloads/:jobId',async(req,res)=>{const job=getCampaignDownload(req.params.jobId,req.user!.id);if(!job)return res.status(404).json({error:'Download expired or unavailable'});res.json({id:job.id,status:job.status,error:job.error,expiresAt:job.expiresAt,downloadUrl:job.status==='ready'?`/api/campaigns/downloads/${job.id}/file`:null});});
router.get('/downloads/:jobId/file',async(req,res)=>{const job=getCampaignDownload(req.params.jobId,req.user!.id);if(!job||job.status!=='ready'||!job.path)return res.status(404).json({error:'Download expired or unavailable'});try{if(job.gameProfileId){const [profile]=rows(await db.execute(sql`SELECT id FROM indie_game_profiles WHERE id=${job.gameProfileId} AND user_id=${req.user!.id}`));if(!profile)return res.sendStatus(404);}else await db.transaction(async tx=>owned(tx,job.campaignId,req.user!.id));res.setHeader('Cache-Control','private, no-store');res.download(job.path,`campaign-${job.campaignId}-approved-content.zip`);}catch(e){fail(res,e);}});
router.get('/game-content',async(req,res)=>{try{const id=req.query.gameId?Number(req.query.gameId):undefined;if(id!==undefined&&(!Number.isSafeInteger(id)||id<1))return res.sendStatus(400);res.json(await gameLibrary(req.user!.id,id));}catch(e){fail(res,e);}});
router.post('/game-content/downloads',async(req,res)=>{try{const {gameId,keys}=req.body;if(!Number.isSafeInteger(gameId)||gameId<1||!Array.isArray(keys)||!keys.length||keys.length>500||new Set(keys).size!==keys.length)return res.sendStatus(400);const library=await gameLibrary(req.user!.id,gameId);const selected=keys.map((key:string)=>library.items.find((i:any)=>i.key===key));if(selected.some((i:any)=>!i))return res.sendStatus(404);const submissions=selected.map((i:any,index:number)=>({...i,original_submission_id:i.source==='campaign'?i.id:null,id:index+1,participant_id:i.creator_id,campaign_title:i.campaign_title??library.profile.game_name,status:'approved',supersedes_submission_id:null}));const job=prepareCampaignDownload(req.user!.id,{campaign:{id:0,campaign_title:library.profile.game_name},participants:[],submissions},submissions.map((s:any)=>s.id),library.profile.id);res.status(202).json({id:job.id,status:job.status,expiresAt:job.expiresAt});}catch(e){fail(res,e);}});
router.patch('/game-content',async(req,res)=>{try{
 const {gameId,keys,action,title,description,collection}=req.body;if(!Number.isSafeInteger(gameId)||gameId<1)return res.sendStatus(400);const library=await gameLibrary(req.user!.id,Number(gameId));if(!Array.isArray(keys)||!keys.length||keys.length>500||new Set(keys).size!==keys.length)return res.sendStatus(400);
 const selected=keys.map((key:string)=>library.items.find((item:any)=>item.key===key));if(selected.some((i:any)=>!i))return res.status(404).json({error:'Content not found in this game library'});
 if(!['publish','unpublish','feature','unfeature','collection','edit','delete'].includes(action))return res.sendStatus(400);
 if(['publish','feature'].includes(action)&&selected.some((i:any)=>!libraryPublicationAllowed(i)))return res.status(409).json({error:'Recorded creator usage-rights acceptance is required before public publication or featuring.'});
 if(['edit','delete'].includes(action)&&selected.some((i:any)=>i.source!=='studio'))return res.status(403).json({error:'Creator assets must remain linked to their campaign. Report an issue rather than editing or deleting their work.'});
 if(action==='edit'&&(selected.length!==1||typeof title!=='string'||!title.trim()||title.length>200||typeof description!=='string'||description.length>4000))return res.sendStatus(400);
 if(action==='collection'&&(typeof collection!=='string'||!collection.trim()||collection.length>80))return res.sendStatus(400);
 await db.transaction(async tx=>{const [profile]=rows(await tx.execute(sql`SELECT id FROM indie_game_profiles WHERE id=${library.profile.id} AND user_id=${req.user!.id} FOR UPDATE`));if(!profile)throw Object.assign(new Error('Game access changed'),{status:403});for(const item of selected){if(item.source==='campaign'){await tx.execute(sql`SELECT id FROM campaign_instances WHERE id=${item.campaign_id} FOR UPDATE`);const [current]=rows(await tx.execute(sql`SELECT s.id FROM campaign_bounty_submissions s WHERE s.id=${item.id} AND s.status='approved' AND NOT EXISTS(SELECT 1 FROM campaign_bounty_submissions n WHERE n.supersedes_submission_id=s.id) AND NOT EXISTS(SELECT 1 FROM campaign_submission_problems r WHERE r.campaign_id=s.instance_id AND r.creator_id=s.participant_id AND r.status='pending')`));if(!current)throw Object.assign(new Error('Contribution is no longer eligible for library actions'),{status:409});}await tx.execute(sql`INSERT INTO game_content_library_settings(game_profile_id,item_key,publication_status,featured,updated_by) VALUES(${library.profile.id},${item.key},${item.publication_status},${item.featured},${req.user!.id}) ON CONFLICT DO NOTHING`);
 if(action==='edit'){if(item.key.startsWith('clip-'))await tx.execute(sql`UPDATE clips SET title=${title.trim()},description=${description} WHERE id=${item.asset_id} AND user_id=${req.user!.id}`);else await tx.execute(sql`UPDATE screenshots SET title=${title.trim()},description=${description} WHERE id=${item.asset_id} AND user_id=${req.user!.id}`);}
 else {const changes=action==='publish'?sql`publication_status='published'`:action==='unpublish'?sql`publication_status='private',featured=false`:action==='feature'?sql`featured=true,publication_status='published'`:action==='unfeature'?sql`featured=false`:action==='delete'?sql`deleted_at=NOW(),publication_status='private',featured=false`:sql`collection=${collection.trim()}`;await tx.execute(sql`UPDATE game_content_library_settings SET ${changes},updated_by=${req.user!.id},updated_at=NOW() WHERE game_profile_id=${library.profile.id} AND item_key=${item.key}`);}}});res.json({updated:selected.length});
}catch(e){fail(res,e);}});
router.get('/content-library',async(req,res)=>{try{
 await ensureCampaignManagement();const profileId=req.query.gameId?Number(req.query.gameId):null;
 const [profile]=rows(await db.execute(sql`SELECT catalog_game_id FROM indie_game_profiles WHERE user_id=${req.user!.id} ${profileId?sql`AND id=${profileId}`:sql``} ORDER BY is_primary DESC,id DESC LIMIT 1`));
 if(!profile)return res.status(404).json({error:'Game not found'});
 const campaigns=rows(await db.execute(sql`SELECT id FROM campaign_instances WHERE developer_user_id=${req.user!.id} AND game_id=${profile.catalog_game_id} ORDER BY updated_at DESC LIMIT 100`));
 const contributions=[];
 for(const c of campaigns){const data=await campaignRecords(db,c.id);if(!data)continue;const approved=data.submissions.filter((s:any)=>s.status==='approved'&&!data.submissions.some((n:any)=>Number(n.supersedes_submission_id)===Number(s.id)));if(approved.length)contributions.push({...data,submissions:approved,keys:[],rewards:[],timeline:[]});}
 res.json({contributions});
}catch(e){fail(res,e);}});
router.get('/moderation/problems',async(req,res)=>{try{if(!['admin','moderator'].includes(req.user!.role??''))return res.sendStatus(403);await ensureCampaignManagement();res.json(rows(await db.execute(sql`SELECT p.*,u.username,ci.campaign_title FROM campaign_submission_problems p JOIN users u ON u.id=p.creator_id JOIN campaign_instances ci ON ci.id=p.campaign_id ORDER BY p.created_at DESC LIMIT 200`)));}catch(e){fail(res,e);}});
router.patch('/moderation/problems/:problemId',async(req,res)=>{try{if(!['admin','moderator'].includes(req.user!.role??''))return res.sendStatus(403);await ensureCampaignManagement();const status=req.body.status,id=Number(req.params.problemId);if(!Number.isSafeInteger(id)||!['reviewed','dismissed'].includes(status))return res.sendStatus(400);const [report]=rows(await db.execute(sql`UPDATE campaign_submission_problems SET status=${status} WHERE id=${id} RETURNING *`));if(!report)return res.sendStatus(404);await campaignEvent(db,report.campaign_id,`problem_${status}`,req.user!.id,`Report #${id} marked ${status}.`);res.json({status});}catch(e){fail(res,e);}});
router.post('/instances/:id/problems',async(req,res)=>{try{
 await ensureCampaignManagement();const id=idFrom(req),creatorId=Number(req.body.creatorId),reason=String(req.body.reason??''),notes=String(req.body.notes??'').trim();
 if(!['Fraudulent content','Wrong game','Inaccessible or misleading link','Falsified stream evidence','Copyright concern','Abusive content','Campaign-rule violation'].includes(reason)||!notes||notes.length>2000||!Number.isSafeInteger(creatorId))return res.status(400).json({error:'Choose a reason and provide supporting notes'});
 const result=await db.transaction(async tx=>{await owned(tx,id,req.user!.id);const [participant]=rows(await tx.execute(sql`SELECT id FROM campaign_participants WHERE instance_id=${id} AND user_id=${creatorId}`));if(!participant)throw Object.assign(new Error('Creator not found'),{status:404});
 const [report]=rows(await tx.execute(sql`INSERT INTO campaign_submission_problems(campaign_id,creator_id,reporter_id,reason,notes) VALUES(${id},${creatorId},${req.user!.id},${reason},${notes}) RETURNING id`));
 await campaignEvent(tx,id,'problem_reported',req.user!.id,`Report #${report.id}: ${reason}. Awaiting moderation review.`);
 return report;});
 const moderators=rows(await db.execute(sql`SELECT id FROM users WHERE role IN ('admin','moderator')`));
 for(const moderator of moderators)void createAndPush({userId:moderator.id,type:'campaign_activity',title:'Campaign problem reported',message:`Report #${result.id}: ${reason}. Supporting notes are available in the moderation queue.`,actionUrl:'/admin',metadata:{campaignId:id,problemId:result.id}}).catch(()=>{});
 res.status(201).json({id:result.id,status:'pending'});
}catch(e){fail(res,e);}});
router.post('/draft-workspace',async(req,res)=>{try{
  await ensureCampaignManagement();const {id,templateSlug,settings,budgetPence,setupStep}=req.body;
  if(!settings||typeof settings!=='object'||Array.isArray(settings)||JSON.stringify(settings).length>24000)throw Object.assign(new Error('Invalid draft setup'),{status:400});
  const allowed=['campaignTitle','description','gameName','gameId','gameImageUrl','startType','scheduledDate','scheduledTime','timeZone','regions','platforms','customDuration','customCapacity','streamConfig','applicationPeriod','accessMethod','completionFullGameKey','customObjectives','maxPlaces','manualApproval','customAccessInstructions','customAccessNeedsKey'];
  if(Object.keys(settings).some(key=>!allowed.includes(key)))throw Object.assign(new Error('Unsupported draft field'),{status:400});
  if(typeof settings.campaignTitle!=='string'||settings.campaignTitle.length>120||typeof settings.description!=='string'||settings.description.length>10000)throw Object.assign(new Error('Invalid draft title or brief'),{status:400});
  const result=await db.transaction(async tx=>{
    const [account]=rows(await tx.execute(sql`SELECT role,partner_type,is_indie_dev_subscriber FROM users WHERE id=${req.user!.id}`));
    if(!['developer','indie_developer','admin','moderator'].includes(account?.role)&&account?.partner_type!=='indie'&&!account?.is_indie_dev_subscriber)throw Object.assign(new Error('A developer account is required'),{status:403});
    const [template]=rows(await tx.execute(sql`SELECT id,bounty_xp_reward,completion_bonus_xp,reward_config FROM campaign_templates WHERE slug=${String(templateSlug)} AND status<>'archived'`));
    if(!template)throw Object.assign(new Error('Campaign type not found'),{status:400});
    if(settings.gameId!=null){const [game]=rows(await tx.execute(sql`SELECT id FROM indie_game_profiles WHERE user_id=${req.user!.id} AND catalog_game_id=${Number(settings.gameId)}`));if(!game)throw Object.assign(new Error('Choose a game you manage'),{status:403});}
    const starter=templateSlug===CAMPAIGN_COMMERCIAL_MODEL.starter.templateSlug;
    const minimum=CAMPAIGN_COMMERCIAL_MODEL.presets.find(p=>p.slug===templateSlug)?.priceFromPence??CAMPAIGN_COMMERCIAL_MODEL.paidMinimumPence;
    const budget=starter?null:Math.max(minimum,Number.isSafeInteger(budgetPence)?budgetPence:minimum);
    const setup=JSON.stringify({settings,templateSlug,budgetPence:budget,setupStep:Number.isInteger(setupStep)?Math.min(4,Math.max(1,setupStep)):2});
    if(id){
      if(!Number.isSafeInteger(id)||id<1)throw Object.assign(new Error('Invalid campaign ID'),{status:400});
      const c=await owned(tx,id,req.user!.id);
      const [payment]=rows(await tx.execute(sql`SELECT status FROM campaign_payments WHERE campaign_id=${id}`));
      if(c.status!=='draft'||payment&&!['payment_failed','cancelled'].includes(payment.status))throw Object.assign(new Error('Confirmed or processing campaigns cannot be saved as drafts'),{status:409});
      await tx.execute(sql`UPDATE campaign_instances SET template_id=${template.id},draft_setup=${setup}::jsonb,campaign_title=${settings.campaignTitle},description=${settings.description},game_id=${settings.gameId??null},game_name=${settings.gameName??''},commercial_type=${starter?'starter':'paid'},budget_pence=${budget},bounty_xp_reward=${template.bounty_xp_reward},completion_bonus_xp=${template.completion_bonus_xp},reward_config=${JSON.stringify(template.reward_config)}::jsonb,updated_at=NOW() WHERE id=${id}`);
      return {id};
    }
    const [created]=rows(await tx.execute(sql`INSERT INTO campaign_instances(template_id,developer_user_id,status,lifecycle_state,campaign_title,description,game_id,game_name,draft_setup,commercial_type,budget_pence,bounty_xp_reward,completion_bonus_xp,reward_config) VALUES(${template.id},${req.user!.id},'draft','draft',${settings.campaignTitle},${settings.description},${settings.gameId??null},${settings.gameName??''},${setup}::jsonb,${starter?'starter':'paid'},${budget},${template.bounty_xp_reward},${template.completion_bonus_xp},${JSON.stringify(template.reward_config)}::jsonb) RETURNING id`));
    return {id:created.id};
  });res.json({...result,saved:true});
}catch(e){fail(res,e);}});
router.get('/setup-sessions',async(req,res)=>{try{
  await ensureCampaignManagement();
  const sessions=rows(await db.execute(sql`SELECT ci.id,ci.campaign_title,ci.game_id,ci.updated_at,igp.id AS profile_game_id,(cp.session_id IS NOT NULL AND cp.status='awaiting_payment') AS checkout_pending FROM campaign_instances ci LEFT JOIN campaign_payments cp ON cp.campaign_id=ci.id LEFT JOIN LATERAL (SELECT id FROM indie_game_profiles WHERE user_id=ci.developer_user_id AND catalog_game_id=ci.game_id LIMIT 1) igp ON true WHERE ci.developer_user_id=${req.user!.id} AND ci.status='draft' AND ci.archived_at IS NULL AND cp.transaction_id IS NULL AND (cp.status IS NULL OR cp.status IN ('awaiting_payment','payment_failed','cancelled')) ORDER BY ci.updated_at DESC`));
  res.json(sessions);
}catch(e){fail(res,e);}});
router.delete('/setup-sessions/:id',async(req,res)=>{try{
  await ensureCampaignManagement();const id=idFrom(req);
  await db.transaction(async tx=>{
    const c=await owned(tx,id,req.user!.id);
    const [payment]=rows(await tx.execute(sql`SELECT * FROM campaign_payments WHERE campaign_id=${id} FOR UPDATE`));
    const [activity]=rows(await tx.execute(sql`SELECT id FROM campaign_participants WHERE instance_id=${id} LIMIT 1`));
    if(!canDiscardCampaignSetup(c,payment,!!activity))throw Object.assign(new Error('Only an unpaid campaign setup can be discarded'),{status:409});
    if(payment?.session_id){
      const stripe=await getUncachableStripeClient();const checkout=await stripe.checkout.sessions.retrieve(payment.session_id);
      if(checkout.payment_status==='paid'||checkout.status==='complete')throw Object.assign(new Error('Payment is confirmed or processing; this setup cannot be discarded'),{status:409});
      if(checkout.status==='open')await stripe.checkout.sessions.expire(checkout.id);
      await tx.execute(sql`UPDATE campaign_payments SET status='cancelled',updated_at=NOW() WHERE campaign_id=${id} AND transaction_id IS NULL`);
    }
    // Retain the internal ID and audit references; permanently remove saved setup information.
    await tx.execute(sql`UPDATE campaign_instances SET draft_setup=NULL,objective_snapshot=NULL,stream_config=NULL,confirmed_terms=NULL,management_data='{}'::jsonb,campaign_title='Discarded setup',description='',game_name='',game_id=NULL,game_artwork_url=NULL,artwork_url=NULL,regions=NULL,platforms=NULL,budget_pence=NULL,max_places=0,access_instructions=NULL,scheduled_start=NULL,status='cancelled',lifecycle_state='cancelled',archived_at=NOW(),cancelled_at=NOW(),cancellation_reason='Setup discarded',updated_at=NOW() WHERE id=${id}`);
    await tx.execute(sql`UPDATE game_keys SET instance_id=NULL,status='available' WHERE instance_id=${id} AND assigned_user_id IS NULL AND assigned_participant_id IS NULL AND revealed_at IS NULL AND removed_at IS NULL`);
    await campaignEvent(tx,id,'setup_discarded',req.user!.id);
  });res.json({discarded:true});
}catch(e){fail(res,e);}});
router.get('/management',async(req,res)=>{try{
  await ensureCampaignManagement();
  const ids=rows(await db.execute(sql`SELECT id FROM campaign_instances WHERE developer_user_id=${req.user!.id} ORDER BY created_at DESC`));
  const list=[];
  for(const {id} of ids){const data=await detail(id,req.user!.id);list.push({...data.campaign, status:managedCampaignStatus(data.campaign), metrics:data.metrics, creator_previews:data.participants.filter((p:any)=>p.avatar_url).slice(0,3).map((p:any)=>({id:p.user_id,username:p.username,avatar_url:p.avatar_url})), content_previews:data.submissions.filter((s:any)=>s.status==='approved'&&!data.submissions.some((n:any)=>Number(n.supersedes_submission_id)===Number(s.id))&&(s.thumbnail_url||s.image_url||s.video_url)).slice(0,3).map((s:any)=>({id:s.id,thumbnail_url:s.thumbnail_url,image_url:s.image_url,video_url:s.video_url,content_type:s.content_type})), can_cancel:cancellationAllowed(data)});}
  res.json(list.filter(c=>isVisibleConfirmedCampaign(c,true)));
}catch(e){fail(res,e);}});
router.get('/instances/:id/dashboard',async(req,res)=>{try{
  await ensureCampaignManagement();const id=idFrom(req),data=await detail(id,req.user!.id);
  const management=rows(await db.execute(sql`SELECT e.event_type AS type,e.detail,e.created_at AS at,u.username AS actor,u.avatar_url AS avatar_url,e.metadata FROM campaign_management_events e LEFT JOIN users u ON u.id=e.actor_user_id WHERE e.instance_id=${id}`));
  const keyEvents=rows(await db.execute(sql`SELECT e.event_type AS type,e.created_at AS at,u.username AS actor FROM campaign_key_events e LEFT JOIN users u ON u.id=e.actor_user_id WHERE e.instance_id=${id}`));
  const reviews=rows(await db.execute(sql`SELECT r.verdict AS type,r.notes AS detail,r.created_at AS at,u.username AS actor,u.avatar_url,jsonb_build_object('actionUrl','/game-dashboard?tab=campaigns&campaignSub=my&viewCampaign='||s.instance_id||'&campaignTab='||CASE WHEN s.content_type IN ('feedback','review') THEN 'Reviews%20%26%20Feedback' ELSE 'Submissions' END||'&submission='||s.id) AS metadata FROM campaign_bounty_submission_reviews r JOIN campaign_bounty_submissions s ON s.id=r.submission_id LEFT JOIN users u ON u.id=s.participant_id WHERE s.instance_id=${id}`));
  const timeline=[{type:'Campaign created',at:data.campaign.created_at,actor:'Developer'},...management,...keyEvents,...reviews,
    ...data.participants.filter(p=>!management.some(e=>e.metadata?.participantId===p.id&&String(e.type).toLowerCase().includes('join'))).map(p=>({type:'Creator joined',at:p.joined_at,actor:p.username,avatar_url:p.avatar_url,metadata:{actionUrl:`/game-dashboard?tab=campaigns&viewCampaign=${id}&campaignTab=Creators&creator=${p.user_id}`}})),
    ...data.submissions.filter(s=>!management.some(e=>Number(e.metadata?.submissionId)===Number(s.id))).map(s=>({type:'Submission uploaded',at:s.submitted_at,actor:s.username,avatar_url:data.participants.find(p=>Number(p.user_id)===Number(s.participant_id))?.avatar_url,metadata:{actionUrl:`/game-dashboard?tab=campaigns&viewCampaign=${id}&campaignTab=${['feedback','review'].includes(s.content_type)?'Reviews%20%26%20Feedback':'Submissions'}&submission=${s.id}`}})),
    ...data.rewards.map(r=>({type:r.status==='awarded'?'Reward distributed':'Reward pending',at:r.updated_at,actor:'System',detail:`${r.amount??0} XP`}))];
  if(data.campaign.payment_reference)timeline.push({type:'Payment confirmed',at:data.campaign.approved_at??data.campaign.updated_at,actor:'System'});
  if(data.campaign.actual_start&&new Date(data.campaign.actual_start).getTime()<=Date.now())timeline.push({type:'Campaign launched',at:data.campaign.actual_start,actor:'System'});
  res.json({...data,campaign:{...data.campaign,status:managedCampaignStatus(data.campaign)},can_cancel:cancellationAllowed(data),can_end_early:canEndCampaignEarly(data),timeline:timeline.filter(e=>e.at).sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime())});
}catch(e){fail(res,e);}});
async function invitationCreator(tx:any,sourceId:number,creatorId:number){
 const [profile]=rows(await tx.execute(sql`SELECT u.id,u.status,u.role,u.partner_type,u.is_indie_dev_subscriber,u.username,u.steam_username,u.epic_username,u.xbox_username,u.playstation_username,u.nintendo_username,u.twitch_verified,u.twitch_user_id,u.twitch_channel_id,u.twitch_channel_name,u.kick_verified,u.kick_id,u.kick_channel_id,u.kick_channel_name,u.youtube_verified,u.youtube_channel_id,u.youtube_channel_name,u.rumble_verified,u.rumble_id,u.rumble_channel_name,u.stream_channel_name,u.stream_platform FROM users u JOIN campaign_participants p ON p.user_id=u.id WHERE p.instance_id=${sourceId} AND u.id=${creatorId}`));
 if(!profile)throw Object.assign(new Error('Creator is not a participant in this campaign'),{status:404});return profile;
}
router.get('/instances/:id/invite-options/:creatorId',async(req,res)=>{try{
 await ensureCampaignManagement();const sourceId=idFrom(req),creatorId=Number(req.params.creatorId);
 if(!Number.isSafeInteger(creatorId)||creatorId<1)throw Object.assign(new Error('Invalid creator'),{status:400});
 const options=await db.transaction(async tx=>{
  await owned(tx,sourceId,req.user!.id);const profile=await invitationCreator(tx,sourceId,creatorId),channels=getConnectedStreamChannels(profile).map(c=>c.platform);
  const ids=rows(await tx.execute(sql`SELECT id FROM campaign_instances WHERE developer_user_id=${req.user!.id} AND status IN ('live','in_progress') AND archived_at IS NULL AND id<>${sourceId}`));const results=[];
  for(const candidate of ids){const data=await campaignRecords(tx,candidate.id);if(data&&isEligibleCampaignInvitation(data,profile,channels))results.push({id:data.campaign.id,campaign_title:data.campaign.campaign_title,template_name:data.campaign.template_name,status:'In Progress'});}
  return results;
 });res.json(options);
}catch(e){fail(res,e);}});
router.get('/instances/:id/thanks/:creatorId',async(req,res)=>{try{
 await ensureCampaignManagement();const id=idFrom(req),creator=Number(req.params.creatorId);
 const result=await db.transaction(async tx=>{await owned(tx,id,req.user!.id);const [record]=rows(await tx.execute(sql`SELECT * FROM campaign_creator_thanks WHERE campaign_id=${id} AND creator_id=${creator} AND developer_id=${req.user!.id}`));return record?{...record,editable:canEditCampaignThanks(record.created_at)}:null;});res.json(result);
}catch(e){fail(res,e);}});
router.post('/instances/:id/thanks/:creatorId',async(req,res)=>{try{
 await ensureCampaignManagement();const id=idFrom(req),creator=Number(req.params.creatorId),message=validateCampaignThanks(req.body.message);
 if(!Number.isSafeInteger(creator)||creator<1||creator===req.user!.id)throw Object.assign(new Error('Choose an eligible creator'),{status:400});
 const result=await db.transaction(async tx=>{
  const campaign=await owned(tx,id,req.user!.id),data=await campaignRecords(tx,id);
  const participant=data?.participants.find((p:any)=>Number(p.user_id)===creator);
  if(!['live','in_progress','under_review','completed'].includes(campaign.status)||!participant||!campaignCreatorProgress(data,participant).completed)throw Object.assign(new Error('Thanks are available only for approved completed contributions'),{status:409});
  const [existing]=rows(await tx.execute(sql`SELECT * FROM campaign_creator_thanks WHERE campaign_id=${id} AND creator_id=${creator} AND developer_id=${req.user!.id} FOR UPDATE`));
  if(existing){
   if(req.body.edit!==true)return {...existing,editable:canEditCampaignThanks(existing.created_at)};
   if(!canEditCampaignThanks(existing.created_at))throw Object.assign(new Error('The 15-minute editing window has ended'),{status:409});
   const [edited]=rows(await tx.execute(sql`UPDATE campaign_creator_thanks SET message=${message},updated_at=NOW() WHERE id=${existing.id} RETURNING *`));
   await campaignEvent(tx,id,'creator_thanks_edited',req.user!.id,`Thank-you updated for creator #${creator}`);return {...edited,editable:true};
  }
  const [record]=rows(await tx.execute(sql`INSERT INTO campaign_creator_thanks(campaign_id,creator_id,developer_id,message) VALUES(${id},${creator},${req.user!.id},${message}) RETURNING *`));
  const [developer]=rows(await tx.execute(sql`SELECT display_name,username FROM users WHERE id=${req.user!.id}`));
  await tx.execute(sql`INSERT INTO notifications(user_id,from_user_id,type,title,message,metadata,action_url) VALUES(${creator},${req.user!.id},'campaign_thanks','Developer thanks',${`${developer.display_name||developer.username} thanked you for completing ${campaign.campaign_title||'your campaign'}.`},${JSON.stringify({campaignId:id,thanksId:record.id})}::json,${`/campaign-thanks/${record.id}`})`);
  await campaignEvent(tx,id,'creator_thanked',req.user!.id,`Creator #${creator} received a private thank-you`);
  return {...record,editable:true};
 });res.json(result);
}catch(e){fail(res,e);}});
router.get('/thanks/:thanksId',async(req,res)=>{try{
 await ensureCampaignManagement();const id=Number(req.params.thanksId);if(!Number.isSafeInteger(id)||id<1)throw Object.assign(new Error('Invalid thank-you'),{status:400});
 const [record]=rows(await db.execute(sql`SELECT t.message,t.created_at,c.campaign_title,u.display_name AS developer_name,u.username AS developer_username FROM campaign_creator_thanks t JOIN campaign_instances c ON c.id=t.campaign_id JOIN users u ON u.id=t.developer_id WHERE t.id=${id} AND (t.creator_id=${req.user!.id} OR t.developer_id=${req.user!.id})`));
 if(!record)throw Object.assign(new Error('Thank-you not found'),{status:404});res.json(record);
}catch(e){fail(res,e);}});
router.post('/instances/:id/invite',async(req,res)=>{try{
  await ensureCampaignManagement();const sourceId=idFrom(req),targetId=Number(req.body.campaignId),creatorId=Number(req.body.creatorId);
  if(!Number.isSafeInteger(targetId)||targetId<1||!Number.isSafeInteger(creatorId)||creatorId<1)throw Object.assign(new Error('Choose a campaign and creator'),{status:400});
  await db.transaction(async tx=>{
    await owned(tx,sourceId,req.user!.id);
    const target=await owned(tx,targetId,req.user!.id);
    const profile=await invitationCreator(tx,sourceId,creatorId),targetData=await campaignRecords(tx,targetId);
    if(!targetData||!isEligibleCampaignInvitation(targetData,profile,getConnectedStreamChannels(profile).map(channel=>channel.platform)))throw Object.assign(new Error('This campaign is no longer accepting this creator or has no remaining capacity'),{status:409});
    const [existing]=rows(await tx.execute(sql`SELECT id FROM notifications WHERE user_id=${creatorId} AND from_user_id=${req.user!.id} AND type='campaign_invitation' AND metadata->>'campaignId'=${String(targetId)}`));
    if(!existing)await tx.execute(sql`INSERT INTO notifications(user_id,from_user_id,type,title,message,metadata,action_url) VALUES(${creatorId},${req.user!.id},'campaign_invitation','Campaign invitation',${`You have been invited to ${target.campaign_title||'a campaign'}. ${target.status==='draft'?'The campaign is still being prepared.':'View its requirements before joining.'}`},${JSON.stringify({campaignId:targetId,sourceCampaignId:sourceId})}::json,${target.status==='draft'?'/bounties':`/bounties?campaign=${targetId}`})`);
  });res.json({invited:true});
}catch(e){fail(res,e);}});
router.patch('/instances/:id/workspace',async(req,res)=>{try{
  await ensureCampaignManagement();const id=idFrom(req);
  let changes:Record<string,string>;
  try { changes=validateWorkspaceChanges(req.body); } catch(e:any) { throw Object.assign(e,{status:400}); }
  await db.transaction(async tx=>{
    const c=await owned(tx,id,req.user!.id);
    if(!['scheduled','live','in_progress'].includes(c.status))throw Object.assign(new Error('Only Scheduled or Live campaigns permit these changes'),{status:409});
    const metadata={...(c.management_data??{})};
    for(const [key,value] of Object.entries(changes))if(key!=='campaignTitle')metadata[key]=value;
    await tx.execute(sql`UPDATE campaign_instances SET campaign_title=COALESCE(${changes.campaignTitle??null},campaign_title),management_data=${JSON.stringify(metadata)}::jsonb,updated_at=NOW() WHERE id=${id}`);
    await campaignEvent(tx,id,'campaign_updated',req.user!.id,`Updated: ${Object.keys(changes).join(', ')}. Original creator requirements preserved.`);
  });res.json({id,updated:Object.keys(changes)});
}catch(e){fail(res,e);}});
router.post('/instances/:id/manage',async(req,res)=>{try{
  await ensureCampaignManagement();const id=idFrom(req),user=req.user!.id,{action}=req.body;
  const result=await db.transaction(async tx=>{
    const c=await owned(tx,id,user),data=(await campaignRecords(tx,id))!;
    if(action==='end_early'){if(req.body.confirm!==true||!canEndCampaignEarly(data))throw Object.assign(new Error('All joined creators must finish approved objectives and pending rewards or access actions before ending early'),{status:409});await tx.execute(sql`UPDATE campaign_instances SET end_date=NOW(),applications_paused=true,updated_at=NOW() WHERE id=${id}`);await campaignEvent(tx,id,'campaign_ended_early',user,'Unclaimed places closed after every participating creator completed.');const closed=(await campaignRecords(tx,id))!;await reconcileCampaign(tx,closed);return {id,status:closed.campaign.status};}
    if(action==='archive'){await tx.execute(sql`UPDATE campaign_instances SET archived_at=CASE WHEN archived_at IS NULL THEN NOW() ELSE NULL END WHERE id=${id}`);return {id};}
    if(action==='cancel'){
      if(!cancellationAllowed(data))throw Object.assign(new Error('This campaign has active creator work, distributed access or submitted content. Contact Gamefolio Support if you need help.'),{status:409});
      const reason=String(req.body.reason??'').trim();if(!reason||reason.length>2000||req.body.confirm!==true)throw Object.assign(new Error('A cancellation reason and confirmation are required'),{status:400});
      await tx.execute(sql`UPDATE campaign_instances SET status='cancelled',lifecycle_state='cancelled',cancelled_at=NOW(),cancellation_reason=${reason},updated_at=NOW() WHERE id=${id}`);
      await tx.execute(sql`UPDATE game_keys SET instance_id=NULL,status='available' WHERE instance_id=${id} AND status IN ('available','reserved') AND assigned_user_id IS NULL AND assigned_participant_id IS NULL AND revealed_at IS NULL AND rewarded_at IS NULL AND removed_at IS NULL AND game_id IS NOT NULL`);
      await campaignEvent(tx,id,'campaign_cancelled',user,reason);return {id};
    }
    if(action==='delete'){
      if(c.status!=='draft'||data.campaign.payment_reference||['payment_processing','setup_processing','awaiting_payment'].includes(data.campaign.payment_status)||data.participants.length)throw Object.assign(new Error('Only an unpaid, unlocked draft can be deleted'),{status:409});
      // Soft-delete preserves references and key audit history; hidden in normal lists.
      await tx.execute(sql`UPDATE campaign_instances SET status='cancelled',lifecycle_state='cancelled',archived_at=NOW(),cancelled_at=NOW(),cancellation_reason='Draft deleted',updated_at=NOW() WHERE id=${id}`);
      await campaignEvent(tx,id,'draft_deleted',user);return {id};
    }
    if(action==='duplicate'){
      const [copy]=rows(await tx.execute(sql`INSERT INTO campaign_instances (template_id,developer_user_id,campaign_title,description,regions,platforms,game_id,game_name,game_artwork_url,artwork_url,start_type,status,lifecycle_state,access_method,access_instructions,completion_reward_type,completion_reward_key_required,requires_access_key,max_places,application_period_days,creator_deadline_days,objective_snapshot,bounty_xp_reward,completion_bonus_xp,reward_config,commercial_type,budget_pence,content_priorities,stream_config,manual_approval_required)
        SELECT template_id,developer_user_id,COALESCE(campaign_title,game_name,'Campaign')||' (copy)',description,regions,platforms,game_id,game_name,game_artwork_url,artwork_url,'asap','draft','draft',access_method,access_instructions,completion_reward_type,completion_reward_key_required,requires_access_key,max_places,application_period_days,creator_deadline_days,objective_snapshot,bounty_xp_reward,completion_bonus_xp,reward_config,commercial_type,budget_pence,content_priorities,stream_config,manual_approval_required FROM campaign_instances WHERE id=${id} RETURNING id`));
      await campaignEvent(tx,copy.id,'campaign_duplicated',user,`Copied from campaign #${id}`);return {id:copy.id};
    }
    if(!['scheduled','live','in_progress','under_review'].includes(c.status))throw Object.assign(new Error('This campaign is read-only'),{status:409});
    if(action==='pause'||action==='resume'){
      if(c.status==='under_review')throw Object.assign(new Error('Enrolment has closed'),{status:409});
      await tx.execute(sql`UPDATE campaign_instances SET applications_paused=${action==='pause'},updated_at=NOW() WHERE id=${id}`);
      await campaignEvent(tx,id,`applications_${action}d`,user);return {id};
    }
    if(action==='extend'){
      const date=new Date(req.body.endDate);if(!Number.isFinite(date.getTime())||!c.end_date||date<=new Date(c.end_date))throw Object.assign(new Error('Choose a deadline later than the current end date'),{status:400});
      await tx.execute(sql`UPDATE campaign_instances SET end_date=${date},updated_at=NOW() WHERE id=${id}`);await campaignEvent(tx,id,'deadline_extended',user,date.toISOString());return {id};
    }
    if(action==='clarification'){
      const text=String(req.body.text??'').trim();if(!text||text.length>4000)throw Object.assign(new Error('Enter a clarification of 1–4000 characters'),{status:400});
      await campaignEvent(tx,id,'clarification_added',user,text);return {id};
    }
    if(action==='places'){
      if(!String(c.template_slug??'').startsWith('custom-') && c.template_category!=='custom') throw Object.assign(new Error('Creator capacity can only be changed for custom campaigns'),{status:400});
      const total=Number(req.body.places);if(!Number.isInteger(total)||total<=Number(c.max_places)||total>100)throw Object.assign(new Error('Increase creator places to a whole number, up to 100'),{status:400});
      const extra=total-Number(c.max_places);
      if(c.requires_access_key!==false){const type=c.access_method==='full_game_upfront'?'full':'demo';
        const keys=rows(await tx.execute(sql`SELECT id FROM game_keys WHERE developer_user_id=${user} AND game_id=${c.game_id} AND key_pool='access' AND key_type=${type} AND removed_at IS NULL AND revealed_at IS NULL AND assigned_user_id IS NULL AND assigned_participant_id IS NULL AND ((instance_id IS NULL AND status='available') OR (instance_id=${id} AND status='available')) ORDER BY id LIMIT ${extra} FOR UPDATE SKIP LOCKED`));
        if(keys.length<extra)throw Object.assign(new Error('Add enough compatible access keys before increasing places'),{status:409});
        await tx.execute(sql`UPDATE game_keys SET instance_id=${id},status='reserved' WHERE id=ANY(${keys.map(k=>Number(k.id))}::int[])`);
        await tx.execute(sql`INSERT INTO campaign_key_events (key_id,instance_id,actor_user_id,event_type,to_status) SELECT unnest(${keys.map(k=>Number(k.id))}::int[]),${id},${user},'allocated','reserved'`);
      }
      if(c.completion_reward_key_required){const reward=rows(await tx.execute(sql`SELECT id FROM game_keys WHERE instance_id=${id} AND key_pool='reward' AND key_type='full' AND status='available' AND assigned_user_id IS NULL AND removed_at IS NULL FOR UPDATE`));const awaiting=data.participants.filter(p=>!p.full_key_id&&!['cancelled','expired','rejected'].includes(p.status)).length;if(reward.length<total-data.participants.length+awaiting)throw Object.assign(new Error('Add enough full-game completion keys before increasing places'),{status:409});}
      await tx.execute(sql`UPDATE campaign_instances SET max_places=${total},updated_at=NOW() WHERE id=${id}`);await campaignEvent(tx,id,'places_increased',user,`${c.max_places} → ${total}`);return {id};
    }
    throw Object.assign(new Error('Unsupported campaign action'),{status:400});
  });res.json(result);
}catch(e){fail(res,e);}});
router.post('/instances/:id/keys/:keyId/reveal',async(req,res)=>{try{
  await ensureCampaignManagement();const id=idFrom(req),keyId=Number(req.params.keyId);
  if(!Number.isSafeInteger(keyId)||keyId<1)return res.status(400).json({error:'A valid key ID is required'});
  const key=await db.transaction(async tx=>{await owned(tx,id,req.user!.id);
    const [row]=rows(await tx.execute(sql`SELECT * FROM game_keys WHERE id=${keyId} AND instance_id=${id} AND developer_user_id=${req.user!.id} AND assigned_user_id IS NOT NULL AND removed_at IS NULL`));
    if(!row)throw Object.assign(new Error('Only a distributed key can be revealed here'),{status:404});
    await campaignEvent(tx,id,'distributed_key_viewed',req.user!.id,`Key #${keyId}`);return decryptCampaignKey(row);
  });res.setHeader('Cache-Control','no-store');res.json({key});
}catch(e){fail(res,e);}});
router.get('/instances/:id/report',async(req,res)=>{try{
  await ensureCampaignManagement();const data=await detail(idFrom(req),req.user!.id);
  if(req.query.format==='json')return res.json(data);
  const feedback=req.query.kind==='feedback', table=feedback?data.submissions.filter(s=>['feedback','review','bug'].includes(s.content_type)):data.metrics.objectives;
  const fields=feedback?['id','username','content_type','status','content_data','submitted_at']:['title','content_type','quantity','expected','submitted','approved','rejected','percent'];
  const cell=(v:any)=>'"'+String(typeof v==='object'?JSON.stringify(v):v??'').replace(/"/g,'""').replace(/^[=+\-@\t\r]/,"'$&")+'"';
  res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="campaign-${data.campaign.id}-${feedback?'feedback':'report'}.csv"`);
  const reportLines=[fields.join(','),...table.map(row=>fields.map(f=>cell(row[f])).join(','))];
  if (!feedback) {
    const summary={ campaign_id:data.campaign.id, title:data.campaign.campaign_title, status:data.campaign.status, start:data.campaign.actual_start, end:data.campaign.end_date, paid_pence:data.campaign.amount_paid, payment_reference:data.campaign.payment_reference, ...Object.fromEntries(Object.entries(data.metrics).filter(([key])=>key!=='objectives')) };
    reportLines.unshift('Campaign summary', 'Metric,Value', ...Object.entries(summary).map(([key,value])=>[cell(key),cell(value)].join(',')), '', 'Objective performance');
  }
  res.send('\uFEFF'+reportLines.join('\r\n'));
}catch(e){fail(res,e);}});
export default router;
