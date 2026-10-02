import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function CampaignPaymentResult({ id, cancelled, onDashboard, onRetry }: {
  id: number; cancelled?: boolean; onDashboard: () => void; onRetry: () => void;
}) {
  const [cancelReady, setCancelReady] = useState(!cancelled);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!cancelled) return;
    apiRequest('POST', `/api/campaigns/instances/${id}/cancel-checkout`, {})
      .then(() => setCancelReady(true)).catch(() => setMessage('Checking your payment status…'));
  }, [id, cancelled]);
  const { data, error } = useQuery<any>({ queryKey: ['/api/campaigns/instances', id, 'payment'],
    queryFn: async () => { const response = await apiRequest('GET', `/api/campaigns/instances/${id}/payment`); return response.json(); },
    refetchInterval: query => query.state.data?.payment_status === 'fulfilled' || (cancelled && cancelReady) ? false : 2500,
  });
  const ready = data?.payment_status === 'fulfilled';
  const setup = data?.payment_status === 'setup_processing';
  const failed = data?.payment_status === 'payment_failed';
  const awaiting = !cancelled && data?.payment_status === 'awaiting_payment';
  const isCancelled = cancelled && cancelReady && !ready && !setup;
  useEffect(() => { if (ready) { queryClient.invalidateQueries({ queryKey: ['/api/campaigns/instances'] }); queryClient.invalidateQueries({ queryKey: ['/api/campaigns/overview'] }); } }, [ready]);
  const retry = async () => {
    setBusy(true); setMessage('');
    try { const response = await apiRequest('POST', `/api/campaigns/instances/${id}/checkout`, {}); const result = await response.json();
      if (result.checkoutUrl) window.location.assign(result.checkoutUrl); else window.location.assign(`/game-dashboard?tab=campaigns&campaignPayment=${id}`);
    } catch { setMessage('Payment could not be completed. Please try again or use another payment method.'); setBusy(false); }
  };
  const content = <section role={ready ? "dialog" : undefined} aria-modal={ready ? true : undefined} aria-label={ready ? "Your campaign is ready" : undefined} className="mx-auto max-w-2xl rounded-2xl bg-[#151827] p-6 text-white sm:p-8" aria-live="polite">
    {ready ? <CheckCircle2 size={40} className="mb-4 text-[#B9FF1A]" /> : !isCancelled && <Loader2 size={32} className="mb-4 animate-spin text-[#B9FF1A]" />}
    <h2 className="text-2xl font-bold">{ready ? 'Your campaign is ready' : awaiting ? 'Complete your payment' : failed ? 'Payment could not be completed' : isCancelled ? 'Payment cancelled' : setup ? 'Payment received' : 'Confirming your payment'}</h2>
    {ready && <p className="mt-3 text-white/80">Your payment has been confirmed and your campaign has been created automatically.</p>}
    <p className="mt-3 text-white/80">{ready ? data.status === 'scheduled'
      ? `Your ${data.campaign_type} campaign has been created and will go live on ${new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(data.scheduled_start) ? data.scheduled_start : data.scheduled_start + 'Z').toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}.`
      : `Your ${data.campaign_type} campaign has been created and is now live for eligible creators.`
      : awaiting ? 'Your campaign is saved as a draft. Continue to secure checkout to create it.' : failed ? 'Payment could not be completed. Please try again or use another payment method.' : isCancelled ? 'Payment was cancelled. Your campaign has been saved as a draft.'
      : setup ? 'Payment received. We’re finishing your campaign setup.' : 'We’re checking your payment securely. Your campaign details are saved.'}</p>
    {ready && <dl className="my-6 space-y-3">{[['Campaign name', data.campaign_title], ['Amount paid', new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(data.amount_paid / 100)],
      ['Launch status', data.status === 'scheduled' ? 'Scheduled' : 'Live'], ['Creator capacity', `${data.max_places} places`], ['Access method', ['public_demo', 'free_to_play'].includes(data.access_method) ? 'No key required' : data.access_method === 'full_game_upfront' ? 'Full-game access' : 'Demo/playtest access']].map(([label,value]) => <div key={label} className="flex justify-between gap-4 text-sm"><dt className="text-white/70">{label}</dt><dd className="text-right">{value}</dd></div>)}</dl>}
    {(message || error) && <p className="mt-4 text-sm text-amber-300">{message || 'Payment status is temporarily unavailable. Your draft and any confirmed payment remain saved.'}</p>}
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      {ready ? <button onClick={() => window.location.assign(`/game-dashboard?tab=campaigns&campaignSub=my&viewCampaign=${id}`)} className="rounded-xl bg-[#B9FF1A] px-5 py-3 font-bold text-[#0F101B]">View Campaign</button>
        : (isCancelled || failed || awaiting) && <><button onClick={retry} disabled={busy} className="rounded-xl bg-[#B9FF1A] px-5 py-3 font-bold text-[#0F101B]">{busy ? 'Opening checkout…' : awaiting ? 'Continue payment' : 'Try payment again'}</button>{!awaiting && <button onClick={onRetry} className="rounded-xl border border-white/20 px-5 py-3">Edit draft</button>}</>}
      <button onClick={onDashboard} className="rounded-xl border border-white/20 px-5 py-3">Go to My Campaigns</button>
    </div>
  </section>;
  return ready ? createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-4">{content}</div>, document.body) : content;
}
