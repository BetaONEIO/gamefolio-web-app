import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`
    UPDATE users SET user_type = 'indie_developer' WHERE username = 'indie_tester'
    RETURNING id, username, user_type
  `);
  const rows = (result as any).rows ?? result;
  rows.forEach((r: any) => console.log('Fixed:', r));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
