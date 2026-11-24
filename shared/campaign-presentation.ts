import { managedCampaignStatus } from './campaign-management';
export function campaignPrimaryStatus(c:any){const status=managedCampaignStatus(c);return status==='completed'?'completed':status==='cancelled'?'cancelled':['live','scheduled','under_review'].includes(status)?'in_progress':null;}
export function isVisibleConfirmedCampaign(c:any,includeArchived=false){return !!campaignPrimaryStatus(c)&&(!c.archived_at||includeArchived)&&!['Setup discarded','Draft deleted'].includes(c.cancellation_reason)&&(c.commercial_type!=='paid'||c.payment_status==='fulfilled'||!!c.payment_reference);}
export function campaignProgressStage(c:any,m:any){
 if(managedCampaignStatus(c)==='scheduled')return 'Scheduled';
 if(Number(m.pendingRewards)>0&&Number(m.pendingReviews??0)===0&&Number(m.expectedUnits)>0&&Number(m.approvedUnits)>=Number(m.expectedUnits))return 'Rewards processing';
 if(Number(m.pendingReviews)>0||managedCampaignStatus(c)==='under_review')return 'Awaiting review';
 if(Number(m.contentReceived)>0)return 'Content submitted';
 if(Number(m.creatorsActive)>0||Number(m.creatorsJoined)>0)return 'Creator work in progress';
 return 'Recruiting creators';
}

export function canDiscardCampaignSetup(c:any,payment:any,hasParticipants:boolean){return c.status==='draft'&&!hasParticipants&&!payment?.transaction_id&&(!payment||['awaiting_payment','payment_failed','cancelled'].includes(payment.status));}
