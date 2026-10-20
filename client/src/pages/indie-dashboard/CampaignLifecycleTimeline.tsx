import { useEffect, useState } from 'react';
import { Check, Users, Film, ClipboardCheck, Flag, X, ArrowRight } from 'lucide-react';
import { campaignLifecycleTimeline, recentCampaignActivity } from '@shared/campaign-lifecycle-timeline';
import CampaignMark from '@/components/icons/CampaignMark';
const icons=[CampaignMark,Users,Film,ClipboardCheck,Flag,X];
const date=(v:string)=>new Date(v).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
export default function CampaignLifecycleTimeline({data,onReview,onParticipants,onContent,onManage,onPublic,compact=false}:{data:any;compact?:boolean;onReview:(creatorId?:number)=>void;onParticipants:()=>void;onContent:()=>void;onManage:()=>void;onPublic:()=>void}) {
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(timer);},[]);
  const journey=campaignLifecycleTimeline(data,now),ended=['completed','cancelled'].includes(data.campaign.status);
  const act=(action:string)=>action==='review'?onReview(journey.nextReviewer?Number(journey.nextReviewer):undefined):action==='participants'?onParticipants():action==='public'?onPublic():action==='manage'?onManage():onContent();
  if(compact)return <section aria-label="Campaign journey" className="space-y-6 border-t border-[#292D3D] pt-10 sm:pt-12"><h2 className="text-2xl font-bold">Campaign journey</h2><ol className="grid lg:grid-cols-5">{journey.stages.slice(0,5).map((stage,index)=><li key={stage.id} className="relative flex min-w-0 gap-4 pb-5 last:pb-0 lg:block lg:px-2 lg:pb-0 lg:text-center">{index<4&&<span aria-hidden="true" className="absolute bottom-0 left-[23px] top-12 w-[2px] bg-[#B9FF1A] lg:bottom-auto lg:left-1/2 lg:top-[23px] lg:h-[2px] lg:w-full"/>}<span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#B9FF1A] text-[#0F101B] lg:mx-auto"><Check size={22}/></span><div className="pt-1 lg:pt-3"><h3 className="text-sm font-semibold text-white">{stage.id==='review'?'Content approved':stage.title}</h3><p className="mt-1 text-sm text-[#D2D6E0]">{stage.date?date(stage.date):'Date not recorded'}</p></div></li>)}</ol></section>;
  return <section aria-label="Campaign lifecycle" className="space-y-6 font-['Space_Grotesk']">
    <div className="rounded-xl border border-[#394158] bg-[#151827] p-5 sm:p-7"><h2 className="mb-7 text-2xl font-bold text-white">Campaign journey</h2>
      <ol className={`grid gap-0 ${journey.stages.length===6?'lg:grid-cols-6':'lg:grid-cols-5'}`}>
        {journey.stages.map((stage,index)=>{
          const done=stage.state==='completed',action=stage.state==='action',current=stage.state==='current',Icon=done?Check:icons[index];
          const interactive=!!stage.action,node=<span className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] ${done?'border-[#B9FF1A] bg-[#B9FF1A] text-[#0F101B]':action?'border-amber-300 bg-[#151827] text-amber-300':current?'campaign-current-node border-[#B9FF1A] bg-[#151827] text-[#B9FF1A]':'border-[#68728A] bg-[#151827] text-[#D2D6E0]'}`}><Icon size={25} strokeWidth={2}/></span>;
          return <li key={stage.id} className="relative flex min-w-0 gap-4 pb-8 last:pb-0 lg:block lg:px-2 lg:pb-0 lg:text-center" aria-current={current||action?'step':undefined}>
            {index<journey.stages.length-1&&<span aria-hidden="true" className={`absolute bottom-0 left-[26px] top-14 w-[3px] lg:bottom-auto lg:left-1/2 lg:top-[26px] lg:h-[3px] lg:w-full ${done?'bg-[#B9FF1A]':'bg-[#394158]'}`}/>}
            {interactive?<button className="relative z-10 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B9FF1A] lg:mx-auto" aria-label={`${stage.title}: ${stage.status}`} onClick={()=>act(stage.action!)}>{node}</button>:<span className="relative z-10 block lg:mx-auto lg:w-fit">{node}</span>}
            <div className="min-w-0 pt-1 lg:pt-4"><p className={`mb-2 text-xs font-bold uppercase tracking-wide ${action?'text-amber-300':done||current?'text-[#B9FF1A]':'text-[#D2D6E0]'}`}>{action?'Action required':current?'Current':done?'Completed':stage.state==='cancelled'?'Cancelled':'Upcoming'}</p>
              <h3 className="text-base font-semibold leading-6 text-white">{stage.title}</h3>
              <p className={`mt-2 text-sm font-medium ${action?'text-amber-200':'text-white'}`}>{stage.date?`${stage.id==='completed'&&!done||stage.id==='started'&&stage.status==='Scheduled'?'Expected ':''}${date(stage.date)}`:stage.status}</p>
              {stage.date&&action&&<p className="mt-1 text-sm text-amber-200">{stage.status}</p>}
              <p className="mt-2 text-sm leading-6 text-[#D2D6E0]">{stage.description}</p>
            </div>
          </li>;
        })}
      </ol>
    </div>
    <section aria-label="Current campaign status" className={`rounded-xl border bg-[#151827] p-6 ${journey.pending&&!ended?'border-amber-300':'border-[#394158]'}`}>
      <div className="flex flex-wrap items-start justify-between gap-5"><div className="max-w-3xl" aria-live="polite" aria-atomic="true"><h2 className={`text-2xl font-bold ${journey.pending&&!ended?'text-amber-200':ended&&data.campaign.status==='completed'?'text-[#B9FF1A]':'text-white'}`}>{journey.title}</h2>{journey.completionDate&&data.campaign.status==='completed'&&<p className="mt-2 font-semibold text-white">Completed {date(journey.completionDate)}</p>}<p className="mt-3 text-base leading-7 text-[#D2D6E0]">{journey.message}</p></div>
        <button onClick={()=>act(journey.action)} className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#B9FF1A] px-5 text-base font-semibold text-[#0F101B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{journey.cta}<ArrowRight size={18}/></button></div>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">{[['View participants',onParticipants],['View campaign content',onContent],['Manage campaign',onManage]].filter(([label])=>label!==journey.cta).map(([label,action]:any)=><button key={label} onClick={action} className="min-h-11 text-sm font-semibold text-white underline underline-offset-4 hover:text-[#B9FF1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B9FF1A]">{label}</button>)}</div>
    </section>
    <dl className={`grid grid-cols-2 gap-4 border-y border-[#394158] py-5 sm:grid-cols-3 ${ended?'lg:grid-cols-4':'lg:grid-cols-5'}`}>{[['Participating creators',journey.participants],['Awaiting review',journey.pending],['Creators completed',`${journey.completed} of ${journey.participants} participating creators`],[ended?'Unclaimed places':'Places available',journey.placesAvailable],...(!ended?[['Days remaining',journey.daysRemaining===null?'Not scheduled':journey.daysRemaining===0?'Deadline reached':journey.daysRemaining]]:[])].map(([label,value])=><div key={label} className="min-w-0 px-2"><dt className="text-sm text-[#D2D6E0]">{label}</dt><dd className={`mt-2 font-semibold text-white ${label==='Creators completed'?'text-base leading-6':'text-2xl'}`}>{value}</dd></div>)}</dl>
  </section>;
}
export function CampaignRecentActivity({events}:{events:any[]}) {
  const activity=recentCampaignActivity(events);
  return <section className="space-y-5"><h2 className="text-2xl font-bold text-white">Recent activity</h2>{!activity.length?<p className="text-[#D2D6E0]">Activity appears here as creators join, submit work and earn rewards.</p>:<ol className="ml-3 border-l-2 border-[#394158]">{activity.map((event:any,index:number)=><li key={`${event.key}-${index}`} className="relative pb-6 pl-7 last:pb-0"><span aria-hidden="true" className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-[#B9FF1A] bg-[#0F101B]"/><div className="flex flex-wrap items-start justify-between gap-3"><p className="font-semibold capitalize text-white">{event.count===1&&event.actor&&event.actor!=='System'?`${event.actor} · `:''}{event.title}</p><time dateTime={event.at} className="text-sm text-[#D2D6E0]">{new Date(event.at).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})}</time></div>{event.count===1&&event.detail&&<p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#D2D6E0]">{event.detail}</p>}{event.metadata?.actionUrl&&<a href={event.metadata.actionUrl} className="mt-2 inline-block text-sm font-semibold text-[#B9FF1A] underline">View activity →</a>}</li>)}</ol>}</section>;
}
