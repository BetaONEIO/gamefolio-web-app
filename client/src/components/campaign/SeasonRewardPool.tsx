import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
export function SeasonRewardPool() {
  const {data,isLoading,isError,refetch}=useQuery({queryKey:['campaign-season-rewards'],queryFn:async()=>{const r=await apiRequest('GET','/api/campaigns/season-rewards');return r.json();},refetchInterval:60000});
  if(isLoading)return <p className="text-sm text-[#BAC0D0]" role="status">Loading your season rewards…</p>;
  if(isError)return <div role="alert" className="text-sm text-[#BAC0D0]">Your reward estimates could not be loaded. <button className="text-[#B9FF1A] underline" onClick={()=>refetch()}>Retry</button></div>;
  if(!data)return null;
  const pounds=(p:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(p/100);
  return <section className="rounded-xl border border-white/15 bg-[#151827] p-5 text-white"><h2 className="text-lg font-bold">Season creator reward pool</h2><p className="mt-1 text-sm text-[#BAC0D0]">{data.name} · {data.dateRange}</p><div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">{[['Season pool',pounds(data.poolPence)],['Your approved campaign XP',data.approvedXp.toLocaleString()],['Estimated pool share',`${(data.share*100).toFixed(2)}%`],['Estimated reward',pounds(data.estimatedPence)]].map(([label,value])=><div key={label}><p className="text-xs text-[#BAC0D0]">{label}</p><p className="mt-1 text-xl font-bold text-[#B9FF1A]">{value}</p></div>)}</div><p className="mt-4 text-xs leading-5 text-[#BAC0D0]">Completed paid campaigns contribute 80% of their price excluding VAT; Gamefolio retains 20%. Only awarded campaign completion XP counts. Contributions enter the season when the campaign completes. Shares remain estimated until season review and settlement. Calculated rewards are not paid balances.</p></section>;
}
