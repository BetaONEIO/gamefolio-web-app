import {useEffect,useState,type Ref} from 'react';
import {ArrowRight,Check,ExternalLink,Gamepad2} from 'lucide-react';
import {useSignedUrl} from '@/hooks/use-signed-url';
import {heroArtworkSources} from '@shared/bounty-hub-view';
import {bountyPrimary,bountySecondary} from './BountyGameAccess';

function GameCover({game}:{game:any}) {
  const sources=heroArtworkSources(game).sort((a,b)=>Number(b.portrait)-Number(a.portrait));
  const signature=sources.map(s=>s.url).join('|'),[index,setIndex]=useState(0);
  useEffect(()=>setIndex(0),[signature]);
  const source=sources[index],{signedUrl}=useSignedUrl(source?.url);
  return <figure className="bounty-opened-art">{source&&signedUrl?<img key={source.url} src={signedUrl} alt={`${game?.game_name??'Game'} artwork`} onError={()=>setIndex(i=>i+1)}/>:<Gamepad2 aria-hidden="true" size={40}/>}</figure>;
}
export default function BountyOpenedConfirmation({game,headingRef,keys,creators,pending,approved,hubLink,onDashboard,onKeys,onAvailability,isOpen,busy}:{game:any;headingRef?:Ref<HTMLHeadingElement>;keys:number|string;creators:number;pending:number;approved:number;hubLink:string;onDashboard:()=>void;onKeys:()=>void;onAvailability:()=>void;isOpen:boolean;busy:boolean}) {
  return <section className="bounty-opened-layout" aria-label="Bounty opened confirmation"><GameCover game={game}/><div className="bounty-opened-content"><header><div className="bounty-success-mark"><Check size={22}/><span>Open for Bounties</span></div><h1 ref={headingRef} tabIndex={-1}>{game?.game_name??'Your game'} is open to creators</h1><p>Your game can now be discovered in the Bounty Hub. We’ll notify you when a creator joins or submits work.</p></header><div className="bounty-metrics bounty-activity-metrics">{[['Keys available',keys],['Creators participating',creators],['Awaiting review',pending],['Approved content',approved]].map(([label,value])=><div key={label}><span>{label}</span><strong className={label==='Keys available'&&typeof value==='string'?'bounty-key-label':undefined}>{value}</strong></div>)}</div><div className="bounty-actions"><button className={bountyPrimary} onClick={onDashboard}>View Bounty Dashboard<ArrowRight size={18}/></button><a className={bountySecondary} href={hubLink}>View in Bounty Hub<ExternalLink size={16}/></a><button className={bountySecondary} onClick={onKeys}>Add game keys</button><button className="bounty-text-action" disabled={busy} onClick={onAvailability}>{isOpen?'Pause bounties':'Resume bounties'}</button></div></div></section>;
}
