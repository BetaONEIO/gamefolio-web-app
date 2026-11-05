export const STREAMER_PRO_DISCOUNT_PERCENT = {
  monthly: 66,
  yearly: 33,
} as const;

export type StreamerProPlan = keyof typeof STREAMER_PRO_DISCOUNT_PERCENT;
export const STREAMER_PRO_COUPON_DURATION = "once" as const;

export function streamerProDiscountPercent(plan: StreamerProPlan): number {
  return STREAMER_PRO_DISCOUNT_PERCENT[plan];
}

export function discountedAmount(amount: number, plan: StreamerProPlan): number {
  return Math.round(amount * (100 - streamerProDiscountPercent(plan))) / 100;
}

export function discountedMinorAmount(amountMinor: number, plan: StreamerProPlan): number {
  return Math.round(amountMinor * (100 - streamerProDiscountPercent(plan)) / 100);
}
