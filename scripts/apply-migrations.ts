import 'dotenv/config';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  // Create migrations tracking table
  await sql`CREATE TABLE IF NOT EXISTS _migrations (
    filename text PRIMARY KEY,
    applied_at timestamp DEFAULT now() NOT NULL
  )`;

  const migrationsDir = path.resolve('migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files`);

  const applied = await sql`SELECT filename FROM _migrations`;
  const appliedSet = new Set(applied.map(r => r.filename));

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  ⚪ Skipped ${file} (already applied)`);
      continue;
    }

    const filepath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filepath, 'utf8');

    console.log(`Applying: ${file}`);
    try {
      // Send the entire SQL file as a single batch
      await sql.unsafe(content);
      await sql`INSERT INTO _migrations (filename) VALUES (${file})`;
      console.log(`  ✅ Applied ${file}`);
    } catch (err: any) {
      // Idempotent migrations use IF NOT EXISTS, so a genuine "this object is
      // already there" is safe to record as applied.
      //
      // Match on SQLSTATE only, never on message text. The old version also
      // accepted any error whose message contained 'already exists' or
      // 'duplicate key value violates unique constraint', which is far wider
      // than it looks — plenty of unrelated failures carry those words, and
      // the migration got stamped into _migrations anyway. That is exactly how
      // 0019_add_user_impersonation.sql came to be recorded as applied on prod
      // on 2026-08-12 while impersonation_audit_log did not exist: the file
      // was then skipped on every later run (see the appliedSet check above),
      // so the table could never appear and the log stayed green.
      //   42P07 duplicate_table    42701 duplicate_column
      //   42710 duplicate_object   42P06 duplicate_schema
      //   42P16 duplicate_index (older PG reports 42P07 here)
      const SAFE_CODES = new Set(['42P07', '42701', '42710', '42P06', '42P16']);
      if (SAFE_CODES.has(err.code)) {
        console.log(`  ✅ ${file} skipped (object already exists, code ${err.code})`);
        await sql`INSERT INTO _migrations (filename) VALUES (${file}) ON CONFLICT DO NOTHING`;
      } else {
        // Not recorded as applied — a rerun must retry this file.
        console.error(`  ❌ ${file} failed [${err.code}]:`, err.message);
        if (err.detail) console.error(`     detail: ${err.detail}`);
        throw err;
      }
    }
  }

  await sql.end();
  console.log('\nAll migrations applied successfully.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
