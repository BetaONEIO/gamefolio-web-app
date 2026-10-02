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
function idFrom(req:any){const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)throw Object.assign(new Error('A valid campaign ID is required'),{status:400});return id;}
async function owned(tx:any,id:number,userId:number){const [c]=rows(await tx.execute(sql`SELECT * FROM campaign_instances WHERE id=${id} AND developer_user_id=${userId} FOR UPDATE`));if(!c)throw Object.assign(new Error('Campaign not found'),{status:404});return c;}
const fail=(res:any,e:any)=>res.status(e.status??500).json({error:e.status?e.message:'Campaign request could not be completed'});
async function detail(id:number,user:number){return db.transaction(async tx=>{await owned(tx,id,user);const data=await campaignRecords(tx,id);return reconcileCampaign(tx,data!);});}
router.post('/draft-workspace',async(req,res)=>{try{
  await ensureCampaignManagement();const {id,templateSlug,settings,budgetPence}=req.body;
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
    const setup=JSON.stringify({settings,templateSlug,budgetPence:budget});
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
router.get('/management',async(req,res)=>{try{
  await ensureCampaignManagement();
  const ids=rows(await db.execute(sql`SELECT id FROM campaign_instances WHERE developer_user_id=${req.user!.id} ORDER BY created_at DESC`));
  const list=[];
  for(const {id} of ids){const data=await detail(id,req.user!.id);list.push({...data.campaign, status:managedCampaignStatus(data.campaign), metrics:data.metrics, can_cancel:cancellationAllowed(data)});}
  res.json(list);
}catch(e){fail(res,e);}});
router.get('/instances/:id/dashboard',async(req,res)=>{try{
  await ensureCampaignManagement();const id=idFrom(req),data=await detail(id,req.user!.id);
  const management=rows(await db.execute(sql`SELECT e.event_type AS type,e.detail,e.created_at AS at,u.username AS actor FROM campaign_management_events e LEFT JOIN users u ON u.id=e.actor_user_id WHERE e.instance_id=${id}`));
  const keyEvents=rows(await db.execute(sql`SELECT e.event_type AS type,e.created_at AS at,u.username AS actor FROM campaign_key_events e LEFT JOIN users u ON u.id=e.actor_user_id WHERE e.instance_id=${id}`));
  const reviews=rows(await db.execute(sql`SELECT r.verdict AS type,r.notes AS detail,r.created_at AS at,u.username AS actor FROM campaign_bounty_submission_reviews r JOIN campaign_bounty_submissions s ON s.id=r.submission_id LEFT JOIN users u ON u.id=r.reviewer_user_id WHERE s.instance_id=${id}`));
  const timeline=[{type:'Campaign created',at:data.campaign.created_at,actor:'Developer'},...management,...keyEvents,...reviews,
    ...data.participants.map(p=>({type:'Creator joined',at:p.joined_at,actor:p.username})),
    ...data.submissions.map(s=>({type:'Submission uploaded',at:s.submitted_at,actor:s.username})),
    ...data.rewards.map(r=>({type:r.status==='awarded'?'Reward distributed':'Reward pending',at:r.updated_at,actor:'System',detail:`${r.amount??0} XP`}))];
  if(data.campaign.payment_reference)timeline.push({type:'Payment confirmed',at:data.campaign.approved_at??data.campaign.updated_at,actor:'System'});
  if(data.campaign.actual_start&&new Date(data.campaign.actual_start).getTime()<=Date.now())timeline.push({type:'Campaign launched',at:data.campaign.actual_start,actor:'System'});
  res.json({...data,campaign:{...data.campaign,status:managedCampaignStatus(data.campaign)},can_cancel:cancellationAllowed(data),timeline:timeline.filter(e=>e.at).sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime())});
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
