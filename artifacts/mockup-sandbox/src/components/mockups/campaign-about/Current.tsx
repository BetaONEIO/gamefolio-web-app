import './_group.css';
import { ExternalLink, Gamepad2, Users } from 'lucide-react';
import { SiSteam, SiItchdotio } from 'react-icons/si';
import { sample } from './_data';

// Isolated copy of the existing CampaignGameDetails markup; links and signed
// avatar are stubbed, but spacing, typography and surfaces remain the baseline.
const surface = "border border-white/[0.09] bg-white/[0.035] p-5 sm:p-6";
const label = "text-[10px] font-black uppercase tracking-[0.15em] text-white/40";

export function Current() {
  return <main className="campaign-about-preview min-h-screen px-6 py-10">
    <section className="grid gap-4 border-b border-white/[0.12] py-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,34%)]" aria-label="Game page details">
      <div className={surface}>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#B8FF1B]">About the game</p>
        <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-white/70">{sample.description}</p>
        <div className="mt-5">
          <p className={label}>Genres</p>
          <div className="mt-2 flex flex-wrap gap-2">{sample.genres.map(x => <span key={x} className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-white/75">{x}</span>)}</div>
        </div>
        <div className="mt-5">
          <p className={label}>Key features</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">{sample.features.map(x => <li key={x} className="flex items-start gap-2.5"><span className="mt-0.5 h-4 w-4 shrink-0 text-[#B8FF1B]">◆</span><span>{x}</span></li>)}</ul>
        </div>
      </div>
      <div className="space-y-4">
        <div className={surface}><p className={label}>Platforms</p><div className="mt-3 flex flex-wrap gap-2">{sample.platforms.map(x => <span key={x} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-white/75"><Gamepad2 size={13}/>{x}</span>)}</div></div>
        <div className={surface}><p className={label}>Where to play</p><div className="mt-3 space-y-2">{sample.stores.map((x,i) => {
          const Icon = i ? SiItchdotio : SiSteam;
          return <a key={x} href="#" className="flex items-center gap-3 border border-white/10 bg-[#0A0A10]/40 px-3 py-2.5 text-sm font-bold text-white/80"><Icon size={17}/>{x}<ExternalLink size={13} className="ml-auto text-white/40"/></a>;
        })}</div></div>
        <div className={surface}><p className={label}>Developer</p><div className="mt-3 flex items-center gap-3 text-sm text-white/80"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><Users size={17}/></span><span className="font-bold">{sample.developer}</span></div></div>
      </div>
    </section>
  </main>;
}