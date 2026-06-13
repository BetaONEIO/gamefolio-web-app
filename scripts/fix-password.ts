import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function main() {
  const correctHash = await hashPassword('Helloworld1!');
  const result = await db.execute(sql`
    UPDATE users SET password = ${correctHash} WHERE username = 'indie_tester'
    RETURNING id, username
  `);
  const rows = (result as any).rows ?? result;
  rows.forEach((r: any) => console.log('Fixed password for:', r.username));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
