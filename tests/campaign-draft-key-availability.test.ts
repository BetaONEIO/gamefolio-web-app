import assert from "node:assert/strict";
import test from "node:test";
import { getCampaignKeyAvailability } from "../client/src/lib/campaign-key-availability";

const inventory = (gameId: number, demo: number, full: number) => ({
  gameId,
  byType: { demo: { available: demo }, full: { available: full } },
});

test("cancelled paid checkout can resume using game inventory without pasted keys", () => {
  const draft = { game_id: 42, existing_reserved_demo_keys: "0", existing_reserved_full_keys: "0" };
  const keys = getCampaignKeyAvailability(42, inventory(42, 5, 5), draft);
  assert.equal(keys.available.full, 5, "full-game access supports all five saved creator places");
  assert.equal(keys.available.demo, 5, "demo access supports all five saved creator places");
});

test("a resumed campaign retains its own keys already reserved before checkout", () => {
  const draft = { game_id: 42, existing_reserved_demo_keys: "3", existing_reserved_full_keys: "4" };
  const keys = getCampaignKeyAvailability(42, inventory(42, 2, 1), draft);
  assert.deepEqual(keys.available, { demo: 5, full: 5 });
  assert.deepEqual(keys.reserved, { demo: 3, full: 4 });
});

test("keys held by other campaigns cannot fund the resumed campaign", () => {
  const keys = getCampaignKeyAvailability(42, {
    ...inventory(42, 0, 1),
    byType: { demo: { available: 0, reserved: 20 }, full: { available: 1, reserved: 40 } },
  } as ReturnType<typeof inventory>, { game_id: 42, existing_reserved_full_keys: "2" });
  assert.deepEqual(keys.available, { demo: 0, full: 3 });
});

test("changing the selected game does not carry over the draft's reserved keys", () => {
  const draft = { game_id: 42, existing_reserved_demo_keys: 5, existing_reserved_full_keys: 5 };
  assert.deepEqual(getCampaignKeyAvailability(43, inventory(43, 0, 1), draft), {
    available: { demo: 0, full: 1 }, reserved: undefined,
  });
  assert.deepEqual(getCampaignKeyAvailability(43, inventory(42, 5, 5), draft).available, {});
});

test("loading, failed or malformed inventory never claims keys are available", () => {
  const draft = { game_id: 42, existing_reserved_full_keys: "5" };
  assert.deepEqual(getCampaignKeyAvailability(42, undefined, draft).available, {});
  assert.deepEqual(getCampaignKeyAvailability(null, inventory(42, 5, 5), draft).available, {});
  assert.deepEqual(getCampaignKeyAvailability(42, {
    gameId: 42, byType: { demo: { available: -1 }, full: { available: "5" } },
  }, draft).available, { demo: undefined, full: undefined });
});
