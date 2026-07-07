import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  console.log('Fixing OAuth tables to match Drizzle schema...');

  // Drop tables with wrong columns (they are empty, so safe)
  await sql`DROP TABLE IF EXISTS oauth_refresh_tokens CASCADE`;
  await sql`DROP TABLE IF EXISTS oauth_access_tokens CASCADE`;
  await sql`DROP TABLE IF EXISTS oauth_authorization_codes CASCADE`;
  await sql`DROP TABLE IF EXISTS oauth_clients CASCADE`;

  // Recreate with exact columns from shared/schema.ts
  await sql`CREATE TABLE oauth_clients (
    id SERIAL PRIMARY KEY,
    client_id UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    client_secret_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    owner_user_id INTEGER NOT NULL REFERENCES users(id),
    redirect_uris TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`;
  await sql`CREATE INDEX oauth_clients_owner_idx ON oauth_clients(owner_user_id)`;

  await sql`CREATE TABLE oauth_authorization_codes (
    id SERIAL PRIMARY KEY,
    code_hash TEXT NOT NULL UNIQUE,
    client_id INTEGER NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    redirect_uri TEXT NOT NULL,
    scope TEXT NOT NULL,
    code_challenge TEXT NOT NULL,
    code_challenge_method TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`;
  await sql`CREATE INDEX oauth_auth_codes_hash_idx ON oauth_authorization_codes(code_hash)`;
  await sql`CREATE INDEX oauth_auth_codes_client_idx ON oauth_authorization_codes(client_id)`;
  await sql`CREATE INDEX oauth_auth_codes_user_idx ON oauth_authorization_codes(user_id)`;

  await sql`CREATE TABLE oauth_access_tokens (
    id SERIAL PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    client_id INTEGER NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`;
  await sql`CREATE INDEX oauth_access_tokens_hash_idx ON oauth_access_tokens(token_hash)`;
  await sql`CREATE INDEX oauth_access_tokens_user_client_idx ON oauth_access_tokens(user_id, client_id)`;

  await sql`CREATE TABLE oauth_refresh_tokens (
    id SERIAL PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    access_token_id INTEGER NOT NULL REFERENCES oauth_access_tokens(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    rotated_to_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`;
  await sql`CREATE INDEX oauth_refresh_tokens_hash_idx ON oauth_refresh_tokens(token_hash)`;
  await sql`CREATE INDEX oauth_refresh_tokens_user_client_idx ON oauth_refresh_tokens(user_id, client_id)`;

  console.log('OAuth tables recreated successfully with correct columns!');
  await sql.end();
}

main().catch(console.error);
