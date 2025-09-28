
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { users } = require('./shared/schema');
const { eq } = require('drizzle-orm');

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const connection = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

const db = drizzle(connection, { schema: { users } });

async function checkUserEmail() {
  try {
    const email = 'RockCrockGt@hotmail.com';
    console.log(`🔍 Searching for user with email: ${email}`);
    
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        emailVerified: users.emailVerified,
        displayName: users.displayName,
        createdAt: users.createdAt,
        status: users.status
      })
      .from(users)
      .where(eq(users.email, email));

    if (user) {
      console.log('✅ User found:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Email Verified: ${user.emailVerified}`);
      console.log(`   Display Name: ${user.displayName}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Created: ${user.createdAt}`);
    } else {
      console.log('❌ No user found with that email address');
    }
    
    await connection.end();
  } catch (error) {
    console.error('Error checking user email:', error);
    await connection.end();
  }
}

checkUserEmail();
