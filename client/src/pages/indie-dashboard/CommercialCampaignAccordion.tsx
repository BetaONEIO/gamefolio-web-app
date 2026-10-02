import { useEffect, useState, useRef } from 'react';
import { ArrowRight, Check, ChevronDown, Info } from 'lucide-react';
import { CAMPAIGN_COMMERCIAL_MODEL, calculateStreamRecommendedCompletionXp, calculateStreamCampaignEstimate, type CommercialPreset, type StreamCampaignConfiguration } from '@shared/campaign-commercial-model';
import { useSignedUrl } from '@/hooks/use-signed-url';
import type { CampaignType } from './CreateCampaignFlow';
import CampaignIcon from './CampaignIcon';
import { campaignPreviewOutputs, previewCapacity, recommendCampaign, type PreviewAccess } from './campaign-preview-model';
const NEON = '#B9FF1A';
const estimateHelp = 'Estimates are based on the number of keys supplied, campaign requirements and current creator activity. Actual participation may vary.';
const contentLabels: Record<string,string> = {clip:'clips',reel:'reels',screenshot:'screenshots',feedback:'feedback responses',review:'reviews',stream:'live streams'};
const currency = (pence:number) => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2,minimumFractionDigits:0}).format(pence/100);
export default function CommercialCampaignAccordion({selectedType,onSelect,onContinue,onBack,campaignTypes,allowance,commercialModel,allowanceLoading,gameArtworkUrl,inventory={},inventoryLoading=false,noKeyAvailable=false,recommendationRequest=0,customBudgetPence,streamConfig,onStreamDurationChange}: {
  selectedType: CampaignType|null; onSelect:(type:CampaignType, preview?:{creatorPlaces:number;access:PreviewAccess})=>void; onContinue:()=>void; onBack:()=>void; campaignTypes:CampaignType[];
  allowance?:{available?:boolean;used?:boolean;periodEnd?:string|null}; commercialModel?:{presets?:readonly CommercialPreset[]}; allowanceLoading?:boolean; gameArtworkUrl?:string|null;
  inventory?:{demo?:number;full?:number}; inventoryLoading?:boolean; noKeyAvailable?:boolean; recommendationRequest?:number;
  customBudgetPence:number; streamConfig:StreamCampaignConfiguration; onStreamDurationChange:(minutes:number)=>void;
}) {
  const [expanded,setExpanded]=useState('');
  const [access,setAccess]=useState<PreviewAccess>('full');
  const accessTouched = useRef(false);
  useEffect(()=>{ if(!accessTouched.current && !inventoryLoading) setAccess(noKeyAvailable?'no_key':(inventory.full ?? 0)>0?'full':(inventory.demo ?? 0)>0?'demo':'full'); },[inventoryLoading,noKeyAvailable,inventory.full,inventory.demo]);
  const [places,setPlaces]=useState<Record<string,number>>({});
  const [customDuration,setCustomDuration]=useState(![30,60,120].includes(streamConfig.requiredMinutes));
  const recommended = recommendCampaign(!!allowance?.available,noKeyAvailable,inventory);
  useEffect(()=>{if(recommendationRequest) setExpanded(recommended);},[recommendationRequest,recommended]);
  const {signedUrl}=useSignedUrl(gameArtworkUrl);
  const [artFailed,setArtFailed]=useState(false);
  useEffect(()=>setArtFailed(false),[signedUrl]);
  const presets= commercialModel?.presets ?? CAMPAIGN_COMMERCIAL_MODEL.presets;
  return <div className="space-y-3 font-['Space_Grotesk']" role="region" aria-label="Campaign types">
    {recommendationRequest > 0 && <p role="status" className="text-sm text-white/80">Recommended based on your game profile and available keys. Preview the recommendation, then select it to continue.</p>}
    {presets.map(preset=>{
      const type=campaignTypes.find(t=>t.slug===preset.slug); if(!type)return null;
      const open=expanded===preset.slug, selected=selectedType?.slug===preset.slug, included=preset.slug==='quick-creator', stream=preset.slug==='stream-spotlight', custom=preset.slug==='custom-campaign';
      const disabled=included && (!allowance?.available || !!allowance?.used);
      const requested=places[preset.slug] ?? (included ? CAMPAIGN_COMMERCIAL_MODEL.starter.creatorPlaces : preset.estimatedCreatorMax ?? 10);
      const effectiveAccess = access === 'demo_to_full' && !custom ? 'demo' : access;
      const capacity=previewCapacity(effectiveAccess,inventory,requested);
      const outputs=campaignPreviewOutputs(preset,capacity);
      if (stream && capacity > 0) {
        const streamEstimate = calculateStreamCampaignEstimate(streamConfig, { streamerCapacity: capacity, campaignDurationDays: preset.campaignDurationDays ?? type.duration, completionXpPerCreator: calculateStreamRecommendedCompletionXp(streamConfig) });
        outputs.splice(0, outputs.length, { type: 'stream', ...streamEstimate.estimatedStreamers });
        if (streamEstimate.estimatedClips) outputs.push({ type: 'clip', ...streamEstimate.estimatedClips });
      }
      const xp=stream?calculateStreamRecommendedCompletionXp(streamConfig):type.xpReward;
      const duration=preset.campaignDurationDays ?? type.duration;
      const price=custom ? customBudgetPence : preset.priceFromPence ?? CAMPAIGN_COMMERCIAL_MODEL.paidMinimumPence;
      const accessItems: {id:PreviewAccess;label:string}[]=[{id:'demo',label:'Demo keys only'},{id:'full',label:'Full-game keys only'},{id:'demo_to_full',label:'Demo + full-game unlock'},...(noKeyAvailable?[{id:'no_key' as const,label:'No key required'}]:[])];
      return <section key={preset.slug} className="overflow-hidden rounded-xl border bg-[#151827]" style={{borderColor:selected?NEON:open?'#4B5267':'#303447'}}>
        <button type="button" aria-expanded={open} aria-controls={`commercial-${preset.slug}`} onClick={()=>setExpanded(open?'':preset.slug)} className="grid min-h-[108px] w-full grid-cols-[36px_minmax(0,1fr)_20px] items-center gap-x-3 gap-y-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B9FF1A] md:grid-cols-[40px_minmax(0,1fr)_320px_20px] sm:px-5">
          <CampaignIcon type={preset.slug} disabled={disabled} className="h-8 w-8" />
          <span className="min-w-0"><span className="flex flex-wrap items-center gap-2 text-base font-bold text-white">{custom?'Build Your Own Campaign':type.shortName}
            {selected&&<span className="inline-flex items-center gap-1 rounded border border-[#B9FF1A] px-2 py-0.5 text-xs text-[#B9FF1A]"><Check size={12}/>Selected</span>}
            {preset.slug===recommended&&<span className="rounded border border-white/25 px-2 py-0.5 text-xs font-medium text-white/85">Recommended</span>}
          </span><span className="mt-1 block text-sm text-[#BAC0D0]">{preset.overview}</span></span>
          <span className="col-span-3 grid grid-cols-3 gap-3 text-sm md:col-span-1 md:col-start-3 md:row-start-1">
            <span><span className="block font-semibold text-white">{custom?'Your choice':`${duration} days`}</span><span className="text-xs text-[#BAC0D0]">Completion window</span></span>
            <span><span className="block font-semibold text-white">{inventoryLoading?'Checking…':`Up to ${capacity}`}</span><span className="text-xs text-[#BAC0D0]">{stream?'Estimated live streams':'Estimated creators'}</span></span>
            <span><span className="block font-semibold text-[#B9FF1A]">{custom?'Calculated':xp.toLocaleString()}</span><span className="text-xs text-[#BAC0D0]">Bounty XP / creator</span></span>
          </span><ChevronDown aria-hidden="true" size={19} className={`col-start-3 row-start-1 text-white/75 md:col-start-4 ${open?'rotate-180':''}`}/>
        </button>
        {open&&<div id={`commercial-${preset.slug}`} role="region" aria-label={`${type.shortName} details`} className="relative overflow-hidden border-t border-white/10">
          {signedUrl&&!artFailed&&<img src={signedUrl} alt="" onError={()=>setArtFailed(true)} className="pointer-events-none absolute inset-0 h-full w-full object-cover"/>}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,16,27,.98),rgba(15,16,27,.92)_60%,rgba(15,16,27,.85))]"/>
          <div className="relative grid gap-5 p-5 md:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)] lg:gap-7">
            <div className="min-w-0 space-y-3">
              <div><h3 className="text-lg font-semibold text-white">Campaign overview</h3><p className="mt-1 text-sm leading-6 text-[#D2D6E0]">{preset.overview}</p></div>
              {stream?<div className="space-y-2 text-sm text-[#D2D6E0]">
                <p><strong className="text-white">Estimated live streams.</strong> Based on the number of keys supplied and creator availability.</p>
                <p><strong className="text-white">Verified stream completion.</strong> Gamefolio tracks the connected stream and confirms that the required duration was completed.</p>
                <p><strong className="text-white">Automated game-key distribution.</strong> Keys are issued automatically to approved participants.</p>
                <label className="block font-medium text-white" htmlFor="campaign-preview-stream-duration">Required stream duration</label>
                <div className="flex gap-2"><select id="campaign-preview-stream-duration" value={customDuration?'custom':streamConfig.requiredMinutes} onChange={e=>{if(e.target.value==='custom')setCustomDuration(true);else{setCustomDuration(false);onStreamDurationChange(Number(e.target.value));}}} className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/20 bg-[#151827] px-3 text-white"><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={120}>2 hours</option><option value="custom">Custom duration</option></select>{customDuration&&<input type="number" min={15} max={240} aria-label="Custom stream duration in minutes" value={streamConfig.requiredMinutes} onChange={e=>onStreamDurationChange(Math.max(15,Math.min(240,Number(e.target.value))))} className="min-h-11 w-24 rounded-lg border border-white/20 bg-[#151827] px-3 text-white"/>}</div>
              </div>:<div><h4 className="mb-2 text-sm font-semibold text-white">Creator objectives</h4><ul className="grid gap-x-4 gap-y-1.5 text-sm text-[#D2D6E0] sm:grid-cols-2">{preset.objectives.length?preset.objectives.map(obj=><li key={obj.type} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-[#B9FF1A]"/>{obj.title}</li>):<li>Choose objectives and rewards in the next step.</li>}</ul></div>}
              <div className="flex flex-wrap gap-2" aria-label="Best for">{preset.bestFor.map(tag=><span key={tag} className="rounded-full border border-white/20 bg-[#151827] px-3 py-1 text-xs text-[#D2D6E0]">{tag}</span>)}</div>
              <div><label htmlFor={`access-preview-${preset.slug}`} className="mb-1 block text-sm font-semibold text-white">Compare game access</label><select id={`access-preview-${preset.slug}`} value={effectiveAccess} onChange={e=>{accessTouched.current=true;setAccess(e.target.value as PreviewAccess);}} className="min-h-11 w-full rounded-lg border border-white/20 bg-[#151827] px-3 text-sm text-white">{accessItems.map(item=><option key={item.id} value={item.id} disabled={item.id==='demo_to_full'&&!custom}>{item.label}{item.id==='demo_to_full'&&!custom?' (custom campaigns)':''}</option>)}</select>
                <p className="mt-1 text-xs leading-5 text-[#BAC0D0]">{effectiveAccess==='demo_to_full'?'Creators receive demo access when they join. A full-game key is automatically issued after their required campaign work is approved.':`${duration} days to complete campaign work from joining.`} Access selection carries into campaign setup. Preset completion rewards are Bounty XP; full-game unlocks are available in custom campaigns.</p>
              </div>
            </div>
            <aside className="flex min-w-0 flex-col rounded-xl bg-[#151827] p-4">
              <div className="flex items-center justify-between gap-2"><h4 className="text-base font-semibold text-white">Campaign summary</h4><span tabIndex={0} aria-label={estimateHelp} className="group relative rounded focus-visible:ring-2 focus-visible:ring-[#B9FF1A]"><Info size={17} className="text-[#BAC0D0]"/><span role="tooltip" className="absolute right-0 top-6 z-10 hidden w-60 rounded-lg border border-white/20 bg-[#0F101B] p-3 text-xs leading-5 text-white shadow-xl group-hover:block group-focus:block">{estimateHelp}</span></span></div>
              <label className="mt-3 flex items-center justify-between gap-3 text-sm text-[#D2D6E0]">Creator places<input type="number" min={included?5:preset.estimatedCreatorMin ?? 1} max={preset.estimatedCreatorMax ?? 25} disabled={included} value={requested} onChange={e=>setPlaces(prev=>({...prev,[preset.slug]:Math.max(preset.estimatedCreatorMin ?? 1,Math.min(preset.estimatedCreatorMax ?? 25,Number(e.target.value)))}))} className="min-h-11 w-20 rounded-lg border border-white/20 bg-[#0F101B] px-3 text-white"/></label>
              <p className="mt-2 text-xs text-[#BAC0D0]">{inventoryLoading?'Checking game inventory…':`${inventory.demo ?? 0} demo keys · ${inventory.full ?? 0} full-game keys available`}</p>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div><p className="font-semibold text-white">{inventoryLoading?'Checking…':`Up to ${capacity}`}</p><p className="text-xs text-[#BAC0D0]">{stream?'Estimated live streams':'Estimated creator reach'}</p></div>
                <div><p className="font-semibold text-[#B9FF1A]">{custom?'Calculated in setup':xp.toLocaleString()}</p><p className="text-xs text-[#BAC0D0]">Bounty XP / creator</p></div>
              </div>
              {stream&&<p className="mt-3 text-sm font-medium text-white">{streamConfig.requiredMinutes} minute stream requirement</p>}
              <p className="mt-3 text-xs leading-5 text-[#D2D6E0]">{inventoryLoading?'Estimates update when inventory is available.':outputs.length?outputs.map(o=>`${o.min}–${o.max} ${contentLabels[o.type]??o.type}`).join(' · '):'Choose your objectives to estimate content outputs.'}</p>
              <div className="mt-4 border-t border-white/10 pt-3"><p className="text-sm text-[#BAC0D0]">{included?'Campaign price':custom?'Estimated total':'Campaign total'}</p><p className="mt-1 text-2xl font-bold text-white">{included?'Included with Pro':currency(price)}</p><p className="mt-1 text-xs leading-5 text-[#BAC0D0]">{included?allowanceLoading?'Checking monthly allowance…':allowance?.used?`Monthly campaign used. Next available ${allowance.periodEnd?new Date(allowance.periodEnd).toLocaleDateString():'at your billing reset'}.`:allowance?.available?'One monthly campaign; unused campaigns do not roll over.':'An active Indie Game Pro subscription is required.':custom?'Your chosen budget sets the price; requirements determine the estimated output. VAT calculated at checkout.':'Fixed preset price. Creator places and stream duration do not change this price. VAT calculated at checkout.'}</p></div>
              <button type="button" disabled={disabled||allowanceLoading&&included} onClick={()=>onSelect(type,{creatorPlaces:requested,access:effectiveAccess})} aria-pressed={selected} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#B9FF1A] px-3 py-3 text-sm font-bold text-[#0F101B] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white disabled:bg-[#263445] disabled:text-[#BAC0D0]">{selected?<><Check size={16}/>Selected</>:disabled?'Monthly campaign unavailable':`Select ${type.shortName}`} {!selected&&!disabled&&<ArrowRight size={16}/>}</button>
            </aside>
          </div>
        </div>}
      </section>;
    })}
    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between"><button type="button" onClick={onBack} className="min-h-11 rounded-lg border border-white/20 bg-[#151827] px-5 py-3 text-sm font-semibold text-white">Back</button><button type="button" onClick={onContinue} disabled={!selectedType} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#B9FF1A] px-5 py-3 text-sm font-bold text-[#0F101B] focus-visible:ring-2 focus-visible:ring-white disabled:bg-[#263445] disabled:text-[#BAC0D0]">{!selectedType?'Select a campaign to continue':selectedType.custom?'Build my campaign':`Continue with ${selectedType.shortName}`}<ArrowRight size={17}/></button></div>
  </div>;
}
