import { fetchSignedUrl } from '@/hooks/use-signed-url';
import { contentZip } from './campaign-content-zip';
export async function downloadCampaignContent(id:number,submissions:any[]){
  const approved=submissions.filter(s=>s.status==='approved');if(!approved.length)throw new Error('No approved content is available to download yet.');
  const encoder=new TextEncoder(),files:{name:string;bytes:Uint8Array}[]=[];let total=0;
  for(const s of approved){const source=s.video_url??s.image_url;
    if(source){const url=await fetchSignedUrl(source);const response=await fetch(url,{credentials:'omit'});if(!response.ok)throw new Error(`Content #${s.id} could not be downloaded. Open it in Submissions and try again.`);
      const chunks: Uint8Array[] = []; let size = 0; const reader = response.body?.getReader();
      if (!reader) throw new Error('This browser cannot download the content archive. Use individual downloads.');
      while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; total += part.value.length; if (total > 256 * 1024 * 1024) { await reader.cancel(); throw new Error('This content collection exceeds 256 MB. Download individual files from Submissions.'); } chunks.push(part.value); }
      const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const extension: string = ({'video/mp4':'mp4','video/webm':'webm','image/png':'png','image/jpeg':'jpg','image/webp':'webp'} as Record<string,string>)[response.headers.get('content-type')?.split(';')[0]??''] ?? (s.video_url?'mp4':'jpg');files.push({name:`${String(s.username??'creator').replace(/[^a-zA-Z0-9_.-]/g,'_').slice(0,50)}-${s.id}.${extension}`,bytes});
    } else files.push({name:`submission-${s.id}.json`,bytes:encoder.encode(JSON.stringify({type:s.content_type,creator:s.username,content:s.content_data,url:s.content_url},null,2))});
  }
  files.push({name:'campaign-content.json',bytes:encoder.encode(JSON.stringify({campaignId:id,submissions:approved.map(s=>({id:s.id,type:s.content_type,creator:s.username,submittedAt:s.submitted_at}))},null,2))});
  const url=URL.createObjectURL(contentZip(files)),link=document.createElement('a');link.href=url;link.download=`campaign-${id}-approved-content.zip`;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
