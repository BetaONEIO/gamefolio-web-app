export function getPgSslConfig(connectionString: string) {
  try {
    const hostname = new URL(connectionString).hostname;

    // Supabase's managed Postgres endpoints require TLS. Railway's Node
    // runtime can receive a chain that node-postgres cannot anchor even
    // though the connection is encrypted, so match postgres-js's `require`
    // behaviour for these known hosts instead of failing app startup.
    if (hostname.endsWith('.supabase.co') || hostname.endsWith('.pooler.supabase.com')) {
      return { rejectUnauthorized: false };
    }
  } catch {
    // Let the database client report malformed connection strings itself.
  }

  return undefined;
}
