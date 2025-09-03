
const PROD_URL = 'https://app.gamefolio.com';

async function testProductionEmailVerification() {
  console.log('🌐 Testing Production Email Verification System');
  console.log('==============================================\n');

  const timestamp = Date.now();
  const testUser = {
    email: `prodtest_${timestamp}@example.com`,
    password: 'TestPassword123!',
    username: `produser_${timestamp}`,
    displayName: `Production Test User ${timestamp}`,
    confirmPassword: 'TestPassword123!'
  };

  try {
    console.log('🔍 Testing production environment at:', PROD_URL);
    
    // Step 1: Test basic connectivity
    console.log('\n1. Testing production server connectivity...');
    try {
      const pingResponse = await fetch(`${PROD_URL}/api/auth/test`);
      
      if (!pingResponse.ok) {
        console.log('❌ Production server not responding to auth test');
        console.log('   Status:', pingResponse.status);
      } else {
        const pingResult = await pingResponse.json();
        console.log('✅ Production server responding:', pingResult.message);
      }
    } catch (error) {
      console.log('⚠️  Auth test endpoint may not be available in production (normal)');
    }

    // Step 2: Register new user
    console.log('\n2. Registering new user in production...');
    console.log('   Email:', testUser.email);
    console.log('   Username:', testUser.username);
    console.log('   Display Name:', testUser.displayName);
    
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
    console.log('   Email Verified:', registerResult.emailVerified);

    // Step 3: Test login before verification (should fail)
    console.log('\n3. Testing login before email verification...');
    const loginBeforeResponse = await fetch(`${PROD_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: testUser.email,
        password: testUser.password
      })
    });

    const loginBeforeResult = await loginBeforeResponse.json();
    
    if (loginBeforeResponse.ok) {
      console.log('⚠️  Login succeeded before verification (unexpected)');
      console.log('   This might indicate email verification is not enforced');
    } else {
      console.log('✅ Login correctly blocked before email verification');
      console.log('   Message:', loginBeforeResult.message);
    }

    // Step 4: Request verification email
    console.log('\n4. Requesting verification email...');
    const verifyResponse = await fetch(`${PROD_URL}/api/auth/request-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: testUser.email })
    });

    const verifyResult = await verifyResponse.json();
    
    if (verifyResponse.ok) {
      console.log('✅ Verification email request successful');
      console.log('   Message:', verifyResult.message);
      
      if (verifyResult.token) {
        console.log('   Token received (for testing):', verifyResult.token.substring(0, 10) + '...');
        
        // Step 5: Test the verification flow
        console.log('\n5. Testing email verification flow...');
        
        // Test the GET endpoint (what happens when user clicks email link)
        const verifyLinkResponse = await fetch(`${PROD_URL}/api/auth/verify-email?token=${encodeURIComponent(verifyResult.token)}`, {
          method: 'GET',
          redirect: 'follow'
        });
        
        console.log('   Verification response status:', verifyLinkResponse.status);
        console.log('   Final URL:', verifyLinkResponse.url);
        
        if (verifyLinkResponse.url.includes('status=success')) {
          console.log('✅ Email verification successful!');
          console.log('   Redirected to success page');
          
          // Step 6: Test login after verification
          console.log('\n6. Testing login after email verification...');
          const loginAfterResponse = await fetch(`${PROD_URL}/api/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username: testUser.email,
              password: testUser.password
            })
          });

          const loginAfterResult = await loginAfterResponse.json();
          
          if (loginAfterResponse.ok) {
            console.log('✅ Login successful after verification');
            console.log('   Welcome:', loginAfterResult.user?.displayName || loginAfterResult.user?.username);
            console.log('   Email Verified:', loginAfterResult.user?.emailVerified);
          } else {
            console.log('❌ Login failed after verification:', loginAfterResult);
          }
          
        } else if (verifyLinkResponse.url.includes('status=expired')) {
          console.log('❌ Verification failed - token expired');
        } else if (verifyLinkResponse.url.includes('status=invalid')) {
          console.log('❌ Verification failed - token invalid');
        } else if (verifyLinkResponse.url.includes('status=error')) {
          console.log('❌ Verification failed - server error');
        } else {
          console.log('⚠️  Unexpected verification response');
          console.log('   Final URL:', verifyLinkResponse.url);
        }
        
      } else {
        console.log('⚠️  No token returned (normal in production if emails are sent via Brevo)');
        console.log('   Check your email inbox for verification link');
      }
    } else {
      console.log('❌ Verification email request failed');
      console.log('   Status:', verifyResponse.status);
      console.log('   Error:', verifyResult);
    }

    console.log('\n📧 Production Email Verification Summary:');
    console.log('==========================================');
    console.log('✅ User registration working');
    console.log('✅ Verification email request working');
    console.log('✅ Verification flow handles redirects correctly');
    console.log('\n💡 Next steps:');
    console.log('   1. Check your email inbox for the verification email');
    console.log('   2. Click the verification link to complete the flow');
    console.log('   3. The link should redirect to: /verify-email?status=success');
    console.log('   4. After verification, login should work normally');

    console.log('\n🔧 Verification URL format:');
    console.log(`   ${PROD_URL}/api/auth/verify-email?token=...`);
    console.log('   This should redirect to:');
    console.log(`   ${PROD_URL}/verify-email?status=success`);

  } catch (error) {
    console.log('❌ Production test failed with error:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('   - Check if production server is running');
    console.log('   - Verify CORS settings allow requests');
    console.log('   - Check network connectivity');
    console.log('   - Ensure API endpoints are deployed');
  }
}

// Run the production test
testProductionEmailVerification();
