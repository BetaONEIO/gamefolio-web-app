import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import CreateCampaignFlow from './CreateCampaignFlow';
import CampaignManagementDashboard from './CampaignManagementDashboard';
import BountiesExperience from './BountiesExperience';

// One route-level workspace throughout the lifetime of the same campaign ID.
// Confirmed Setup reuses CampaignSetupFields from the creation flow.
export default function CampaignWorkspace({id,draftId,gameId,onBack,onEditDraft}:{id?:number;draftId?:number;gameId?:number;onBack:()=>void;onEditDraft:(id:number)=>void}) {
  const draft=useQuery<any>({queryKey:['bounty-workspace-draft',draftId],enabled:!!draftId&&!id,queryFn:async()=>(await apiRequest('GET',`/api/campaigns/instances/${draftId}`)).json()});
  if(id)return <CampaignManagementDashboard id={id} onBack={onBack} onEditDraft={onEditDraft}/>;
  if(draftId&&draft.isLoading)return <p className="py-10 text-[#C4CBD8]">Loading your saved campaign…</p>;
  if(draftId&&draft.isError)return <div className="space-y-4"><p>Could not load this campaign.</p><button onClick={()=>draft.refetch()} className="min-h-11 text-[#B7FF18]">Try again</button><button onClick={onBack} className="ml-4 min-h-11 text-white">Back</button></div>;
  // Existing paid drafts keep their saved configuration; included drafts leave the builder.
  if(draft.data?.commercial_type==='paid')return <CreateCampaignFlow selectedGameId={gameId} editInstanceId={draftId} onComplete={onBack}/>;
  return <BountiesExperience gameId={gameId}/>;
}
