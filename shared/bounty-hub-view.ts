import { bountyKeyType } from './included-bounty';
import { workspaceCreator } from './campaign-workspace-progress';
export type BountyHubState='never-enabled'|'active'|'paused'|'keys-required'|'awaiting-review'|'profile-required';
export const REVIEW_STATUSES=['pending','awaiting_review','under_review'];
export const INACTIVE_CREATOR_STATUSES=['expired','cancelled','rejected','withdrawn','removed','completed','completed_and_verified','full_game_awarded'];
export function hubSubmissions(submissions:any[]=[]) {
  const superseded=new Set(submissions.map(s=>Number(s.supersedes_submission_id)).filter(Boolean));
  return submissions.filter(s=>s.status!=='staged'&&!superseded.has(Number(s.id))).sort((a,b)=>(Date.parse(b.submitted_at)||0)-(Date.parse(a.submitted_at)||0)||Number(b.id)-Number(a.id));
}
/** Presentation only. Opt-in, visibility, entitlement and inventory remain authoritative records. */
export function bountyHubState(input:{programme?:any;eligible:boolean;submissions?:any[];availableKeys?:number;availabilityIssue?:string|null}):BountyHubState {
  if(hubSubmissions(input.submissions).some(s=>REVIEW_STATUSES.includes(s.status)))return 'awaiting-review';
  const p=input.programme;
  if(input.availabilityIssue)return 'profile-required';
  if(!p)return 'never-enabled';
  if(p.is_open&&!p.opted_out_at&&input.eligible&&bountyKeyType(p.access_method)&&Number(input.availableKeys??0)<1)return 'keys-required';
  if(!p.is_open||p.opted_out_at||!input.eligible)return 'paused';
  return 'active';
}
export const BOUNTY_HERO_COPY:Record<BountyHubState,{badge:string;heading:string;description:string;primary:string;secondary:string}>={
  'never-enabled':{badge:'Bounties not enabled',heading:'Open your game to creators',description:'Add game access and let gamers and streamers discover, play and share your game.',primary:'Open for Bounties',secondary:'How bounties work'},
  paused:{badge:'Bounties paused',heading:'Ready to put your game back in front of creators?',description:'Resume bounties to make your game discoverable in the Bounty Hub again. Your existing creator work and history remain available.',primary:'Resume bounties',secondary:'View previous activity'},
  active:{badge:'Open for Bounties',heading:'Your game is discoverable',description:'Creators can discover your game, claim an opportunity and submit content, feedback or a verified stream.',primary:'View Bounty Hub listing',secondary:'Share bounty'},
  'keys-required':{badge:'Action required',heading:'Add more game keys',description:'Your bounty listing is paused because no game access remains.',primary:'Add game keys',secondary:'Change access method'},
  'awaiting-review':{badge:'Action required',heading:'A creator submission is ready',description:'Review the completed work and approve it or request changes.',primary:'Review submission',secondary:'View all activity'},
  'profile-required':{badge:'Action required',heading:'Complete your Game Profile',description:'Set your game’s platforms and regions to open it for bounties.',primary:'Edit Game Profile',secondary:'How bounties work'},
};
export function parseStreamEvidence(raw:any) {try{return typeof raw==='string'?JSON.parse(raw):raw??{};}catch{return {};}}
export function isLiveSubmission(s:any) {return ['stream','livestream'].includes(s.content_type)&&parseStreamEvidence(s.content_data).isLive===true;}
export function isVerifiedStream(s:any) {const evidence=parseStreamEvidence(s.content_data);return ['stream','livestream'].includes(s.content_type)&&evidence.verificationStatus==='verified';}
export function heroArtworkSources(game:any):{url:string;portrait:boolean}[] {
  const values=[{url:game?.header_image_url,portrait:false},...(Array.isArray(game?.screenshot_urls)?game.screenshot_urls:[]).slice(0,1).map((url:string)=>({url,portrait:false})),{url:game?.capsule_image_url,portrait:true},{url:game?.catalog_image_url,portrait:true}];
  return values.filter((value,index)=>typeof value.url==='string'&&value.url.trim()&&values.findIndex(other=>other.url===value.url)===index);
}

/** Link to a real accepting opportunity, never to an unrelated generic listing. */
export function bountyHubListingUrl(opportunities:any[]=[]):string {
  const opportunity=opportunities.find(o=>Number.isSafeInteger(Number(o.instance_id))&&Number(o.instance_id)>0&&!o.applications_paused&&['live','approved','in_progress'].includes(o.status));
  return opportunity?`/bounties?campaign=${Number(opportunity.instance_id)}`:'/bounties';
}

/** Each participation is evaluated against its own saved objectives and stream evidence. */
export function bountyCreatorRows(activity:any) {
  return (activity?.participants??[]).map((participant:any)=>{
    const record=activity.recordsByInstance?.[participant.instance_id];
    const work=hubSubmissions(record?.submissions??activity.submissions).filter((s:any)=>Number(s.instance_id)===Number(participant.instance_id)&&Number(s.participant_id)===Number(participant.user_id));
    const progress=record?workspaceCreator({...record,submissions:hubSubmissions(record.submissions),rewards:record.rewards??[]},participant):null;
    const review=work.find((s:any)=>REVIEW_STATUSES.includes(s.status));
    const ended=['expired','rejected','cancelled','withdrawn','removed'].includes(participant.status);
    const status=progress?.completed?'Approved':ended?'Did not complete':review?'Awaiting review':work.some((s:any)=>s.status==='changes_requested')?'Changes requested':participant.status==='ready_to_submit'?'Ready to submit':'Working';
    return {participant,work,review,status,opportunity:record?.objectives?.some((o:any)=>['stream','livestream'].includes(o.content_type))?'Stream':'Content',deadline:participant.completion_deadline??participant.deadline??null};
  }).sort((a:any,b:any)=>Number(!!b.review)-Number(!!a.review)||(Date.parse(b.participant.joined_at)||0)-(Date.parse(a.participant.joined_at)||0));
}
export const BOUNTY_NO_INTEREST_DAYS=7;
/** No upsell on a fresh or paused listing; never infer a creator allowance. */
export function showOverviewBoost(data:any,now=Date.now()) {
  const p=data.programme;
  if(!p?.is_open||p.opted_out_at||!data.entitlement?.eligible)return false;
  const participants=data.activity?.participants??[];
  if(bountyCreatorRows(data.activity).some((row:any)=>row.status==='Approved'))return true;
  const opened=Date.parse(p.created_at);
  return Number.isFinite(opened)&&now-opened>=BOUNTY_NO_INTEREST_DAYS*86400000&&!participants.length&&!hubSubmissions(data.activity?.submissions).length&&!(data.feed??[]).some((e:any)=>e.type==='creator_joined')&&Number(data.analytics?.listing_open??0)===0;
}
