import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarizeCampaignSubmissionSlots } from "../server/campaign-submission-status";

describe("summarizeCampaignSubmissionSlots", () => {
  it("uses the latest submission in each slot instead of historical review requests", () => {
    const summary = summarizeCampaignSubmissionSlots([
      { id: 10, slot_index: 0, status: "changes_requested" },
      { id: 14, slot_index: 0, status: "under_review" },
      { id: 12, slot_index: 1, status: "approved" },
    ], 2);

    assert.equal(summary.submissionStatus, "under_review");
    assert.equal(summary.changesRequested, 0);
    assert.equal(summary.underReview, 1);
    assert.equal(summary.approved, 1);
    assert.equal(summary.submitted, 2);
  });

  it("keeps the requested state when a slot has not yet been resubmitted", () => {
    const summary = summarizeCampaignSubmissionSlots([
      { id: 10, slot_index: 0, status: "approved" },
      { id: 11, slot_index: 1, status: "changes_requested" },
      { id: 12, slot_index: 1, status: "staged" },
    ], 2);

    assert.equal(summary.submissionStatus, "staged");
    assert.equal(summary.changesRequested, 0);
    assert.equal(summary.staged, 1);
    assert.equal(summary.approved, 1);
  });

  it("reports a completed objective only when every required slot is currently approved", () => {
    const summary = summarizeCampaignSubmissionSlots([
      { id: 1, slot_index: 0, status: "approved" },
      { id: 2, slot_index: 1, status: "changes_requested" },
      { id: 3, slot_index: 1, status: "approved" },
    ], 2);

    assert.equal(summary.submissionStatus, "approved");
    assert.equal(summary.approved, 2);
  });
});