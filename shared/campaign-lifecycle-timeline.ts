import { RELEASED_PARTICIPANTS } from './campaign-management';
import { campaignCreatorProgress } from './campaign-creator-progress';
import { currentCampaignSubmissions, submissionReviewStatus } from './campaign-content-view';
export type TimelineState='completed'|'current'|'action'|'future'|'cancelled';
export type TimelineStage={id:string;title:string;state:TimelineState;date:string|null;status:string;description:string;action?:'review'|'content'};
const date=(v:any):string|null=>v&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;
const first=(values:any[])=>values.map(date).filter((v):v is string=>!!v).sort()[0]??null;
const last=(values:any[])=>values.map(date).filter((v):v is string=>!!v).sort().at(-1)??null;
const eventDate=(data:any,type:string)=>first((data.timeline??[]).filter((e:any)=>String(e.type).toLowerCase().replaceAll('_',' ').includes(type)).map((e:any)=>e.at));
export function campaignLifecycleTimeline(data:any,now=new Date()) {
  const c=data.campaign,submissions=currentCampaignSubmissions(data.submissions??[]);
  const participants=(data.participants??[]).filter((p:any)=>['completed','cancelled'].includes(c.status)||!RELEASED_PARTICIPANTS.includes(p.status));
  const required=(data.objectives??[]).filter((o:any)=>o.mandatory!==false&&Number(o.quantity)>0);
  const submitted=participants.map((p:any)=>{
    const work=submissions.filter((s:any)=>Number(s.participant_id)===Number(p.user_id)&&!['staged','draft'].includes(s.status));
    const ready=required.length>0&&required.every((o:any)=>{
      const matching=work.filter((s:any)=>Number(s.bounty_id)===Number(o.id));
      const slots=new Set(matching.map((s:any,index:number)=>Number(s.slot_index??index)).filter((n:number)=>Number.isInteger(n)&&n>=0&&n<Number(o.quantity)));
      return slots.size>=Number(o.quantity);
    });
    return {p,ready,date:ready?last(work.map((s:any)=>s.submitted_at)):null,progress:campaignCreatorProgress(data,p)};
  });
  const ready=submitted.filter((p:any)=>p.ready),completed=submitted.filter((p:any)=>p.progress.completed);
  const pending=submissions.filter(s=>submissionReviewStatus(s.status)==='awaiting_review');
  const changes=submissions.filter(s=>s.status==='changes_requested');
  const changesCreators=new Set(changes.map(s=>Number(s.participant_id))).size;
  const fullReviewCreators=submitted.filter((p:any)=>p.ready&&pending.some(s=>Number(s.participant_id)===Number(p.p.user_id))).length;
  const ended=c.status==='completed',cancelled=c.status==='cancelled',scheduled=c.status==='scheduled',processing=c.status==='payment_processing';
  const start=date(c.activated_at??c.actual_start??c.payment_confirmed_at)??eventDate(data,'campaign launched');
  const started=!scheduled&&!processing&&c.status!=='draft'&&(!!start&&Date.parse(start)<=now.getTime()||participants.length>0||submissions.length>0);
  const joined=first((data.participants??[]).map((p:any)=>p.joined_at));
  const finish=date(c.completed_at??c.reward_pool_completed_at)??eventDate(data,'campaign completed');
  const current=processing||scheduled||!started?0:!joined?1:pending.length?3:changes.length?2:!ready.length||completed.length<participants.length?2:4;
  const reached=[started,!!joined,ready.length>0,participants.length>0&&completed.length===participants.length&&pending.length===0&&changes.length===0,ended];
  const state=(i:number):TimelineState=>ended?'completed':reached[i]?'completed':cancelled?'future':i===current?'current':'future';
  const stages:TimelineStage[]=[
    {id:'started',title:'Campaign started',state:state(0),date:started||ended?start:scheduled?date(c.scheduled_start??c.actual_start):null,status:started?'Started':scheduled?'Scheduled':processing?'Confirming payment':'Not started',description:started||ended?'Campaign opened to eligible creators':scheduled?'Creators can join after launch':'Campaign activation is pending'},
    {id:'joined',title:'Creators joined',state:state(1),date:joined,status:joined?'First creator joined':ended||cancelled?'No creators joined':'Waiting for creators',description:ended||cancelled?`${participants.length} ${participants.length===1?'creator participated':'creators participated'}`:`${participants.length} ${participants.length===1?'creator currently participating':'creators currently participating'}`},
    {id:'submitted',title:'Content submitted',state:state(2),date:first(ready.map((p:any)=>p.date)),status:ready.length?'Complete work submitted':ended||cancelled?'No complete submissions':'In progress',description:`${ready.length} of ${participants.length} participating creators submitted${changes.length?` · ${changesCreators} updating content`:''}`,action:changes.length&&!ended&&!cancelled?'content':undefined},
    {id:'review',title:'Content review',state:!ended&&!cancelled&&pending.length?'action':state(3),date:reached[3]||ended?last(submissions.filter(s=>s.status==='approved').map(s=>s.reviewed_at)):null,status:pending.length?`${pending.length} awaiting review`:changes.length?'Changes requested':'No reviews pending',description:pending.length?`${pending.length} ${pending.length===1?'submission needs':'submissions need'} your decision`:changes.length?`${changesCreators} ${changesCreators===1?'creator is':'creators are'} updating content`:'Approved work and rewards remain accessible',action:pending.length&&!ended&&!cancelled?'review':changes.length&&!ended&&!cancelled?'content':undefined},
    {id:'completed',title:'Campaign completed',state:state(4),date:ended?finish:cancelled?null:date(c.end_date),status:ended?'Completed':cancelled?'Not completed':c.end_date?'Expected':'Not scheduled',description:ended?'Final results and approved content are available':cancelled?'Campaign stopped before completion':'Campaign deadline; completion is confirmed separately'},
  ];
  if(cancelled)stages.push({id:'cancelled',title:'Campaign cancelled',state:'cancelled',date:date(c.cancelled_at)??eventDate(data,'campaign cancelled'),status:'Cancelled',description:c.cancellation_reason||'Campaign stopped accepting creators'});
  const remaining=ended||cancelled||!date(c.end_date)?null:Math.max(0,Math.ceil((Date.parse(c.end_date)-now.getTime())/86400000));
  let title='Campaign in progress',message='',cta='View participants',action='participants';
  if(ended){title='Campaign completed';message='This campaign has ended. All approved content and campaign results are available below.';cta='View campaign content';action='content';}
  else if(cancelled){title='Campaign cancelled';message=c.cancellation_reason||'This campaign has stopped. Content, participants and reward history remain accessible.';cta='View campaign content';action='content';}
  else if(scheduled){title='Campaign scheduled';message='Your campaign is confirmed. Creators can join when it launches.';cta='Manage campaign';action='manage';}
  else if(processing||!started){title='Campaign activation pending';message='Wait for payment and activation confirmation before treating this campaign as live.';cta='Manage campaign';action='manage';}
  else if(pending.length){title='Review required';message=fullReviewCreators?`${fullReviewCreators} ${fullReviewCreators===1?'creator has':'creators have'} submitted all required content for approval. ${pending.length} ${pending.length===1?'submission is':'submissions are'} awaiting review.`:`${pending.length} ${pending.length===1?'submission is':'submissions are'} ready for review. ${participants.length} creators are currently participating.`;cta=pending.length===1?'Review submission':'Review submissions';action='review';}
  else if(changes.length){title='Changes requested';message=`${changesCreators} ${changesCreators===1?'creator is':'creators are'} updating content following your feedback.`;cta='View submission';action='content';}
  else if(!participants.length){title='Waiting for creators';message='Your campaign is live and ready for creators to join.';cta='View public campaign';action='public';}
  else if(completed.length===participants.length){title='Creator work approved';message=`All ${participants.length} participating creators have completed their approved work. The campaign has not yet been closed.`;cta='Manage campaign';action='manage';}
  else{title='Creators working';message=`${participants.length-completed.length} ${participants.length-completed.length===1?'creator is':'creators are'} currently completing their campaign objectives.`;}
  return {stages,title,message,cta,action,participants:participants.length,completed:completed.length,pending:pending.length,changes:changes.length,placesAvailable:Number.isFinite(Number(data.metrics?.unclaimedPlaces??data.metrics?.placesAvailable))?Math.max(0,Number(data.metrics?.unclaimedPlaces??data.metrics?.placesAvailable)):Math.max(0,Number(c.max_places??0)-participants.length),daysRemaining:remaining,completionDate:finish,nextReviewer:pending[0]?.participant_id??null};
}
export function recentCampaignActivity(events:any[]) {
  const sorted=events.filter(e=>date(e.at)).slice().sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
  const grouped:any[]=[];
  for(const event of sorted){
    const rawType=String(event.type).toLowerCase().replaceAll('_',' ');
    const type=({'approved':'submission approved','changes requested':'changes requested','rejected':'submission rejected','submission uploaded':'content submitted','participant joined':'creator joined'} as Record<string,string>)[rawType]??rawType,day=date(event.at)!.slice(0,10);
    const grouping=/creator joined|participant joined|content submitted|submission approved|content approved/.test(type);
    const previous=grouped.find(e=>e.key===`${type}:${day}`);
    if(grouping&&previous){previous.count++;previous.actors.add(event.actor);continue;}
    grouped.push({...event,key:`${type}:${day}`,count:1,actors:new Set([event.actor])});
  }
  return grouped.slice(0,12).map(e=>({...e,actor:e.actors.size===1?e.actor:null,title:e.count>1?`${e.count} ${/joined/.test(e.key)?'creators joined the campaign':/submitted/.test(e.key)?'submissions received':'submissions approved'}`:e.key.split(':')[0]}));
}
