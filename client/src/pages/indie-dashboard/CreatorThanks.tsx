import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {apiRequest} from '@/lib/queryClient';
import {canEditCampaignThanks} from '@shared/campaign-thanks';
import {useToast} from '@/hooks/use-toast';
const button='min-h-11 rounded-lg border border-[#2A2F40] px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B9FF1A]';
export default function CreatorThanks({campaignId,creatorId,username,sample}:{campaignId:number;creatorId:number;username:string;sample:boolean}){
 const client=useQueryClient(),{toast}=useToast();const key=[`/api/campaigns/instances/${campaignId}/thanks/${creatorId}`];
 const query=useQuery<any>({queryKey:key,enabled:!sample});
 const sampleKey=`campaign-sample-thanks:${campaignId}:${creatorId}`;
 const [open,setOpen]=useState(false),[message,setMessage]=useState('Great work, thank you!'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[local,setLocal]=useState<any>(()=>{if(!sample)return null;try{return JSON.parse(sessionStorage.getItem(sampleKey)||'null');}catch{return null;}});
 const record=sample?(local?{...local,editable:canEditCampaignThanks(local.created_at)}:null):query.data;
 async function send(){if(busy)return;setBusy(true);setError('');try{
  if(sample){const saved={message,created_at:local?.created_at??new Date().toISOString()};sessionStorage.setItem(sampleKey,JSON.stringify(saved));setLocal(saved);toast({title:'Sample thanks saved',description:'Local demonstration only. No creator was notified.'});}
  else {const result=await(await apiRequest('POST',key[0],{message,edit:!!record})).json();client.setQueryData(key,result);toast({title:record?'Thank-you updated':'Thank-you sent'});}
  setOpen(false);
 }catch(e:any){setError(e.message||'Could not send thanks.');}finally{setBusy(false);}}
 return <><button className={button} disabled={!sample&&(query.isLoading||query.isError)} onClick={()=>{setMessage(record?.message??'Great work, thank you!');setError('');setOpen(true);}}>{record?'Thanked ✓':'Thank this creator'}</button>{query.isError&&<button className="text-sm underline" onClick={()=>query.refetch()}>Retry thanks status</button>}<Dialog open={open} onOpenChange={setOpen}><DialogContent className="border-[#2A2F40] bg-[#151824] text-white"><DialogTitle>Thank @{username}</DialogTitle><DialogDescription className="text-[#BAC0D0]">Send a message to thank them for contributing to your campaign.</DialogDescription>{sample&&<p className="text-sm text-amber-200">Sample mode: no message will be sent.</p>}{(!record||record.editable)&&<div className="flex flex-wrap gap-2">{['Great work, thank you!','Thanks for supporting our game!','We loved the content you created.','Write a personal message'].map(text=><button key={text} className={button} onClick={()=>setMessage(text==='Write a personal message'?'':text)}>{text}</button>)}</div>}<label className="text-sm">Your message<textarea className="mt-2 block w-full rounded-lg border border-[#2A2F40] bg-[#10131D] p-3 text-white focus-visible:outline-[#B9FF1A]" rows={4} maxLength={300} readOnly={!!record&&!record.editable} value={message} onChange={e=>setMessage(e.target.value)}/></label><p className="text-right text-sm text-[#BAC0D0]">{message.length}/300</p>{record&&<p className="text-sm text-[#BAC0D0]">{record.editable?'You can edit your message for 15 minutes after sending.':'This thank-you is now read-only.'}</p>}{error&&<p role="alert">{error}</p>}<div className="flex justify-end gap-3"><button className={button} onClick={()=>setOpen(false)}>Cancel</button>{(!record||record.editable)&&<button className={`${button} bg-[#B9FF1A] text-[#0F101B]`} disabled={busy||!message.trim()} onClick={send}>{busy?'Sending…':record?'Save message':'Send thanks'}</button>}</div></DialogContent></Dialog></>;
}
