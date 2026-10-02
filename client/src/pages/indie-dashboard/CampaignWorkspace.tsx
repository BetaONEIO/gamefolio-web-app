import CreateCampaignFlow from './CreateCampaignFlow';
import CampaignManagementDashboard from './CampaignManagementDashboard';

// One route-level workspace throughout the lifetime of the same campaign ID.
// Confirmed Setup reuses CampaignSetupFields from the creation flow.
export default function CampaignWorkspace({id,draftId,gameId,onBack,onEditDraft}:{id?:number;draftId?:number;gameId?:number;onBack:()=>void;onEditDraft:(id:number)=>void}) {
  return id ? <CampaignManagementDashboard id={id} onBack={onBack} onEditDraft={onEditDraft}/>
    : <section className="space-y-6 bg-[#0F101B] font-['Space_Grotesk'] text-white"><nav aria-label="Campaign workspace tabs" className="border-b border-[#303447]"><span className="inline-flex min-h-11 items-center border-b-2 border-[#B9FF1A] px-4 text-sm font-semibold text-[#B9FF1A]">Setup</span></nav><CreateCampaignFlow selectedGameId={gameId} editInstanceId={draftId} onComplete={onBack}/></section>;
}
