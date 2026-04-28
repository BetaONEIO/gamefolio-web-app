import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function run() {
  const username = process.argv[2] || 'Player1';
  const updated = await db.update(users).set({ isPro: true, proSubscriptionType: 'manual', proSubscriptionStartDate: new Date(), updatedAt: new Date() }).where(eq(users.username, username)).returning();
  console.log(JSON.stringify(updated[0] ?? null));
}

run().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });