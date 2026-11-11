import assert from "node:assert/strict";
import test from "node:test";
import {
  discountedIndieDevMinorAmount,
  INDIE_DEV_PRO_COUPON_DURATION,
  INDIE_DEV_PRO_DISCOUNT_PERCENT,
} from "../shared/indie-dev-pro-offer";

test("Game Developer Pro uses the same one-time introductory discounts", () => {
  assert.equal(INDIE_DEV_PRO_COUPON_DURATION, "once");
  assert.deepEqual(INDIE_DEV_PRO_DISCOUNT_PERCENT, { monthly: 66, yearly: 33 });
});

test("discounts are calculated against Game Developer Pro prices", () => {
  assert.equal(discountedIndieDevMinorAmount(399, "monthly"), 136);
  assert.equal(discountedIndieDevMinorAmount(4200, "yearly"), 2814);
});
