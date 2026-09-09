import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CAMPAIGN_HERO_FALLBACK,
  campaignHeroSources,
  nextCampaignHeroSource,
} from "../client/src/lib/campaign-hero";

test("catalogue game artwork stays ahead of campaign-level artwork", () => {
  const sources = campaignHeroSources({
    catalog_game_artwork_url: "https://cdn.example/game.jpg",
    campaign_artwork_url: "https://cdn.example/campaign.jpg",
  });

  assert.deepEqual(sources, [
    "https://cdn.example/game.jpg",
    "https://cdn.example/campaign.jpg",
  ]);
});

test("a failed preferred image advances to the next usable source", () => {
  const sources = campaignHeroSources({
    hero_artwork_url: "https://cdn.example/broken.jpg",
    catalog_game_artwork_url: "https://cdn.example/game.jpg",
    campaign_artwork_url: "https://cdn.example/campaign.jpg",
  });

  assert.equal(
    nextCampaignHeroSource(sources, "https://cdn.example/broken.jpg"),
    "https://cdn.example/game.jpg",
  );
});

test("the hero uses its dark fallback when no artwork is usable", () => {
  assert.deepEqual(campaignHeroSources({
    hero_artwork_url: "   ",
    catalog_game_artwork_url: null,
    artwork_url: undefined,
  }), []);
  assert.match(CAMPAIGN_HERO_FALLBACK, /linear-gradient/);
  assert.doesNotMatch(CAMPAIGN_HERO_FALLBACK, /url\(/);
});

test("the marketplace query keeps catalogue and fallback artwork fields", () => {
  const route = readFileSync("server/routes/bounty-marketplace.ts", "utf8");
  const catalogField = route.indexOf("g.image_url AS catalog_game_artwork_url");
  const campaignField = route.indexOf("ci.artwork_url AS campaign_artwork_url");
  const fallbackExpression = route.indexOf("NULLIF(g.image_url, '')");
  const campaignFallback = route.indexOf("NULLIF(ci.artwork_url, '')");

  assert.ok(catalogField >= 0, "catalogue artwork must be returned by the marketplace query");
  assert.ok(campaignField >= 0, "campaign artwork must be returned by the marketplace query");
  assert.ok(fallbackExpression >= 0, "catalogue artwork must be part of the hero fallback chain");
  assert.ok(campaignFallback >= 0, "campaign artwork must be part of the hero fallback chain");
  assert.ok(fallbackExpression < campaignFallback, "catalogue artwork must precede campaign artwork");
});