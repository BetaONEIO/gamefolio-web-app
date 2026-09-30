/**
 * node-postgres verifies the certificate for sslmode=require. The development
 * Supabase endpoint in this workspace presents an untrusted chain, while the
 * postgres-js client uses require as encrypted, non-verifying TLS. Keep pg on
 * encrypted TLS too, without changing production or non-Supabase connections.
 */
export function pgConnectionString(connectionString: string): string {
  if (process.env.NODE_ENV !== "development") return connectionString;

  const url = new URL(connectionString);
  if (
    (url.hostname.endsWith(".supabase.com") || url.hostname.endsWith(".supabase.co")) &&
    url.searchParams.get("sslmode") === "require"
  ) {
    url.searchParams.set("sslmode", "no-verify");
    return url.toString();
  }
  return connectionString;
}