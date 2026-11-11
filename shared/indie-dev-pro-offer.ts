import {
  STREAMER_PRO_COUPON_DURATION,
  STREAMER_PRO_DISCOUNT_PERCENT,
} from "./streamer-pro-offer";

// Same campaign terms as Streamer Pro, applied to Game Developer Pro prices.
export const INDIE_DEV_PRO_DISCOUNT_PERCENT = STREAMER_PRO_DISCOUNT_PERCENT;
export const INDIE_DEV_PRO_COUPON_DURATION = STREAMER_PRO_COUPON_DURATION;

export type IndieDevProPlan = keyof typeof INDIE_DEV_PRO_DISCOUNT_PERCENT;

export function indieDevProDiscountPercent(plan: IndieDevProPlan): number {
  return INDIE_DEV_PRO_DISCOUNT_PERCENT[plan];
}

export function discountedIndieDevMinorAmount(amountMinor: number, plan: IndieDevProPlan): number {
  return Math.round(amountMinor * (100 - indieDevProDiscountPercent(plan)) / 100);
}
