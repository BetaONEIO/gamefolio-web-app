import {isCampaignCreatorParticipationRestricted} from './campaign-access';
import {isVisibleConfirmedCampaign} from './campaign-presentation';
const parse=(v:any)=>{if(typeof v==='string'){try{return JSON.parse(v);}catch{return {};}}return v??{};};
export function creatorGamingPlatforms(user:any){const platforms:string[]=[];const has=(camel:string,snake:string)=>user[camel]??user[snake];if(has('steamUsername','steam_username')||has('epicUsername','epic_username'))platforms.push('windows','pc','mac','linux');if(has('xboxUsername','xbox_username'))platforms.push('xbox','xbox_series','xbox_one');if(has('playstationUsername','playstation_username'))platforms.push('ps5','ps4','playstation');if(has('nintendoUsername','nintendo_username'))platforms.push('switch','nintendo');return platforms;}
export function isEligibleCampaignInvitation(data:any,creator:any,verifiedStreamPlatforms:string[],now=Date.now()){
 const c=data.campaign;
 if(!isVisibleConfirmedCampaign(c)||!['live','in_progress'].includes(c.status)||c.applications_paused||Number(data.metrics.placesAvailable)<1)return false;
 if(c.actual_start&&new Date(c.actual_start).getTime()>now||c.end_date&&new Date(c.end_date).getTime()<=now)return false;
 if(creator.status!=='active'||isCampaignCreatorParticipationRestricted(creator)||data.participants.some((p:any)=>Number(p.user_id)===Number(creator.id)))return false;
 const terms=parse(c.confirmed_terms);const platforms=terms.platforms??c.platforms??c.profile_platforms??[];
 if(Array.isArray(platforms)&&platforms.length&&!platforms.some((p:string)=>creatorGamingPlatforms(creator).includes(p.toLowerCase())))return false;
 const streamRequired=data.objectives.some((o:any)=>o.mandatory!==false&&['stream','livestream'].includes(o.content_type));
 if(streamRequired){const config=parse(c.stream_config);if(!verifiedStreamPlatforms.length||Array.isArray(config.allowedPlatforms)&&!config.allowedPlatforms.some((p:string)=>verifiedStreamPlatforms.includes(p)))return false;}
 if(c.requires_access_key!==false&&!data.keys.some((k:any)=>k.key_pool==='access'&&k.key_type===(c.access_method==='full_game_upfront'?'full':'demo')&&!k.assigned_user_id&&!k.assigned_participant_id&&!k.removed_at&&['available','reserved'].includes(k.status)))return false;
 return true;
}
