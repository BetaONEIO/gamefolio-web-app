import { calculateCustomCampaign } from './bounty-rewards';
import { DEFAULT_STREAM_CAMPAIGN_CONFIGURATION, calculateStreamRecommendedCompletionXp } from './campaign-commercial-model';
import type { PaidKind } from './included-bounty';

export type CreatorPreference = 'both' | 'content' | 'stream';
export const CREATOR_PREFERENCES = {
  both: { title: 'Content and streams', description: 'Allow all suitable creator opportunities.', recommended: true },
  content: { title: 'Content only', description: 'Clips, reels, screenshots, feedback and reviews.' },
  stream: { title: 'Streams only', description: 'Verified creator livestreams.' },
} as const;
export const STANDARD_OPPORTUNITIES = {
  clip: { title: 'Create a gameplay clip', format: 'Landscape video, 15–90 seconds.', quality: 'Original gameplay from this game, clear picture and audio, with no unrelated material.' },
  reel: { title: 'Create a vertical gameplay reel', format: 'Vertical 9:16 video, 15–60 seconds.', quality: 'Original gameplay, legible framing and clear audio. No watermarks from other creators.' },
  screenshot: { title: 'Upload a gameplay screenshot', format: 'One full-resolution gameplay image.', quality: 'Capture your own gameplay. No menus, unrelated images or misleading edits.' },
  feedback: { title: 'Share structured game feedback', format: 'Complete the structured feedback form.', quality: 'Describe what you played, what worked and one specific improvement. Be constructive.' },
  review: { title: 'Complete a creator review', format: 'A written review through the creator review form.', quality: 'Give an original, honest account of your experience. Include strengths and limitations.' },
  stream: { title: 'Complete a verified livestream', format: '60 minutes on a connected supported streaming account, with a public VOD.', quality: 'Stream this game in the correct category. Connected-account verification and developer approval are required.' },
} as const;
export type OpportunityType = keyof typeof STANDARD_OPPORTUNITIES;
export function opportunityTypes(preference: CreatorPreference): OpportunityType[] {
  if (!Object.hasOwn(CREATOR_PREFERENCES, preference)) throw new Error('Choose a creator activity preference');
  return (Object.keys(STANDARD_OPPORTUNITIES) as OpportunityType[]).filter(type => preference === 'both' || (preference === 'stream') === (type === 'stream'));
}
export function discoveryTemplate(type: OpportunityType) {
  if (!Object.hasOwn(STANDARD_OPPORTUNITIES,type)) throw new Error('Unsupported creator opportunity');
  const objective = STANDARD_OPPORTUNITIES[type];
  const xp = calculateCustomCampaign({[type]:1});
  const streamConfig = type === 'stream' ? {...DEFAULT_STREAM_CAMPAIGN_CONFIGURATION, requirePublicVod:true} : null;
  return {...objective,type,objectives:{[type]:1},deadlineDays:type==='stream'?14:7,streamConfig,
    completionBonus:xp.completionBonus,xp:streamConfig?calculateStreamRecommendedCompletionXp(streamConfig,{baseCompletionXp:xp.completionBonus}):xp.totalXp};
}
export type BoostPrompt = { id:string; title:string; description:string; cta:string; kind:PaidKind; bestType?:string };
// Evidence comes from server records, never from an assumed monthly allowance.
export function contextualBoost(input:{approved:any[];participants:any[];listingOpens:number;releaseDate?:string|null;now?:number}):BoostPrompt|null {
  const now=input.now??Date.now();
  const approved=input.approved;
  const typed=approved.reduce((counts:Record<string,number>,s:any)=>{counts[s.content_type]=(counts[s.content_type]??0)+1;return counts;},{});
  const best=Object.entries(typed).sort((a,b)=>Number(b[1])-Number(a[1]))[0];
  if(best && Number(best[1])>=3 && ['clip','reel','stream'].includes(best[0]))return {id:`successful-${best[0]}`,title:best[0]==='stream'?'Reach more streaming communities':'Generate more gameplay clips',description:'Build a paid campaign using your best-performing creator activity.',cta:'Create a similar campaign',kind:best[0]==='stream'?'stream':'content',bestType:best[0]};
  if(approved.length)return {id:'first-approved',title:'Like what this creator made?',description:'Launch a Bounty Boost to reach more creators and generate more activity around your game.',cta:'Create a Bounty Boost',kind:approved[0].content_type==='stream'?'stream':'content',bestType:approved[0].content_type};
  const release=input.releaseDate?Date.parse(input.releaseDate):NaN;
  if(Number.isFinite(release)&&release>=now&&release-now<=30*86400000)return {id:'release',title:'Build creator activity around your release',description:'Run a focused Bounty Boost with featured placement and funded creator rewards.',cta:'Plan a Bounty Boost',kind:'both'};
  if(input.participants.length>=3 || input.listingOpens>=20)return {id:'strong-interest',title:'Your game is getting creator interest',description:'Boost its visibility and reach more creators while interest is growing.',cta:'Boost your reach',kind:'both'};
  // Never prompt while work is within the creator's active completion window.
  if(input.participants.some(p=>p.access_key_id && (p.completion_deadline||p.deadline) && Date.parse(p.completion_deadline||p.deadline)<now && !p.has_submission && !['completed','completed_and_verified','full_game_awarded'].includes(p.status)))return {id:'expired-claim',title:'Give creators an extra reason to participate',description:'Add a cash reward and featured placement to attract more creator attention.',cta:'Boost your bounty',kind:'both'};
  return null;
}
export function unusedBoostRewards(poolPence:number,perCompletionPence:number,completed:number,capacity:number) {
  if(![poolPence,perCompletionPence,completed,capacity].every(Number.isSafeInteger)||poolPence<0||perCompletionPence<0||completed<0||capacity<1||completed>capacity||perCompletionPence*capacity>poolPence)throw new Error('Invalid campaign reward settlement');
  return poolPence-perCompletionPence*completed;
}
