export const CAMPAIGN_STATUSES = ['draft', 'payment_processing', 'scheduled', 'live', 'under_review', 'completed', 'cancelled'] as const;
export type ManagedCampaignStatus = typeof CAMPAIGN_STATUSES[number];
export const CAMPAIGN_STATUS_LABELS: Record<ManagedCampaignStatus, string> = { draft:'Draft', payment_processing:'Payment Processing', scheduled:'Scheduled', live:'Live', under_review:'Under Review', completed:'Completed', cancelled:'Cancelled' };
export const CAMPAIGN_ACTIONS: Record<ManagedCampaignStatus, string> = { draft:'Continue Setup', payment_processing:'Payment Processing', scheduled:'View Campaign', live:'Manage Campaign', under_review:'Review Submissions', completed:'View Results', cancelled:'View Details' };
export const COMPLETE_PARTICIPANTS = ['completed','completed_and_verified','full_game_awarded'];
export const TERMINAL_PARTICIPANTS = [...COMPLETE_PARTICIPANTS,'expired','cancelled','rejected'];
export function managedCampaignStatus(campaign:any): ManagedCampaignStatus {
  if (campaign.status === 'cancelled') return 'cancelled';
  if (['payment_processing','setup_processing'].includes(campaign.payment_status) || campaign.payment_status === 'fulfilled' && campaign.status === 'draft') return 'payment_processing';
  if (campaign.status === 'in_progress' || campaign.status === 'paused') return 'live';
  if (CAMPAIGN_STATUSES.includes(campaign.status)) return campaign.status;
  return campaign.status === 'approved' ? 'scheduled' : campaign.status === 'awaiting_review' ? 'under_review' : 'draft';
}
export function campaignHasActivity(participants:any[], submissions:any[], keys:any[], rewards:any[]) {
  return participants.length > 0 || submissions.length > 0 || keys.some(k=>k.assigned_user_id || k.assigned_participant_id || k.revealed_at || k.rewarded_at || ['assigned','revealed','rewarded'].includes(k.status)) || rewards.length > 0;
}
export function campaignObjectiveDefinitions(template:any[], snapshot:any) {
  const definitions = Array.isArray(snapshot) ? snapshot : Array.isArray(snapshot?.objectives) ? snapshot.objectives : template;
  return definitions.map((o:any,i:number)=>({ ...template.find(t=>Number(t.id)===Number(o.id)), ...o, id:o.id ?? template[i]?.id, quantity:Math.max(0, Number(o.quantity)||0), content_type:o.content_type ?? o.type })).filter((o:any)=>o.quantity > 0);
}
export function campaignMetrics(campaign:any, participants:any[], submissions:any[], keys:any[], rewards:any[], objectives:any[]) {
  const activeParticipants = participants.filter(p=> !['cancelled','rejected'].includes(p.status));
  const current = submissions.filter(s=>!submissions.some(newer=>Number(newer.supersedes_submission_id)===Number(s.id)));
  const progress = objectives.map(o=>{
    let approved=0, submitted=0, rejected=0;
    for (const p of activeParticipants) {
      const work=current.filter(s=>Number(s.participant_id)===Number(p.user_id) && Number(s.bounty_id)===Number(o.id));
      approved+=Math.min(o.quantity,work.filter(s=>s.status==='approved').length);
      submitted+=Math.min(o.quantity,work.length);
      rejected+=work.filter(s=>s.status==='rejected').length;
    }
    const expected=o.quantity*activeParticipants.length;
    return {...o, expected, submitted, approved, rejected, percent:expected?Math.round(approved/expected*100):0};
  });
  const expected=progress.reduce((n,o)=>n+o.expected,0), approvedUnits=progress.reduce((n,o)=>n+o.approved,0);
  return { creatorsJoined:participants.length, creatorsActive:activeParticipants.filter(p=>!TERMINAL_PARTICIPANTS.includes(p.status) && (p.access_revealed_at || current.some(s=>Number(s.participant_id)===Number(p.user_id)) || ['in_progress','changes_requested','submitted_for_review'].includes(p.status))).length,
    creatorsCompleted:participants.filter(p=>COMPLETE_PARTICIPANTS.includes(p.status)).length,
    completionPercent:expected?Math.round(approvedUnits/expected*100):0, expectedUnits:expected, approvedUnits,
    contentReceived:current.length, contentApproved:current.filter(s=>s.status==='approved').length,
    contentRejected:current.filter(s=>s.status==='rejected').length, pendingReviews:current.filter(s=>s.status==='under_review' || s.status==='pending' && participants.some(p=>Number(p.user_id)===Number(s.participant_id) && p.status==='submitted_for_review')).length,
    keysAllocated:keys.length, keysAvailable:keys.filter(k=>k.status==='available').length, keysReserved:keys.filter(k=>k.status==='reserved').length,
    keysIssued:keys.filter(k=>k.assigned_user_id||k.assigned_participant_id||k.rewarded_at).length,
    keysRevealed:keys.filter(k=>k.revealed_at).length, keysRevoked:keys.filter(k=>k.removed_at).length,
    fullKeysWaiting:keys.filter(k=>k.key_pool==='reward'&&k.status!=='released'&&!k.rewarded_at&&!k.removed_at).length,
    xpDistributed:rewards.filter(r=>r.status==='awarded'&&r.reward_type!=='full_game_key').reduce((n,r)=>n+Number(r.amount||0),0),
    pendingRewards:rewards.filter(r=>r.status!=='awarded').length,
    verifiedStreams:current.filter(s=>['stream','livestream'].includes(s.content_type)&&s.status==='approved').length,
    placesAvailable:Math.max(0,Number(campaign.max_places||0)-activeParticipants.length), objectives:progress };
}
export function nextCampaignStatus(campaign:any, participants:any[], submissions:any[], keys:any[], rewards:any[], now=Date.now()):ManagedCampaignStatus {
  const current=managedCampaignStatus(campaign);
  if (['draft','payment_processing','cancelled','completed'].includes(current)) return current;
  if (current==='scheduled' && (!campaign.actual_start || new Date(campaign.actual_start).getTime()>now)) return current;
  const closed=!!campaign.end_date && new Date(campaign.end_date).getTime()<=now;
  const allTerminal=participants.every(p=>TERMINAL_PARTICIPANTS.includes(p.status));
  const pending=submissions.some(s=>['pending','under_review','changes_requested'].includes(s.status)&&!submissions.some(n=>Number(n.supersedes_submission_id)===Number(s.id))&& !participants.some(p=>Number(p.user_id)===Number(s.participant_id)&&['expired','cancelled','rejected'].includes(p.status)));
  const missingRewards=participants.some(p=>COMPLETE_PARTICIPANTS.includes(p.status)&& (
    campaign.completion_reward_key_required===true&&!p.full_key_id || Number(campaign.bounty_xp_reward)>0 && !rewards.some(r=>Number(r.participant_id)===Number(p.id)&&r.reward_type==='completion'&&r.status==='awarded')));
  const fullyOccupied=Number(campaign.max_places)>0 && participants.filter(p=>!['cancelled','rejected','expired'].includes(p.status)).length>=Number(campaign.max_places);
  if ((closed || fullyOccupied&&allTerminal) && allTerminal&&!pending&&!missingRewards&&rewards.every(r=>r.status==='awarded')) return 'completed';
  if (closed || fullyOccupied&&allTerminal || current==='under_review') return 'under_review';
  return 'live';
}
