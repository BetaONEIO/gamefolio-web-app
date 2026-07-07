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
      // Idempotent migrations use IF NOT EXISTS, so some errors are safe
      const isSafe = err.message?.includes('already exists') ||
                     err.message?.includes('duplicate key value violates unique constraint') ||
                     err.code === '42P07' || err.code === '42701';
      if (isSafe) {
        console.log(`  ✅ ${file} skipped (already applied)`);
        await sql`INSERT INTO _migrations (filename) VALUES (${file}) ON CONFLICT DO NOTHING`;
      } else {
        console.error(`  ❌ ${file} failed:`, err.message);
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
