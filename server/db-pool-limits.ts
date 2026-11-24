// The Supabase session pooler permits 15 client connections. Keep one app
// instance below half that limit so a preview and published instance can run
// concurrently, with a spare slot for maintenance access.
export const DB_POOL_LIMITS = {
  queries: 3,
  sessions: 2,
  stripeSync: 1,
  migrations: 1,
} as const;