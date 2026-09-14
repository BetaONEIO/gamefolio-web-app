import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { performanceMiddleware, measureStage, timedMiddleware, type PerformanceEvent } from '../server/performance';
import { loadCurrentUser, STREAK_CLAIM_INTERVAL_MS } from '../server/current-user';
const reward = { currentStreak: 3, bonusAwarded: 75, dailyXP: 10, isNewMilestone: true, message: 'Awarded', isFirstLogin: false };
test('recent claims do one fresh read without awarding again', async () => {
  let reads = 0;
  const user = { lastStreakUpdate: new Date(100), currentStreak: 2 };
  const result = await loadCurrentUser(1, false, { getUser: async () => { reads++; return user; },
    updateStreak: async () => { throw new Error('must not award'); } }, STREAK_CLAIM_INTERVAL_MS);
  assert.equal(reads, 1); assert.equal(result.user, user);
  assert.equal(result.streakInfo?.dailyXP, 0); assert.equal(result.streakInfo?.message, 'Already logged in today');
});
test('20-hour boundary and first login await rewards and reread updated state', async () => {
  for (const lastStreakUpdate of [new Date(0), null]) {
    const calls: string[] = [];
    const result = await loadCurrentUser(1, false, {
      getUser: async () => { calls.push('read'); return { lastStreakUpdate, currentStreak: calls.length > 1 ? 3 : 2 }; },
      updateStreak: async () => { calls.push('award'); await delay(5); calls.push('awarded'); return reward; }
    }, STREAK_CLAIM_INTERVAL_MS);
    assert.deepEqual(calls, ['read', 'award', 'awarded', 'read']);
    assert.equal(result.user?.currentStreak, 3); assert.equal(result.streakInfo, reward);
  }
});
test('impersonation and missing users never award', async () => {
  for (const user of [null, { lastStreakUpdate: null, currentStreak: 0 }]) {
    const result = await loadCurrentUser(1, true, { getUser: async () => user,
      updateStreak: async () => { throw new Error('must not award'); } });
    assert.equal(result.user, user); assert.equal(result.streakInfo, null);
  }
});
function response() { return Object.assign(new EventEmitter(), { statusCode: 200, writableFinished: false,
  headers: {} as Record<string,string>, setHeader(name: string, value: string) { this.headers[name] = value; } }); }
test('stalled request records active auth stage, redacts private paths and alerts only once', async () => {
  const events: PerformanceEvent[] = [], alerts: PerformanceEvent[] = [];
  const req = { path: '/api/users/private-name/clips', method: 'GET', headers: { authorization: 'secret' } };
  const res = response();
  performanceMiddleware({ stalledMs: 10, slowMs: 0, emit: e => events.push(e), onSlow: e => alerts.push(e) })(req as any, res as any, () => {
    timedMiddleware('session.load', (_req, _res, next) => { setTimeout(next, 35); })(req as any, res as any, () => {
      res.writableFinished = true; res.emit('finish'); res.emit('close'); });
  });
  await delay(70);
  assert.deepEqual(events.map(e => e.event), ['request_slow','request_complete']);
  assert.equal(events[0].stages['session.load'].active, 1); assert.equal(events[1].stages['session.load'].count, 1);
  assert.equal(alerts.length, 1); assert.equal(events[0].route, '/api/users/:username/clips');
  assert.ok(!JSON.stringify(events).includes('private-name')); assert.ok(!JSON.stringify(events).includes('secret'));
  assert.equal(events[0].requestId, res.headers['X-Request-ID']);
});
test('concurrent timings are isolated; original errors are preserved without logging their contents', async () => {
  const events: PerformanceEvent[] = [], error = new Error('private database detail');
  const middleware = performanceMiddleware({ slowMs: 0, emit: e => events.push(e) });
  await Promise.all([10,20].map(ms => new Promise<void>(resolve => {
    const res = response();
    middleware({ path: '/api/user', method: 'GET' } as any, res as any, () => {
      void (async () => { await assert.rejects(measureStage(`db.test${ms}`, async () => { await delay(ms); throw error; }), e => e === error);
        res.emit('close'); resolve(); })();
    });
  })));
  assert.equal(events.length, 2); assert.notEqual(events[0].requestId, events[1].requestId);
  assert.equal(Object.keys(events[0].stages).length, 1); assert.equal(Object.values(events[0].stages)[0].failures, 1);
  assert.ok(!JSON.stringify(events).includes(error.message));
});
