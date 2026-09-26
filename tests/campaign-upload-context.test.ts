import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CampaignUploadError, validateCampaignUploadRow } from "../server/services/campaign-upload-context";

const linked = {
  game_id: 42, linked_game_id: 42, status: "in_progress", deadline: null,
  content_type: "screenshot", quantity: 2,
};

test("linked campaign uploads use the verified campaign game", () => {
  assert.deepEqual(validateCampaignUploadRow(linked, "screenshot"), { gameId: 42 });
});

test("intentional game-unassigned campaigns can save media without inventing a game", () => {
  assert.deepEqual(validateCampaignUploadRow({ ...linked, game_id: null, linked_game_id: null }, "screenshot"), { gameId: null });
});

test("misconfigured, unrelated, ended and non-participant uploads are rejected", () => {
  for (const [record, type] of [
    [{ ...linked, linked_game_id: null }, "screenshot"],
    [{ ...linked, content_type: "clip" }, "screenshot"],
    [{ ...linked, status: "submitted_for_review" }, "screenshot"],
    [{ ...linked, deadline: new Date(0) }, "screenshot"],
    [undefined, "screenshot"],
  ] as const) {
    assert.throws(() => validateCampaignUploadRow(record, type), CampaignUploadError);
  }
});

test("an instance's immutable objective snapshot overrides the mutable template", () => {
  const campaign = {
    ...linked,
    content_type: "clip",
    quantity: 0,
    objective_snapshot: [{ id: 23, content_type: "screenshot", quantity: 2 }],
  };
  assert.deepEqual(validateCampaignUploadRow(campaign, "screenshot", 23), { gameId: 42 });
  assert.throws(() => validateCampaignUploadRow(campaign, "screenshot", 24), CampaignUploadError);
});

test("both campaign media routes derive game from campaign context, not a user-supplied field", () => {
  const screenshotRoute = readFileSync("server/routes.ts", "utf8");
  const videoRoute = readFileSync("server/routes/upload.ts", "utf8");
  const page = readFileSync("client/src/pages/BountiesPage.tsx", "utf8");
  assert.match(screenshotRoute, /campaignContext \? campaignContext\.gameId : req\.body\.gameId/);
  assert.match(videoRoute, /campaignUpload \? \{ \.\.\.req\.body, gameId: campaignContext!\.gameId \} : req\.body/);
  assert.match(page, /form\.append\("campaignInstanceId", String\(cp\.instance_id\)\)/);
  assert.match(page, /campaignObjectiveId: bountyId/);
});