import { describe, expect, it } from 'bun:test';
import { stripeSubscriptionPeriodEnd } from '../server/stripe-subscription-period';

describe('stripeSubscriptionPeriodEnd', () => {
  it('supports Stripe subscription-level period dates', () => {
    expect(stripeSubscriptionPeriodEnd({ current_period_end: 1_800_000_000 })?.toISOString())
      .toBe('2027-01-15T08:00:00.000Z');
  });

  it('supports current Stripe item-level period dates', () => {
    expect(stripeSubscriptionPeriodEnd({ items: { data: [{ current_period_end: 1_800_086_400 }] } })?.toISOString())
      .toBe('2027-01-16T08:00:00.000Z');
  });

  it('returns null when Stripe supplies no period date', () => {
    expect(stripeSubscriptionPeriodEnd({ items: { data: [] } })).toBeNull();
  });
});
