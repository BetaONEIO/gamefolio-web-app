import assert from "node:assert/strict";
import test from "node:test";
import { buildOnboardingUserType, isGamingOnboardingPath } from "../shared/onboarding";

test("Speedrunner is a gaming path and persists its identity with selected interests", () => {
  assert.equal(isGamingOnboardingPath("speedrunner"), true);
  assert.equal(buildOnboardingUserType("speedrunner"), "speedrunner");
  assert.equal(
    buildOnboardingUserType("speedrunner", ["competitive", "content_creator"]),
    "speedrunner,competitive,content_creator",
  );
  assert.equal(
    buildOnboardingUserType("speedrunner", ["speedrunner", "competitive"]),
    "speedrunner,competitive",
  );
});

test("existing Gamer and non-gaming path user types stay unchanged", () => {
  assert.equal(isGamingOnboardingPath("gamer"), true);
  assert.equal(isGamingOnboardingPath("streamer"), false);
  assert.equal(isGamingOnboardingPath("indie"), false);
  assert.equal(isGamingOnboardingPath(null), false);
  assert.equal(buildOnboardingUserType("gamer"), "gamer");
  assert.equal(buildOnboardingUserType("gamer", ["gamer", "competitive"]), "gamer,competitive");
  assert.equal(buildOnboardingUserType("streamer"), "streamer");
  assert.equal(buildOnboardingUserType("indie"), "indie_developer");
});