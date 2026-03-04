import { db } from './server/db';
import { users } from '@shared/schema';
import { eq, or } from 'drizzle-orm';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function createOnboardingTestUser() {
  console.log('Setting up onboarding test account...');

  try {
    const email = 'onboarding@gamefolio.com';
    const username = 'onboardingtest';

    const [existingByEmail] = await db.select().from(users).where(eq(users.email, email));

    if (existingByEmail) {
      console.log('Onboarding test account already exists (id:', existingByEmail.id + ')');
      console.log('Email:', email);
      console.log('Password: Helloworld1!');
      process.exit(0);
    }

    const [existingByUsername] = await db.select().from(users).where(eq(users.username, username));

    if (existingByUsername) {
      const hashed = await hashPassword('Helloworld1!');
      await db.update(users).set({
        email,
        password: hashed,
        emailVerified: true,
        userType: null,
        displayName: 'Onboarding Test',
      }).where(eq(users.id, existingByUsername.id));

      console.log('Updated existing account to onboarding test account (id:', existingByUsername.id + ')');
      console.log('Email:', email);
      console.log('Password: Helloworld1!');
      console.log('\nThis account will never be able to complete onboarding.');
      process.exit(0);
    }

    const [user] = await db.insert(users).values({
      username,
      email,
      password: await hashPassword('Helloworld1!'),
      displayName: 'Onboarding Test',
      emailVerified: true,
      userType: null,
      authProvider: 'local',
      role: 'user',
      status: 'active',
    }).returning();

    console.log('Onboarding test account created successfully!');
    console.log('Email:', user.email);
    console.log('Username:', user.username);
    console.log('Password: Helloworld1!');
    console.log('\nThis account will never be able to complete onboarding.');
  } catch (error) {
    console.error('Error creating onboarding test account:', error);
    process.exit(1);
  }

  process.exit(0);
}

createOnboardingTestUser();
