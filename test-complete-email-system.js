
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

async function testCompleteEmailSystem() {
  console.log('🧪 Testing Complete Email Verification System');
  console.log('=============================================\n');

  const timestamp = Date.now();
  const testUser = {
    email: `test_${timestamp}@example.com`,
    password: 'TestPassword123!',
    username: `testuser_${timestamp}`,
    displayName: `Test User ${timestamp}`
  };

  try {
    // 1. Register user
    console.log('1. Testing user registration...');
    const registerResponse = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });

    const registerResult = await registerResponse.json();
    
    if (registerResponse.ok) {
      console.log('✅ Registration successful:', registerResult);
    } else {
      console.log('❌ Registration failed:', registerResult);
      return;
    }

    // 2. Test verification email request
    console.log('\n2. Testing verification email request...');
    const verifyResponse = await fetch(`${BASE_URL}/api/auth/request-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: testUser.email })
    });

    const verifyResult = await verifyResponse.json();
    console.log('✅ Verification email response:', verifyResult);

    // 3. Check if we can get debug info
    console.log('\n3. Checking debug tokens...');
    const debugResponse = await fetch(`${BASE_URL}/api/auth/debug-tokens/${encodeURIComponent(testUser.email)}`);
    
    if (debugResponse.ok) {
      const debugResult = await debugResponse.json();
      console.log('✅ Debug info:', debugResult);
      
      if (debugResult.tokens && debugResult.tokens.length > 0) {
        const latestToken = debugResult.tokens[debugResult.tokens.length - 1];
        console.log('📧 Latest token created at:', latestToken.createdAt);
        console.log('⏰ Token expires at:', latestToken.expiresAt);
        
        // Check if token is expired
        const now = new Date();
        const expiryDate = new Date(latestToken.expiresAt);
        const timeUntilExpiry = expiryDate.getTime() - now.getTime();
        const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);
        
        console.log(`⏳ Token expires in ${hoursUntilExpiry.toFixed(2)} hours`);
        
        if (timeUntilExpiry > 0) {
          console.log('✅ Token is still valid');
        } else {
          console.log('❌ Token has expired');
        }
      }
    } else {
      console.log('❌ Could not get debug info');
    }

    console.log('\n🎉 Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testCompleteEmailSystem();
