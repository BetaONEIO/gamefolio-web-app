import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { setDefaultResultOrder } from 'node:dns';
import * as schema from '@shared/schema';
import { DB_POOL_LIMITS } from './db-pool-limits';
import { getPgSslConfig, normalizePgConnectionString } from './database-tls';
import { withArrayResults, rowsWithCount } from './database-results';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

setDefaultResultOrder('ipv4first');

// Use the production-proven pg driver: postgres-js previously left queries
// unresolved against the Supabase session pooler, exhausting the app's pool.
const pgPool = new pg.Pool({
  connectionString: normalizePgConnectionString(process.env.DATABASE_URL),
  ssl: getPgSslConfig(process.env.DATABASE_URL),
  max: DB_POOL_LIMITS.queries,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  maxLifetimeSeconds: 1800,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

// An idle connection can be closed by the pooler without an active query to
// receive the error. pg discards that client; keep the remaining pool usable.
pgPool.on('error', error => {
  console.error('Idle database connection error:', error.message);
});

export const db = withArrayResults(drizzle(pgPool, { schema }));

// Maintenance workers hold a physical session for advisory locks. Parameterized
// queries and release must use that same connection, not the shared pool.
export const pool = {
  end: () => pgPool.end(),
  async reserve() {
    const client = await pgPool.connect();
    return {
      async unsafe(query: string, params: any[] = []) {
        return rowsWithCount(await client.query(query, params));
      },
      release() {
        client.release();
      },
    };
  },
};
