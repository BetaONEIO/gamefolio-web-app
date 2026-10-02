import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { setDefaultResultOrder } from 'node:dns';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = new URL(process.env.DATABASE_URL);

// Railway opens short-lived concurrent queries, which is the workload the
// Supabase transaction pooler is designed for. The shared pooler uses the same
// host and credentials on port 6543; port 5432 is session mode and can leave
// the application queue pinned behind one retained Supavisor session.
if (databaseUrl.hostname.endsWith('.pooler.supabase.com') && databaseUrl.port === '5432') {
  databaseUrl.port = '6543';
}

// Prefer reachable IPv4 addresses on hosts without IPv6 egress. Keep IPv6
// fallback available; this does not retry writes or mask database outages.
setDefaultResultOrder('ipv4first');

// Configure postgres connection for Supabase
const connection = postgres(databaseUrl.toString(), {
  // Supabase's session pooler has a small per-project connection allowance.
  // Leave capacity for the session store, Stripe sync, migrations, and the
  // Supabase dashboard instead of letting one Railway replica consume it all.
  max: 6,
  // Supavisor can leave a session waiting in ClientRead. With postgres.js's
  // default pipeline of 100, every later query assigned to that connection is
  // then stuck behind it. Keep one in-flight query per connection so a stale
  // socket is isolated and the pool can continue serving requests.
  max_pipeline: 1,
  // The Supabase pooler does not need server-side prepared statements here,
  // and disabling them avoids retaining statement state across pooled sessions.
  prepare: false,
  keep_alive: 15,
  idle_timeout: 30, // Close idle connections after 30 seconds
  connect_timeout: 10, // Timeout after 10 seconds
  max_lifetime: 1800, // Recycle connections every 30 min to avoid stale sockets
});

export const db = drizzle(connection, { schema });
export const pool = connection; // Export for compatibility
