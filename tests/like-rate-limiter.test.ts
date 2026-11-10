import assert from 'node:assert/strict';
import test from 'node:test';
import { createLikeRateLimiter } from '../server/like-rate-limiter';

test('blocks rapid like creation but permits activity after the short window', () => {
  const recordLike = createLikeRateLimiter();
  const userId = 42;

  for (let index = 0; index < 20; index += 1) {
    assert.equal(recordLike(userId, index * 1_000).allowed, true);
  }

  assert.deepEqual(recordLike(userId, 20_000), {
    allowed: false,
    message: 'Too many likes in a short period. Please wait a few minutes and try again.',
  });
  assert.equal(recordLike(userId, 5 * 60 * 1_000 + 1).allowed, true);
});

test('enforces the hourly cap independently per account', () => {
  const recordLike = createLikeRateLimiter();

  for (let index = 0; index < 30; index += 1) {
    assert.equal(recordLike(1, index * 20_000).allowed, true);
  }

  assert.deepEqual(recordLike(1, 30 * 20_000), {
    allowed: false,
    message: 'Hourly like limit reached. Please try again later.',
  });
  assert.equal(recordLike(2, 30 * 20_000).allowed, true);
  assert.equal(recordLike(1, 60 * 60 * 1_000 + 1).allowed, true);
});

test('failed like attempts do not consume the short-period quota', () => {
  const recordLike = createLikeRateLimiter();
  const userId = 193;

  for (let index = 0; index < 20; index += 1) {
    const attempt = recordLike(userId, 1_000);
    assert.equal(attempt.allowed, true);
    attempt.release?.();
  }

  assert.equal(recordLike(userId, 1_000).allowed, true);
});

test('releasing a failed attempt keeps a later successful reservation', () => {
  const recordLike = createLikeRateLimiter();
  const failed = recordLike(1, 1_000);
  const succeeded = recordLike(1, 1_000);
  assert.equal(failed.allowed, true);
  assert.equal(succeeded.allowed, true);

  failed.release?.();

  for (let index = 0; index < 18; index += 1) {
    assert.equal(recordLike(1, 1_000).allowed, true);
  }

  assert.equal(recordLike(1, 1_000).allowed, true);
  assert.equal(recordLike(1, 1_000).allowed, false);
  assert.equal(recordLike(2, 1_000).allowed, true);
});
