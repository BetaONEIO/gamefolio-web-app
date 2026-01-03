import { storage } from "./server/storage";

async function createTestUser() {
  console.log('Creating test user for onboarding flow testing...');
  
  try {
    // Check if user already exists
    const existingUser = await storage.getUserByUsername('onboardingtest');
    
    if (existingUser) {
      console.log('User already exists. Deleting old user first...');
      await storage.deleteUser(existingUser.id);
      console.log('Old user deleted.');
    }
    
    // Create the test user
    const user = await storage.createUser({
      username: 'onboardingtest',
      password: 'Helloworld1!',
      email: 'onboardingtest@test.com',
      displayName: 'Onboarding Test',
      emailVerified: true, // Skip email verification for test account
      userType: null, // Force onboarding
      ageRange: null, // Force onboarding
      authProvider: 'local'
    });
    
    console.log('✅ Test user created successfully!');
    console.log('Username:', user.username);
    console.log('Email:', user.email);
    console.log('Password: Helloworld1!');
    console.log('\nYou can now log in with these credentials and test the onboarding flow.');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

createTestUser();
