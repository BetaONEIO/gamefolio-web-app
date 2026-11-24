import './_group.css';
import { ExternalLink, Gamepad2, Users } from 'lucide-react';
import { SiSteam, SiItchdotio } from 'react-icons/si';
import { sample } from './_data';

const label = "text-[10px] font-black uppercase tracking-[0.15em] text-white/45";

export function Revised() {
  return <main className="campaign-about-preview min-h-screen px-6 py-10">
    <section className="border-b border-white/[0.12] py-8 sm:py-10" aria-label="About the game">
      <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-[#B8FF1B]">About the game</h2>
      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(240px,30%)] lg:gap-12">
        <div className="space-y-7">
          <p className="max-w-3xl whitespace-pre-line text-sm leading-7 text-white/75 sm:text-[15px]">{sample.description}</p>
          <div><p className={label}>Genres &amp; tags</p><div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">{[...sample.genres,...sample.tags].map(x => <span key={x} className="text-xs font-semibold text-white/70">{x}</span>)}</div></div>
          <div><p className={label}>Key features</p><ul className="mt-3 grid gap-x-8 gap-y-2 text-sm text-white/70 sm:grid-cols-2">{sample.features.map(x => <li key={x} className="flex items-start gap-2.5"><span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 bg-[#B8FF1B]" /><span>{x}</span></li>)}</ul></div>
        </div>
        <div className="space-y-6 border-t border-white/10 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div><p className={label}>Platforms</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">{sample.platforms.map(x => <span key={x} className="inline-flex items-center gap-1.5 text-xs text-white/75"><Gamepad2 size={14}/>{x}</span>)}</div></div>
          <div><p className={label}>Where to play</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-3">{sample.stores.map((x,i) => {
            const Icon = i ? SiItchdotio : SiSteam;
            return <a key={x} href="#" className="inline-flex items-center gap-2 text-xs font-bold text-white/80"><Icon size={16}/>{x}<ExternalLink size={12} className="text-white/40"/></a>;
          })}</div></div>
          <div><p className={label}>Developer</p><div className="mt-3 inline-flex items-center gap-3 text-sm text-white/80"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10"><Users size={16}/></span><span className="font-bold">{sample.developer}</span></div></div>
        </div>
      </div>
    </section>
  </main>;
}