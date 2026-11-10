import { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ClipboardCheck, Clock3, Film, KeyRound, Pause, Play, Radio, Share2, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useSignedUrl } from '@/hooks/use-signed-url';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { bountyKeyType } from '@shared/included-bounty';
import { BOUNTY_HERO_COPY, bountyHubState, bountyHubListingUrl, bountyCreatorRows, showOverviewBoost, heroArtworkSources, hubSubmissions, INACTIVE_CREATOR_STATUSES, REVIEW_STATUSES, isLiveSubmission, isVerifiedStream, parseStreamEvidence, type BountyHubState } from '@shared/bounty-hub-view';
import { feedbackText } from './CampaignContentLibrary';
import { bountyGameProfileUrl, bountyPrimary, bountySecondary } from './BountyGameAccess';
import { bountyGameAvailabilityIssue } from '@shared/bounty-game-availability';
import './bounty-campaign-hub.css';

function HubImage({source,alt='',className='',onUnavailable}:{source?:string|null;alt?:string;className?:string;onUnavailable?:()=>void}) {
  const {signedUrl}=useSignedUrl(source);const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[source]);
  return signedUrl&&!failed?<img src={signedUrl} alt={alt} className={className} loading="lazy" onError={()=>{setFailed(true);onUnavailable?.();}}/>:null;
}
function Creator({submission,participants,compact=false}:{submission:any;participants:any[];compact?:boolean}) {
  const person=participants.find(p=>Number(p.user_id)===Number(submission.participant_id))??submission;
  return <span className={`hub-creator ${compact?'is-compact':''}`}>{person.avatar_url&&<HubImage source={person.avatar_url}/>}<span>@{person.username??submission.username??'Creator'}</span></span>;
}
const typeLabels:Record<string,string>={clip:'Gameplay clip',reel:'Vertical reel',screenshot:'Screenshot',stream:'Stream recording',livestream:'Stream recording',review:'Creator review',feedback:'Creator feedback',bug:'Bug report'};
function MediaVisual({submission,posterOnly=false}:{submission:any;posterOnly?:boolean}) {
  const evidence=parseStreamEvidence(submission.content_data),session=evidence.sessions?.[0]??evidence;
  const poster=submission.thumbnail_url??session.thumbnailUrl??evidence.thumbnailUrl;
  const source=submission.content_type==='screenshot'?submission.image_url:poster;
  const {signedUrl:video}=useSignedUrl(source?null:submission.video_url);
  const {signedUrl:posterUrl}=useSignedUrl(source);
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[submission.id]);
  return <span className={`hub-media-visual type-${submission.content_type}`}>
    {!failed&&posterUrl?<img src={posterUrl} alt={submission.media_title??typeLabels[submission.content_type]} onError={()=>setFailed(true)} loading="lazy"/>:!failed&&video&&!posterOnly?<video src={video} muted playsInline preload="metadata" onError={()=>setFailed(true)} onLoadedMetadata={e=>{const v=e.currentTarget;v.currentTime=Math.min(.5,Number.isFinite(v.duration)?v.duration/2:.1);}}/>:<span className="hub-media-unavailable">{['feedback','review','bug'].includes(submission.content_type)?<span>{feedbackText(submission.content_data).slice(0,150)||'Read the creator’s response'}</span>:<><Film size={24} aria-hidden="true"/><span>{failed?'Open submitted media':'View submitted media'}</span></>}</span>}
    {['clip','reel','stream','livestream'].includes(submission.content_type)&&<span className="hub-play-mark"><Play size={20} fill="currentColor" aria-hidden="true"/></span>}
  </span>;
}
function HeroArtwork({game}:{game:any}) {
  const sources=heroArtworkSources(game),signature=sources.map(s=>s.url).join('|');
  const [index,setIndex]=useState(0);
  useEffect(()=>setIndex(0),[signature]);
  const current=sources[index];
  const {signedUrl}=useSignedUrl(current?.url);
  // Focal data is optional; current game profiles normally use a centred image.
  const position=typeof game?.header_image_position==='string'&&/^\d{1,3}% \d{1,3}%$/.test(game.header_image_position)?game.header_image_position:'68% 50%';
  return <div className={`hub-game-art ${current?.portrait?'is-portrait':''} ${!current?'is-unavailable':''}`} aria-hidden="true">
    {signedUrl&&current?<>{current.portrait&&<img className="hub-art-atmosphere" src={signedUrl} alt=""/>}<img key={current.url} src={signedUrl} alt="" style={{objectPosition:position}} className="hub-art-main" onError={()=>setIndex(i=>i+1)}/></>:<div className="hub-game-wordmark"><span>GAMEFOLIO</span><strong>{game?.game_name??'Your game'}</strong><span>CREATOR OPPORTUNITIES</span></div>}
    <div className="hub-art-shade"/>
  </div>;
}
function AvatarStack({participants}:{participants:any[]}) {
  const people=participants.filter((p,index,all)=>p.avatar_url&&all.findIndex(other=>Number(other.user_id)===Number(p.user_id))===index).slice(0,3);
  return people.length?<span className="hub-avatar-stack">{people.map(p=><HubImage key={p.user_id} source={p.avatar_url} alt={`@${p.username}`}/>)}</span>:null;
}
function VisualStory({submissions,participants,onOpen,review}:{submissions:any[];participants:any[];onOpen:(s:any)=>void;review?:any}) {
  const picks=review?[review]:[submissions.find(s=>['clip','reel'].includes(s.content_type)),submissions.find(s=>s.content_type==='screenshot'),submissions.find(s=>isVerifiedStream(s)||isLiveSubmission(s))].filter(Boolean);
  if(!picks.length)return null;
  return <div className={`hub-visual-story ${review?'is-review':''}`} aria-label={review?'Newest submission awaiting review':'Creator content from this game'}>{picks.slice(0,3).map((s,index)=><button type="button" key={s.id} className={`hub-floating-media floating-${index} ${s.content_type==='reel'?'is-reel':''}`} onClick={()=>onOpen(s)} aria-label={`${review?'Review':'View'} ${typeLabels[s.content_type]} by ${s.username??'creator'}`}><MediaVisual submission={s} posterOnly/><span className="hub-floating-meta"><span>{isLiveSubmission(s)?<span className="hub-live">LIVE</span>:isVerifiedStream(s)?<><ShieldCheck size={13}/>Verified stream</>:typeLabels[s.content_type]}</span><Creator submission={s} participants={participants} compact/></span></button>)}<div className="hub-story-people"><AvatarStack participants={participants}/><span className="hub-key-symbol"><KeyRound size={17}/><span className="sr-only">Game access connects creators with your game</span></span></div></div>;
}
const icons:Record<BountyHubState,any>={'never-enabled':Sparkles,active:Check,paused:Pause,'keys-required':KeyRound,'awaiting-review':ClipboardCheck,'profile-required':ClipboardCheck};
export function BountyStateHero({state,game,submissions,participants,pending,busy,programme,onStart,onResume,onPause,onKeys,onAccess,onHelp,onActivity,onHistory,onOpen,hubLink,onShare}:{state:BountyHubState;game:any;submissions:any[];participants:any[];pending:any[];busy:boolean;programme:any;onStart:()=>void;onResume:()=>void;onPause:()=>void;onKeys:()=>void;onAccess:()=>void;onHelp:()=>void;onActivity:()=>void;onHistory:()=>void;onOpen:(s:any)=>void;hubLink:string;onShare:()=>void}) {
  const copy=BOUNTY_HERO_COPY[state],Icon=icons[state];
  const activeCount=new Set(participants.filter(p=>!INACTIVE_CREATOR_STATUSES.includes(p.status)).map(p=>p.user_id)).size;
  const primary=state==='never-enabled'?onStart:state==='paused'?onResume:state==='keys-required'?onKeys:()=>onOpen(pending[0]);
  const secondary=state==='never-enabled'?onHelp:state==='paused'?onHistory:state==='keys-required'?onAccess:onActivity;
  return <section className={`hub-state-hero state-${state}`} aria-label={`${game?.game_name??'Your game'} bounty status`}>
    <HeroArtwork game={game}/>{state==='awaiting-review'&&<VisualStory submissions={submissions} participants={participants} onOpen={onOpen} review={pending[0]}/>}
    <div className="hub-hero-copy"><p className={`hub-state-label ${state==='active'?'is-open':''}`}><Icon size={16} aria-hidden="true"/>{copy.badge}</p><div className="hub-hero-game">{game?.game_name??'Your game'}</div><h2>{state==='awaiting-review'&&pending.length>1?`${pending.length} submissions are ready`:copy.heading}</h2><p className="hub-hero-description">{copy.description}</p>
      {state==='active'&&activeCount>0&&<p className="hub-hero-participation"><AvatarStack participants={participants}/><span><strong>{activeCount}</strong> {activeCount===1?'creator participating':'creators participating'} · <strong>{pending.length}</strong> awaiting review</span></p>}
      {state==='awaiting-review'&&<p className="hub-review-count">{pending.length} {pending.length===1?'submission':'submissions'} awaiting review</p>}
      <div className="hub-hero-actions">{state==='active'?<><a className={bountyPrimary} href={hubLink}>{copy.primary}<ArrowRight size={18}/></a><button type="button" className={bountySecondary} onClick={onShare}><Share2 size={17}/>{copy.secondary}</button></>:state==='profile-required'?<><a className={bountyPrimary} href={bountyGameProfileUrl(game)}>{copy.primary}<ArrowRight size={18}/></a><button type="button" className="hub-quiet-action" onClick={onHelp}>{copy.secondary}</button></>:<><button type="button" className={bountyPrimary} disabled={busy} onClick={primary}>{copy.primary}<ArrowRight size={18}/></button><button type="button" className={state==='never-enabled'?'hub-quiet-action':bountySecondary} disabled={busy} onClick={secondary}>{copy.secondary}</button></>}</div>
      <div className="hub-hero-footer">{state==='active'?<button type="button" onClick={onPause} disabled={busy}>Pause bounties</button>:state==='never-enabled'?<span>Creator participation is not guaranteed.</span>:['paused','profile-required'].includes(state)?null:programme&&!programme.is_open?<span>Bounties are paused. Existing work remains available for review.</span>:<button type="button" onClick={onHelp}>How bounties work</button>}</div>
    </div>
  </section>;
}
function GameSwitcher({games,game,onSelect}:{games:any[];game:any;onSelect:(id:number)=>void}) {
  const [open,setOpen]=useState(false);
  return <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button className="hub-game-switcher" aria-label={`Selected game: ${game?.game_name??'Choose game'}`}><span className="hub-switch-cover"><HubImage source={game?.capsule_image_url}/></span><span>{game?.game_name??'Choose game'}</span><ChevronDown size={17}/></button></PopoverTrigger><PopoverContent align="end" className="hub-switch-menu w-72 border-[#303448] bg-[#141824] p-2 text-white"><p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#C4CBD8]">Your games</p>{games.map(g=><button key={g.id} onClick={()=>{onSelect(Number(g.id));setOpen(false);}} className="hub-switch-option" aria-current={Number(g.id)===Number(game?.id)?'true':undefined}><span className="hub-switch-cover"><HubImage source={g.capsule_image_url}/></span><span>{g.game_name}</span>{Number(g.id)===Number(game?.id)&&<Check size={17}/>}</button>)}</PopoverContent></Popover>;
}
const eventCopy:Record<string,{action:string;Icon:any}>={creator_joined:{action:'claimed an opportunity',Icon:Users},reserved:{action:'had a game key reserved',Icon:KeyRound},revealed:{action:'received a game key',Icon:KeyRound},issued:{action:'received a game key',Icon:KeyRound},content_submitted:{action:'submitted creator content',Icon:Film},stream_started:{action:'started a stream',Icon:Radio},stream_completed:{action:'completed a stream',Icon:ShieldCheck},changes_requested:{action:'received a request for changes',Icon:Clock3},submission_changes_requested:{action:'received a request for changes',Icon:Clock3},submission_approved:{action:'had a submission approved',Icon:Check},approved:{action:'had a submission approved',Icon:Check},reward_awarded:{action:'received an XP reward',Icon:Sparkles},reward_distributed:{action:'received an XP reward',Icon:Sparkles}};
function ActivityTimeline({data,submissions,state,hubLink,onOpen,onHelp,onShare}:{data:any;submissions:any[];state:BountyHubState;hubLink:string;onOpen:(s:any)=>void;onHelp:()=>void;onShare:()=>void}) {
  const [expanded,setExpanded]=useState(false);
  const creators=bountyCreatorRows(data.activity),events=data.feed??[];
  // Submitted work is shown in the content section; avoid an unrelated empty activity message.
  if(!creators.length&&submissions.length)return null;
  if(!creators.length)return <section className="hub-activity" id="bounty-creator-activity" tabIndex={-1}><div className="hub-activity-empty"><span className="hub-empty-orbit" aria-hidden="true"><Users size={27}/></span><div><h2>{state==='active'?'Waiting for your first creator':state==='paused'?'Your creator history stays here':state==='keys-required'?'Make your game available to creators':'Your creator activity starts here'}</h2><p>{state==='active'?'Your game is visible in the Bounty Hub. When a creator claims an opportunity, their progress and submitted work will appear here.':state==='paused'?'Resume bounties when you’re ready. Existing creator work and history remain available.':state==='keys-required'?'Add game keys to let creators claim an opportunity.':'Open your game to see creator progress and submitted work here.'}</p><div className="hub-empty-links">{state==='active'&&<><a href={hubLink}>View Bounty Hub listing<ArrowRight size={16}/></a><button onClick={onShare}>Share bounty</button></>}<button onClick={onHelp}>How creator discovery works</button></div></div></div></section>;
  return <section className="hub-activity" id="bounty-creator-activity" tabIndex={-1}><div className="hub-section-heading"><div><h2>Creator activity</h2><p>Progress, deadlines and the work that needs your attention.</p></div></div><div className="hub-participants">{creators.slice(0,expanded?creators.length:6).map((row:any)=>{const p=row.participant;const url=`/game-dashboard?gameId=${data.programme.profile_game_id}&tab=campaigns&campaignSub=my&viewCampaign=${p.instance_id}&campaignTab=${row.work.length?'Submissions':'Creators'}&creator=${p.user_id}`;return <article className={`hub-participant ${row.review?'needs-review':''}`} key={p.id??`${p.instance_id}-${p.user_id}`}>
    <div className="hub-participant-identity">{p.avatar_url&&<HubImage source={p.avatar_url} alt=""/>}<div><h3>@{p.username}</h3><p>{row.opportunity} · Joined <time dateTime={p.joined_at}>{dateLabel(p.joined_at)}</time></p></div></div>
    <div className="hub-participant-progress"><span className={`hub-participant-status ${row.status==='Approved'?'is-approved':''}`}>{row.review?<ClipboardCheck size={16}/>:row.status==='Approved'?<Check size={16}/>:<Clock3 size={16}/>} {row.status}</span>{row.deadline&&!['Approved','Did not complete'].includes(row.status)&&<p>Due <time dateTime={row.deadline}>{dateLabel(row.deadline)}</time></p>}</div>
    {row.review?<button className={bountyPrimary} onClick={()=>onOpen(row.review)}>Review submission<ArrowRight size={16}/></button>:<a className="hub-quiet-action" href={url}>{row.work.length?'View submissions':'View opportunity'}<ArrowRight size={16}/></a>}
  </article>;})}</div>{creators.length>6&&<button className="hub-quiet-action" onClick={()=>setExpanded(v=>!v)}>{expanded?'Show fewer creators':`View all creators (${creators.length})`}</button>}
  {!!events.length&&<details className="hub-recent-events"><summary>Recent activity</summary><ol>{events.slice(0,8).map((event:any)=><li key={event.id}><span><strong>{event.username?`@${event.username}`:'Gamefolio'}</strong> {eventCopy[event.type]?.action??String(event.type).replaceAll('_',' ')}</span><time dateTime={event.at}>{dateLabel(event.at)}</time></li>)}</ol></details>}</section>;
}
function dateLabel(value:string){return Number.isFinite(Date.parse(value))?new Date(value).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'Date not recorded';}
function LatestContent({submissions,participants,game,gamesCount,onOpen,onAll}:{submissions:any[];participants:any[];game:any;gamesCount:number;onOpen:(s:any)=>void;onAll:()=>void}) {
  const items=submissions.filter(s=>['clip','reel','screenshot','stream','livestream','review','feedback','bug'].includes(s.content_type)).slice(0,12);
  const [viewport,api]=useEmblaCarousel({align:'start',containScroll:'trimSnaps',duration:24,watchDrag:true});
  const [position,setPosition]=useState(0),[snaps,setSnaps]=useState<number[]>([]),[scrollable,setScrollable]=useState(false);
  useEffect(()=>{if(!api)return;const update=()=>{setPosition(api.selectedScrollSnap());setSnaps(api.scrollSnapList());setScrollable(api.canScrollNext()||api.canScrollPrev());};update();api.on('select',update);api.on('reInit',update);return()=>{api.off('select',update);api.off('reInit',update);};},[api]);
  const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function move(direction:number){if(!api)return;api.scrollTo(Math.max(0,Math.min(snaps.length-1,position+direction)),reduced());}
  return <section className="hub-latest" id="bounty-latest-content" tabIndex={-1}><div className="hub-section-heading"><div><h2>Creator content</h2><p>Submitted content, feedback and verified streams.</p></div><div className="hub-carousel-heading-actions">{submissions.length>0&&<button className="hub-quiet-action" onClick={onAll}>View all submissions<ArrowRight size={16}/></button>}{scrollable&&<div className="hub-carousel-arrows"><button type="button" aria-label="Previous creator content" disabled={!api?.canScrollPrev()} onClick={()=>move(-1)}><ArrowLeft size={19}/></button><button type="button" aria-label="Next creator content" disabled={!api?.canScrollNext()} onClick={()=>move(1)}><ArrowRight size={19}/></button></div>}</div></div>
    {items.length?<><div ref={viewport} className="hub-content-viewport" role="region" aria-roledescription="carousel" aria-label="Latest submitted content" tabIndex={0} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}}}><div className="hub-content-track">{items.map(s=><article className={`hub-content-card ${s.content_type==='reel'?'is-reel':''}`} key={s.id}><button type="button" onClick={()=>onOpen(s)} className="hub-content-open" aria-label={`View ${typeLabels[s.content_type]} by ${s.username??'creator'}`}><MediaVisual submission={s}/><span className="hub-content-type">{isLiveSubmission(s)?<><Radio size={13}/>LIVE</>:isVerifiedStream(s)?<><ShieldCheck size={13}/>Verified stream</>:typeLabels[s.content_type]}</span></button><div className="hub-content-meta"><Creator submission={s} participants={participants}/><span className={`hub-submission-status ${s.status==='approved'?'is-approved':''}`}>{s.status==='approved'?<Check size={13}/>:<Clock3 size={13}/>} {REVIEW_STATUSES.includes(s.status)?'Awaiting review':String(s.status).replaceAll('_',' ')}</span><div className="hub-content-date"><time dateTime={s.submitted_at}>{Number.isFinite(Date.parse(s.submitted_at))?new Date(s.submitted_at).toLocaleDateString(undefined,{day:'numeric',month:'short'}):'Date not recorded'}</time>{gamesCount>1&&<span>{game?.game_name}</span>}</div><button type="button" className="hub-content-action" onClick={()=>onOpen(s)}>{REVIEW_STATUSES.includes(s.status)?'Review submission':'Open submission'}<ArrowRight size={15}/></button></div></article>)}</div></div>{scrollable&&snaps.length<=12&&<div className="hub-carousel-dots" aria-label="Content pages">{snaps.map((_,index)=><button key={index} aria-label={`Go to content page ${index+1}`} aria-current={position===index?'true':undefined} onClick={()=>api?.scrollTo(index,reduced())}/>)}</div>}</>:<div className="hub-content-empty"><div className="hub-empty-media" aria-hidden="true"><span/><span/><Film size={24}/></div><div><h3>Your creators’ work will live here</h3><p>Clips, screenshots and stream recordings appear as creators submit them.</p>{submissions.length>0&&<button className="hub-quiet-action" onClick={onAll}>View feedback and reviews<ArrowRight size={16}/></button>}</div></div>}
  </section>;
}
export function BountyBoostBanner({game,submissions,participants,onBoost,onLearn}:{game:any;submissions:any[];participants:any[];onBoost:()=>void;onLearn:()=>void}) {
  const successful=submissions.find(s=>s.status==='approved'&&['clip','reel','screenshot','stream'].includes(s.content_type));
  return <section className="hub-boost-banner"><div className="hub-boost-light" aria-hidden="true"/><div className="hub-boost-art" aria-hidden="true">{successful?<MediaVisual submission={successful} posterOnly/>:<HubImage source={game?.capsule_image_url??game?.catalog_image_url}/>}<AvatarStack participants={participants}/><span className="hub-boost-stamp"><Sparkles size={18}/>BOUNTY BOOST</span></div><div className="hub-boost-copy"><p className="hub-boost-eyebrow"><Sparkles size={15}/>Bounty Boost</p><h2>Want to reach more creators?</h2><p>Boost your game with featured placement, funded creator rewards and a focused campaign brief.</p><div className="hub-hero-actions"><button className={bountyPrimary} onClick={onBoost}>Explore Bounty Boost<ArrowRight size={18}/></button><button className="hub-quiet-action" onClick={onLearn}>How Bounty Boost works</button></div></div></section>;
}
export default function BountyCampaignHub({data,game,busy,onSelectGame,onStart,onResume,onPause,onKeys,onAccess,onHelp,onOpen,onAll,onBoost,onBoostLearn,onHistory}:{data:any;game:any;busy:boolean;onSelectGame:(id:number)=>void;onStart:()=>void;onResume:()=>void;onPause:()=>void;onKeys:()=>void;onAccess:()=>void;onHelp:()=>void;onOpen:(s:any)=>void;onAll:()=>void;onBoost:()=>void;onBoostLearn:()=>void;onHistory:()=>void}) {
  const [shareOpen,setShareOpen]=useState(false),[copied,setCopied]=useState(false),[shareError,setShareError]=useState('');
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),60000);return()=>window.clearInterval(timer);},[]);
  const programme=data.programme,participants=data.activity?.participants??[],submissions=hubSubmissions(data.activity?.submissions);
  const pending=submissions.filter(s=>REVIEW_STATUSES.includes(s.status)),approved=submissions.filter(s=>s.status==='approved');
  const type=programme?bountyKeyType(programme.access_method):null,keys=type?Number(programme.inventory?.[type]?.available??0):0;
  const active=new Set(participants.filter((p:any)=>!INACTIVE_CREATOR_STATUSES.includes(p.status)).map((p:any)=>p.user_id)).size;
  const availabilityIssue=game&&(!programme||programme.model_version==='discovery-v2')
    ? bountyGameAvailabilityIssue(game.platforms,game.available_regions) : null;
  const state=bountyHubState({programme,eligible:data.entitlement.eligible,submissions,availableKeys:keys,availabilityIssue});
  const hubLink=bountyHubListingUrl(data.opportunities);
  const shareUrl=new URL(hubLink,window.location.origin).href;
  async function copyLink(){try{await navigator.clipboard.writeText(shareUrl);setCopied(true);setShareError('');}catch{setShareError('Select and copy the link above.');}}
  function share(){setCopied(false);setShareError('');setShareOpen(true);}
  function scrollToActivity(){const target=document.getElementById('bounty-creator-activity');target?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});target?.focus({preventScroll:true});}
  return <div className="bounty-campaign-hub"><header className="hub-page-header"><div><h1>Bounties Overview</h1><p>Your game, creator progress and submitted work.</p></div>{data.games.length>1&&<GameSwitcher games={data.games} game={game} onSelect={onSelectGame}/>}</header>
    <BountyStateHero onShare={share} hubLink={hubLink} state={state} game={game} submissions={submissions} participants={participants} pending={pending} busy={busy} programme={programme} onStart={onStart} onResume={onResume} onPause={onPause} onKeys={onKeys} onAccess={onAccess} onHelp={onHelp} onActivity={scrollToActivity} onHistory={onHistory} onOpen={onOpen}/>
    <dl className="hub-metrics-strip" aria-label="Live bounty metrics">{[{label:'Game access',value:programme?type?`${keys} ${type==='full'?'full-game':'demo'} keys`:'No key required':'Not set',positive:false},{label:'Active creators',value:active,positive:false},{label:'Awaiting review',value:pending.length,positive:pending.length>0},{label:'Approved submissions',value:approved.length,positive:approved.length>0}].map(item=><div key={item.label}><dd className={item.positive?'is-positive':''}>{item.value}</dd><dt>{item.label}</dt></div>)}</dl>
    <ActivityTimeline data={data} state={state} submissions={submissions} hubLink={hubLink} onOpen={onOpen} onHelp={onHelp} onShare={share}/>
    {submissions.length>0&&<LatestContent submissions={submissions} participants={participants} game={game} gamesCount={data.games.length} onOpen={onOpen} onAll={onAll}/>}
    {showOverviewBoost(data,now)&&state==='active'&&<BountyBoostBanner game={game} submissions={submissions} participants={participants} onBoost={onBoost} onLearn={onBoostLearn}/>}
    <Dialog open={shareOpen} onOpenChange={setShareOpen}><DialogContent className="bounty-explainer hub-share-dialog bg-[#141824] border-[#303448] text-white p-7"><DialogTitle>Share your bounty</DialogTitle><DialogDescription className="text-base text-[#C4CBD8]">Send creators the link to {game?.game_name} in the Bounty Hub.</DialogDescription><label className="hub-share-field">Bounty listing<input readOnly value={shareUrl} onFocus={event=>event.currentTarget.select()}/></label><button type="button" className={bountyPrimary} onClick={()=>void copyLink()}>{copied?<Check size={17}/>:<Share2 size={17}/>} {copied?'Link copied':'Copy link'}</button><p role="status">{shareError||(copied?'Ready to share with creators.':'')}</p></DialogContent></Dialog>
  </div>;
}
