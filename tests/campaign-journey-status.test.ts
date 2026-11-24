import assert from "node:assert/strict";
import test from "node:test";
import { deriveCampaignJourneyStatus } from "../server/services/campaign-journey-status";

const base = {
  participantStatus: "active",
  deadline: "2026-10-01T00:00:00Z",
  submittedUnits: 0,
  totalUnits: 5,
  hasAwaitingReview: false,
  hasChangesRequested: false,
  now: Date.parse("2026-09-26T00:00:00Z"),
};

test("a resubmitted package is under review despite historical change requests and an elapsed deadline", () => {
  assert.equal(deriveCampaignJourneyStatus({
    ...base,
    participantStatus: "submitted_for_review",
    deadline: "2026-09-25T00:00:00Z",
    submittedUnits: 5,
    hasAwaitingReview: true,
    hasChangesRequested: true,
  }), "under_review");
});

test("only the requested changes reopen the package before resubmission", () => {
  assert.equal(deriveCampaignJourneyStatus({
    ...base,
    participantStatus: "changes_requested",
    submittedUnits: 4,
    hasChangesRequested: true,
  }), "changes_requested");
  assert.equal(deriveCampaignJourneyStatus({
    ...base,
    participantStatus: "active",
    hasChangesRequested: true,
  }), "changes_requested");
});

test("completed and rejected campaigns keep their terminal state", () => {
  assert.equal(deriveCampaignJourneyStatus({
    ...base,
    participantStatus: "completed_and_verified",
    hasChangesRequested: true,
  }), "completed");
  assert.equal(deriveCampaignJourneyStatus({
    ...base,
    participantStatus: "rejected",
  }), "rejected");
});

test("a previously active participant with a complete pending package is under review", () => {
  assert.equal(deriveCampaignJourneyStatus({
    ...base,
    submittedUnits: 5,
    hasAwaitingReview: true,
  }), "under_review");
});

test("an unsubmitted package past its deadline is expired", () => {
  assert.equal(deriveCampaignJourneyStatus({
    ...base,
    deadline: "2026-09-25T00:00:00Z",
  }), "expired");
});