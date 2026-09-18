import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { performanceMiddleware, measureStage, timedMiddleware, instrumentSessionStore, type PerformanceEvent } from '../server/performance';
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


test('session persistence is timed through its callback without exposing session data', async () => {
  const events: PerformanceEvent[] = [];
  const token = { saved: true };
  const privateError = new Error('private session detail');
  const store = { value: 42, set(this: { value: number }, _id: string, _session: unknown, callback: Function) {
    assert.equal(this.value, 42);
    setTimeout(() => callback(privateError, token), 20);
    return token;
  } };
  assert.equal(instrumentSessionStore(store), store);
  instrumentSessionStore(store); // Repeated setup must not double-count operations.
  await new Promise<void>(resolve => {
    const res = response();
    performanceMiddleware({ slowMs: 0, stalledMs: 10, emit: e => events.push(e) })(
      { path: '/api/user', method: 'GET' } as any, res as any, () => {
        assert.equal(store.set('private-session-id', { secret: 'private-token' }, (error: Error, result: unknown) => {
          assert.equal(error, privateError); assert.equal(result, token);
          res.writableFinished = true; res.emit('finish'); resolve();
        }), token);
      });
  });
  assert.ok(events[0].stages['session.store.set'].activeMs >= 5);
  const final = events.at(-1)!;
  assert.equal(final.stages['session.store.set'].count, 1);
  assert.equal(final.stages['session.store.set'].failures, 1);
  assert.equal(final.stages['session.store.set'].active, 0);
  assert.ok(!JSON.stringify(events).includes('private-'));
  assert.equal(final.runtimeId, events[0].runtimeId);
  assert.ok(Number.isFinite(final.processWindow.cpuUserMs));
  assert.ok(!Number.isNaN(Date.parse(final.observedAt)));
});

test('completed slow requests alert below the stalled threshold and keep a correlation ID', async () => {
  const events: PerformanceEvent[] = [], alerts: PerformanceEvent[] = [];
  const res = response();
  await new Promise<void>(resolve => performanceMiddleware({ slowMs: 0, alertMs: 10, stalledMs: 1000,
    emit: e => events.push(e), onSlow: e => alerts.push(e) })(
    { path: '/api/user', method: 'GET' } as any, res as any, () => {
      setTimeout(() => { res.writableFinished = true; res.emit('finish'); res.emit('close'); resolve(); }, 25);
    }));
  assert.equal(alerts.length, 1); assert.equal(events.length, 1);
  assert.equal(alerts[0].requestId, res.headers['X-Request-ID']);
  assert.ok(events[0].processWindow.eventLoopIdleMs >= 0);
});

test('timed async middleware preserves rejection identity and completed response timings', async () => {
  const error = new Error('private authentication detail');
  const res = response(), events: PerformanceEvent[] = [];
  await new Promise<void>(resolve => performanceMiddleware({ slowMs: 0, emit: e => events.push(e) })(
    { path: '/api/user', method: 'GET' } as any, res as any, () => {
      timedMiddleware('auth.optional', async () => { await delay(5); throw error; })(
        {} as any, res as any, received => {
          assert.equal(received, error); res.writableFinished = true; res.emit('finish'); resolve();
        });
    }));
  assert.equal(events[0].stages['auth.optional'].failures, 1);
  assert.equal(events[0].stages['auth.optional'].active, 0);
  assert.equal(res.listenerCount('close'), 1); // Only the outer request observer remains.
  const short = response();
  performanceMiddleware({ slowMs: 0, emit: e => events.push(e) })(
    { path: '/api/user', method: 'GET' } as any, short as any, () => {
      timedMiddleware('auth.terminal', (_req, response) => {
        short.writableFinished = true; response.emit('finish');
      })({} as any, short as any, () => assert.fail('response must not advance'));
    });
  assert.equal(events[1].stages['auth.terminal'].active, 0);
  assert.equal(events[1].stages['auth.terminal'].count, 1);
});
