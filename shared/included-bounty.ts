import { calculateCustomCampaign } from './bounty-rewards';
import { DEFAULT_STREAM_CAMPAIGN_CONFIGURATION, calculateStreamRecommendedCompletionXp, minimumCreatorPoolPence } from './campaign-commercial-model';

export type MonthlyOutcome = 'content' | 'stream';
export type BountyAccess = 'private_playtest' | 'full_game_upfront' | 'free_to_play';
export const MONTHLY_OUTCOMES = {
  content: { name: 'Content Drop', summary: 'Up to 5 approved media pieces', description: 'Gameplay clips, vertical reels or screenshots created from your game.' },
  stream: { name: 'Stream Spotlight', summary: '1 verified creator stream', description: 'A creator plays and broadcasts your game to their community.' },
} as const;
export function monthlyTemplate(outcome: MonthlyOutcome) {
  if (!Object.hasOwn(MONTHLY_OUTCOMES,outcome)) throw new Error('Choose Content Drop or Stream Spotlight');
  const objectives: Record<string, number> = outcome === 'stream' ? { stream: 1, feedback: 1 } : { clip: 2, reel: 1, screenshot: 2, feedback: 1 };
  const streamConfig = outcome === 'stream' ? { ...DEFAULT_STREAM_CAMPAIGN_CONFIGURATION, requirePublicVod: true } : null;
  const xp = calculateCustomCampaign(objectives);
  return { objectives, streamConfig, xp: streamConfig ? calculateStreamRecommendedCompletionXp(streamConfig, { baseCompletionXp: xp.completionBonus, additionalContentCount: 1 }) : xp.totalXp, completionBonus: xp.completionBonus, deadlineDays: 14, capacity: 1 };
}
export function bountyKeyType(access: string): 'demo' | 'full' | null {
  if (access === 'private_playtest') return 'demo';
  if (access === 'full_game_upfront') return 'full';
  if (access === 'free_to_play' || access === 'public_demo') return null;
  throw new Error('Choose a supported game access method');
}
// Always calculate from the original subscription anniversary (including month-end).
export function includedMonth(startValue: unknown, endValue: unknown, now = new Date()) {
  if (!startValue || !endValue) return null;
  const start = new Date(String(startValue)), end = new Date(String(endValue));
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || start > now || end <= now) return null;
  const at = (offset: number) => { const d = new Date(start); d.setUTCDate(1); d.setUTCMonth(start.getUTCMonth() + offset); d.setUTCDate(Math.min(start.getUTCDate(), new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate())); return d; };
  let month = (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + now.getUTCMonth() - start.getUTCMonth();
  if (at(month) > now) month--;
  return { start: at(month), end: new Date(Math.min(+at(month + 1), +end)) };
}
export function assertIncludedActivation(input: { eligible: boolean; owned: boolean; access: string; availableKeys: number; used: boolean }) {
  if (!input.eligible) throw new Error('An active Indie Game Pro membership is required');
  if (!input.owned) throw new Error('Choose a registered game that you own');
  const keyType = bountyKeyType(input.access);
  if (input.used) throw new Error('Your included bounty is already available in your Bounty Dashboard');
  if (keyType && input.availableKeys < 1) throw new Error('Add at least one valid game key to continue');
}
export function includedStatus(open: boolean, eligible: boolean, keyType: string | null, available: number, claimed: boolean) {
  if (!eligible) return 'Indie Game Pro required';
  if (!open) return 'Paused';
  if (!claimed && keyType && available < 1) return 'Keys required';
  return 'Open';
}

export const PAID_OUTPUT_LEVELS = {
  Starter: { clip: 1, feedback: 1 },
  Boost: { clip: 2, screenshot: 1, feedback: 1 },
  Launch: { clip: 2, reel: 1, screenshot: 3, feedback: 1 },
} as const;
export type PaidKind = 'content' | 'stream' | 'both';
export function paidBountySpecification(input: { kind: PaidKind; level: keyof typeof PAID_OUTPUT_LEVELS; creators: number; minutes?: number; objectives?: Record<string,number> }) {
  if (!['content','stream','both'].includes(input.kind) || !Object.hasOwn(PAID_OUTPUT_LEVELS,input.level)) throw new Error('Choose a campaign type and output level');
  const minutes=input.minutes??60;
  if (![30,60,120].includes(minutes)) throw new Error('Choose a standard stream duration');
  const objectives:Record<string,number>=input.objectives ? {...input.objectives} : input.kind==='stream'?{stream:1}:{...PAID_OUTPUT_LEVELS[input.level]};
  if (input.kind==='both') objectives.stream=1;
  if (input.kind==='content' && objectives.stream || input.kind==='stream' && Object.keys(objectives).some(type=>type!=='stream') || input.kind!=='content' && objectives.stream!==1) throw new Error('Objectives must match your campaign type');
  const filtered=Object.fromEntries(Object.entries(objectives).filter(([,quantity])=>quantity!==0));
  return { objectives:filtered, minutes, ...paidBountyQuote(filtered,input.creators,minutes) };
}
export function paidBountyQuote(objectives: Record<string, number>, creators: number, minutes = 60) {
  const maximum=objectives.stream?10:100;
  if (!Number.isSafeInteger(creators) || creators < 1 || creators > maximum) throw new Error(`Choose between 1 and ${maximum} creators`);
  const estimate = calculateCustomCampaign(objectives);
  if (estimate.warnings.length) throw new Error(estimate.warnings.join('. '));
  const poolMinimum = minimumCreatorPoolPence(objectives, creators, minutes);
  const totalPence = Math.max(1000, Math.ceil(poolMinimum / .8));
  const feePence = Math.round(totalPence * .2);
  const xp=objectives.stream?calculateStreamRecommendedCompletionXp({...DEFAULT_STREAM_CAMPAIGN_CONFIGURATION,requiredMinutes:minutes},{
    baseCompletionXp:estimate.completionBonus,streamObjectiveCount:objectives.stream,clipObjectiveCount:objectives.clip??0,
    additionalContentCount:Object.entries(objectives).reduce((count,[type,quantity])=>count+(['stream','clip'].includes(type)?0:quantity),0),
  }):estimate.totalXp;
  return { totalPence, poolPence: totalPence - feePence, feePence, deadlineDays: Math.max(7, estimate.deadlineDays), xp };
}
