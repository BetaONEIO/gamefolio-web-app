import assert from "node:assert/strict";
import test from "node:test";
import { loadIsolatedService } from "./helpers/isolated-typescript.ts";

async function setup() {
  const event = {
    key: "season:9:ending_week", seasonNumber: 9, stage: "ending_week",
    title: "Final week", message: "Climb the leaderboard",
    dueAt: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 60_000),
  };
  let events = [event];
  let users = [{ id: 1, status: "active", createdAt: new Date(0) }];
  const claims = new Set<number>();
  const deliveries: any[] = [];
  const failed = new Set<number>();
  const cursors: number[] = [];
  let schemaCalls = 0;
  let beforeQuery = async () => {};
  const mocks = {
    "drizzle-orm": { sql: (_strings: TemplateStringsArray, ...values: any[]) => values },
    "./db": { db: { execute: async (values: any[]) => {
      await beforeQuery();
      const [dueAt, afterId, _eventKey, limit] = values;
      cursors.push(afterId);
      return { rows: users.filter(user => user.status === "active"
        && user.createdAt <= new Date(dueAt) && user.id > afterId && !claims.has(user.id))
        .sort((a, b) => a.id - b.id).slice(0, limit).map(user => ({ id: user.id })) };
    } } },
    "./notification-event-schema": { ensureNotificationEventClaims: async () => { schemaCalls++; } },
    "./season-notification-policy": { getDueSeasonNotifications: () => events },
    "./notification-service": { createAndPush: async (notification: any, key: string) => {
      if (failed.has(notification.userId)) throw new Error("Simulated database failure");
      if (claims.has(notification.userId)) return;
      claims.add(notification.userId);
      deliveries.push({ ...notification, key });
    } },
  };
  const load = () => loadIsolatedService(new URL("../server/season-notification-service.ts", import.meta.url), mocks);
  return {
    service: await load(), load, event, claims, deliveries, failed, cursors,
    setEvents: (value: typeof events) => { events = value; },
    setUsers: (value: typeof users) => { users = value; },
    setBeforeQuery: (value: typeof beforeQuery) => { beforeQuery = value; },
    schemaCalls: () => schemaCalls,
  };
}

test("the season worker does no database work outside an announcement window", async () => {
  const s = await setup();
  s.setEvents([]);
  await s.service.processSeasonNotifications();
  assert.equal(s.schemaCalls(), 0);
  assert.equal(s.cursors.length, 0);
});

test("season audiences are paged and previously claimed recipients stay skipped after a restart", async () => {
  const s = await setup();
  s.setUsers([
    ...Array.from({ length: 405 }, (_, i) => ({ id: i + 1, status: "active", createdAt: new Date(0) })),
    { id: 406, status: "banned", createdAt: new Date(0) },
    { id: 407, status: "active", createdAt: new Date(Date.now() + 60_000) },
  ]);
  await s.service.processSeasonNotifications();
  assert.deepEqual(s.cursors, [0, 200, 400]);
  assert.equal(s.deliveries.length, 405);
  assert.equal(s.deliveries[0].actionUrl, "/leaderboard");
  assert.equal(s.deliveries[0].key, s.event.key);
  assert.equal(s.deliveries[0].type, "season");
  const restarted = await s.load();
  await restarted.processSeasonNotifications();
  assert.equal(s.deliveries.length, 405);
});

test("a failed recipient is retried next tick without repeating successful recipients", async () => {
  const s = await setup();
  s.setUsers([{ id: 1, status: "active", createdAt: new Date(0) }, { id: 2, status: "active", createdAt: new Date(0) }]);
  s.failed.add(1);
  await s.service.processSeasonNotifications();
  assert.deepEqual(s.deliveries.map(row => row.userId), [2]);
  s.failed.clear();
  await s.service.processSeasonNotifications();
  assert.deepEqual(s.deliveries.map(row => row.userId), [2, 1]);
});

test("overlapping ticks do not launch a second season worker", async () => {
  const s = await setup();
  let release!: () => void;
  let queryStarted!: () => void;
  const started = new Promise<void>(resolve => { queryStarted = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  s.setBeforeQuery(async () => { queryStarted(); await gate; });
  const first = s.service.processSeasonNotifications();
  await started;
  await s.service.processSeasonNotifications();
  release();
  await first;
  assert.equal(s.schemaCalls(), 1);
  assert.equal(s.deliveries.length, 1);
});

test("expired events stop before querying or sending", async () => {
  const s = await setup();
  s.event.expiresAt = new Date(Date.now() - 1);
  await s.service.processSeasonNotifications();
  assert.equal(s.cursors.length, 0);
  assert.equal(s.deliveries.length, 0);
});
