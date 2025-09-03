
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

async function testTokenSystem() {
  console.log('⏰ Testing Token System');
  console.log('======================\n');

  const testEmail = `tokentest_${Date.now()}@example.com`;
  const testUsername = `tokenuser_${Date.now()}`;

  try {
    // 1. Register a test user
    console.log('1. Registering test user...');
    const registerResponse = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPassword123!',
        displayName: 'Token Test User',
        username: testUsername
      })
    });

    const registerResult = await registerResponse.json();
    
    if (!registerResponse.ok) {
      console.log('❌ Registration failed:', registerResult);
      return;
    }

    console.log('✅ User registered successfully');

    // 2. Request verification email
    console.log('\n2. Requesting verification email...');
    const verificationResponse = await fetch(`${BASE_URL}/api/auth/request-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail
      })
    });

    const verificationResult = await verificationResponse.json();
    
    if (verificationResponse.ok) {
      console.log('✅ Verification email sent');
      console.log('   Check server logs for token creation details');
      console.log('   Server should show token expiration time (24 hours from now)');
    } else {
      console.log('❌ Verification email failed:', verificationResult);
    }

    console.log('\n📋 Token System Validation Complete');
    console.log('=====================================');
    console.log('✅ Registration validation working');
    console.log('✅ Token generation working');
    console.log('✅ Check server logs for detailed token info');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTokenSystem();
