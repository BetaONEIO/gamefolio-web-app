import { COMPLETE_PARTICIPANTS } from './campaign-management';
const json=(value:any)=>{if(typeof value==='string'){try{return JSON.parse(value);}catch{return {};}}return value??{};};
export function campaignCreatorProgress(data:any,p:any){
  const work=data.submissions.filter((s:any)=>Number(s.participant_id)===Number(p.user_id)&&!data.submissions.some((n:any)=>Number(n.supersedes_submission_id)===Number(s.id)));
  const objectives=data.objectives.filter((o:any)=>o.mandatory!==false&&Number(o.quantity)>0);
  const results=objectives.map((o:any)=>{const slots=new Map<number,any>();work.filter((s:any)=>Number(s.bounty_id)===Number(o.id)).forEach((s:any,index:number)=>{const slot=Number(s.slot_index??index),old=slots.get(slot);if(Number.isInteger(slot)&&slot>=0&&slot<Number(o.quantity)&&(!old||Number(s.id)>Number(old.id)))slots.set(slot,s);});const approved=Array.from(slots.values()).filter(s=>s.status==='approved');return {...o,approved:approved.length,submissions:approved};});
  const streams=results.filter((o:any)=>['stream','livestream'].includes(o.content_type)).flatMap((o:any)=>o.submissions);
  const config=json(data.campaign.stream_config);
  const requiredMinutes=Number(config.requiredMinutes??0);
  const verifiedMinutes=streams.reduce((sum:number,s:any)=>sum+Number(json(s.content_data).verifiedMinutes??0),0);
  const streamVerified=!results.some((o:any)=>['stream','livestream'].includes(o.content_type))||(streams.length>0&&streams.every((s:any)=>json(s.content_data).verificationStatus==='verified'&&Number(json(s.content_data).verifiedMinutes)>0)&&verifiedMinutes>=requiredMinutes);
  const completed=COMPLETE_PARTICIPANTS.includes(p.status)&&objectives.length>0&&results.every((o:any)=>o.approved>=Number(o.quantity))&&streamVerified;
  const rewards=data.rewards.filter((r:any)=>Number(r.participant_id)===Number(p.id)&&r.reward_type!=='full_game_key');
  const xp=rewards.filter((r:any)=>r.status==='awarded').reduce((n:number,r:any)=>n+Number(r.amount??0),0);
  const approved=work.filter((s:any)=>s.status==='approved');
  const status=completed?'Completed':['expired','rejected','cancelled','withdrawn','removed'].includes(p.status)||data.campaign.status==='completed'?'Did not complete':p.status==='submitted_for_review'||work.some((s:any)=>['pending','under_review','awaiting_review'].includes(s.status))?'Awaiting approval':'In progress';
  return {completed,status,work,approved,rejected:work.filter((s:any)=>s.status==='rejected').length,objectivesCompleted:results.filter((o:any)=>o.approved>=Number(o.quantity)).length,objectivesRequired:objectives.length,verifiedMinutes,streamVerified,hasStream:results.some((o:any)=>['stream','livestream'].includes(o.content_type)),xp,rewardStatus:rewards.length?(rewards.every((r:any)=>r.status==='awarded')?'XP awarded':'XP pending'):'XP not earned',completionDate:completed?p.completed_at??null:null};
}
