
const PROD_URL = 'https://app.gamefolio.com';

async function testProductionEmailVerification() {
  console.log('🌐 Testing Production Email Verification System');
  console.log('=============================================\n');

  const timestamp = Date.now();
  const testUser = {
    email: `prodtest_${timestamp}@example.com`,
    password: 'TestPassword123!',
    username: `produser_${timestamp}`,
    displayName: `Production Test User ${timestamp}`
  };

  try {
    console.log('🔍 Testing production environment at:', PROD_URL);
    
    // Step 1: Test basic connectivity
    console.log('\n1. Testing production server connectivity...');
    const pingResponse = await fetch(`${PROD_URL}/api/auth/test`);
    
    if (!pingResponse.ok) {
      console.log('❌ Production server not responding');
      console.log('   Status:', pingResponse.status);
      return;
    }
    
    const pingResult = await pingResponse.json();
    console.log('✅ Production server responding:', pingResult.message);

    // Step 2: Register new user
    console.log('\n2. Registering new user in production...');
    console.log('   Email:', testUser.email);
    console.log('   Username:', testUser.username);
    
    const registerResponse = await fetch(`${PROD_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });

    const registerResult = await registerResponse.json();
    
    if (!registerResponse.ok) {
      console.log('❌ Production registration failed');
      console.log('   Status:', registerResponse.status);
      console.log('   Error:', registerResult);
      return;
    }
    
    console.log('✅ Registration successful in production');
    console.log('   User ID:', registerResult.id);

    // Step 3: Check initial email verification status
    console.log('\n3. Checking initial user state...');
    try {
      const debugResponse = await fetch(`${PROD_URL}/api/auth/debug-tokens/${encodeURIComponent(testUser.email)}`);
      
      if (debugResponse.ok) {
        const debugResult = await debugResponse.json();
        console.log('📊 Initial user state:');
        console.log('   Email verified:', debugResult.emailVerified);
        console.log('   Active tokens:', debugResult.tokens ? debugResult.tokens.length : 0);
        
        if (debugResult.tokens && debugResult.tokens.length > 0) {
          const token = debugResult.tokens[0];
          console.log('   Token expires at:', token.expiresAt);
          
          // Calculate time until expiry
          const expiresAt = new Date(token.expiresAt);
          const now = new Date();
          const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60);
          console.log('   Hours until expiry:', hoursUntilExpiry.toFixed(2));
          
          if (hoursUntilExpiry > 0) {
            console.log('✅ Token is valid and not expired');
            
            // Step 4: Test email verification with the token
            console.log('\n4. Testing email verification with token...');
            
            // Get the full token for verification
            const fullToken = debugResult.tokens[0].id; // Use the actual token, not the truncated version
            
            // Try to get the actual token from the debug endpoint
            const tokenDetailResponse = await fetch(`${PROD_URL}/api/auth/debug-tokens/${encodeURIComponent(testUser.email)}`);
            const tokenDetail = await tokenDetailResponse.json();
            
            if (tokenDetail.tokens && tokenDetail.tokens.length > 0) {
              // The debug endpoint truncates tokens, so we need to request a new verification email to get a fresh token
              console.log('\n4a. Requesting fresh verification email...');
              const freshVerifyResponse = await fetch(`${PROD_URL}/api/auth/request-verification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: testUser.email })
              });
              
              const freshVerifyResult = await freshVerifyResponse.json();
              
              if (freshVerifyResponse.ok && freshVerifyResult.token) {
                console.log('✅ Fresh verification token generated');
                
                // Step 5: Test verification endpoint
                console.log('\n5. Testing email verification endpoint...');
                const verifyResponse = await fetch(`${PROD_URL}/api/auth/verify-email?token=${encodeURIComponent(freshVerifyResult.token)}`, {
                  method: 'GET'
                });
                
                const verifyResult = await verifyResponse.json();
                
                if (verifyResponse.ok) {
                  console.log('✅ Email verification successful in production!');
                  console.log('   Message:', verifyResult.message);
                  
                  // Step 6: Verify user state after verification
                  console.log('\n6. Checking final user state...');
                  const finalDebugResponse = await fetch(`${PROD_URL}/api/auth/debug-tokens/${encodeURIComponent(testUser.email)}`);
                  
                  if (finalDebugResponse.ok) {
                    const finalDebugResult = await finalDebugResponse.json();
                    console.log('📊 Final user state:');
                    console.log('   Email verified:', finalDebugResult.emailVerified);
                    console.log('   Remaining tokens:', finalDebugResult.tokens ? finalDebugResult.tokens.length : 0);
                    
                    if (finalDebugResult.emailVerified) {
                      console.log('\n🎉 PRODUCTION EMAIL VERIFICATION WORKING CORRECTLY!');
                      console.log('✅ User can now log in and access all features');
                      
                      // Step 7: Test login after verification
                      console.log('\n7. Testing login after verification...');
                      const loginResponse = await fetch(`${PROD_URL}/api/login`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          username: testUser.email,
                          password: testUser.password
                        })
                      });
                      
                      const loginResult = await loginResponse.json();
                      
                      if (loginResponse.ok) {
                        console.log('✅ Login successful after verification');
                        console.log('   Welcome:', loginResult.user?.displayName || loginResult.user?.username);
                      } else {
                        console.log('❌ Login failed after verification:', loginResult);
                      }
                      
                    } else {
                      console.log('❌ Email verification status not updated in production');
                    }
                  }
                } else {
                  console.log('❌ Email verification failed in production');
                  console.log('   Status:', verifyResponse.status);
                  console.log('   Error:', verifyResult);
                  
                  if (verifyResult.message && verifyResult.message.includes('expired')) {
                    console.log('\n💡 Token appears to be expired. This could mean:');
                    console.log('   - Clock synchronization issues between environments');
                    console.log('   - Token was already used');
                    console.log('   - Multiple verification requests invalidated previous tokens');
                  }
                }
              } else {
                console.log('❌ Failed to get fresh verification token');
                console.log('   Response:', freshVerifyResult);
              }
            }
          } else {
            console.log('❌ Token is expired in production');
            console.log('   This suggests a timing or environment issue');
          }
        } else {
          console.log('❌ No verification tokens found for user');
        }
      } else {
        console.log('❌ Could not access debug endpoint in production');
        console.log('   This is expected if debug endpoints are disabled in production');
      }
    } catch (debugError) {
      console.log('⚠️  Debug endpoints not available in production (this is normal)');
    }

    console.log('\n📧 Email Verification URL Format Check:');
    console.log('   Expected format: https://app.gamefolio.com/verify-email?token=...');
    console.log('   Check your email for verification link with this format');

    console.log('\n🔧 Troubleshooting Steps if Verification Fails:');
    console.log('   1. Check email spam/junk folder');
    console.log('   2. Ensure email service (Brevo) is working in production');
    console.log('   3. Verify SITE_URL environment variable is set to https://app.gamefolio.com');
    console.log('   4. Check server logs for email sending errors');
    console.log('   5. Try requesting a new verification email');

  } catch (error) {
    console.log('❌ Production test failed with error:', error.message);
    console.log('   This could indicate:');
    console.log('   - Network connectivity issues');
    console.log('   - Production server is down');
    console.log('   - API endpoints changed');
    console.log('   - CORS issues');
  }
}

// Run the production test
testProductionEmailVerification();
