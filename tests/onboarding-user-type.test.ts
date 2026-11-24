import assert from "node:assert/strict";
import test from "node:test";
import { buildOnboardingUserType, isGamingOnboardingPath } from "../shared/onboarding";

test("Speedrunner is a gaming path and persists as its own persona", () => {
  assert.equal(isGamingOnboardingPath("speedrunner"), true);
  assert.equal(buildOnboardingUserType("speedrunner"), "speedrunner");
  assert.equal(
    buildOnboardingUserType("speedrunner", ["competitive", "content_creator"]),
    "speedrunner,competitive,content_creator",
  );
});

test("the existing gamer persona and non-gaming paths keep their stored values", () => {
  assert.equal(isGamingOnboardingPath("gamer"), true);
  assert.equal(isGamingOnboardingPath("streamer"), false);
  assert.equal(isGamingOnboardingPath("indie"), false);
  assert.equal(isGamingOnboardingPath(null), false);
  assert.equal(buildOnboardingUserType("gamer"), "gamer");
  assert.equal(buildOnboardingUserType("gamer", ["gamer", "competitive"]), "gamer,competitive");
  assert.equal(buildOnboardingUserType("streamer"), "streamer");
  assert.equal(buildOnboardingUserType("indie"), "indie_developer");
});