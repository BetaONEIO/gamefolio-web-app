import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'oauth%'`;
  console.log('OAuth tables found:', tables.map((t: any) => t.table_name));

  if (tables.length === 0) {
    console.log('No oauth tables found — creating them...');

    await sql`CREATE TABLE IF NOT EXISTS oauth_clients (
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
    await sql`CREATE INDEX IF NOT EXISTS oauth_clients_owner_idx ON oauth_clients(owner_user_id)`;

    await sql`CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
      id SERIAL PRIMARY KEY,
      code_hash TEXT NOT NULL UNIQUE,
      client_id INTEGER NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      redirect_uri TEXT NOT NULL,
      code_challenge TEXT,
      code_challenge_method TEXT,
      scopes TEXT[] NOT NULL DEFAULT '{}',
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`;
    await sql`CREATE INDEX IF NOT EXISTS oauth_auth_codes_hash_idx ON oauth_authorization_codes(code_hash)`;
    await sql`CREATE INDEX IF NOT EXISTS oauth_auth_codes_client_idx ON oauth_authorization_codes(client_id)`;
    await sql`CREATE INDEX IF NOT EXISTS oauth_auth_codes_user_idx ON oauth_authorization_codes(user_id)`;

    await sql`CREATE TABLE IF NOT EXISTS oauth_access_tokens (
      id SERIAL PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      client_id INTEGER NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scopes TEXT[] NOT NULL DEFAULT '{}',
      expires_at TIMESTAMP NOT NULL,
      is_revoked BOOLEAN DEFAULT false NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`;
    await sql`CREATE INDEX IF NOT EXISTS oauth_access_tokens_hash_idx ON oauth_access_tokens(token_hash)`;
    await sql`CREATE INDEX IF NOT EXISTS oauth_access_tokens_client_idx ON oauth_access_tokens(client_id)`;
    await sql`CREATE INDEX IF NOT EXISTS oauth_access_tokens_user_idx ON oauth_access_tokens(user_id)`;

    await sql`CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
      id SERIAL PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      access_token_id INTEGER NOT NULL REFERENCES oauth_access_tokens(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scopes TEXT[] NOT NULL DEFAULT '{}',
      expires_at TIMESTAMP NOT NULL,
      is_revoked BOOLEAN DEFAULT false NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`;
    await sql`CREATE INDEX IF NOT EXISTS oauth_refresh_tokens_hash_idx ON oauth_refresh_tokens(token_hash)`;

    console.log('OAuth tables created successfully!');
  } else {
    console.log('OAuth tables already exist.');
  }

  await sql.end();
}

main().catch(console.error);
