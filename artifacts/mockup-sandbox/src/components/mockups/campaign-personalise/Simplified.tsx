import './_group.css';
import './Simplified.css';
import { useState } from 'react';
import { ArrowRight, Check, ChevronDown, Gamepad2, KeyRound, LockKeyhole, CalendarDays, Clock3 } from 'lucide-react';

const NEON = '#B9FF1A';
type Access = 'full' | 'demo' | 'none';
type Settings = { title: string; access: Access; launch: 'approval' | 'scheduled'; date: string; time: string };
const INITIAL: Settings = { title: 'Neon Rift Content Boost', access: 'demo', launch: 'approval', date: '', time: '' };
const preset = { title: 'Content Boost', applicationDays: 30, completionDays: 14, creators: '5–10', submissions: '~25–50', deliverables: '4' };
const styleField: React.CSSProperties = { width: '100%', background: '#111720', border: '1px solid #303744', color: '#F5F7F1', borderRadius: 9, padding: '11px 13px', outline: 'none', fontSize: 13 };
const regions = ['Worldwide', 'North America', 'Europe', 'Asia Pacific', 'Latin America'];
const selectedGame = { name: 'Neon Rift', studio: 'Gamefolio Labs', platforms: 'Linux · PlayStation · Nintendo Switch · Mobile' };

function Label({ children, detail }: { children: React.ReactNode; detail?: string }) {
  return <div className="flex items-baseline justify-between gap-3 mb-2.5"><h2 className="text-[10px] font-bold tracking-[.15em] text-white/55 uppercase">{children}</h2>{detail && <span className="text-[10px] text-white/35">{detail}</span>}</div>;
}
function Timeline({ settings }: { settings: Settings }) {
  const start = settings.launch === 'approval' ? 'After approval' : settings.date ? new Date(`${settings.date}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'Scheduled date';
  const end = settings.launch === 'approval' ? `+${preset.applicationDays} days` : settings.date ? new Date(new Date(`${settings.date}T00:00:00`).getTime() + preset.applicationDays * 86400000).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : `+${preset.applicationDays} days`;
  return <section className="rounded-xl border border-white/[.08] bg-[#10151d] p-4 sm:p-5">
    <Label>Campaign timeline</Label>
    <div className="timeline-block">
      <div className="flex justify-between text-[9px] font-bold tracking-[.12em] text-white/42 uppercase"><span>Launch</span><span>Campaign closes</span></div>
      <div className="timeline-rule"><i /><b /><i /></div>
      <div className="flex justify-between text-[11px] font-semibold text-white/75"><span>{start}</span><span>{end}</span></div>
      <div className="timeline-duration"><span />{preset.applicationDays} days open</div>
    </div>
    <div className="mt-5 border-t border-white/[.07] pt-4">
      <div className="text-[9px] font-bold tracking-[.12em] text-white/42 uppercase mb-3">Creator completion</div>
      <div className="creator-timeline"><div className="creator-rule"><i /><b /><i /></div><div className="flex justify-between text-[10px] text-white/55"><span>Creator joins</span><span>Deadline</span></div><div className="creator-duration">{preset.completionDays} days</div></div>
    </div>
  </section>;
}
export function Simplified() {
  const [settings, setSettings] = useState<Settings>(INITIAL);
  const [advanced, setAdvanced] = useState(false);
  const [region, setRegion] = useState('Worldwide');
  const [notice, setNotice] = useState('');
  const [platform, setPlatform] = useState('All platforms');
  const update = (changes: Partial<Settings>) => setSettings(current => ({ ...current, ...changes }));
  return <main className="campaign-personalise-preview min-h-[100dvh] px-3 py-5 sm:px-7 sm:py-8">
    <div className="mx-auto max-w-[950px] overflow-hidden rounded-2xl border border-white/[.09] bg-[#0e1520] shadow-[0_24px_70px_rgba(0,0,0,.28)]">
      <header className="flex items-center gap-3.5 border-b border-white/[.08] px-5 py-5 sm:px-8">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#B9FF1A] text-[11px] font-black text-[#080c10]">2</div>
        <div><h1 className="text-[15px] font-extrabold tracking-[-.02em] text-white sm:text-base">Personalise your campaign</h1><p className="mt-1 text-xs text-white/50">We've configured {preset.title} for you. Just add the details we need to launch it.</p></div>
      </header>
      <div className="grid gap-7 px-5 py-6 sm:px-8 sm:py-7">
        <div className="grid gap-6 md:grid-cols-[1fr_1fr] md:items-start">
          <section><Label>Campaign title</Label><input aria-label="Campaign title" maxLength={120} value={settings.title} onChange={e => update({ title: e.target.value })} style={styleField} /></section>
          <section>
            <Label detail="Inherited from your selected game">Your game</Label>
            <div className="game-picker">
              <div className="game-art flex h-14 w-14 shrink-0 items-center justify-center rounded-lg"><Gamepad2 size={24} strokeWidth={1.5} /></div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-white">{selectedGame.name}</div>
                <div className="mt-0.5 text-xs text-white/55">{selectedGame.studio}</div>
                <div className="mt-1 text-[10px] text-white/40">{selectedGame.platforms}</div>
              </div>
              <LockKeyhole aria-label="Game identity is locked" size={14} className="shrink-0 text-white/35" />
            </div>
          </section>
        </div>
        <section><Label detail="Delivered when a creator joins">Game access</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {([{id:'full', title:'Full game key', sub:'Full game on joining', Icon:Gamepad2},{id:'demo',title:'Demo / playtest key',sub:'Demo access on joining',Icon:KeyRound},{id:'none',title:'No key required',sub:'Public access',Icon:LockKeyhole}] as const).map(option => {
              const active = settings.access === option.id; const Icon = option.Icon;
              return <button key={option.id} type="button" aria-pressed={active} onClick={() => update({access:option.id})} className={`access-option ${active?'active':''}`}>
                <div className="flex items-center gap-2.5"><Icon size={16} className={active?'text-[#B9FF1A]':'text-white/45'} /><span className="text-[12px] font-bold text-white">{option.title}</span><span className={`radio ${active?'selected':''}`} /></div><div className="mt-1.5 pl-[27px] text-[10px] text-white/42">{option.sub}</div>
              </button>;
            })}
          </div>
          {settings.access !== 'none' && <p className="access-handoff mt-3">Game-key inventory, creator capacity, and key imports are set up in Step 3.</p>}
        </section>
        <section><Label>Launch</Label><div className="grid gap-2 sm:grid-cols-2">
          {([{value:'approval',title:'Launch after approval',note:'Goes live once your campaign is approved',Icon:Check},{value:'scheduled',title:'Schedule launch',note:'Choose a date and time',Icon:CalendarDays}] as const).map(opt => {const selected=settings.launch===opt.value;const Icon=opt.Icon;return <button key={opt.value} type="button" aria-pressed={selected} onClick={()=>update({launch:opt.value})} className={`launch-option ${selected?'active':''}`}><span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[.05]"><Icon size={14} className={selected?'text-[#B9FF1A]':'text-white/45'}/></span><span className="min-w-0 flex-1 text-left"><span className="block text-xs font-bold text-white">{opt.title}</span><span className="mt-1 block text-[10px] text-white/40">{opt.note}</span></span><span className={`radio ${selected?'selected':''}`} /></button>;})}
        </div>{settings.launch==='scheduled' && <div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="relative"><span className="sr-only">Launch date</span><CalendarDays className="pointer-events-none absolute left-3 top-3 text-white/40" size={14}/><input aria-label="Launch date" type="date" style={{...styleField,paddingLeft:36,colorScheme:'dark'}} value={settings.date} onChange={e=>update({date:e.target.value})}/></label><label className="relative"><span className="sr-only">Launch time</span><Clock3 className="pointer-events-none absolute left-3 top-3 text-white/40" size={14}/><input aria-label="Launch time" type="time" style={{...styleField,paddingLeft:36,colorScheme:'dark'}} value={settings.time} onChange={e=>update({time:e.target.value})}/></label></div>}</section>
        <Timeline settings={settings}/>
        <section className="rounded-xl border border-white/[.08] bg-[#10151d] px-4 py-4 sm:px-5"><Label>Content Boost includes</Label><div className="grid grid-cols-3 gap-2 border-b border-white/[.07] pb-3">
          {[{value:preset.creators,label:'Est. creators'},{value:preset.submissions,label:'Est. submissions'},{value:preset.deliverables,label:'Deliverables / creator'}].map(item=><div key={item.label}><div className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">{item.value}</div><div className="mt-1 max-w-[110px] text-[9px] font-semibold uppercase leading-[1.35] tracking-[.1em] text-white/40">{item.label}</div></div>)}
        </div><div className="mt-3 flex items-center gap-2 text-[10px] font-bold tracking-[.08em] text-white/65"><Check size={14} className="text-[#B9FF1A]"/> Gamefolio promotion</div></section>
        <section className="border-t border-white/[.08] pt-4"><button type="button" aria-expanded={advanced} onClick={()=>setAdvanced(value=>!value)} className="flex w-full items-center justify-between text-left"><span className="text-[10px] font-bold uppercase tracking-[.15em] text-white/65">Advanced settings <span className="ml-2 font-normal normal-case tracking-normal text-white/30">Optional</span></span><ChevronDown size={15} className={`text-white/45 transition-transform ${advanced?'rotate-180':''}`}/></button>
          {advanced && <div className="mt-4 grid gap-4 border-t border-white/[.07] pt-4 sm:grid-cols-2"><label className="text-[10px] font-bold uppercase tracking-[.1em] text-white/50">Eligible regions<select value={region} onChange={e=>setRegion(e.target.value)} style={{...styleField,display:'block',marginTop:8}}>{regions.map(item=><option key={item}>{item}</option>)}</select></label><label className="text-[10px] font-bold uppercase tracking-[.1em] text-white/50">Platform restrictions<select value={platform} onChange={e=>setPlatform(e.target.value)} style={{...styleField,display:'block',marginTop:8}}><option>All platforms</option><option>Game platforms only</option></select></label></div>}
        </section>
        <footer className="campaign-footer border-t border-white/[.08] pt-4">
          <div aria-live="polite" role="status" className="footer-notice">{notice}</div>
          <div className="footer-actions">
            <button type="button" onClick={()=>setNotice('Return to the previous campaign step to change your preset.')} className="rounded-lg border border-white/[.14] px-5 py-3 text-xs font-bold text-white/60 hover:text-white">Back</button>
            <button type="button" onClick={()=>setNotice('Campaign details saved in this preview. Next: set up game keys and creator capacity in Step 3.')} className="flex items-center justify-center gap-2 rounded-lg bg-[#B9FF1A] px-5 py-3 text-xs font-extrabold text-[#080c10] hover:bg-[#c8ff48]">Continue <ArrowRight size={15}/></button>
          </div>
        </footer>
      </div>
    </div>
  </main>;
}
