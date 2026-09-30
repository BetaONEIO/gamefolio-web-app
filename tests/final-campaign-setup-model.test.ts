import assert from "node:assert/strict";
import test from "node:test";
import {
  getPresetDecisionBlocker,
  getPresetPersonaliseSummary,
} from "../client/src/pages/indie-dashboard/preset-personalise-model";

const validInput = {
  title: "My Content Boost",
  accessChoice: "free_to_play",
  fullKeyCount: 0,
  demoKeyCount: 0,
  noKeyConfirmed: true,
  startType: "asap" as const,
  scheduledDate: "",
  scheduledTime: "",
  launchIsValid: true,
};

test("Content Boost summary derives all canonical estimates from the campaign template", () => {
  const summary = getPresetPersonaliseSummary("content-boost", "Content Boost");
  assert.deepEqual(summary, {
    title: "Content Boost",
    applicationDays: 30,
    completionDays: 14,
    creatorRange: "5–10",
    submissionRange: "Approximately 25–50",
    deliverablesPerCreator: 5,
  });
});

test("zero key inventory blocks key access while unknown inventory requests a check", () => {
  assert.equal(getPresetDecisionBlocker({
    ...validInput,
    accessChoice: "full_game_upfront",
    fullKeyCount: 0,
  }), "Add full-game keys before selecting this option.");
  assert.equal(getPresetDecisionBlocker({
    ...validInput,
    accessChoice: "private_playtest",
    demoKeyCount: 0,
  }), "Add demo or playtest keys before selecting this option.");

  assert.equal(getPresetDecisionBlocker({
    ...validInput,
    accessChoice: "full_game_upfront",
    fullKeyCount: null,
  }), "Check full-game key availability before selecting this option.");
  assert.equal(getPresetDecisionBlocker({
    ...validInput,
    accessChoice: "private_playtest",
    demoKeyCount: undefined,
  }), "Check demo or playtest key availability before selecting this option.");
});

test("no-key access is permitted only after matching game-profile confirmation", () => {
  assert.equal(getPresetDecisionBlocker({
    ...validInput,
    accessChoice: "free_to_play",
    noKeyConfirmed: false,
  }), "Confirm no-key access in your game profile.");
  assert.equal(getPresetDecisionBlocker({
    ...validInput,
    accessChoice: "public_demo",
    noKeyConfirmed: false,
  }), "Confirm no-key access in your game profile.");
  assert.equal(getPresetDecisionBlocker(validInput), null);
});

test("title and scheduled-launch blockers are specific and clear when complete", () => {
  assert.equal(getPresetDecisionBlocker({
    ...validInput,
    title: "  ",
    accessChoice: null,
  }), "Add a campaign title to continue.");
  assert.equal(getPresetDecisionBlocker({
    ...validInput,
    accessChoice: null,
  }), "Choose how creators will access your game.");
  assert.equal(getPresetDecisionBlocker({
    ...validInput,
    startType: "scheduled",
  }), "Select a launch date and time.");
  assert.equal(getPresetDecisionBlocker({
    ...validInput,
    startType: "scheduled",
    scheduledDate: "2032-12-31",
    scheduledTime: "12:00",
    launchIsValid: false,
  }), "Choose a future launch date and time.");
  assert.equal(getPresetDecisionBlocker({
    ...validInput,
    startType: "scheduled",
    scheduledDate: "2032-12-31",
    scheduledTime: "12:00",
    launchIsValid: true,
  }), null);
});

test("unknown preset does not fabricate a summary", () => {
  assert.equal(getPresetPersonaliseSummary("unknown-template", "Unknown"), null);
});