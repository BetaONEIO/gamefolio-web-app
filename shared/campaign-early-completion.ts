import {campaignCreatorProgress} from './campaign-creator-progress';
import {COMPLETE_PARTICIPANTS,RELEASED_PARTICIPANTS} from './campaign-management';
export function canEndCampaignEarly(data:any){
 if(!['live','in_progress','under_review'].includes(data.campaign.status))return false;
 const participants=data.participants.filter((p:any)=>!RELEASED_PARTICIPANTS.includes(p.status));
 if(!participants.length||!participants.every((p:any)=>COMPLETE_PARTICIPANTS.includes(p.status)&&campaignCreatorProgress(data,p).completed))return false;
 const current=data.submissions.filter((s:any)=>participants.some((p:any)=>Number(p.user_id)===Number(s.participant_id))&&!data.submissions.some((n:any)=>Number(n.supersedes_submission_id)===Number(s.id)));
 if(current.some((s:any)=>['staged','pending','under_review','awaiting_review','changes_requested'].includes(s.status)))return false;
 if(data.keys.some((k:any)=>k.key_pool==='access'&&['reserved','assigned'].includes(k.status)&&!k.revealed_at&&participants.some((p:any)=>Number(p.user_id)===Number(k.assigned_user_id)&&!p.access_revealed_at)))return false;
 if(data.rewards.some((r:any)=>r.status!=='awarded'))return false;
 return participants.every((p:any)=>
  (!Number(data.campaign.bounty_xp_reward)||data.rewards.some((r:any)=>Number(r.participant_id)===Number(p.id)&&r.reward_type==='completion'&&r.status==='awarded'))&&
  (!data.campaign.completion_reward_key_required||p.full_key_id||p.full_game_key_id||data.keys.some((k:any)=>Number(k.assigned_user_id)===Number(p.user_id)&&k.key_pool==='reward'&&k.rewarded_at)));
}
