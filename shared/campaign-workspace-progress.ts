import { campaignCreatorProgress } from './campaign-creator-progress';
export function workspaceCreator(data:any,p:any){
 const progress=campaignCreatorProgress(data,p);
 const reviewable=progress.work.filter((s:any)=>['pending','awaiting_review','under_review'].includes(s.status));
 const required=data.objectives.filter((o:any)=>o.mandatory!==false&&Number(o.quantity)>0);
 const submittedObjectives=required.filter((o:any)=>{const slots=new Set(progress.work.filter((s:any)=>Number(s.bounty_id)===Number(o.id)&&['approved','pending','awaiting_review','under_review'].includes(s.status)).map((s:any)=>Number(s.slot_index??0)).filter((n:number)=>Number.isInteger(n)&&n>=0&&n<Number(o.quantity)));return slots.size>=Number(o.quantity);}).length;
 const status=progress.completed?'Completed':['expired','cancelled','rejected','removed','withdrawn'].includes(p.status)?'Withdrawn':progress.work.some((s:any)=>s.status==='changes_requested')?'Changes requested':reviewable.length?'Awaiting approval':'Working';
 const rewards=data.rewards.filter((r:any)=>Number(r.participant_id)===Number(p.id));
 const delivered=rewards.length>0&&rewards.every((r:any)=>r.status==='awarded');
 return {...progress,status,reviewable,submittedObjectives,ready:required.length>0&&submittedObjectives===required.length,rewards,delivered,rewardLabel:delivered?'Delivered':progress.completed?'Processing':rewards.length?'Reserved':'Not earned'};
}
export function workspaceTab(value:string|null){return value==='Creators'?'Creators':['Submissions','Reviews & Feedback','Content'].includes(value??'')?'Submissions':value==='Results'?'Results':'Overview';}
