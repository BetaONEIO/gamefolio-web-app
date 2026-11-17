type StripeLikeInvoice = {
  subscription?: string | { id?: string | null } | null;
  parent?: {
    subscription_details?: {
      subscription?: string | { id?: string | null } | null;
    } | null;
  } | null;
};

type StripeLikeSubscription = {
  current_period_end?: number | null;
  items?: {
    data?: Array<{ current_period_end?: number | null }>;
  } | null;
};

function expandableId(value: string | { id?: string | null } | null | undefined): string | null {
  if (typeof value === 'string') return value;
  return value?.id || null;
}

/**
 * Stripe moved Invoice.subscription to
 * Invoice.parent.subscription_details.subscription in newer API versions.
 * Accept both shapes so webhook delivery keeps working across API upgrades.
 */
export function getInvoiceSubscriptionId(invoice: StripeLikeInvoice): string | null {
  return expandableId(invoice.subscription)
    || expandableId(invoice.parent?.subscription_details?.subscription);
}

/** Return the authoritative paid-through timestamp from a Stripe subscription. */
export function getSubscriptionPeriodEnd(subscription: StripeLikeSubscription): Date | null {
  const itemPeriodEnds = subscription.items?.data
    ?.map(item => item.current_period_end)
    .filter((value): value is number => typeof value === 'number' && value > 0) || [];
  const legacyPeriodEnd = typeof subscription.current_period_end === 'number'
    ? subscription.current_period_end
    : 0;
  const periodEnd = Math.max(legacyPeriodEnd, ...itemPeriodEnds);
  return periodEnd > 0 ? new Date(periodEnd * 1000) : null;
}
