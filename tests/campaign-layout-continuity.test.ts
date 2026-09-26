import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("client/src/pages/BountiesPage.tsx", "utf8");
const available = page.slice(page.indexOf("function AvailableCampaignPreview("), page.indexOf("function CampaignRowArtwork("));
const active = page.slice(page.indexOf("function CampaignProgress("), page.indexOf("function CampaignStartedModal("));

test("available and active campaigns share the game details and mission artwork", () => {
  for (const view of [available, active]) {
    assert.match(view, /<CampaignGameDetails campaign=/);
    assert.match(view, /<VisualMissionCard bounty=/);
    assert.match(view, /<CampaignRewardJourney campaign=/);
  }
});

test("active objectives stay in count-aware desktop columns beside rewards", () => {
  assert.match(active, /mandatory\.length >= 4 \? "lg:grid-cols-4" : mandatory\.length === 3 \? "lg:grid-cols-3" : mandatory\.length === 2 \? "lg:grid-cols-2"/);
  assert.match(active, /lg:grid-cols-\[minmax\(0,1fr\)_minmax\(240px,28%\)\]/);
  assert.match(active, /showProgress=\{false\}/);
  assert.doesNotMatch(active, /<article key=\{b\.id\} className="w-full rounded-2xl/);
});

test("prepared items do not award completion rewards or bypass package submission", () => {
  assert.match(active, /const readyToSubmit = preparedUnits >= requiredUnits/);
  assert.match(active, /disabled=\{!readyToSubmit \|\| nativeSubmitMutation\.isPending/);
  assert.match(active, /submitPackageMutation\.mutate\(\)/);
  assert.match(page, /const earnedXp = joined && requiredUnits > 0 && approvedUnits >= requiredUnits \? requiredXp : 0/);
});