import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useLocation, useSearch } from 'wouter';
import { useSignedUrl } from '@/hooks/use-signed-url';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ArrowLeft, ArrowRight, Check, Film, Gamepad2, KeyRound, Loader2, Radio, Users, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import IndieDevUpgradeDialog from '@/components/IndieDevUpgradeDialog';
import { bountyKeyType, type BountyAccess } from '@shared/included-bounty';
import { CREATOR_PREFERENCES, STANDARD_OPPORTUNITIES, type CreatorPreference, type OpportunityType, type BoostPrompt } from '@shared/bounty-discovery';
import BountyGameAccess, { BountyKeyUpload, bountyGameProfileUrl, bountyPrimary, bountySecondary, readableBountyError } from './BountyGameAccess';
import { bountyGameAvailabilityIssue } from '@shared/bounty-game-availability';
import CampaignContentLibrary from './CampaignContentLibrary';
import PaidBountyBuilder from './PaidBountyBuilder';
import BountyCampaignHub from './BountyCampaignHub';
import BountyOpenedConfirmation from './BountyOpenedConfirmation';
import {bountyHubListingUrl, showOverviewBoost} from '@shared/bounty-hub-view';
import './bounties-experience.css';

const contextKey=['/api/included-bounties/context'];
const disclaimer='Creator participation, content and streaming activity are not guaranteed.';
export function BountyArtwork({url,alt='',className=''}:{url?:string|null;alt?:string;className?:string}) {
  const {signedUrl}=useSignedUrl(url);const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[url]);
  return signedUrl&&!failed?<img src={signedUrl} alt={alt} className={className} onError={()=>setFailed(true)}/>:<Gamepad2 aria-hidden="true" size={42} className="bounty-accent"/>;
}
function GameIdentity({game}:{game:any}) {
  return <div className="bounty-game"><div className="bounty-cover"><BountyArtwork url={game.capsule_image_url} alt={game.game_name}/></div><div><h3>{game.game_name}</h3><p>{String(game.release_status??'In development').replaceAll('_',' ')}</p></div></div>;
}
const explainerSteps=[
  {Icon:KeyRound,title:'1. Add game access',description:'Provide demo or full-game access.'},
  {Icon:Users,title:'2. Creators play',description:'Creators choose a content or streaming bounty.'},
  {Icon:Film,title:'3. Review their work',description:'Review submitted content, feedback and verified streams.'},
];
function ExchangeSteps() {
  return <ol className="bounty-exchange is-detailed">{explainerSteps.map(({Icon,title,description})=><li key={title}><span className="bounty-step-icon"><Icon aria-hidden="true" size={25}/></span><div><strong>{title}</strong><p>{description}</p></div></li>)}</ol>;
}
function ActivityPreference({value,onChange}:{value:CreatorPreference;onChange:(value:CreatorPreference)=>void}) {
  return <div className="bounty-access-options">{(Object.keys(CREATOR_PREFERENCES) as CreatorPreference[]).map(id=>{const item=CREATOR_PREFERENCES[id];return <button key={id} type="button" className={`bounty-choice ${value===id?'is-selected':''}`} aria-pressed={value===id} onClick={()=>onChange(id)}><strong>{item.title}{value===id&&<Check aria-label="Selected" size={18} className="inline ml-2 bounty-accent"/>}</strong><span>{item.description}</span>{id==='both'&&<span className="bounty-accent">Recommended</span>}</button>;})}</div>;
}
type Screen='landing'|'game'|'access'|'review'|'success'|'dashboard'|'paid';
export default function BountiesExperience({gameId,forceLanding=false,initialPaid=false}:{gameId?:number;forceLanding?:boolean;initialPaid?:boolean}) {
  const {user}=useAuth();const [,navigate]=useLocation();
  const searchParams=useSearch();
  const restartSetup=import.meta.env.DEV&&new URLSearchParams(searchParams).get('restartBountySetup')==='1';
  const [contextGameId,setContextGameId]=useState(gameId??0);
  const query=useQuery<any>({queryKey:[...contextKey,contextGameId],refetchInterval:15000,queryFn:async()=>(await apiRequest('GET',`/api/included-bounties/context?gameId=${contextGameId}`)).json()});
  const [screen,setScreen]=useState<Screen>(initialPaid?'paid':'landing');
  const [modal,setModal]=useState<'start'|'help'|null>(null),[upgrade,setUpgrade]=useState(false);
  const [selectedId,setSelectedId]=useState(gameId??0),[search,setSearch]=useState('');
  const [access,setAccess]=useState<BountyAccess|null>(null),[preference,setPreference]=useState<CreatorPreference>('both');
  const [accessSettings,setAccessSettings]=useState(false),[boostHelp,setBoostHelp]=useState(false);
  const [openSubmissionRequest,setOpenSubmissionRequest]=useState<{id:number;sequence:number}>();
  const allSubmissionsRef=useRef<HTMLDetailsElement>(null),historyRef=useRef<HTMLDivElement>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[keysOpen,setKeysOpen]=useState(false);
  const [boostSeed,setBoostSeed]=useState<BoostPrompt|null>(null);
  const introHeadingRef=useRef<HTMLHeadingElement>(null);
  const routeGameRef=useRef(gameId);
  const headingRef=useRef<HTMLHeadingElement>(null),started=useRef(false),submitLock=useRef(false);
  const data=query.data,games=data?.games??[],programme=data?.programme,activity=data?.activity;
  const programmeGame=games.find((g:any)=>Number(g.id)===Number(programme?.profile_game_id));
  const game=games.find((g:any)=>Number(g.id)===selectedId)??programmeGame??games[0];
  const discovery=programme?.model_version==='discovery-v2';
  useEffect(()=>{if(data&&!started.current){started.current=true;if(programme&&!forceLanding&&!initialPaid&&!restartSetup)setScreen('dashboard');if(games.length===1)setSelectedId(Number(games[0].id));if(programme)setPreference(programme.activity_preference??'both');}},[data,programme,games,forceLanding,initialPaid,restartSetup]);
  useEffect(()=>{if(routeGameRef.current===gameId)return;routeGameRef.current=gameId;setContextGameId(gameId??0);setSelectedId(gameId??0);started.current=false;setScreen(initialPaid?'paid':'landing');},[gameId,initialPaid]);
  useEffect(()=>{headingRef.current?.focus({preventScroll:true});},[screen]);
  const boost=data?.boost as BoostPrompt|null;
  const overviewBoostVisible=!!data&&showOverviewBoost(data);
  useEffect(()=>{if(['dashboard','landing'].includes(screen)&&boost?.id&&overviewBoostVisible)void apiRequest('POST','/api/included-bounties/boost-event',{type:'boost_prompt_shown',prompt:boost.id,programmeId:programme?.id}).catch(()=>{});},[screen,boost?.id,overviewBoostVisible]);
  async function refresh(){await query.refetch();await Promise.all([queryClient.invalidateQueries({queryKey:['/api/campaigns/management']}),queryClient.invalidateQueries({queryKey:['/api/bounties']})]);}
  function go(next:Screen){setError('');setScreen(next);}
  function begin(){setAccess(restartSetup?null:programme?.access_method??(['free_to_play','public_demo'].includes(game?.access_method)?'free_to_play':null));setPreference(restartSetup?'both':programme?.activity_preference??'both');if(programme){setSelectedId(Number(programme.profile_game_id));go('access');}else if(game&&(selectedId||gameId||games.length===1)){setSelectedId(Number(game.id));go('access');}else go('game');}
  function start(){
    if(!restartSetup&&discovery&&!programme.opted_out_at){go('dashboard');return;}
    if(!data?.entitlement.eligible){setUpgrade(true);return;}
    if(!restartSetup&&discovery&&programme.opted_out_at){void availability();return;}
    setModal('start');
  }
  async function rememberIntroduction(){try{localStorage.setItem(`gamefolio:discovery-intro:${user?.id}`,'seen');}catch{}await apiRequest('POST','/api/included-bounties/introduction').catch(()=>{});}
  async function activate(){if(submitLock.current||!game||!access)return;submitLock.current=true;setBusy(true);setError('');try{await apiRequest('POST','/api/included-bounties/activate',{profileGameId:Number(game.id),access,preference});await queryClient.invalidateQueries({queryKey:contextKey});setContextGameId(Number(game.id));await refresh();go('success');if(restartSetup)navigate(`/game-dashboard?tab=campaigns&campaignSub=bounties&gameId=${game.id}`,{replace:true});}catch(e){setError(readableBountyError(e));}finally{submitLock.current=false;setBusy(false);}}
  async function availability(open?:boolean){const next=typeof open==='boolean'?open:!programme.is_open;if(next&&!data?.entitlement.eligible){setUpgrade(true);return;}setBusy(true);setError('');try{await apiRequest('PATCH','/api/included-bounties/availability',{open:next,profileGameId:programme.profile_game_id});await refresh();go('dashboard');}catch(e){setError(readableBountyError(e));}finally{setBusy(false);}}
  function addKeys(){if(!programme){start();return;}if(!bountyKeyType(programme.access_method)){changeAccess();return;}setKeysOpen(true);}
  function changeAccess(){if(!programme){start();return;}setAccess(programme.access_method);setSelectedId(Number(programme.profile_game_id));setAccessSettings(true);}
  async function saveAccess(){if(!programme||!access)return;setBusy(true);setError('');try{await apiRequest('PATCH','/api/included-bounties/access',{profileGameId:programme.profile_game_id,access});await refresh();setAccessSettings(false);}catch(e){setError(readableBountyError(e));}finally{setBusy(false);}}
  function viewAllSubmissions(){if(allSubmissionsRef.current){allSubmissionsRef.current.open=true;allSubmissionsRef.current.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});allSubmissionsRef.current.querySelector('summary')?.focus();}}
  function viewHistory(){const target=historyRef.current??document.getElementById('bounty-creator-activity');if(!target)return;const settings=target.closest('details');if(settings)settings.open=true;target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
  function openSubmission(submission:any){setOpenSubmissionRequest({id:Number(submission.id),sequence:Date.now()});}
  async function optOut(){setBusy(true);setError('');try{await apiRequest('PATCH','/api/included-bounties/availability',{open:false,optOut:true,profileGameId:programme.profile_game_id});await refresh();go('landing');}catch(e){setError(readableBountyError(e));}finally{setBusy(false);}}
  async function savePreference(){setBusy(true);setError('');try{await apiRequest('PATCH','/api/included-bounties/preference',{preference,profileGameId:programme.profile_game_id});await refresh();}catch(e){setError(readableBountyError(e));}finally{setBusy(false);}}
  function paid(prompt?:BoostPrompt){setBoostSeed(prompt??null);if(prompt)void apiRequest('POST','/api/included-bounties/boost-event',{type:'boost_prompt_clicked',prompt:prompt.id,programmeId:programme?.id}).catch(()=>{});go('paid');}
  const keyType=access?bountyKeyType(access):null,keys=keyType?Number(game?.inventory?.[keyType]?.available??0):0;
  const accessReady=!!access&&(!keyType||keys>0);
  const availabilityIssue=game ? bountyGameAvailabilityIssue(game.platforms,game.available_regions) : null;
  const participants=(activity?.participants??[]).filter((p:any)=>!['expired','cancelled','rejected','withdrawn','removed'].includes(p.status));
  const submissions=(activity?.submissions??[]).filter((s:any)=>s.status!=='staged'&&!(activity?.submissions??[]).some((n:any)=>Number(n.supersedes_submission_id)===Number(s.id)));
  const pending=submissions.filter((s:any)=>['pending','awaiting_review','under_review'].includes(s.status)).length;
  const approved=submissions.filter((s:any)=>s.status==='approved');
  const activeType=programme?bountyKeyType(programme.access_method):null,inventory=activeType?programme?.inventory?.[activeType]:null;
  const creators=new Set(participants.map((p:any)=>p.user_id)).size;
  const hubLink=bountyHubListingUrl(data?.opportunities);
  const reviewCreator=(id:number,instanceId?:number)=>navigate(`/game-dashboard?gameId=${programme.profile_game_id}&tab=campaigns&campaignSub=my&viewCampaign=${instanceId??activity.campaign.id}&campaignTab=Submissions&reviewCreator=${id}`);
  if(query.isLoading)return <div className="bounties-page bounty-loading" role="status"><Loader2 className="animate-spin"/>Loading bounties…</div>;
  if(query.isError||!data)return <div className="bounties-page"><h1>Bounties</h1><p role="alert">We couldn’t load your bounties.</p><button className={bountySecondary} onClick={()=>query.refetch()}>Try again</button></div>;
  const Header=({title,description}:{title:string;description?:string})=><header className="bounty-page-heading"><h1 ref={headingRef} tabIndex={-1}>{title}</h1>{description&&<p>{description}</p>}</header>;
  const help=<button type="button" className="bounty-text-action" onClick={()=>setModal('help')}>How bounties work</button>;
  return <section className={`bounties-page ${['landing','dashboard'].includes(screen)?'bounty-hub-layout':''}`}>
    <IndieDevUpgradeDialog open={upgrade} onOpenChange={setUpgrade}/>
    <Dialog open={modal!==null} onOpenChange={open=>{if(!open)setModal(null);}}><DialogContent onOpenAutoFocus={event=>{event.preventDefault();introHeadingRef.current?.focus({preventScroll:true});}} className="bounty-explainer border-[#303448] bg-[#0F101B] p-0 text-white">
      <div className="bounty-modal-art"><BountyArtwork url={game?.header_image_url}/><span/></div>
      <div className="bounty-modal-copy"><DialogTitle ref={introHeadingRef} tabIndex={-1} className="text-2xl font-bold outline-none sm:text-3xl">Open your game to creators</DialogTitle><DialogDescription className="mt-3 text-base leading-7 text-[#C4CBD8]">Add game keys and let gamers and streamers discover, play and share your game.</DialogDescription><ExchangeSteps/>
        <p className="bounty-exchange-statement">You provide the game. Creators provide the content.</p><p><em>Creator participation is not guaranteed.</em></p>
        <div className="bounty-actions mt-6"><button className={bountyPrimary} onClick={()=>{const intent=modal;setModal(null);void rememberIntroduction();if(intent==='start')begin();else if(programme)go('dashboard');else begin();}}>Open for Bounties<ArrowRight size={18}/></button><button className={bountySecondary} onClick={()=>setModal(null)}>Not now</button></div>
      </div></DialogContent></Dialog>
    <Dialog open={keysOpen} onOpenChange={setKeysOpen}><DialogContent className="bounty-explainer bg-[#0F101B] border-[#303448] text-white p-6"><DialogTitle>Add game keys</DialogTitle><DialogDescription className="text-[#C4CBD8]">Keys are reserved when creators join and issued through their tracked opportunity.</DialogDescription>{programmeGame&&activeType&&<div className="bounties-page !p-0"><BountyKeyUpload game={programmeGame} access={programme.access_method} onChanged={refresh}/></div>}</DialogContent></Dialog>
    <Dialog open={accessSettings} onOpenChange={setAccessSettings}><DialogContent className="bounty-explainer bg-[#0F101B] border-[#303448] text-white p-6"><DialogTitle>Change game access</DialogTitle><DialogDescription className="text-[#C4CBD8]">Choose access for new creator opportunities. Existing work and previously issued keys keep their original terms.</DialogDescription>{programmeGame&&<div className="bounties-page !p-0"><BountyGameAccess game={programmeGame} value={access} onChange={setAccess} onChanged={refresh}/><button className={bountyPrimary} disabled={busy||!accessReady||access===programme?.access_method} onClick={()=>void saveAccess()}>Save access method</button>{error&&<p role="alert">{error}</p>}</div>}</DialogContent></Dialog>
    <Dialog open={boostHelp} onOpenChange={setBoostHelp}><DialogContent className="bounty-explainer bg-[#0F101B] border-[#303448] text-white p-8"><DialogTitle className="text-2xl">A focused boost for your game</DialogTitle><DialogDescription className="text-base leading-7 text-[#C4CBD8]">Bounty Boost adds featured placement and developer-funded cash rewards to a campaign with the goals, creator places and promotional period you choose.</DialogDescription><p className="text-base text-[#C4CBD8]">Your game and access method carry through. You can review the objectives, costs and reward terms before paying. Participation and completed content are not guaranteed.</p><button className={bountyPrimary} onClick={()=>{setBoostHelp(false);paid(boost??undefined);}}>Build a Bounty Boost<ArrowRight size={18}/></button></DialogContent></Dialog>
    {error&&!accessSettings&&<p role="alert" className="bounty-error">{error}</p>}
    {restartSetup&&['landing','game','access','review'].includes(screen)&&<p className="bounty-note">Test setup restart · Your previous test records are preserved.</p>}
    {['landing','dashboard'].includes(screen)&&<><BountyCampaignHub data={restartSetup&&screen==='landing'?{...data,programme:null,activity:null,opportunities:[],feed:[]}:data} game={programmeGame??game} busy={busy} onSelectGame={id=>navigate(`/game-dashboard?tab=campaigns&campaignSub=bounties&gameId=${id}`)} onStart={start} onResume={()=>void availability(true)} onPause={()=>void availability(false)} onKeys={addKeys} onAccess={changeAccess} onHelp={()=>setModal('help')} onOpen={openSubmission} onAll={viewAllSubmissions} onBoost={()=>paid(boost??undefined)} onBoostLearn={()=>setBoostHelp(true)} onHistory={viewHistory}/>
      {activity&&submissions.length>0&&<details ref={allSubmissionsRef} className="hub-all-submissions"><summary>All creator submissions · {submissions.length}</summary><CampaignContentLibrary data={activity} allTypes onReviewCreator={reviewCreator} openRequest={openSubmissionRequest}/></details>}
      {programme&&<details className="bounty-settings"><summary>Bounty settings & insights</summary><dl className="hub-operational-details">{[
        ['Bounty status',programme.status],
        ['Game access',activeType?activeType==='full'?'Full-game keys':'Demo keys':'No key required'],
        ...(activeType?[['Keys remaining',Number(inventory?.available??0)]]:[]),
        ['Monthly creator allowance',discovery?'No monthly limit':'Managed by your plan'],
        ['Listing visibility',programme.is_open&&!programme.opted_out_at&&programme.status!=='Game Profile incomplete'&&data.entitlement.eligible&&(!activeType||Number(inventory?.available??0)>0)?'Visible in the Bounty Hub':'Not accepting new creators'],
      ].map(([label,value])=><div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="bounty-metrics bounty-activity-metrics">{[['Creator interest',data.analytics?.listing_open??0],['Keys claimed',data.analytics?.key_claims??0],['Streams completed',approved.filter((s:any)=>s.content_type==='stream').length],['Paid boosts launched',data.analytics?.payment_completed??0]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><p>Creator interest counts Bounty Hub listing opens. Approved work is shown after review.</p>{!!data.refunds?.length&&<><h3>Bounty Boost refunds</h3>{data.refunds.map((refund:any)=><div key={refund.campaign_id} className="bounty-row mt-4"><span>{refund.campaign_title}</span><span>{new Intl.NumberFormat(undefined,{style:'currency',currency:refund.currency}).format(refund.amount_pence/100)} · {refund.status==='refunded'?'Refunded':refund.status==='not_needed'?'No unused rewards':refund.status==='failed'?'Refund needs support review':'Refund processing'}</span></div>)}</>}{discovery&&<><p>What creator activity are you open to? Changing your preference only affects new claims.</p><ActivityPreference value={preference} onChange={setPreference}/><div className="bounty-actions mt-5"><button className={bountySecondary} disabled={busy||preference===programme.activity_preference} onClick={()=>void savePreference()}>Save preference</button></div></>}<div className="bounty-actions mt-6"><button className="bounty-text-action" onClick={changeAccess}>Change access method</button>{programme.is_open?<button className="bounty-text-action" disabled={busy} onClick={()=>void availability(false)}>Pause bounties</button>:<button className="bounty-text-action" disabled={busy} onClick={()=>void availability(true)}>Resume bounties</button>}{!programme.opted_out_at&&<button className="bounty-text-action" disabled={busy} onClick={()=>void optOut()}>Opt out of bounties</button>}</div>{ !!data.history?.length&&<div ref={historyRef} className="hub-history"><h3>Previous bounty activity</h3>{data.history.map((past:any)=><div key={past.instance_id} className="bounty-row mt-5"><div><h3>{past.campaign_title}</h3><p>{String(past.status).replaceAll('_',' ')}</p></div><a className={bountySecondary} href={`/game-dashboard?gameId=${programme.profile_game_id}&tab=campaigns&campaignSub=my&viewCampaign=${past.instance_id}&campaignTab=Submissions`}>View campaign</a></div>)}</div>}</details>}

    </>}
    {['game','access','review'].includes(screen)&&<><div className="bounty-row"><button className="bounty-text-action" onClick={()=>go(screen==='game'?'landing':screen==='access'?(programme&&!restartSetup?'dashboard':games.length>1&&!gameId?'game':'landing'):'access')}><ArrowLeft size={17}/>Back</button>{help}</div>
      {screen==='game'&&<><Header title="Which game would you like to open?"/><label className="bounty-search">Find your game<input value={search} onChange={e=>setSearch(e.target.value)} type="search" placeholder="Search your registered games"/></label><div className="bounty-game-list">{games.filter((g:any)=>g.game_name.toLowerCase().includes(search.toLowerCase())).map((g:any)=><button type="button" key={g.id} aria-pressed={selectedId===Number(g.id)} className={`bounty-choice ${selectedId===Number(g.id)?'is-selected':''}`} onClick={()=>{setSelectedId(Number(g.id));setAccess(['free_to_play','public_demo'].includes(g.access_method)?'free_to_play':null);}}><GameIdentity game={g}/><p>{Number(g.inventory?.demo?.available??0)+Number(g.inventory?.full?.available??0)} keys available</p></button>)}</div>{!games.length&&<a className="bounty-text-action" href="/game-dashboard?tab=game-profile">Add a game in Game Profile</a>}<div className="bounty-actions"><button className={bountyPrimary} disabled={!selectedId||!games.some((g:any)=>Number(g.id)===selectedId)} onClick={()=>go('access')}>Continue<ArrowRight size={18}/></button></div></>}
      {game&&availabilityIssue&&screen!=='game'&&<p role="status" className="bounty-note">{availabilityIssue} <a href={bountyGameProfileUrl(game)} className="bounty-text-action">Edit Game Profile</a></p>}
      {screen==='access'&&game&&<><Header title="Add game access" description="Keys are reserved when creators join and issued automatically."/><GameIdentity game={game}/><BountyGameAccess game={game} value={access} onChange={setAccess} onChanged={refresh}/><details className="bounty-settings"><summary>Creator activity preference · {CREATOR_PREFERENCES[preference].title}</summary><p>What creator activity are you open to?</p><ActivityPreference value={preference} onChange={setPreference}/></details><div className="bounty-actions"><button className={bountyPrimary} disabled={!accessReady||!!availabilityIssue} onClick={()=>go('review')}>Continue<ArrowRight size={18}/></button></div></>}
      {screen==='review'&&game&&<><Header title={`Ready to open ${game.game_name} for bounties?`}/><div className="bounty-review"><GameIdentity game={game}/><dl><div><dt>Game access</dt><dd>{keyType?`${keys} ${keyType==='full'?'full-game':'demo'} keys available`:'No game key required'}</dd></div><div><dt>Creator opportunities</dt><dd>{CREATOR_PREFERENCES[preference].title}</dd></div><div><dt>Gamefolio handles</dt><dd>Creator objectives · XP rewards · Deadlines · Key distribution · Submission management</dd></div></dl><p>{disclaimer}</p>{programme&&!discovery&&<p className="mt-4">Existing campaigns, work and agreed rewards will remain unchanged.</p>}</div><div className="bounty-actions"><button className={bountyPrimary} disabled={busy||!accessReady||!!availabilityIssue} onClick={()=>void activate()}>{busy?<Loader2 size={18} className="animate-spin"/>:<Check size={18}/>}Open {game.game_name} for Bounties</button><button className={bountySecondary} disabled={busy} onClick={()=>go('access')}>Back</button></div></>}
    </>}
    {screen==='success'&&programme&&<BountyOpenedConfirmation game={programmeGame??game} headingRef={headingRef} keys={activeType?inventory?.available??0:'No key needed'} creators={creators} pending={pending} approved={approved.length} hubLink={hubLink} onDashboard={()=>go('dashboard')} onKeys={()=>{go('dashboard');addKeys();}} onAvailability={()=>void availability()} isOpen={programme.is_open} busy={busy}/>}
    {screen==='paid'&&<PaidBountyBuilder games={games} initialGameId={programmeGame?.id??game?.id} seed={{access:programme?.access_method,preference:boostSeed?.kind??programme?.activity_preference??'content',bestType:boostSeed?.bestType,sourceProgrammeId:programme?.id}} onBack={()=>go(programme?'dashboard':'landing')}/>}
  </section>;
}
