import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import ts from 'typescript';

// Production still supports Node 20, which has no built-in SQLite module.
// Keep this integration check dependency-free and report that limitation as a
// skip there; Node 22+ runs the actual production SQL below.
const { DatabaseSync } = await import('node:sqlite').catch(error => {
  if (error.code === 'ERR_UNKNOWN_BUILTIN_MODULE') return {};
  throw error;
});
const sqlTestOptions = { skip: DatabaseSync ? false : 'Actual SQL fixture requires node:sqlite (Node 22+)' };

// Execute the production join's COUNT/EXISTS query against isolated SQL tables.
// This query uses SQL shared by PostgreSQL and SQLite; no application database
// connection or account is needed to exercise campaign-reserved inventory.
const source = readFileSync(new URL('../server/routes/bounty-marketplace.ts', import.meta.url), 'utf8');
const file = ts.createSourceFile('bounty-marketplace.ts', source, ts.ScriptTarget.Latest, true);
const queries = [];
function visit(node) {
  if (ts.isTaggedTemplateExpression(node) && node.getText(file).includes('AS access_keys_usable')) {
    queries.push(node.getText(file));
  }
  ts.forEachChild(node, visit);
}
visit(file);
assert.equal(queries.length, 1, 'locate the authoritative creator-join capacity query');
const makeQuery = new Function('sql', 'instanceId', 'accessKeyType', 'isStreamSpotlight', `return ${queries[0]}`);
const compiled = new PgDialect().sqlToQuery(makeQuery(sql, 71, 'demo', true));
const parameters = Object.fromEntries(compiled.params.map((value, index) => [
  String(index + 1), typeof value === 'boolean' ? Number(value) : value,
]));

function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE game_keys (
      id INTEGER PRIMARY KEY, instance_id INTEGER, key_type TEXT, key_pool TEXT,
      status TEXT, assigned_user_id INTEGER, assigned_participant_id INTEGER,
      revealed_at TEXT, removed_at TEXT
    );
    CREATE TABLE campaign_participants (
      id INTEGER PRIMARY KEY, instance_id INTEGER, status TEXT,
      access_key_id INTEGER, completion_reward_key_id INTEGER
    );
    INSERT INTO game_keys (id, instance_id, key_type, key_pool, status)
    VALUES (101, 71, 'demo', 'access', 'reserved'), (102, 71, 'demo', 'access', 'reserved');
  `);
  const count = () => db.prepare(compiled.sql).get(parameters);
  return { db, count };
}

test('a freshly launched Stream Spotlight retains capacity from its reserved keys', sqlTestOptions, () => {
  const { db, count } = fixture();
  try {
    const counts = count();
    assert.equal(counts.participant_count, 0);
    assert.equal(counts.access_keys_available, 0, 'launch has already reserved every key');
    assert.equal(counts.access_keys_usable, 2, 'both launch reservations can accept a creator');
    assert.ok(counts.participant_count < counts.access_keys_usable);
  } finally { db.close(); }
});

test('a claimed key and an unassigned reservation retain the second creator place', sqlTestOptions, () => {
  const { db, count } = fixture();
  try {
    db.exec(`
      INSERT INTO campaign_participants (id, instance_id, status, access_key_id)
      VALUES (201, 71, 'joined', 101);
      UPDATE game_keys SET assigned_user_id = 301, assigned_participant_id = 201 WHERE id = 101;
    `);
    const counts = count();
    assert.equal(counts.participant_count, 1);
    assert.equal(counts.access_keys_usable, 2);
    assert.ok(counts.participant_count < counts.access_keys_usable);
  } finally { db.close(); }
});

test('unusable reservations do not create extra Stream Spotlight places', sqlTestOptions, () => {
  const { db, count } = fixture();
  try {
    db.exec(`
      UPDATE game_keys SET assigned_user_id = 301, assigned_participant_id = 201 WHERE id = 101;
      INSERT INTO campaign_participants (id, instance_id, status, access_key_id)
      VALUES (201, 71, 'rejected', 101);
      UPDATE game_keys SET revealed_at = '2026-11-24' WHERE id = 102;
      INSERT INTO game_keys (id, instance_id, key_type, key_pool, status, removed_at)
      VALUES (103, 71, 'demo', 'access', 'reserved', '2026-11-24');
      INSERT INTO game_keys (id, instance_id, key_type, key_pool, status)
      VALUES (104, 72, 'demo', 'access', 'reserved'),
        (105, 71, 'full', 'access', 'reserved'),
        (106, 71, 'demo', 'reward', 'reserved');
    `);
    const counts = count();
    assert.equal(counts.participant_count, 0);
    assert.equal(counts.access_keys_usable, 0);
  } finally { db.close(); }
});
