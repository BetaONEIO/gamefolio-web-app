import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { setDefaultResultOrder } from 'node:dns';
import * as schema from "@shared/schema";
import { getPgSslConfig, normalizePgConnectionString } from './database-tls';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Prefer reachable IPv4 addresses on hosts without IPv6 egress. Keep IPv6
// fallback available; this does not retry writes or mask database outages.
setDefaultResultOrder('ipv4first');

// connect-pg-simple already uses node-postgres successfully against the same
// Supabase session pooler. Use that proven driver for application queries too;
// postgres.js connections were intermittently remaining unresolved after the
// server had completed a query, eventually queueing every API request.
const pgPool = new pg.Pool({
  connectionString: normalizePgConnectionString(process.env.DATABASE_URL),
  ssl: getPgSslConfig(process.env.DATABASE_URL),
  max: 6,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

const drizzleDb = drizzle(pgPool, { schema });
const executeWithPgResult = drizzleDb.execute.bind(drizzleDb);

// postgres.js returned rows directly from db.execute(), whereas Drizzle's
// node-postgres adapter returns pg's QueryResult wrapper. Existing raw-SQL
// call sites expect the former shape, so preserve that contract centrally.
(drizzleDb as any).execute = async (...args: any[]) => {
  const result = await (executeWithPgResult as any)(...args);
  return result?.rows ?? result;
};

export const db = drizzleDb;

type UnsafeRows = any[] & { count?: number };

const rowsWithCount = (result: pg.QueryResult): UnsafeRows =>
  Object.assign(result.rows, { count: result.rowCount ?? 0 });

// A small compatibility facade for the three maintenance jobs that need a
// reserved physical connection for transactions or advisory locks.
export const pool = {
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
