import assert from "node:assert/strict";
import test from "node:test";
import { isCampaignCreatorParticipationRestricted } from "../shared/campaign-access";

test("the named Indie preview account can access creator campaign workflows", () => {
  assert.equal(isCampaignCreatorParticipationRestricted({
    username: "indiedevgf",
    role: "indie_developer",
  }), false);

  assert.equal(isCampaignCreatorParticipationRestricted({
    username: "IndieDevGF",
    partnerType: "indie",
  }), false);
});

test("other Indie accounts remain restricted from creator campaign workflows", () => {
  assert.equal(isCampaignCreatorParticipationRestricted({
    username: "another_indie",
    role: "indie_developer",
  }), true);
  assert.equal(isCampaignCreatorParticipationRestricted({
    username: "another_partner",
    is_indie_dev_subscriber: true,
  }), true);
});

test("admin and moderator campaign access remains unchanged", () => {
  assert.equal(isCampaignCreatorParticipationRestricted({ role: "admin" }), false);
  assert.equal(isCampaignCreatorParticipationRestricted({ role: "moderator" }), false);
});