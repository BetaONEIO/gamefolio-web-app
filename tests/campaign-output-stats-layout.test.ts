import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const stats = readFileSync("client/src/pages/indie-dashboard/CampaignOutputStats.tsx", "utf8");

test("two campaign output metrics use the full two-column width", () => {
  assert.match(stats, /outputs\.length === 2[\s\S]*?'grid-cols-2'/);
  assert.doesNotMatch(stats, /outputs\.length >= 4 \? 'lg:grid-cols-4' : 'lg:grid-cols-3'/);
});

test("campaign output values stay together instead of wrapping Up to and units", () => {
  assert.match(stats, /whitespace-nowrap text-\[32px\]/);
});
