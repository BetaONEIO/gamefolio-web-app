import { STREAMER_PRO_COUPON_DURATION } from "./streamer-pro-offer";

export const INDIE_DEV_PRO_DISCOUNT_PERCENT = {
  monthly: 66,
  yearly: 20,
} as const;
export const INDIE_DEV_PRO_COUPON_DURATION = STREAMER_PRO_COUPON_DURATION;

export type IndieDevProPlan = keyof typeof INDIE_DEV_PRO_DISCOUNT_PERCENT;

export function indieDevProDiscountPercent(plan: IndieDevProPlan): number {
  return INDIE_DEV_PRO_DISCOUNT_PERCENT[plan];
}

export function discountedIndieDevMinorAmount(amountMinor: number, plan: IndieDevProPlan): number {
  return Math.round(amountMinor * (100 - indieDevProDiscountPercent(plan)) / 100);
}
