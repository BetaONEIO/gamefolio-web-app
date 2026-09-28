import assert from "node:assert/strict";
import test from "node:test";
import { buildOnboardingUserType, isGamingOnboardingPath } from "../shared/onboarding";

test("available onboarding paths preserve their user types", () => {
  assert.equal(isGamingOnboardingPath("gamer"), true);
  assert.equal(isGamingOnboardingPath("streamer"), false);
  assert.equal(isGamingOnboardingPath("indie"), false);
  assert.equal(isGamingOnboardingPath(null), false);
  assert.equal(buildOnboardingUserType("gamer"), "gamer");
  assert.equal(buildOnboardingUserType("gamer", ["gamer", "competitive"]), "gamer,competitive");
  assert.equal(buildOnboardingUserType("streamer"), "streamer");
  assert.equal(buildOnboardingUserType("indie"), "indie_developer");
});