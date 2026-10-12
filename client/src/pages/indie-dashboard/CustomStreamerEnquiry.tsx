import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
export default function CustomStreamerEnquiry({gameName,minutes,onClose}:{gameName:string;minutes:number;onClose:()=>void}) {
  const {data:user}=useQuery<any>({queryKey:['/api/user']});
  const [places,setPlaces]=useState(11),[game,setGame]=useState(gameName),[duration,setDuration]=useState(minutes);
  const [email,setEmail]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState('');
  const field='mt-2 block min-h-11 w-full rounded-lg border border-[#303447] bg-[#0F101B] px-3 text-white';
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4"><section role="dialog" aria-modal="true" aria-label="Request a custom streaming campaign" className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border border-[#303447] bg-[#151827] p-6 text-white"><h2 className="text-2xl font-bold">Request a custom campaign</h2>{sent?<p className="mt-4 text-[#B9FF1A]">Request received. Gamefolio will contact you to discuss availability and pricing.</p>:<form className="mt-5 space-y-4" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await apiRequest('POST','/api/campaigns/streamer-enquiries',{gameName:game,minutes:duration,requestedPlaces:places,email:email||user?.email,message});setSent(true);}catch(err:any){setError(err.message);}finally{setBusy(false);}}}>
    <label className="block">Game<input required maxLength={200} className={field} value={game} onChange={e=>setGame(e.target.value)}/></label>
    <label className="block">Stream duration<select className={field} value={duration} onChange={e=>setDuration(Number(e.target.value))}>{[30,60,120].map(n=><option key={n} value={n}>{n} minutes</option>)}</select></label>
    <label className="block">Requested streamer places<input required className={field} type="number" min={11} max={1000} value={places} onChange={e=>setPlaces(Number(e.target.value))}/></label>
    <label className="block">Contact email<input required className={field} type="email" value={email||user?.email||''} onChange={e=>setEmail(e.target.value)} /></label>
    <p className="text-sm text-[#D2D6E0]">Developer: {user?.displayName||user?.username||'Your Gamefolio account'}</p>
    <label className="block">Anything else?<textarea className={field} maxLength={2000} value={message} onChange={e=>setMessage(e.target.value)}/></label>
    {error&&<p role="alert" className="text-amber-300">{error}</p>}<button disabled={busy} className="min-h-11 rounded-lg bg-[#B9FF1A] px-4 font-bold text-[#0F101B]">{busy?'Sending…':'Send request'}</button>
  </form>}<button type="button" className="mt-4 min-h-11 rounded-lg border border-[#303447] px-4" onClick={onClose}>Close</button></section></div>;
}
