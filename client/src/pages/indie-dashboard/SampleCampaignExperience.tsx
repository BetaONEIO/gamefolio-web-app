import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const primary = 'rounded-xl bg-[#B9FF1A] px-5 py-3 font-semibold text-[#0F101B]';
const secondary = 'rounded-xl border border-[#394158] px-5 py-3 font-semibold text-white';
const money = (pence: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
export default function SampleCampaignExperience({ id }: { id: string }) {
  const [celebrate, setCelebrate] = useState(true);
  const [tab, setTab] = useState('Overview');
  let campaign: any;
  try { campaign = JSON.parse(sessionStorage.getItem(`campaign-preview:${id}`) || 'null'); } catch { campaign = null; }
  const setupAnother = () => window.location.assign('/game-dashboard?tab=campaigns&campaignSub=create');
  if (!campaign) return <section className="p-8 text-white"><h2 className="text-2xl font-bold">Sample campaign unavailable</h2><p className="my-4">This preview belongs to the browser session in which it was created.</p><button className={primary} onClick={setupAnother}>Set up another</button></section>;
  const noKey = ['free_to_play', 'public_demo'].includes(campaign.accessMethod);
  const objectives = Object.entries(campaign.objectiveSnapshot ?? {}).filter(([, quantity]) => Number(quantity) > 0);
  const launch = campaign.startType === 'scheduled' ? 'Scheduled' : 'Live';
  return <section className="space-y-6 bg-[#0F101B] p-6 text-white sm:p-8">
    <p className="rounded-lg border border-amber-400/40 p-3 text-sm text-amber-200">Local sample · Payment and approval are simulated. No money charged, keys issued or campaign published.</p>
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-[#BAC0D0]">Your campaign dashboard</p><h1 className="mt-2 text-3xl font-bold">{campaign.campaignTitle}</h1><p className="mt-2 text-[#BAC0D0]">{campaign.gameName} · {launch} preview</p></div><button className={secondary} onClick={setupAnother}>Set up another</button></div>
    <div className="grid gap-4 sm:grid-cols-3">{[['Creator places', `0 / ${campaign.maxPlaces}`], ['Content submitted', '0'], ['Approved completion', '0%']].map(([label,value]) => <div key={label} className="rounded-xl bg-[#151827] p-5"><p className="text-[#BAC0D0]">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}</div>
    <nav aria-label="Campaign management" className="flex flex-wrap gap-2">{['Overview','Creators','Submissions','Access','Timeline','Results'].map(name => <button key={name} aria-pressed={tab === name} onClick={() => setTab(name)} className={tab === name ? primary : secondary}>{name}</button>)}</nav>
    <div className="rounded-xl bg-[#151827] p-6">
      <h2 className="text-2xl font-bold">{tab}</h2>
      {tab === 'Overview' && <><dl className="my-6 grid gap-5 sm:grid-cols-2">{[['Campaign price',money(campaign.pricePence)],['Creator places',campaign.maxPlaces],['Joining window',`${campaign.applicationPeriodDays} days`],['Completion window',`${campaign.creatorDeadlineDays} days per creator`]].map(([label,value]) => <div key={label}><dt className="text-[#BAC0D0]">{label}</dt><dd className="mt-1 text-xl font-semibold">{value}</dd></div>)}</dl><h3 className="font-semibold">Required content per creator</h3><ul className="mt-3 space-y-2">{objectives.map(([name,quantity]) => <li key={name}>{String(quantity)} × {name.replaceAll('_',' ')}</li>)}</ul>{campaign.streamConfig && <p className="mt-3">Required stream: {campaign.streamConfig.requiredMinutes} minutes</p>}</>}
      {tab === 'Creators' && <p className="mt-4 text-[#BAC0D0]">No creators have joined yet. This area tracks who joins, their deadlines and completion status.</p>}
      {tab === 'Submissions' && <p className="mt-4 text-[#BAC0D0]">No submissions yet. Review creator content here, approve completed requirements or request changes.</p>}
      {tab === 'Access' && <p className="mt-4 text-[#BAC0D0]">{noKey ? 'No key required. Creators use public game access.' : 'Game keys are required. This sample does not reserve or distribute real keys.'}</p>}
      {tab === 'Timeline' && <ol className="mt-4 space-y-3"><li>✓ Sample payment successful — {money(campaign.pricePence)}</li><li>✓ Sample campaign approved</li><li>✓ Campaign {launch.toLowerCase()}{campaign.scheduledStart ? ` for ${new Date(campaign.scheduledStart).toLocaleString('en-GB')}` : ''}</li><li>Waiting for creators to join</li></ol>}
      {tab === 'Results' && <p className="mt-4 text-[#BAC0D0]">Results appear as creators complete their work. No activity or rewards have been generated for this sample.</p>}
    </div>
    <Dialog open={celebrate} onOpenChange={setCelebrate}><DialogContent className="border-[#394158] bg-[#151827] text-white"><CheckCircle2 size={48} className="text-[#B9FF1A]"/><DialogTitle className="text-3xl">Congratulations!</DialogTitle><DialogDescription className="text-base text-[#BAC0D0]">Your sample payment of {money(campaign.pricePence)} was successful and your campaign has been approved in this preview.</DialogDescription><p className="font-semibold">{campaign.campaignTitle}</p><p className="text-sm text-[#BAC0D0]">No actual payment or approval took place. View your campaign to explore the developer dashboard.</p><div className="flex flex-wrap gap-3"><button className={primary} onClick={() => setCelebrate(false)}>View campaign</button><button className={secondary} onClick={setupAnother}>Set up another</button></div></DialogContent></Dialog>
  </section>;
}
