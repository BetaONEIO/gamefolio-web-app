export function stripeSubscriptionPeriodEnd(subscription: any): Date | null {
  const candidates = [
    subscription?.current_period_end,
    ...(subscription?.items?.data ?? []).map((item: any) => item?.current_period_end),
  ].filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (candidates.length === 0) return null;
  return new Date(Math.max(...candidates) * 1000);
}
