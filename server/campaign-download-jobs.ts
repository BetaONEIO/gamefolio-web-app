import {randomUUID} from 'node:crypto';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {supabaseStorage} from './supabase-storage';
import {contentZip} from '@shared/campaign-content-zip';
import {createAndPush} from './notification-service';
export type DownloadJob={id:string;ownerId:number;campaignId:number;gameProfileId?:number;status:'preparing'|'ready'|'failed';expiresAt:number;path?:string;directory?:string;error?:string};
const jobs=new Map<string,DownloadJob>();
const queue:(()=>Promise<void>)[]=[];let running=0;
function drain(){while(running<2&&queue.length){running++;void queue.shift()!().finally(()=>{running--;drain();});}}
const safe=(value:any)=>String(value??'content').replace(/[^a-zA-Z0-9_. -]/g,'_').replace(/^\.+$/,'content').slice(0,80);
export function getCampaignDownload(id:string,ownerId:number){const job=jobs.get(id);return job&&job.ownerId===ownerId&&job.expiresAt>Date.now()?job:null;}
export function prepareCampaignDownload(ownerId:number,data:any,ids:number[],gameProfileId?:number){
 const existing=Array.from(jobs.values()).filter(j=>j.ownerId===ownerId&&j.status==='preparing');if(queue.length>=20||existing.length>=2)throw Object.assign(new Error('Two downloads are already preparing. Wait for one to finish.'),{status:429});
 const current=data.submissions.filter((s:any)=>s.status==='approved'&&ids.includes(Number(s.id))&&!data.submissions.some((n:any)=>Number(n.supersedes_submission_id)===Number(s.id)));
 if(current.length!==ids.length||!current.length)throw Object.assign(new Error('Select current approved submissions from this campaign'),{status:400});
 const job:DownloadJob={id:randomUUID(),ownerId,campaignId:Number(data.campaign.id),gameProfileId,status:'preparing',expiresAt:Date.now()+3600000};jobs.set(job.id,job);
 const timer=setTimeout(()=>{jobs.delete(job.id);if(job.directory)void rm(job.directory,{recursive:true,force:true});},3600000);timer.unref();
 queue.push(async()=>{try{
  const files:{name:string;bytes:Uint8Array}[]=[];let total=0;
  for(const s of current){const username=data.participants.find((p:any)=>Number(p.user_id)===Number(s.participant_id))?.username??s.username;const folder=`${safe(s.campaign_title??data.campaign.campaign_title??data.campaign.template_name)}/${safe(username)}/${safe(s.content_type)}/`;
   const source=s.video_url??s.image_url;
   if(source){
    // Never fetch a submitted arbitrary URL. Only signed URLs produced by our storage service.
    const url=await supabaseStorage.convertToSignedUrl(source,300);if(!url)throw new Error('An original asset is unavailable for secure download');
    const response=await fetch(url,{signal:AbortSignal.timeout(60000),redirect:'error'});if(!response.ok)throw new Error('An original asset could not be downloaded');
    const reader=response.body?.getReader();if(!reader)throw new Error('Asset stream unavailable');const chunks:Uint8Array[]=[];let size=0;
    while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;total+=part.value.length;if(total>256*1024*1024){await reader.cancel();throw new Error('Collection exceeds 256 MB. Select fewer files.');}chunks.push(part.value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    const extension=({'video/mp4':'mp4','video/webm':'webm','image/png':'png','image/jpeg':'jpg','image/webp':'webp'} as Record<string,string>)[response.headers.get('content-type')?.split(';')[0]??'']??'bin';files.push({name:`${folder}submission-${s.id}.${extension}`,bytes});
   }else files.push({name:`${folder}submission-${s.id}.json`,bytes:new TextEncoder().encode(JSON.stringify({id:s.id,creator:username,type:s.content_type,content:s.content_data,url:s.content_url,approvedAt:s.reviewed_at},null,2))});
  }
  files.push({name:'creator-attribution.json',bytes:new TextEncoder().encode(JSON.stringify(current.map((s:any)=>({submissionId:s.original_submission_id??s.id,creatorId:s.creator_id??s.participant_id,creator:s.username,campaignId:s.campaign_id??data.campaign.id,campaign:s.campaign_title??data.campaign.campaign_title,participationId:s.participation_id,objective:s.objective??s.content_type,assetId:s.asset_id,approvedAt:s.approval_date??s.reviewed_at,approvingDeveloper:s.approving_developer??s.reviewed_by_user_id,usageRights:s.rights??null})),null,2))});
  job.directory=await mkdtemp(join(tmpdir(),'gamefolio-campaign-download-'));job.path=join(job.directory,'content.zip');await writeFile(job.path,Buffer.from(await contentZip(files).arrayBuffer()),{mode:0o600});job.status='ready';
  await createAndPush({userId:ownerId,type:'campaign_activity',title:'Your campaign download is ready',message:'Your approved content ZIP is ready. The private download expires in one hour.',actionUrl:`/api/campaigns/downloads/${job.id}/file`,metadata:{campaignId:job.campaignId,downloadJobId:job.id}}).catch(()=>{});
 }catch(e:any){job.status='failed';job.error=e.message??'Download preparation failed';await createAndPush({userId:ownerId,type:'campaign_activity',title:'Campaign download could not be prepared',message:job.error!,actionUrl:`/game-dashboard?tab=campaigns&viewCampaign=${job.campaignId}&campaignTab=Results`,metadata:{campaignId:job.campaignId}}).catch(()=>{});}});drain();return job;
}
