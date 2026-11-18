import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  applyPollVoteResult,
  getDisplayedPoll,
  type ActivePoll,
  type PollVoteResult,
} from "../client/src/components/home/poll-state";

function activePoll(): ActivePoll {
  return {
    id: 2,
    title: "How do you play?",
    description: "Choose one option.",
    startsAt: "2026-11-18T00:00:00.000Z",
    endsAt: "2026-12-02T00:00:00.000Z",
    myVoteOptionId: null,
    options: [
      { id: 5, label: "Local", voteCount: 3 },
      { id: 6, label: "Cloud", voteCount: 1 },
    ],
  };
}

const newVote: PollVoteResult = { optionId: 6, alreadyVoted: false };

test("a successful vote drives selected state and totals before a refetch", () => {
  const poll = activePoll();
  const displayed = getDisplayedPoll(poll, newVote);

  assert.equal(displayed.myVoteOptionId, 6);
  assert.deepEqual(displayed.options.map((option) => option.voteCount), [3, 2]);
  assert.deepEqual(poll.options.map((option) => option.voteCount), [3, 1]);
});

test("a cache update records the vote without double-counting its display result", () => {
  const updated = applyPollVoteResult(activePoll(), 2, newVote);
  assert.ok(updated);
  const displayed = getDisplayedPoll(updated, newVote);

  assert.equal(displayed.myVoteOptionId, 6);
  assert.deepEqual(displayed.options.map((option) => option.voteCount), [3, 2]);
});

test("an already-recorded vote selects the option without incrementing totals", () => {
  const displayed = getDisplayedPoll(activePoll(), { optionId: 5, alreadyVoted: true });

  assert.equal(displayed.myVoteOptionId, 5);
  assert.deepEqual(displayed.options.map((option) => option.voteCount), [3, 1]);
});

test("cache reconciliation leaves missing or unrelated polls unchanged", () => {
  const poll = activePoll();

  assert.equal(applyPollVoteResult(undefined, 2, newVote), undefined);
  assert.equal(applyPollVoteResult(poll, 99, newVote), poll);
});

test("the poll component always reconciles its exact user query after settlement", () => {
  const source = readFileSync("client/src/components/home/PollTakeover.tsx", "utf8");

  assert.match(source, /useQueryClient\(\)/);
  assert.match(source, /getDisplayedPoll\(poll, vote\.data\)/);
  assert.match(source, /onSettled:[\s\S]*invalidateQueries\(/);
  assert.match(source, /throwOnError: true/);
  assert.match(source, /Sentry\.captureException/);
  assert.match(source, /Poll vote reconciliation mismatch/);
});
