import { useCampaignCurrency } from './useCampaignCurrency';
import { calculateCampaignFunding } from '@shared/campaign-funding';
import { campaignRewardExamples } from '@shared/campaign-reward-allocation';
export const campaignMoney = (pence: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(pence / 100);
export function CampaignRewardExplanation({total,capacity,xp}:{total:number;capacity:number;xp?:number}) {
  const { money: campaignMoney } = useCampaignCurrency();
  const funding=calculateCampaignFunding(total,Math.max(1,capacity));
  return <section className="min-w-0 space-y-4 text-sm leading-6 text-[#D2D6E0]">
    <h4 className="text-lg font-semibold text-white">What creators can earn</h4>
    {xp!=null&&<div><p className="text-xl font-bold text-[#B9FF1A]">ϟ {xp.toLocaleString()} Bounty XP</p><p>Awarded when all required campaign contributions are approved. XP is not a monetary payment.</p></div>}
    <div><p className="text-lg font-semibold text-white">Share of the {campaignMoney(funding.creatorPoolPence)} creator reward pool</p><p>Every approved, completed creator receives a guaranteed share, with any remaining reward allocated as a completion bonus when the campaign closes.</p></div>
    <div><p className="text-2xl font-bold text-[#B9FF1A]">{campaignMoney(funding.payoutPerCreatorPence)} guaranteed reward</p><p>Reserved for each approved creator.</p></div>
    <div><p className="text-xl font-semibold text-white">Up to {campaignMoney(funding.creatorPoolPence)} total reward</p><p>The maximum applies if only one creator completes and is approved.</p></div>
    <div className="border-l-2 border-[#B9FF1A] pl-3"><p className="font-semibold text-white">Fewer completions can mean a larger reward</p><p>Each approved creator receives at least {campaignMoney(funding.payoutPerCreatorPence)}. At campaign closure, the remaining pool is shared equally between approved, completed creators. Unresolved work must be reviewed first.</p></div>
    <p><strong className="text-white">Creator reward range: {campaignMoney(funding.payoutPerCreatorPence)}–{campaignMoney(funding.creatorPoolPence)}</strong><br/>Guaranteed minimum to maximum possible total per approved creator.</p>
    <details><summary className="cursor-pointer font-semibold text-[#B9FF1A]">See how creator rewards are calculated</summary><div className="mt-3 space-y-3">{campaignRewardExamples(total,Math.max(1,capacity)).map(row=><div key={row.count} className="border-b border-[#303447] pb-3"><p className="font-semibold text-white">{row.count} approved {row.count===1?'creator':'creators'} · {campaignMoney(row.finalPence)} each{row.hasRemainder?'*':''}</p><p>{campaignMoney(row.guaranteedPence)} on approval + {campaignMoney(row.bonusPence)} completion bonus</p></div>)}<p>Amounts exclude VAT. Remainder pennies are allocated in participation order. If nobody completes approved work, the existing cancellation and refund policy applies; campaign fees are not automatically refundable. Payments require a connected, eligible payout account; a reserved reward is not yet paid.</p></div></details>
  </section>;
}
export default function CampaignPriceBreakdown({ total, capacity, compact = false }: { total: number; capacity: number; compact?: boolean }) {
  const { money: campaignMoney } = useCampaignCurrency();
  const funding = calculateCampaignFunding(total, Math.max(1, capacity));
  if (compact) return <section className="space-y-2 border-t border-[#303447] pt-4"><h4 className="font-semibold text-white">Campaign total</h4><p className="text-2xl font-bold text-[#B9FF1A]">{campaignMoney(total)} <span className="text-sm font-normal text-[#BAC0D0]">plus VAT</span></p><p className="text-sm leading-6 text-[#D2D6E0]">{campaignMoney(funding.creatorPoolPence)} creator rewards · {campaignMoney(funding.platformFeePence)} Gamefolio fee</p></section>;
  const help='This amount is reserved for creators who complete the campaign and have their contributions approved. It cannot be used for Gamefolio’s campaign fee.';
  return <section className="space-y-3 border-t border-[#303447] pt-4">
    <h4 className="font-semibold text-white">Campaign total</h4>
    <p className="text-3xl font-bold text-[#B9FF1A]">{campaignMoney(total)} <span className="text-sm font-normal text-[#BAC0D0]">plus VAT</span></p>
    <div><p className="text-lg font-semibold text-white">{campaignMoney(funding.creatorPoolPence)} goes to creator rewards <span tabIndex={0} role="img" aria-label={help} title={help} className="cursor-help">ⓘ</span></p><p className="text-sm text-[#BAC0D0]">80% of the campaign price</p></div>
    <div><p className="text-lg font-semibold text-white">{campaignMoney(funding.platformFeePence)} Gamefolio campaign fee</p><p className="text-sm text-[#BAC0D0]">20% of the campaign price</p></div>
    <p className="text-sm text-[#BAC0D0]">VAT calculated at checkout.</p>
  </section>;
}
