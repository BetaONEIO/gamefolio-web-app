import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createIdempotentLike, isUniqueViolation } from '../server/idempotent-like';

type Row = { id: number; userId: number; contentId: number };

function createStore(initial: Row[] = []) {
  const rows = initial.map((row) => ({ ...row }));
  let nextId = rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
  let inserts = 0;
  let chain = Promise.resolve();

  const db = {
    transaction<T>(fn: (tx: typeof db) => Promise<T>): Promise<T> {
      const run = chain.then(() => fn(db));
      chain = run.then(() => undefined, () => undefined);
      return run;
    },
    async execute() {
      return undefined;
    },
  };

  return {
    db,
    rows,
    get inserts() {
      return inserts;
    },
    async like(userId: number, contentId: number, insertError?: unknown) {
      return createIdempotentLike<Row>(db, {
        namespace: 'clip_like',
        userId,
        contentId,
        find: async () => rows.find((row) => row.userId === userId && row.contentId === contentId),
        insert: async () => {
          if (insertError) throw insertError;
          inserts += 1;
          const row = { id: nextId, userId, contentId };
          nextId += 1;
          rows.push(row);
          return row;
        },
      });
    },
  };
}

test('likes once when no unique constraint exists', async () => {
  const store = createStore();
  const first = await store.like(193, 4367);
  const second = await store.like(193, 4367);

  assert.equal(first.id, second.id);
  assert.equal(store.inserts, 1);
  assert.equal(store.rows.length, 1);
});

test('parallel double taps insert a single like', async () => {
  const store = createStore();
  const [first, second] = await Promise.all([store.like(4, 8), store.like(4, 8)]);

  assert.equal(first.id, second.id);
  assert.equal(store.rows.length, 1);
});

test('leaves historical duplicate likes in place', async () => {
  const store = createStore([
    { id: 10, userId: 193, contentId: 4367 },
    { id: 11, userId: 193, contentId: 4367 },
  ]);

  const like = await store.like(193, 4367);

  assert.equal(like.id, 10);
  assert.equal(store.inserts, 0);
  assert.equal(store.rows.length, 2);
});

test('returns the existing row when the unique index rejects the insert', async () => {
  const store = createStore([{ id: 7, userId: 1, contentId: 2 }]);
  let lookups = 0;
  const created = await createIdempotentLike<Row>(store.db, {
    namespace: 'screenshot_like',
    userId: 1,
    contentId: 2,
    find: async () => {
      lookups += 1;
      // First lookup races ahead of a committed insert. The unique index then
      // rejects the write, and the fallback lookup must return that row.
      return lookups === 1 ? undefined : store.rows[0];
    },
    insert: async () => {
      throw { code: '23505' };
    },
  });

  assert.equal(created.id, 7);
  assert.equal(store.rows.length, 1);
});

test('propagates errors that are not unique violations', async () => {
  const store = createStore();
  await assert.rejects(
    () => store.like(1, 2, { code: '42P10' }),
    (error: { code?: string }) => error.code === '42P10',
  );
  assert.equal(store.rows.length, 0);
});

test('recognizes a unique violation wrapped by the query driver', () => {
  const wrapped = { cause: { code: '23505' } };
  assert.equal(isUniqueViolation(wrapped), true);
  assert.equal(isUniqueViolation({ code: '42P10', cause: { code: '42P10' } }), false);
});

test('like migration dedupes before creating unique indexes', () => {
  const file = fs.readFileSync(
    path.resolve('migrations/0033_harden_content_likes.sql'),
    'utf8',
  );
  const deleteLikes = file.indexOf('DELETE FROM likes');
  const deleteScreenshots = file.indexOf('DELETE FROM screenshot_likes');
  const clipIndex = file.indexOf('CREATE UNIQUE INDEX IF NOT EXISTS likes_user_clip_unique');
  const screenshotIndex = file.indexOf('CREATE UNIQUE INDEX IF NOT EXISTS screenshot_likes_user_screenshot_unique');

  const sqlOnly = file.replace(/--.*$/gm, '');

  assert.ok(file.includes('BEGIN;'));
  assert.ok(file.includes('COMMIT;'));
  assert.ok(deleteLikes > 0 && deleteLikes < clipIndex);
  assert.ok(deleteScreenshots > 0 && deleteScreenshots < screenshotIndex);
  assert.equal(sqlOnly.includes('ON CONFLICT'), false);
});
