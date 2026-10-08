export const THANKS_EDIT_WINDOW_MS=15*60*1000;
export function validateCampaignThanks(message:unknown){
 if(typeof message!=='string'||!message.trim()||message.trim().length>300)throw Object.assign(new Error('Enter a message of 1–300 characters'),{status:400});
 return message.trim();
}
export function canEditCampaignThanks(createdAt:string|Date,now=Date.now()){
 const age=now-new Date(createdAt).getTime();return Number.isFinite(age)&&age>=0&&age<THANKS_EDIT_WINDOW_MS;
}
