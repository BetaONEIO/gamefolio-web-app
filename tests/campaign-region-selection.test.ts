import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const flow = readFileSync("client/src/pages/indie-dashboard/CreateCampaignFlow.tsx", "utf8");
const routes = readFileSync("server/routes/campaign-programme.ts", "utf8");

test("campaign setup no longer exposes region eligibility controls", () => {
  assert.doesNotMatch(flow, /Eligible regions?/i);
  assert.doesNotMatch(flow, /AvailableRegionsCard/);
  assert.doesNotMatch(flow, /Add eligible regions to your game profile before launching/);
});

test("campaign submissions use worldwide compatibility scope", () => {
  assert.match(flow, /regions: "worldwide"/);
  assert.match(routes, /VALUES[\s\S]*?'worldwide'/);
  assert.match(routes, /regions = 'worldwide'/);
  assert.doesNotMatch(routes, /Add available regions in your game settings before launching this campaign/);
});
