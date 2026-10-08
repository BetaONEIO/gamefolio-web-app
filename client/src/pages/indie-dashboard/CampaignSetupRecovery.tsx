import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {apiRequest} from '@/lib/queryClient';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
const button='min-h-11 rounded-lg border border-[#394158] bg-[#151827] px-4 text-sm font-semibold';
export function DiscardCampaignSetup({id,onDiscard}:{id:number;onDiscard:()=>void}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');const client=useQueryClient();
 async function discard(){setBusy(true);setError('');try{await apiRequest('DELETE',`/api/campaigns/setup-sessions/${id}`);await client.invalidateQueries({queryKey:['/api/campaigns/setup-sessions']});await client.invalidateQueries({queryKey:['/api/campaigns/management']});setOpen(false);onDiscard();}catch(e:any){setError(e.message||'Could not discard setup. Please try again.');}finally{setBusy(false);}}
 return <><button type="button" className={`${button} text-red-300`} onClick={()=>{setError('');setOpen(true);}}>Discard setup</button><Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value);}}><DialogContent className="border-[#394158] bg-[#151827] text-white"><DialogTitle>Discard this campaign setup?</DialogTitle><DialogDescription className="text-[#BAC0D0]">Your saved campaign information will be permanently removed. This will not affect any active campaigns.</DialogDescription>{error&&<p role="alert" className="text-amber-200">{error}</p>}<div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={busy} className={button} onClick={()=>setOpen(false)}>Keep setup</button><button type="button" disabled={busy} className={`${button} text-red-300`} onClick={discard}>{busy?'Discarding…':'Discard setup'}</button></div></DialogContent></Dialog></>;
}
export default function CampaignSetupRecovery({gameId,onContinue}:{gameId?:number;onContinue:(id:number)=>void}){
 const [opening,setOpening]=useState<number|null>(null),[error,setError]=useState('');
 async function resume(session:any){setOpening(session.id);setError('');try{if(session.checkout_pending)await apiRequest('POST',`/api/campaigns/instances/${session.id}/cancel-checkout`);onContinue(session.id);}catch(e:any){setError(e.message||'Could not continue setup. Please try again.');}finally{setOpening(null);}}
 const query=useQuery<any[]>({queryKey:['/api/campaigns/setup-sessions'],refetchOnMount:'always'});
 if(query.isLoading)return <p role="status" className="text-sm text-[#BAC0D0]">Checking for saved setup…</p>;
 if(query.isError)return <p role="alert" className="text-sm text-amber-200">Saved setup could not be loaded. <button className="underline" onClick={()=>query.refetch()}>Retry</button></p>;
 const sessions=(query.data??[]).filter(s=>!gameId||!s.profile_game_id||Number(s.profile_game_id)===gameId);
 if(!sessions.length)return null;
 return <aside className="space-y-4 rounded-xl border border-[#394158] bg-[#151827] p-5"><div><h2 className="text-lg font-bold">Continue setting up your campaign</h2><p className="mt-2 text-sm text-[#BAC0D0]">You have an unfinished campaign setup. Continue where you left off or discard it and start again.</p></div>{error&&<p role="alert" className="text-amber-200">{error}</p>}{sessions.map(session=><div key={session.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#394158] pt-3"><p className="font-semibold">{session.campaign_title||'Unfinished campaign setup'}</p><div className="flex flex-wrap gap-3"><button className={`${button} bg-[#B9FF1A] text-[#0F101B]`} disabled={opening!==null} onClick={()=>resume(session)}>{opening===session.id?'Opening…':'Continue setup'}</button><DiscardCampaignSetup id={session.id} onDiscard={()=>void query.refetch()}/></div></div>)}</aside>;
}
