import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { savedCampaignType, CampaignSetupFields, savedCampaignSettings } from './CreateCampaignFlow';
import { WORKSPACE_EDIT_FIELDS } from '@shared/campaign-workspace';

const field='block min-h-11 w-full rounded-lg border border-[#394158] bg-[#151827] px-3 py-2.5 text-sm text-white';
export default function ConfirmedCampaignSetup({data,onSaved,onManage,onKeys,saveRequest=0}:{data:any;saveRequest?:number;onSaved:()=>Promise<void>;onManage:(action:string)=>void;onKeys:()=>void}) {
  const c=data.campaign,editable=['scheduled','live'].includes(c.status);
  const [changes,setChanges]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
  useEffect(()=>{setChanges({});setNotice('');},[c.id]);
  const terms=c.confirmed_terms??c;
  const settings=savedCampaignSettings({...c,...terms,campaign_title:c.campaign_title},data.objectives);
  const type=savedCampaignType(c);
  const original=(name:string)=>String(name==='campaignTitle'?c.campaign_title??'':c.management_data?.[name]??'');
  async function save(){setBusy(true);setError('');try{
    const patch=Object.fromEntries(Object.entries(changes).filter(([key,value])=>value!==original(key)));
    if(!Object.keys(patch).length){setNotice('No changes to save.');return;}
    await apiRequest('PATCH',`/api/campaigns/instances/${c.id}/workspace`,patch);
    await onSaved();setChanges({});setNotice(`Campaign updated. Updated: ${Object.keys(patch).join(', ')}. Your permitted changes have been saved. Existing creator requirements have not been changed.`);
  }catch(e:any){setError(e.message);}finally{setBusy(false);}}
  useEffect(()=>{if(saveRequest>0)void save();},[saveRequest]);
  const profile={profile:{gameName:settings.gameName,headerImageUrl:settings.gameImageUrl,platforms:settings.platforms,availableRegions:settings.regions.split(',').filter(Boolean),isFree:settings.accessMethod==='free_to_play',accessMethod:settings.accessMethod}};
  return <div className="mx-auto max-w-[1200px] space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{type?.shortName??c.template_name}</h2><p className="mt-1 text-sm text-[#BAC0D0]">Original campaign setup and confirmed creator agreement.</p></div>{editable&&<button className="min-h-11 rounded-lg bg-[#B9FF1A] px-5 text-sm font-bold text-[#0F101B]" disabled={busy} onClick={save}>{busy?'Saving…':'Save Changes'}</button>}</div>
    {type&&<CampaignSetupFields type={type} settings={settings} onChange={()=>{}} locked titleIsManual onCampaignTitleChange={()=>{}} presetAccessChoice={settings.accessMethod} gameProfile={profile} availableKeyCounts={{fullGame:data.keys.filter((k:any)=>k.key_type==='full').length,demoPlaytest:data.keys.filter((k:any)=>k.key_type==='demo').length}}/>}
    <section className="space-y-4 border-t border-[#303447] pt-6"><h3 className="flex items-center gap-2 text-lg font-bold"><Lock size={16}/>Confirmed requirements</h3><dl className="grid gap-4 text-sm sm:grid-cols-2">
      {Object.entries({'Original brief':terms.description||'No additional brief','Platforms':settings.platforms.join(', ')||'Not configured','Creator places at confirmation':terms.max_places??'Not configured','Current creator places':c.max_places??'Not configured','Original creator completion window':`${terms.creator_deadline_days??c.creator_deadline_days??'—'} days`,'Required stream duration':`${settings.streamConfig.requiredMinutes} minutes`,'Bounty XP per creator':terms.bounty_xp_reward??c.bounty_xp_reward??'Not configured','Completion bonus XP':terms.completion_bonus_xp??c.completion_bonus_xp??0,'Campaign budget':terms.budget_pence==null?'Included / not configured':`£${(Number(terms.budget_pence)/100).toFixed(2)}`,'Access instructions':terms.access_instructions||'No additional instructions'}).map(([label,value])=><div key={label}><dt className="text-[#BAC0D0]">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words rounded-lg border border-[#303447] bg-[#151827] p-3" title="Locked after launch">{String(value)}</dd></div>)}
    </dl><h4 className="font-semibold">Required objectives per creator</h4><ul className="space-y-2 text-sm">{data.objectives.map((o:any)=><li key={o.id} className="flex items-center gap-2"><Lock size={14} className="text-[#BAC0D0]"/>{o.quantity} × {o.title??o.content_type}</li>)}</ul></section>
    <section className="space-y-4 border-t border-[#303447] pt-6"><h3 className="text-lg font-bold">{editable?'Permitted updates':'Campaign guidance'}</h3><p className="text-sm text-[#BAC0D0]">Correct title wording or add helpful information. The original brief, rewards and creator requirements stay preserved.</p>
      {WORKSPACE_EDIT_FIELDS.map(name=><label key={name} className="block text-sm font-semibold">{{campaignTitle:'Campaign title correction',guidance:'Additional guidance',faq:'FAQs',links:'Useful links / downloadable files (one HTTPS link per line)',contact:'Campaign contact information'}[name]}
        {name==='campaignTitle'||name==='contact'?<input className={`${field} mt-2`} value={changes[name]??original(name)} readOnly={!editable} maxLength={name==='campaignTitle'?120:500} onChange={e=>setChanges({...changes,[name]:e.target.value})}/>:<textarea className={`${field} mt-2`} rows={3} value={changes[name]??original(name)} readOnly={!editable} maxLength={4000} onChange={e=>setChanges({...changes,[name]:e.target.value})}/>}</label>)}
      {editable&&<div className="flex flex-wrap gap-3">{[['places','Increase creator places'],['extend','Extend campaign deadline'],[c.applications_paused?'resume':'pause',c.applications_paused?'Resume applications':'Pause applications'],['cancel','Cancel campaign']].map(([action,label])=><button key={action} onClick={()=>onManage(action)} className="min-h-11 rounded-lg border border-[#394158] bg-[#151827] px-4 text-sm font-semibold">{label}</button>)}<button onClick={onKeys} className="min-h-11 rounded-lg border border-[#394158] px-4 text-sm font-semibold">Add game keys</button></div>}
      {error&&<p role="alert" className="text-amber-300">{error}</p>}{notice&&<p role="status" className="text-[#B9FF1A]">{notice}</p>}
      {editable&&<button className="min-h-11 rounded-lg bg-[#B9FF1A] px-5 font-bold text-[#0F101B]" disabled={busy} onClick={save}>{busy?'Saving…':'Save Changes'}</button>}
    </section>
  </div>;
}
