import test from 'node:test';
import assert from 'node:assert/strict';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { pgTable, integer } from 'drizzle-orm/pg-core';
import { withArrayResults, rowsWithCount } from '../server/database-results';
import * as tls from '../server/database-tls';
import { DB_POOL_LIMITS } from '../server/db-pool-limits';
import { loadIsolatedService } from './helpers/isolated-typescript';

// Use the real Drizzle driver and transaction machinery. Replace only the
// network connection so failures cannot touch a database or payment service.
async function fixture() {
  const calls: { text: string; values: unknown[]; connection: string }[] = [];
  let releases = 0;
  let poolOptions: any;
  let idleErrorHandler: any;
  async function query(config: any, values: unknown[] = [], connection = 'pool') {
    const text = typeof config === 'string' ? config : config.text;
    calls.push({ text, values, connection });
    if (text === 'SELECT fail') throw new Error('query failed');
    const count = /count\(/i.test(text);
    const rows = /^select/i.test(text)
      ? config.rowMode === 'array' ? [[7]] : count ? [{ count: '7' }] : [{ value: 7 }]
      : [];
    return { rows, rowCount: /^update/i.test(text) ? 3 : rows.length };
  }
  class RecordingPool {
    constructor(options: any) { poolOptions = options; }
    on(event: string, handler: any) {
      assert.equal(event, 'error');
      idleErrorHandler = handler;
    }
    query(config: any, values?: unknown[]) { return query(config, values); }
    async connect() {
      return {
        query: (config: any, values?: unknown[]) => query(config, values, 'reserved'),
        release: () => { releases++; },
      };
    }
  }
  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgresql://fixture:fixture@aws-0-eu.pooler.supabase.com/postgres?sslmode=require';
  let service: any;
  try {
    service = await loadIsolatedService(new URL('../server/db.ts', import.meta.url), {
      'drizzle-orm/node-postgres': { drizzle },
      pg: { default: { Pool: RecordingPool } },
      'node:dns': { setDefaultResultOrder: (order: string) => assert.equal(order, 'ipv4first') },
      '@shared/schema': {},
      './db-pool-limits': { DB_POOL_LIMITS },
      './database-tls': tls,
      './database-results': { withArrayResults, rowsWithCount },
    });
  } finally {
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  }
  return { ...service, calls, poolOptions, idleErrorHandler, releases: () => releases };
}

test('the application driver uses the bounded pg pool and production TLS policy', async () => {
  const { poolOptions, idleErrorHandler } = await fixture();
  assert.equal(poolOptions.max, DB_POOL_LIMITS.queries);
  assert.equal(poolOptions.connectionTimeoutMillis, 10_000);
  assert.equal(poolOptions.keepAlive, true);
  assert.equal(poolOptions.ssl.rejectUnauthorized, false);
  assert.equal(new URL(poolOptions.connectionString).searchParams.has('sslmode'), false);
  assert.equal(typeof idleErrorHandler, 'function');
});

test('raw queries preserve iterable rows, affected counts, and parameter values', async () => {
  const { db, calls } = await fixture();
  const values = ['one', 'two'];
  const when = new Date('2026-11-24T00:00:00Z');
  const rows = await db.execute(sql`SELECT ${sql.param(values)}::text[], ${when}::timestamptz`);
  assert.deepEqual(rows, [{ value: 7 }]);
  assert.equal(rows.count, 1);
  assert.equal(rows.rows, rows);
  assert.equal(rows.rowCount, 1);
  assert.equal(JSON.stringify(rows), '[{"value":7}]');
  assert.equal(calls[0].values[0], values);
  assert.equal(calls[0].values[1], when);
  const changed = await db.execute(sql`UPDATE fixture SET value = ${8}`);
  assert.deepEqual(changed, []);
  assert.equal(changed.count, 3);
  assert.equal(changed.rowCount, 3);
});

test('nested transactions return rows and retain savepoints and rollback', async () => {
  const { db, calls, releases } = await fixture();
  await db.transaction(async (tx: any) => {
    const [outer] = await tx.execute(sql`SELECT 7`);
    assert.equal(outer.value, 7);
    await tx.transaction(async (nested: any) => {
      const [inner] = await nested.execute(sql`SELECT 7`);
      assert.equal(inner.value, 7);
    });
    await assert.rejects(tx.transaction((nested: any) => nested.execute(sql`SELECT fail`)), /Failed query: SELECT fail/);
  }, { accessMode: 'read only' });
  assert.ok(calls.some((call: any) => call.text === 'begin read only'));
  assert.ok(calls.some((call: any) => call.text === 'release savepoint sp1'));
  assert.ok(calls.some((call: any) => call.text === 'rollback to savepoint sp1'));
  assert.equal(calls.at(-1)?.text, 'commit');
  assert.ok(calls.every((call: any) => call.connection === 'reserved'));
  assert.equal(releases(), 1);

  await assert.rejects(db.transaction((tx: any) => tx.execute(sql`SELECT fail`)), /Failed query: SELECT fail/);
  assert.equal(calls.at(-1)?.text, 'rollback');
  assert.equal(releases(), 2);
});

test('typed query builders and count retain Drizzle response mapping', async () => {
  const { db } = await fixture();
  const fixtureTable = pgTable('fixture', { value: integer('value') });
  assert.deepEqual(await db.select().from(fixtureTable), [{ value: 7 }]);
  assert.equal(await db.$count(fixtureTable), 7);
  await db.transaction(async (tx: any) => {
    assert.deepEqual(await tx.select().from(fixtureTable), [{ value: 7 }]);
    assert.equal(await tx.$count(fixtureTable), 7);
  });
});

test('reserved advisory locks and row counts use one client until release', async () => {
  const { pool, calls, releases } = await fixture();
  const connection = await pool.reserve();
  try {
    const [lock] = await connection.unsafe('SELECT $1', ['campaign-lock']);
    assert.equal(lock.value, 7);
    const updated = await connection.unsafe('UPDATE fixture SET value = $1', [8]);
    assert.equal(updated.count, 3);
    assert.deepEqual(calls.map((call: any) => call.values), [['campaign-lock'], [8]]);
    assert.ok(calls.every((call: any) => call.connection === 'reserved'));
  } finally {
    connection.release();
  }
  assert.equal(releases(), 1);
});
