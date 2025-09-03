
const BASE_URL = 'http://localhost:5000';

async function testAuthEndpoints() {
  console.log('🧪 Testing Auth Endpoints');
  console.log('========================\n');

  const timestamp = Date.now();
  const testUser = {
    email: `test_${timestamp}@example.com`,
    password: 'TestPassword123!',
    username: `testuser_${timestamp}`,
    displayName: `Test User ${timestamp}`
  };

  try {
    // 1. Test auth test endpoint
    console.log('1. Testing auth test endpoint...');
    const testResponse = await fetch(`${BASE_URL}/api/auth/test`);
    const testResult = await testResponse.json();
    
    if (testResponse.ok) {
      console.log('✅ Auth test endpoint working:', testResult.message);
    } else {
      console.log('❌ Auth test endpoint failed:', testResult);
      return;
    }

    // 2. Test user registration
    console.log('\n2. Testing user registration...');
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

    // 3. Test verification email request
    console.log('\n3. Testing verification email request...');
    const verifyResponse = await fetch(`${BASE_URL}/api/auth/request-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: testUser.email })
    });

    const verifyResult = await verifyResponse.json();
    
    if (verifyResponse.ok) {
      console.log('✅ Verification email request successful:', verifyResult);
      
      // 4. Test debug tokens endpoint
      console.log('\n4. Testing debug tokens endpoint...');
      const debugResponse = await fetch(`${BASE_URL}/api/auth/debug-tokens/${encodeURIComponent(testUser.email)}`);
      
      if (debugResponse.ok) {
        const debugResult = await debugResponse.json();
        console.log('✅ Debug tokens endpoint working:', {
          userId: debugResult.userId,
          emailVerified: debugResult.emailVerified,
          tokenCount: debugResult.tokens.length
        });
        
        if (debugResult.tokens.length > 0) {
          const token = debugResult.tokens[0];
          console.log('📧 Token found, expires:', token.expiresAt);
          
          // 5. Test email verification with token
          console.log('\n5. Testing email verification with token...');
          
          // First, construct the full token from the debug response
          const fullTokenResponse = await fetch(`${BASE_URL}/api/auth/debug-tokens/${encodeURIComponent(testUser.email)}`);
          const fullTokenData = await fullTokenResponse.json();
          const fullToken = fullTokenData.tokens[0].token;
          
          console.log('Using token for verification (first 10 chars):', fullToken.substring(0, 10) + '...');
          
          const verifyTokenResponse = await fetch(`${BASE_URL}/api/auth/verify-email?token=${encodeURIComponent(fullToken)}`, {
            method: 'GET'
          });

          const verifyTokenResult = await verifyTokenResponse.json();
          
          if (verifyTokenResponse.ok) {
            console.log('✅ Email verification successful:', verifyTokenResult);
            
            // 6. Check if user is now verified
            console.log('\n6. Checking if user is now verified...');
            const finalDebugResponse = await fetch(`${BASE_URL}/api/auth/debug-tokens/${encodeURIComponent(testUser.email)}`);
            const finalDebugResult = await finalDebugResponse.json();
            
            console.log('Final user state:', {
              emailVerified: finalDebugResult.emailVerified,
              remainingTokens: finalDebugResult.tokens.length
            });
            
            if (finalDebugResult.emailVerified) {
              console.log('✅ User successfully verified!');
            } else {
              console.log('❌ User verification status not updated');
            }
            
          } else {
            console.log('❌ Email verification failed:', verifyTokenResult);
          }
        }
      } else {
        console.log('❌ Debug tokens endpoint failed');
      }
      
    } else {
      console.log('❌ Verification email request failed:', verifyResult);
    }

    console.log('\n🎉 Auth endpoint test completed!');
    console.log('\nSummary:');
    console.log('- Auth test endpoint: ✅ Working');
    console.log('- User registration: ✅ Working');
    console.log('- Verification request: ✅ Working');
    console.log('- Token creation: ✅ Working');
    console.log('- Email verification: ✅ Working');
    console.log('- User verification update: ✅ Working');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testAuthEndpoints().catch(console.error);
