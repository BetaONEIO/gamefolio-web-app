import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { setDefaultResultOrder } from 'node:dns';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Prefer reachable IPv4 addresses on hosts without IPv6 egress. Keep IPv6
// fallback available; this does not retry writes or mask database outages.
setDefaultResultOrder('ipv4first');

// Configure postgres connection for Supabase
const connection = postgres(process.env.DATABASE_URL, {
  // Supabase's session pooler has a small per-project connection allowance.
  // Leave capacity for the session store, Stripe sync, migrations, and the
  // Supabase dashboard instead of letting one Railway replica consume it all.
  max: 6,
  idle_timeout: 30, // Close idle connections after 30 seconds
  connect_timeout: 10, // Timeout after 10 seconds
  max_lifetime: 1800, // Recycle connections every 30 min to avoid stale sockets
});

export const db = drizzle(connection, { schema });
export const pool = connection; // Export for compatibility
