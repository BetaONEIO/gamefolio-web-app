import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function formatCampaignCurrency(pence: number, currency = 'GBP', rate = 1, locale?: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(pence / 100 * rate);
}
export function useCampaignCurrency() {
  const locale = typeof navigator === 'undefined' ? 'en-GB' : navigator.language;
  const { data } = useQuery<{currency: string; rate: number}>({
    queryKey: ['/api/campaigns/pricing-currency', locale],
    queryFn: async () => (await apiRequest('GET', `/api/campaigns/pricing-currency?locale=${encodeURIComponent(locale)}`)).json(),
    staleTime: 60 * 60 * 1000, retry: false,
  });
  const currency = data?.currency ?? 'GBP';
  return {
    currency, localised: currency !== 'GBP',
    money: (pence: number) => formatCampaignCurrency(pence, currency, data?.rate ?? 1, locale),
    notice: currency !== 'GBP'
      ? `Estimated prices in ${currency}. Final currency, exchange rate and VAT are confirmed at checkout. Campaign accounting and creator rewards are in GBP.`
      : 'Prices in GBP. Local-currency payment options and VAT are confirmed at checkout.',
  };
}
