import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const flow = readFileSync("client/src/pages/indie-dashboard/CreateCampaignFlow.tsx", "utf8");

test("campaign setup exposes region selection when the game profile has none", () => {
  assert.match(
    flow,
    /regionsMissing && profile\.id != null && !locked[\s\S]*No regions are configured for this game yet[\s\S]*<AvailableRegionsCard/,
  );
  assert.match(flow, /choices are also saved to the game profile/);
});

test("existing profile regions keep the compact summary and adjustment dialog", () => {
  assert.match(flow, /profile\.availableRegions\.map/);
  assert.match(flow, /profile\.id != null && !regionsMissing && <Dialog/);
});
