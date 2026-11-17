import {bountyGamePageRights} from '@shared/game-content-library';
import {useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {apiRequest} from '@/lib/queryClient';
export default function CampaignSubmissionReview({data,submission,onReviewed}:{data:any;submission:any;onReviewed:()=>void}){
 const [reason,setReason]=useState(''),[changes,setChanges]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const client=useQueryClient();
 const publishesToGamePage = Boolean(bountyGamePageRights(submission.game_page_rights));
 const participant=data.participants.find((p:any)=>Number(p.user_id)===Number(submission.participant_id));
 if(!participant||['expired','cancelled','withdrawn','removed','rejected'].includes(participant.status)||!['awaiting_review','under_review','pending'].includes(submission.status)||['completed','cancelled'].includes(data.campaign.status))return null;
 if(['stream','livestream'].includes(submission.content_type))return <p className="text-sm text-[#BAC0D0]">Use the creator review below to verify stream duration and game evidence before approval.</p>;
 async function review(verdict: 'approved' | 'changes_requested') {
  setBusy(true);
  setError('');
  const campaignId = Number(data.campaign.id);
  try {
   await apiRequest('POST', `/api/bounties/admin/instances/${campaignId}/packages/${participant.id}/review`, {
    verdict,
    submissionIds: [Number(submission.id)],
    notes: verdict === 'changes_requested' ? reason.trim() : undefined,
   });
   await Promise.all([
    client.invalidateQueries({queryKey: ['campaign-dashboard', campaignId]}),
    client.invalidateQueries({queryKey: ['/api/campaigns/management']}),
    client.invalidateQueries({queryKey: ['/api/bounties/admin/instances', campaignId, 'packages']}),
    client.invalidateQueries({queryKey: ['unified-game-content']}),
    ...(verdict === 'approved' && publishesToGamePage && data.campaign.game_id
     ? [client.invalidateQueries({queryKey: ['/api/games', Number(data.campaign.game_id)]})] : []),
   ]);
   onReviewed();
  } catch (error) {
   setError(error instanceof Error ? error.message : 'Could not save the review.');
  } finally {
   setBusy(false);
  }
 }

 return <div className="space-y-3 border-t border-[#394158] pt-4"><div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>review('approved')} className="min-h-11 rounded-lg bg-[#B9FF1A] px-4 text-sm font-semibold text-[#0F101B]">{busy?'Saving…':'Approve content'}</button><button disabled={busy} onClick={()=>setChanges(v=>!v)} className="min-h-11 rounded-lg border border-[#394158] px-4 text-sm font-semibold">Request changes</button></div>{publishesToGamePage&&<p className="text-sm text-[#BAC0D0]">The creator agreed to share this on the public game page after approval.</p>}{changes&&<><textarea aria-label="Reason for requested changes" className="w-full rounded-lg border border-[#394158] bg-[#0F101B] p-3 text-sm" value={reason} onChange={e=>setReason(e.target.value)} maxLength={2000} placeholder="Explain which campaign requirement needs attention"/><button disabled={busy||!reason.trim()} onClick={()=>review('changes_requested')} className="min-h-11 text-sm font-semibold text-[#B9FF1A] disabled:text-[#BAC0D0]">Send change request</button></>}{error&&<p role="alert" className="text-sm text-amber-200">{error}</p>}</div>;
}
