
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

async function debugRegistration() {
  console.log('🔍 Debug Registration Test');
  console.log('==========================\n');

  const testData = {
    email: `debug_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    displayName: 'Debug Test User',
    username: `debuguser_${Date.now()}`
  };

  console.log('Sending registration data:', JSON.stringify(testData, null, 2));

  try {
    const response = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('\nResponse status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response body:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ Registration successful!');
      
      // Test verification email
      console.log('\nTesting verification email...');
      const verifyResponse = await fetch(`${BASE_URL}/api/auth/request-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: testData.email })
      });

      const verifyResult = await verifyResponse.json();
      console.log('Verification response:', JSON.stringify(verifyResult, null, 2));
      
    } else {
      console.log('\n❌ Registration failed');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugRegistration();
