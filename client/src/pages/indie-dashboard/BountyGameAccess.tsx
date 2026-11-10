import { useRef, useState } from 'react';
import { KeyRound, Upload, Check, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { parseCSVKeys } from './campaign-key-csv';
import {analyseGameAccessKeys} from '@shared/game-access-key-input';
import { availabilityValues } from '@shared/bounty-game-availability';
import type { BountyAccess } from '@shared/included-bounty';
export const bountyPrimary='bounty-button bounty-button-primary';
export const bountySecondary='bounty-button bounty-button-secondary';
export function bountyGameProfileUrl(game: { id: number; platforms: unknown }) {
  const field = availabilityValues(game.platforms).length ? 'availableRegions' : 'platforms';
  return `/game-dashboard?tab=game-profile&gameId=${game.id}&profileSection=${field}`;
}
export function readableBountyError(error:any) { const message=error?.message??'Please try again.'; try { const text=message.slice(message.indexOf('{')); return JSON.parse(text).error??message; } catch { return message; } }
export function BountyKeyUpload({game,access,onChanged}:{game:any;access:BountyAccess;onChanged:()=>Promise<unknown>}) {
  const [text,setText]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const fileRef=useRef<HTMLInputElement>(null);
  const type=access==='private_playtest'?'demo':'full';
  const values=text.split(/\r?\n/).map(value=>value.trim()).filter(Boolean);
  const analysis=analyseGameAccessKeys(values),valid=analysis.keys;
  async function upload() {
    if(!valid.length||analysis.invalidLines.length||values.length>500)return;
    setBusy(true);setError('');setMessage('');
    try { const result=await(await apiRequest('POST',`/api/campaigns/games/${game.catalog_game_id}/keys`,{keyType:type,keys:values})).json();setText('');setMessage(`${result.added} keys added · ${result.duplicates} duplicates · ${result.invalid} invalid`);await onChanged(); }
    catch(error) { setError(readableBountyError(error)); } finally { setBusy(false); }
  }
  return <div className="bounty-key-upload">
    <div className="bounty-row"><h3>Add {type==='demo'?'demo':'full-game'} keys</h3><span className="bounty-accent">{game.inventory?.[type]?.available??0} keys available</span></div>
    <label htmlFor="bounty-key-text">Paste one activation code per line</label>
    <textarea id="bounty-key-text" aria-describedby="bounty-key-format-note" aria-invalid={analysis.invalidLines.length>0} value={text} onChange={event=>{setText(event.target.value);setMessage('');}} rows={5} maxLength={130000} autoComplete="off" spellCheck={false} placeholder="Paste your game keys here"/>
    {values.length>0&&<p role="status">{valid.length} ready · {analysis.invalidLines.length} unrecognised · {analysis.duplicates} duplicates{values.length>500?' · Upload a maximum of 500 at a time':''}</p>}
    {analysis.invalidLines.length>0&&<p className="bounty-key-format-error">Check the activation-code format on {analysis.invalidLines.length===1?'line':'lines'} {analysis.invalidLines.slice(0,8).join(', ')}{analysis.invalidLines.length>8?'…':''}. Random text is not an activation code.</p>}
    <p id="bounty-key-format-note" className="bounty-note">Format checks do not confirm that a key can be redeemed.</p>
    <input ref={fileRef} type="file" accept=".csv,.txt,text/plain,text/csv" className="sr-only" onChange={async event=>{const file=event.target.files?.[0];if(!file)return;setError('');try{if(file.size>250000)throw new Error('Choose a file smaller than 250 KB');const raw=await file.text();setText(file.name.toLowerCase().endsWith('.csv')?parseCSVKeys(raw).join('\n'):raw);}catch(error){setError(readableBountyError(error));}event.target.value='';}}/>
    <div className="bounty-actions"><button type="button" className={bountySecondary} onClick={()=>fileRef.current?.click()}><Upload size={18}/>Upload CSV or text</button><button type="button" className={bountyPrimary} disabled={busy||!valid.length||analysis.invalidLines.length>0||values.length>500} onClick={()=>void upload()}>{busy?<Loader2 size={18} className="animate-spin"/>:<KeyRound size={18}/>}Save keys</button></div>
    {message&&<p role="status" className="bounty-accent">{message}</p>}{error&&<p role="alert">{error}</p>}
  </div>;
}
export default function BountyGameAccess({game,value,onChange,onChanged}:{game:any;value:BountyAccess|null;onChange:(value:BountyAccess)=>void;onChanged:()=>Promise<unknown>}) {
  return <div className="bounty-access">
    <div className="bounty-access-options">{[
      {id:'private_playtest' as const,title:'Demo keys',description:'Give creators access to your playable demo.'},
      {id:'full_game_upfront' as const,title:'Full-game keys',description:'Give creators access to the complete game.'},
      {id:'free_to_play' as const,title:'No key required',description:'For free-to-play games or games creators can access without a key.'},
    ].map(option=><button type="button" key={option.id} aria-pressed={value===option.id} className={`bounty-choice ${value===option.id?'is-selected':''}`} onClick={()=>onChange(option.id)}><span className="bounty-row"><strong>{option.title}</strong>{value===option.id&&<Check size={20}/>}</span><span>{option.description}</span></button>)}</div>
    {value&&value!=='free_to_play'&&<BountyKeyUpload game={game} access={value} onChanged={onChanged}/>}
  </div>;
}
