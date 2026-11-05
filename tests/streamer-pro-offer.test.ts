import assert from "node:assert/strict";
import test from "node:test";
import {
  STREAMER_PRO_COUPON_DURATION,
  STREAMER_PRO_DISCOUNT_PERCENT,
  discountedMinorAmount,
} from "../shared/streamer-pro-offer";

test("streamer Pro discounts apply to the first invoice only", () => {
  assert.equal(STREAMER_PRO_COUPON_DURATION, "once");
  assert.deepEqual(STREAMER_PRO_DISCOUNT_PERCENT, { monthly: 66, yearly: 33 });
});

test("streamer introductory prices round to Stripe minor currency units", () => {
  assert.equal(discountedMinorAmount(299, "monthly"), 102);
  assert.equal(discountedMinorAmount(3000, "yearly"), 2010);
});
