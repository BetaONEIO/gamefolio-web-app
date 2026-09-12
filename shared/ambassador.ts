// Ambassador referral discount, shared by the client and server so the paywall
// copy can never disagree with what the buyer is actually charged.
//
// Delivered differently per platform:
//   - web / Stripe   → a percent-off, first-payment-only coupon
//   - Android / Play → a discounted subscription offer (Play Console)
//   - iOS / StoreKit → not possible for a first-time subscriber; those buyers
//                      get bonus XP instead (see /api/pro/activate)
//
// NB: Stripe coupons are immutable — `percent_off` cannot be edited after
// creation — so the coupon id below is derived from this number. Changing the
// percentage therefore mints a NEW coupon rather than silently continuing to
// apply the old one. The Play Console offer is configured by hand and must be
// updated to match separately.
export const AMBASSADOR_DISCOUNT_PERCENT = 15;
