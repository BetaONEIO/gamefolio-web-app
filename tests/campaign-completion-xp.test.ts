import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCampaignCompletionXp } from "../server/campaign-completion-xp";

describe("resolveCampaignCompletionXp", () => {
  it("uses the instance, then template, then configured, then tier amount", () => {
    assert.equal(resolveCampaignCompletionXp({
      instanceAmount: 1_250,
      templateAmount: 2_500,
      configuredAmount: 3_000,
      tierAmount: 4_000,
      multiplier: 2,
    }), 2_500);
    assert.equal(resolveCampaignCompletionXp({
      instanceAmount: 0,
      templateAmount: 1_500,
      configuredAmount: 3_000,
      tierAmount: 4_000,
      multiplier: 2,
    }), 3_000);
    assert.equal(resolveCampaignCompletionXp({
      configuredAmount: 2_000,
      tierAmount: 4_000,
      multiplier: 1.5,
    }), 3_000);
    assert.equal(resolveCampaignCompletionXp({
      tierAmount: 1_500,
      multiplier: 1.5,
    }), 2_250);
  });

  it("treats invalid values safely without producing an invalid reward", () => {
    assert.equal(resolveCampaignCompletionXp({
      instanceAmount: Number.NaN,
      templateAmount: -1,
      configuredAmount: 1000,
      multiplier: Number.NaN,
    }), 1_000);
    assert.equal(resolveCampaignCompletionXp({ configuredAmount: 1_000, multiplier: 0 }), 0);
  });
});