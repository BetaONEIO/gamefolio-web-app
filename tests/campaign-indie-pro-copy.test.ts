import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const accordion = readFileSync("client/src/pages/indie-dashboard/CommercialCampaignAccordion.tsx", "utf8");

test("free developers see Indie Pro as an upgrade rather than an active benefit", () => {
  assert.match(accordion, /hasIndieProBenefit\?'Included with Indie Pro':'Available with Indie Pro'/);
  assert.match(accordion, /hasIndieProBenefit\?'Included':'Upgrade'/);
  assert.match(accordion, /Upgrade to Indie Pro to receive one Quick Creator campaign per billing month\./);
});

test("active or used monthly allowances identify an Indie Pro developer", () => {
  assert.match(accordion, /allowance\?\.available \|\| allowance\?\.used/);
});
