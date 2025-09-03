
const BASE_URL = 'http://localhost:5000';

async function testTokenExpiration() {
  console.log('⏰ Testing Token Expiration Logic');
  console.log('================================\n');

  const testEmail = `expire.test.${Date.now()}@example.com`;
  const testUsername = `expiretest${Date.now()}`;
  
  try {
    // 1. Register a new user
    console.log('1. Registering test user...');
    const registerResponse = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: testEmail,
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!'
      }),
    });

    const registerResult = await registerResponse.json();
    console.log('✅ Registration:', registerResult.success ? 'Success' : 'Failed');

    if (!registerResponse.ok) {
      console.log('❌ Registration failed:', registerResult);
      return;
    }

    // 2. Request verification token
    console.log('\n2. Requesting verification token...');
    const verificationResponse = await fetch(`${BASE_URL}/api/auth/request-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });

    const verificationResult = await verificationResponse.json();
    console.log('✅ Token request:', verificationResult.success ? 'Success' : 'Failed');

    if (verificationResult.token) {
      // 3. Check token in database
      console.log('\n3. Checking token in database...');
      const debugResponse = await fetch(`${BASE_URL}/api/auth/debug-tokens/${testEmail}`);
      const debugResult = await debugResponse.json();
      
      console.log('🔍 Token debug info:');
      console.log(`   User ID: ${debugResult.userId}`);
      console.log(`   Email verified: ${debugResult.emailVerified}`);
      console.log(`   Active tokens: ${debugResult.tokens.length}`);
      
      if (debugResult.tokens.length > 0) {
        const token = debugResult.tokens[0];
        console.log(`   Token expires at: ${token.expiresAt}`);
        console.log(`   Token created at: ${token.createdAt}`);
        
        // Check if expiration is in the future (should be 24 hours)
        const expiresAt = new Date(token.expiresAt);
        const now = new Date();
        const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60);
        
        console.log(`   Hours until expiry: ${hoursUntilExpiry.toFixed(2)}`);
        console.log(`   Expires in future: ${expiresAt > now ? '✅' : '❌'}`);
        console.log(`   ~24 hour expiry: ${hoursUntilExpiry >= 23 && hoursUntilExpiry <= 25 ? '✅' : '❌'}`);
      }

      // 4. Test token verification
      console.log('\n4. Testing token verification...');
      const verifyResponse = await fetch(`${BASE_URL}/api/auth/verify-email?token=${verificationResult.token}`);
      const verifyResult = await verifyResponse.json();
      
      console.log('✅ Token verification:', verifyResult.success ? 'Success' : 'Failed');
      if (!verifyResult.success) {
        console.log('❌ Verification error:', verifyResult.message);
      }

      // 5. Check if token was deleted after use
      console.log('\n5. Checking token cleanup...');
      const debugAfterResponse = await fetch(`${BASE_URL}/api/auth/debug-tokens/${testEmail}`);
      const debugAfterResult = await debugAfterResponse.json();
      
      console.log(`   Tokens after verification: ${debugAfterResult.tokens.length}`);
      console.log(`   Token properly deleted: ${debugAfterResult.tokens.length === 0 ? '✅' : '❌'}`);
      console.log(`   Email now verified: ${debugAfterResult.emailVerified ? '✅' : '❌'}`);
    }

    console.log('\n🎉 Token expiration test completed!');
    
  } catch (error) {
    console.error('❌ Token test failed:', error);
  }
}

testTokenExpiration();
