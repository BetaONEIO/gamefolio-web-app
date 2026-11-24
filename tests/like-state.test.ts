import assert from "node:assert/strict";
import test from "node:test";
import {
  sameLikeTarget,
  shouldApplyLikeResult,
  shouldApplyLikeStatus,
  toggledLikeCount,
  type LikeTarget,
} from "../client/src/components/engagement/like-state";

const clip = (contentId: number): LikeTarget => ({ contentId, contentType: "clip" });

test("a like confirmation is applied only to the item that was tapped", () => {
  const tapped = clip(11);
  assert.equal(shouldApplyLikeResult(clip(11), tapped), true);
  assert.equal(shouldApplyLikeResult(clip(22), tapped), false);
  assert.equal(
    shouldApplyLikeResult({ contentId: 11, contentType: "screenshot" }, tapped),
    false,
  );
});

test("status for another item, or an in-flight toggle, does not overwrite the heart", () => {
  assert.equal(shouldApplyLikeStatus({
    current: clip(22),
    reportedFor: clip(11),
    toggleInFlightFor: null,
  }), false);

  assert.equal(shouldApplyLikeStatus({
    current: clip(11),
    reportedFor: clip(11),
    toggleInFlightFor: clip(11),
  }), false);

  assert.equal(shouldApplyLikeStatus({
    current: clip(22),
    reportedFor: clip(22),
    toggleInFlightFor: clip(11),
  }), true);

  assert.equal(shouldApplyLikeStatus({
    current: clip(11),
    reportedFor: clip(11),
    toggleInFlightFor: null,
  }), true);
});

test("optimistic count moves with the tap and does not go below zero", () => {
  assert.equal(toggledLikeCount(false, 3), 4);
  assert.equal(toggledLikeCount(true, 3), 2);
  assert.equal(toggledLikeCount(true, 0), 0);
  assert.equal(sameLikeTarget(clip(11), clip(11)), true);
});
