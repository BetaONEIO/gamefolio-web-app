import { db } from './db';
import { users, verificationBadges, userUnlockedVerificationBadges } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function makeUserPro(username: string) {
  try {
    console.log(`Making ${username} a pro account with all verification badges...`);
    
    // Find the user
    let user = await db.select().from(users).where(eq(users.username, username)).limit(1);
    let userId: number;
    
    if (user.length === 0) {
      console.log(`User ${username} not found, creating...`);
      // Create the user
      const hashedPassword = await hashPassword('password123');
      const created = await db.insert(users).values({
        username,
        displayName: username,
        password: hashedPassword,
        bio: 'Pro Account',
        isPro: true,
        proSubscriptionType: 'manual',
        proSubscriptionStartDate: new Date(),
        role: 'user'
      }).returning();
      
      if (created.length > 0) {
        userId = created[0].id;
        console.log(`✅ Created ${username} as a pro account!`);
        console.log(`Pro Status: ${created[0].isPro}`);
        console.log(`Subscription Type: ${created[0].proSubscriptionType}`);
      } else {
        throw new Error('Failed to create user');
      }
    } else {
      userId = user[0].id;
      // Update the user to pro
      const updated = await db
        .update(users)
        .set({
          isPro: true,
          proSubscriptionType: 'manual',
          proSubscriptionStartDate: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, user[0].id))
        .returning();
      
      if (updated.length > 0) {
        console.log(`✅ ${username} is now a pro account!`);
        console.log(`Pro Status: ${updated[0].isPro}`);
        console.log(`Subscription Type: ${updated[0].proSubscriptionType}`);
      }
    }
    
    // Get all verification badges
    const allBadges = await db.select().from(verificationBadges);
    console.log(`\nFound ${allBadges.length} verification badges`);
    
    // Get badges the user already has
    const existingBadges = await db.select({ badgeId: userUnlockedVerificationBadges.badgeId })
      .from(userUnlockedVerificationBadges)
      .where(eq(userUnlockedVerificationBadges.userId, userId));
    
    const existingBadgeIds = new Set(existingBadges.map(b => b.badgeId));
    
    // Add all badges the user doesn't have
    let badgesAdded = 0;
    for (const badge of allBadges) {
      if (!existingBadgeIds.has(badge.id)) {
        await db.insert(userUnlockedVerificationBadges).values({
          userId,
          badgeId: badge.id
        });
        badgesAdded++;
      }
    }
    
    console.log(`✅ Granted ${badgesAdded} new verification badges`);
    console.log(`Total badges available: ${allBadges.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Get username from command line args
const username = process.argv[2] || 'player1';
makeUserPro(username);
