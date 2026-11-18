import assert from "node:assert/strict";
import test from "node:test";
import {
  discountedIndieDevMinorAmount,
  INDIE_DEV_PRO_COUPON_DURATION,
  INDIE_DEV_PRO_DISCOUNT_PERCENT,
} from "../shared/indie-dev-pro-offer";
import {
  isIndieDevIntroOfferEligible,
  parseIndieDevOnboardingPath,
} from "../server/services/indie-dev-offer-eligibility";

test("Game Developer Pro uses the same one-time introductory discounts", () => {
  assert.equal(INDIE_DEV_PRO_COUPON_DURATION, "once");
  assert.deepEqual(INDIE_DEV_PRO_DISCOUNT_PERCENT, { monthly: 66, yearly: 20 });
});

test("discounts are calculated against Game Developer Pro prices", () => {
  assert.equal(discountedIndieDevMinorAmount(899, "monthly"), 306);
  assert.equal(discountedIndieDevMinorAmount(9900, "yearly"), 7920);
});

test("persisted developer personas receive the intro offer once", () => {
  assert.equal(isIndieDevIntroOfferEligible({ userType: "indie_developer" }), true);
  assert.equal(isIndieDevIntroOfferEligible({ role: "developer" }), true);
  assert.equal(isIndieDevIntroOfferEligible({ partnerType: "indie" }), true);
  assert.equal(isIndieDevIntroOfferEligible({
    userType: "indie_developer",
    indieDevSubscriptionStartDate: new Date("2026-01-01T00:00:00.000Z"),
  }), false);
});

test("unfinished indie onboarding is eligible without marking onboarding complete", () => {
  assert.equal(isIndieDevIntroOfferEligible({ userType: null }, "indie"), true);
  assert.equal(isIndieDevIntroOfferEligible({ userType: null }), false);
});

test("onboarded non-developers cannot forge onboarding eligibility", () => {
  assert.equal(isIndieDevIntroOfferEligible({ userType: "gamer" }, "indie"), false);
  assert.equal(isIndieDevIntroOfferEligible({
    userType: null,
    indieDevSubscriptionStartDate: new Date("2026-01-01T00:00:00.000Z"),
  }, "indie"), false);
});

test("only the exact indie onboarding path is accepted", () => {
  assert.equal(parseIndieDevOnboardingPath("indie"), "indie");
  assert.equal(parseIndieDevOnboardingPath("developer"), undefined);
  assert.equal(parseIndieDevOnboardingPath(["indie"]), undefined);
  assert.equal(parseIndieDevOnboardingPath(undefined), undefined);
});
