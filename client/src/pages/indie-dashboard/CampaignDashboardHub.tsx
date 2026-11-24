import { useEffect } from 'react';
import { completedName } from './CompletedCampaignSummary';
import { campaignSamples } from './completed-campaign-sample';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
import { CAMPAIGN_STATUS_LABELS, type ManagedCampaignStatus } from '@shared/campaign-management';
import { apiRequest } from '@/lib/queryClient';
import CampaignWorkspace from './CampaignWorkspace';

export default function CampaignDashboardHub({gameId,onCreate,onEdit}:{gameId?:number;onCreate:()=>void;onEdit:(id:number)=>void}) {
  const search = useSearch();
  const [,navigate] = useLocation();
  const selected = Number(new URLSearchParams(search).get('viewCampaign') || 0);
  const query = useQuery<any[]>({queryKey:['/api/campaigns/management'],queryFn:async()=>(await apiRequest('GET','/api/campaigns/management')).json(),refetchInterval:15000});
  const samples = campaignSamples(gameId);
  const campaigns = [...(query.data ?? []), ...(import.meta.env.DEV ? samples.map(sample=>sample.campaign) : [])].filter(c => !gameId || Number(c.profile_game_id) === gameId);
  const filters = [['all','All'],['draft','Drafts'],['scheduled','Scheduled'],['live','In progress'],['under_review','Awaiting review'],['completed','Completed'],['cancelled','Cancelled']] as const;
  const requestedFilter = new URLSearchParams(search).get('campaignStatus') ?? 'all';
  const filter = filters.some(([id])=>id===requestedFilter) ? requestedFilter : 'all';
  const visible = campaigns.filter(c=>filter==='all'||c.status===filter);
  const changeFilter = (next:string) => {
    const params=new URLSearchParams(search);params.set('campaignStatus',next);params.delete('campaignTab');
    if((next==='all'&&selectedStatus==='completed')||next!=='all'&&!campaigns.some(c=>Number(c.id)===selected&&c.status===next))params.delete('viewCampaign');
    navigate(`/game-dashboard?${params.toString()}`);
  };
  const statusLabel=(status:ManagedCampaignStatus)=>status==='live'?'In progress':status==='under_review'?'Awaiting review':CAMPAIGN_STATUS_LABELS[status]??status;
  const selectedStatus=campaigns.find(c=>Number(c.id)===selected)?.status;
  useEffect(()=>{if(selectedStatus==='completed'&&filter!=='completed'){const params=new URLSearchParams(search);params.set('campaignStatus','completed');navigate(`/game-dashboard?${params.toString()}`,{replace:true});}},[selected,selectedStatus]);
  const select = (id:number) => {
    const params = new URLSearchParams(search);
    params.set('campaignSub','dashboard');
    params.delete('campaignTab');
    if(id) params.set('viewCampaign',String(id)); else params.delete('viewCampaign');
    navigate(`/game-dashboard?${params.toString()}`);
  };
  return <section className="relative isolate space-y-6 text-white [&>*]:relative [&>*]:z-10">

    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold">Campaign Dashboard</h1></div></div>
    <nav aria-label="Filter campaigns by status" className="flex flex-wrap gap-2">{filters.map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>changeFilter(id)} className={`min-h-11 rounded-lg px-4 text-sm font-semibold ${filter===id?'bg-[#B9FF1A] text-[#0F101B]':'border border-[#394158] bg-[#151827] text-[#BAC0D0]'}`}>{id==='completed'?'✓ ':''}{label}<span className="ml-2 opacity-75">{query.isSuccess?(id==='all'?campaigns.length:campaigns.filter(c=>c.status===id).length):'—'}</span></button>)}</nav>
    {query.isLoading ? <p role="status">Loading your campaigns…</p> : query.isError ? <div role="alert"><p>Your campaigns could not be loaded.</p><button onClick={()=>query.refetch()} className="mt-3 underline">Try again</button></div> : <>
      <label className="block max-w-xl font-semibold">Viewing campaign<select value={visible.some(c=>Number(c.id)===selected)?selected:0} onChange={e=>select(Number(e.target.value))} className="mt-2 block min-h-12 w-full rounded-lg border border-[#394158] bg-[#151827] px-4 text-white"><option value={0}>Select a campaign to manage</option>{visible.map(c=><option key={c.id} value={c.id}>{c.status==='completed'?'✓ ':''}{completedName(c.campaign_title || c.template_name)} · {c.game_name || 'Game'}</option>)}</select></label>
      {selected && visible.some(c=>Number(c.id)===selected) ? <CampaignWorkspace key={selected} id={selected} onBack={()=>select(0)} onEditDraft={onEdit}/> : <div className="rounded-xl border border-[#303447] bg-[#151827] p-8"><h2 className="text-xl font-semibold">{visible.length?'Select a campaign above':filter==='all'?'No campaigns yet':`No ${filters.find(([id])=>id===filter)?.[1].toLowerCase()} campaigns`}</h2><p className="mt-3 text-[#BAC0D0]">{visible.length?'Choose a campaign to see its content, feedback and results in one place.':'Choose another status, or create a new campaign.'}</p></div>}
    </>}
  </section>;
}
