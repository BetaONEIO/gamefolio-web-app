import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBountyClipRecommendation } from '../server/services/bounty-clip-ai-review';

const timestamps = [2.4, 6, 10.2];
const response = { game: 'matches', brief: 'meets', reason: 'Gameplay matches the official reference.', frame: 1 };

test('a clear match can be recommended with a timestamp from the sampled frames', () => {
  assert.deepEqual(parseBountyClipRecommendation(response, timestamps), {
    verdict: 'looks_ready',
    reason: response.reason,
    timestamp: 6,
  });
});

test('wrong-game, mixed-game and uncertain footage stays in human review', () => {
  for (const game of ['wrong_game', 'mixed', 'uncertain']) {
    assert.equal(parseBountyClipRecommendation({ ...response, game }, timestamps).verdict, 'needs_review');
  }
  for (const brief of ['misses', 'uncertain']) {
    assert.equal(parseBountyClipRecommendation({ ...response, brief }, timestamps).verdict, 'needs_review');
  }
});

test('malformed responses fail and fabricated timestamps are omitted', () => {
  assert.throws(() => parseBountyClipRecommendation({ ...response, game: 'approve' }, timestamps));
  assert.throws(() => parseBountyClipRecommendation({ ...response, frame: 1.5 }, timestamps));
  assert.equal(parseBountyClipRecommendation({ ...response, frame: 10 }, timestamps).timestamp, null);
});
