function isSupabaseHost(hostname: string) {
  return hostname.endsWith('.supabase.co') || hostname.endsWith('.pooler.supabase.com');
}

export function normalizePgConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);

    if (isSupabaseHost(url.hostname)) {
      // node-postgres gives SSL parameters embedded in the URL precedence over
      // the explicit `ssl` object. Remove sslmode so our Supabase TLS policy is
      // not silently replaced by `sslmode=require` certificate verification.
      url.searchParams.delete('sslmode');
      return url.toString();
    }
  } catch {
    // Let the database client report malformed connection strings itself.
  }

  return connectionString;
}

export function getPgSslConfig(connectionString: string) {
  try {
    const hostname = new URL(connectionString).hostname;

    // Supabase's managed Postgres endpoints require TLS. Railway's Node
    // runtime can receive a chain that node-postgres cannot anchor even
    // though the connection is encrypted, so match postgres-js's `require`
    // behaviour for these known hosts instead of failing app startup.
    if (isSupabaseHost(hostname)) return { rejectUnauthorized: false };
  } catch {
    // Let the database client report malformed connection strings itself.
  }

  return undefined;
}
