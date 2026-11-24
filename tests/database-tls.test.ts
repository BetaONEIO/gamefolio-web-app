import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test, { after, before } from 'node:test';
import { runInNewContext } from 'node:vm';
import pg from 'pg';
import ts from 'typescript';
import { getPgSslConfig, normalizePgConnectionString } from '../server/database-tls';
import { pgConnectionString } from '../server/pg-connection';
import { DB_POOL_LIMITS } from '../server/db-pool-limits';

const supabaseUrl = 'postgres://fixture:fixture@aws-0.pooler.supabase.com:6543/postgres?sslmode=require';
const originalEnvironment = process.env.NODE_ENV;
before(() => { process.env.NODE_ENV = 'production'; });
after(() => {
  if (originalEnvironment === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnvironment;
});

function parsedTls(config: pg.ClientConfig): unknown {
  // pg exposes the parsed parameters at runtime but omits them from its types.
  return (new pg.Client(config) as pg.Client & {
    connectionParameters: { ssl: unknown };
  }).connectionParameters.ssl;
}

function effectiveTls(connectionString: string) {
  return parsedTls({
    connectionString: normalizePgConnectionString(connectionString),
    ssl: getPgSslConfig(connectionString),
  });
}

test('Supabase connections preserve encrypted TLS when pg parses sslmode=require', () => {
  for (const host of ['aws-0.pooler.supabase.com', 'db.project.supabase.co']) {
    const input = supabaseUrl.replace('aws-0.pooler.supabase.com', host);
    const normalized = new URL(normalizePgConnectionString(input));
    assert.equal(normalized.searchParams.has('sslmode'), false);
    assert.equal(normalized.hostname, host);
    assert.equal(normalized.username, 'fixture');
    assert.equal(normalized.pathname, '/postgres');
    assert.deepEqual(effectiveTls(input), { rejectUnauthorized: false });
  }
});

test('other database hosts retain their configured TLS validation', () => {
  for (const host of ['db.example.com', 'pooler.supabase.com.example.com', 'supabase.co.example.com']) {
    const input = supabaseUrl.replace('aws-0.pooler.supabase.com', host);
    assert.equal(normalizePgConnectionString(input), input);
    assert.equal(getPgSslConfig(input), undefined);
    assert.notDeepEqual(effectiveTls(input), { rejectUnauthorized: false });
  }
});

test('malformed database URLs remain the database client’s responsibility', () => {
  assert.equal(normalizePgConnectionString('invalid-url'), 'invalid-url');
  assert.equal(getPgSslConfig('invalid-url'), undefined);
});

// Read the actual constructor config without importing modules that start
// migrations, timers, or external clients. pg still parses the resulting
// config here, catching URL sslmode overriding the explicit TLS policy.
async function poolConfig(file: string, constructorName: string, property?: string) {
  const source = await readFile(new URL(file, import.meta.url), 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  let argument: ts.Expression | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isNewExpression(node) && node.expression.getText(ast) === constructorName) {
      argument = node.arguments?.[0];
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(argument && ts.isObjectLiteralExpression(argument), `Missing ${constructorName} config`);
  if (property) {
    const entry = argument.properties.find(node => ts.isPropertyAssignment(node) && node.name.getText(ast) === property);
    assert.ok(entry && ts.isPropertyAssignment(entry), `Missing ${property} config`);
    argument = entry.initializer;
  }
  const code = ts.transpileModule(`(${argument.getText(ast)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return runInNewContext(code, {
    connectionString: supabaseUrl,
    process: { env: { NODE_ENV: 'production', DATABASE_URL: supabaseUrl } },
    DB_POOL_LIMITS,
    getPgSslConfig,
    normalizePgConnectionString,
    pgConnectionString,
  }) as pg.PoolConfig;
}

for (const [name, file, constructor, property, max] of [
  ['session', '../server/database-storage.ts', 'PgSession', 'conObject', DB_POOL_LIMITS.sessions],
  ['migration', '../server/routes/bounty-marketplace.ts', 'Pool', undefined, DB_POOL_LIMITS.migrations],
  ['Stripe sync', '../server/stripeClient.ts', 'StripeSync', 'poolConfig', DB_POOL_LIMITS.stripeSync],
] as const) {
  test(`production ${name} pool retains TLS and its connection budget`, async () => {
    const config = await poolConfig(file, constructor, property);
    assert.deepEqual(parsedTls(config), { rejectUnauthorized: false });
    assert.equal(config.max, max);
    assert.equal(config.connectionTimeoutMillis, 10_000);
    if (name === 'session') {
      assert.equal(config.keepAlive, true);
      assert.equal(config.idleTimeoutMillis, 30_000);
      assert.equal(config.maxLifetimeSeconds, 1800);
    }
  });
}
