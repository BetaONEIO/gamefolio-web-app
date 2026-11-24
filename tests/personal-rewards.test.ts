import assert from "node:assert/strict";
import test from "node:test";
import { canUsePersonalRewards } from "../shared/partner-access";

test("indie accounts are excluded independently of Pro and feature flags", () => {
  for (const user of [
    {userType:"indie_developer"}, {userType:"gamer, indie_developer"},
    {userType:"GAME_DEVELOPER"}, {userType:"indie"},
    {role:"developer"}, {role:"indie_developer"}, {role:"game_developer"},
    {partnerType:"indie", isPartner:true}, {partnerType:"indie", isPartner:false},
  ]) assert.equal(canUsePersonalRewards(user), false, JSON.stringify(user));
});

test("gamers and creators keep personal rewards, including paid streamer partners", () => {
  for (const user of [{userType:"gamer"}, {userType:"content_creator,streamer"}, {partnerType:"streamer",isPartner:true}, {role:"user"}, {}]) {
    assert.equal(canUsePersonalRewards(user), true, JSON.stringify(user));
  }
  assert.equal(canUsePersonalRewards(null), false);
  assert.equal(canUsePersonalRewards(undefined), false);
});
