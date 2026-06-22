import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`
    UPDATE users SET user_type = 'indie' WHERE username = 'indie_tester'
    RETURNING id, username, user_type, email, display_name
  `);
  const rows = (result as any).rows ?? result;
  rows.forEach((r: any) => console.log('UPDATED:', r));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
