/** Read current server-side Supabase credentials, retaining legacy deployments. */
export function supabaseConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    url: env.SUPABASE_URL || env.STORAGE_SUPABASE_URL,
    publicKey: env.SUPABASE_PUBLISHABLE_KEY || env.STORAGE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || env.STORAGE_SUPABASE_ANON_KEY,
    secretKey: env.SUPABASE_SECRET_KEY || env.STORAGE_SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
  };
}
