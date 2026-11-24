import { fetchSignedUrl } from '@/hooks/use-signed-url';
import { contentZip } from './campaign-content-zip';
export async function downloadCampaignContent(id:number,submissions:any[],original=false){
  const approved=submissions.filter(s=>s.status==='approved');if(!approved.length)throw new Error('No approved content is available to download yet.');
  const safe=(v:any)=>String(v??'content').replace(/[^a-zA-Z0-9_. -]/g,'_').replace(/^\.+$/,'content').slice(0,80);
  const folder=(s:any)=>`${safe(s.campaign_title??`Campaign ${id}`)}/${safe(s.username??'creator')}/${safe(s.content_type)}/`;
  const encoder=new TextEncoder(),files:{name:string;bytes:Uint8Array}[]=[];let total=0;
  for(const s of approved){const source=s.video_url??s.image_url;
    if(source){const url=await fetchSignedUrl(source);const response=await fetch(url,{credentials:'omit'});if(!response.ok)throw new Error(`Content #${s.id} could not be downloaded. Open it in Submissions and try again.`);
      const chunks: Uint8Array[] = []; let size = 0; const reader = response.body?.getReader();
      if (!reader) throw new Error('This browser cannot download the content archive. Use individual downloads.');
      while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; total += part.value.length; if (total > 256 * 1024 * 1024) { await reader.cancel(); throw new Error('This content collection exceeds 256 MB. Download individual files from Submissions.'); } chunks.push(part.value); }
      const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const extension: string = ({'video/mp4':'mp4','video/webm':'webm','image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/svg+xml':'svg'} as Record<string,string>)[response.headers.get('content-type')?.split(';')[0]??''] ?? (s.video_url?'mp4':'jpg');files.push({name:`${original?'':folder(s)}${String(s.username??'creator').replace(/[^a-zA-Z0-9_.-]/g,'_').slice(0,50)}-${s.id}.${extension}`,bytes});
    } else files.push({name:`${folder(s)}submission-${s.id}.json`,bytes:encoder.encode(JSON.stringify({type:s.content_type,creator:s.username,content:s.content_data,url:s.content_url},null,2))});
  }
  if(original && files.length === 1){const file=files[0];saveBlob(new Blob([file.bytes as BlobPart]),file.name);return;}
  files.push({name:'campaign-content.json',bytes:encoder.encode(JSON.stringify({campaignId:id,submissions:approved.map(s=>({id:s.id,type:s.content_type,creator:s.username,submittedAt:s.submitted_at}))},null,2))});
  saveBlob(contentZip(files),`campaign-${id}-approved-content.zip`);
}
function saveBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export async function downloadCampaignOriginal(submission:any){await downloadCampaignContent(0,[submission],true);}
export function exportCampaignFeedback(id:number,submissions:any[]){
  const cell=(value:unknown)=>{let text=String(value??'');if(/^[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
  const rows=[['Creator','Type','Submitted','Status','Response'],...submissions.map(s=>{let content=s.content_data;try{if(typeof content==='string')content=JSON.parse(content);}catch{}return [s.username,s.content_type,s.submitted_at,s.status,typeof content==='string'?content:content?.text??content?.review??content?.feedback??''];})];
  saveBlob(new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),`campaign-${id}-feedback.csv`);
}

export function exportCampaignFeedbackReport(id:number,submissions:any[]){
  const responses=submissions.map(s=>{let content=s.content_data;try{if(typeof content==='string')content=JSON.parse(content);}catch{}const text=typeof content==='string'?content:content?.text??content?.review??content?.feedback??'';return `@${s.username??'Creator'} · ${s.content_type} · ${s.status}\nSubmitted: ${s.submitted_at??'Unknown'}\n\n${text}`;});
  saveBlob(new Blob([`Campaign ${id} — Creator feedback\n\n`+responses.join('\n\n--------------------\n\n')],{type:'text/plain;charset=utf-8'}),`campaign-${id}-feedback.txt`);
}
