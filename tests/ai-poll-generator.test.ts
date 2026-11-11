import assert from 'node:assert/strict';
import test from 'node:test';
import { getPollWindow, parseGeneratedPoll } from '../server/services/ai-poll-policy';

test('generated polls get a two-day review window and stay live for exactly two weeks', () => {
  const generatedAt = new Date('2026-11-11T12:00:00.000Z');
  const window = getPollWindow(generatedAt);
  assert.equal(window.startsAt.toISOString(), '2026-11-13T12:00:00.000Z');
  assert.equal(window.endsAt.toISOString(), '2026-11-27T12:00:00.000Z');
});

test('the next poll starts when the current poll ends during the review window', () => {
  const generatedAt = new Date('2026-11-11T12:00:00.000Z');
  const previousEndsAt = new Date('2026-11-13T10:00:00.000Z');
  const window = getPollWindow(generatedAt, previousEndsAt);
  assert.equal(window.startsAt, previousEndsAt);
  assert.equal(window.endsAt.toISOString(), '2026-11-27T10:00:00.000Z');
});

test('valid generated poll content is accepted', () => {
  const poll = parseGeneratedPoll({
    theme: 'gamefolio',
    title: 'What should we improve next?',
    description: 'Help shape the next Gamefolio update.',
    options: ['Profiles', 'Discovery', 'Clip tools'],
  });
  assert.equal(poll.options.length, 3);
});

test('duplicate or out-of-bounds poll content is rejected', () => {
  assert.throws(() => parseGeneratedPoll({
    theme: 'gaming',
    title: 'Pick one',
    description: 'A quick community question.',
    options: ['Co-op', 'co-op'],
  }));
  assert.throws(() => parseGeneratedPoll({
    theme: 'gaming',
    title: 'Pick one',
    description: 'A quick community question.',
    options: ['A'],
  }));
});

