
const axios = require('axios');

const API_BASE = 'http://localhost:5000';

// Test users for different scenarios
const testUsers = {
  publicUser: { username: 'mod_tom', password: 'password123' },
  privateUser: { username: 'demo', password: 'demo' }, // Assuming demo user can be made private
  follower: { username: 'testfollower', password: 'password123' },
  nonFollower: { username: 'testnonfollower', password: 'password123' }
};

let cookies = {};

// Helper function to login and get session cookies
async function login(username, password) {
  try {
    const response = await axios.post(`${API_BASE}/api/login`, {
      username,
      password
    }, {
      withCredentials: true
    });
    
    // Extract cookies from response headers
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      cookies[username] = setCookieHeader;
    }
    
    console.log(`✅ Login successful for ${username}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Login failed for ${username}:`, error.response?.data || error.message);
    throw error;
  }
}

// Helper function to make authenticated requests
async function makeAuthRequest(method, url, data, username) {
  const config = {
    method,
    url: `${API_BASE}${url}`,
    withCredentials: true,
    headers: {}
  };
  
  if (cookies[username]) {
    config.headers.Cookie = cookies[username].join('; ');
  }
  
  if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'patch')) {
    config.data = data;
  }
  
  return axios(config);
}

// Test 1: Follow Status Persistence
async function testFollowStatusPersistence() {
  console.log('\n🧪 TEST 1: Follow Status Persistence');
  
  try {
    // Login as follower
    await login(testUsers.follower.username, testUsers.follower.password);
    
    // Check initial follow status
    let response = await makeAuthRequest('GET', `/api/users/demo/follow-status`, null, testUsers.follower.username);
    const initialStatus = response.data;
    console.log(`Initial follow status: ${initialStatus}`);
    
    // Follow user
    await makeAuthRequest('POST', `/api/users/demo/follow`, null, testUsers.follower.username);
    console.log('✅ Follow request sent');
    
    // Check follow status immediately
    response = await makeAuthRequest('GET', `/api/users/demo/follow-status`, null, testUsers.follower.username);
    const statusAfterFollow = response.data;
    console.log(`Status after follow: ${statusAfterFollow}`);
    
    // Wait 2 seconds to simulate page refresh delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check follow status again (simulating page refresh)
    response = await makeAuthRequest('GET', `/api/users/demo/follow-status`, null, testUsers.follower.username);
    const statusAfterRefresh = response.data;
    console.log(`Status after refresh: ${statusAfterRefresh}`);
    
    // Verify persistence
    if (statusAfterFollow === statusAfterRefresh && statusAfterRefresh === true) {
      console.log('✅ Follow status persists correctly');
    } else {
      console.log('❌ Follow status does not persist');
    }
    
    // Cleanup: Unfollow
    await makeAuthRequest('DELETE', `/api/users/demo/follow`, null, testUsers.follower.username);
    console.log('🧹 Cleanup: Unfollowed user');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Test 2: Private User Follow Requests
async function testPrivateUserFollowRequests() {
  console.log('\n🧪 TEST 2: Private User Follow Requests');
  
  try {
    // First, make demo user private (login as demo user)
    await login(testUsers.privateUser.username, testUsers.privateUser.password);
    await makeAuthRequest('POST', '/api/users/privacy-preferences', { isPrivate: true }, testUsers.privateUser.username);
    console.log('✅ Demo user set to private');
    
    // Login as non-follower
    await login(testUsers.nonFollower.username, testUsers.nonFollower.password);
    
    // Try to view private user's content without following
    try {
      const response = await makeAuthRequest('GET', '/api/users/demo/clips', null, testUsers.nonFollower.username);
      if (response.status === 403) {
        console.log('✅ Private profile correctly blocks non-followers from viewing content');
      } else {
        console.log('❌ Private profile allows non-followers to view content');
      }
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Private profile correctly blocks non-followers from viewing content');
      } else {
        throw error;
      }
    }
    
    // Send follow request
    await makeAuthRequest('POST', '/api/users/demo/follow', null, testUsers.nonFollower.username);
    console.log('✅ Follow request sent to private user');
    
    // Check if follow status is pending or approved
    const response = await makeAuthRequest('GET', '/api/users/demo/follow-status', null, testUsers.nonFollower.username);
    console.log(`Follow status for private user: ${response.data}`);
    
    // Try to access content after follow request
    try {
      const contentResponse = await makeAuthRequest('GET', '/api/users/demo/clips', null, testUsers.nonFollower.username);
      console.log('✅ Can access private user content after follow request');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('⚠️ Follow request pending - cannot access content yet');
      } else {
        throw error;
      }
    }
    
    // Cleanup
    await makeAuthRequest('DELETE', '/api/users/demo/follow', null, testUsers.nonFollower.username);
    console.log('🧹 Cleanup: Unfollowed private user');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Test 3: Follow/Unfollow Cycle
async function testFollowUnfollowCycle() {
  console.log('\n🧪 TEST 3: Follow/Unfollow Cycle');
  
  try {
    await login(testUsers.follower.username, testUsers.follower.password);
    
    // Cycle through follow/unfollow multiple times
    for (let i = 0; i < 3; i++) {
      console.log(`\n--- Cycle ${i + 1} ---`);
      
      // Follow
      await makeAuthRequest('POST', '/api/users/demo/follow', null, testUsers.follower.username);
      let response = await makeAuthRequest('GET', '/api/users/demo/follow-status', null, testUsers.follower.username);
      console.log(`After follow: ${response.data}`);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Unfollow
      await makeAuthRequest('DELETE', '/api/users/demo/follow', null, testUsers.follower.username);
      response = await makeAuthRequest('GET', '/api/users/demo/follow-status', null, testUsers.follower.username);
      console.log(`After unfollow: ${response.data}`);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('✅ Follow/unfollow cycle completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Test 4: Follower/Following Counts
async function testFollowerCounts() {
  console.log('\n🧪 TEST 4: Follower/Following Counts');
  
  try {
    // Login as follower
    await login(testUsers.follower.username, testUsers.follower.password);
    
    // Get initial counts
    let demoProfile = await makeAuthRequest('GET', '/api/users/demo', null, testUsers.follower.username);
    let followerProfile = await makeAuthRequest('GET', `/api/users/${testUsers.follower.username}`, null, testUsers.follower.username);
    
    const initialDemoFollowers = demoProfile.data._count?.followers || 0;
    const initialFollowerFollowing = followerProfile.data._count?.following || 0;
    
    console.log(`Demo initial followers: ${initialDemoFollowers}`);
    console.log(`Follower initial following: ${initialFollowerFollowing}`);
    
    // Follow demo user
    await makeAuthRequest('POST', '/api/users/demo/follow', null, testUsers.follower.username);
    
    // Check updated counts
    demoProfile = await makeAuthRequest('GET', '/api/users/demo', null, testUsers.follower.username);
    followerProfile = await makeAuthRequest('GET', `/api/users/${testUsers.follower.username}`, null, testUsers.follower.username);
    
    const afterFollowDemoFollowers = demoProfile.data._count?.followers || 0;
    const afterFollowFollowerFollowing = followerProfile.data._count?.following || 0;
    
    console.log(`Demo followers after follow: ${afterFollowDemoFollowers}`);
    console.log(`Follower following after follow: ${afterFollowFollowerFollowing}`);
    
    // Verify counts increased
    if (afterFollowDemoFollowers === initialDemoFollowers + 1 && 
        afterFollowFollowerFollowing === initialFollowerFollowing + 1) {
      console.log('✅ Follower counts updated correctly');
    } else {
      console.log('❌ Follower counts not updated correctly');
    }
    
    // Unfollow and check counts decrease
    await makeAuthRequest('DELETE', '/api/users/demo/follow', null, testUsers.follower.username);
    
    demoProfile = await makeAuthRequest('GET', '/api/users/demo', null, testUsers.follower.username);
    followerProfile = await makeAuthRequest('GET', `/api/users/${testUsers.follower.username}`, null, testUsers.follower.username);
    
    const afterUnfollowDemoFollowers = demoProfile.data._count?.followers || 0;
    const afterUnfollowFollowerFollowing = followerProfile.data._count?.following || 0;
    
    console.log(`Demo followers after unfollow: ${afterUnfollowDemoFollowers}`);
    console.log(`Follower following after unfollow: ${afterUnfollowFollowerFollowing}`);
    
    // Verify counts decreased
    if (afterUnfollowDemoFollowers === initialDemoFollowers && 
        afterUnfollowFollowerFollowing === initialFollowerFollowing) {
      console.log('✅ Follower counts decremented correctly');
    } else {
      console.log('❌ Follower counts not decremented correctly');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Test 5: Database vs Frontend Sync
async function testDatabaseFrontendSync() {
  console.log('\n🧪 TEST 5: Database vs Frontend Sync');
  
  try {
    await login(testUsers.follower.username, testUsers.follower.password);
    
    // Make multiple rapid follow/unfollow requests
    console.log('Making rapid follow/unfollow requests...');
    
    await makeAuthRequest('POST', '/api/users/demo/follow', null, testUsers.follower.username);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await makeAuthRequest('DELETE', '/api/users/demo/follow', null, testUsers.follower.username);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await makeAuthRequest('POST', '/api/users/demo/follow', null, testUsers.follower.username);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check final status
    const response = await makeAuthRequest('GET', '/api/users/demo/follow-status', null, testUsers.follower.username);
    console.log(`Final status after rapid changes: ${response.data}`);
    
    // Wait and check again to ensure consistency
    await new Promise(resolve => setTimeout(resolve, 2000));
    const finalCheck = await makeAuthRequest('GET', '/api/users/demo/follow-status', null, testUsers.follower.username);
    console.log(`Status after delay: ${finalCheck.data}`);
    
    if (response.data === finalCheck.data) {
      console.log('✅ Database and frontend remain synchronized');
    } else {
      console.log('❌ Database and frontend are out of sync');
    }
    
    // Cleanup
    await makeAuthRequest('DELETE', '/api/users/demo/follow', null, testUsers.follower.username);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Test 6: Edge Cases
async function testEdgeCases() {
  console.log('\n🧪 TEST 6: Edge Cases');
  
  try {
    await login(testUsers.follower.username, testUsers.follower.password);
    
    // Test: Follow non-existent user
    try {
      await makeAuthRequest('POST', '/api/users/nonexistentuser/follow', null, testUsers.follower.username);
      console.log('❌ Should not be able to follow non-existent user');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Correctly handles non-existent user');
      } else {
        throw error;
      }
    }
    
    // Test: Follow yourself
    try {
      await makeAuthRequest('POST', `/api/users/${testUsers.follower.username}/follow`, null, testUsers.follower.username);
      console.log('❌ Should not be able to follow yourself');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly prevents self-following');
      } else {
        throw error;
      }
    }
    
    // Test: Double follow
    await makeAuthRequest('POST', '/api/users/demo/follow', null, testUsers.follower.username);
    try {
      await makeAuthRequest('POST', '/api/users/demo/follow', null, testUsers.follower.username);
      console.log('❌ Should not be able to follow twice');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly prevents double following');
      } else {
        console.log('⚠️ Double follow handled differently:', error.response?.status);
      }
    }
    
    // Test: Unfollow without following
    await makeAuthRequest('DELETE', '/api/users/demo/follow', null, testUsers.follower.username);
    try {
      await makeAuthRequest('DELETE', '/api/users/demo/follow', null, testUsers.follower.username);
      console.log('❌ Should not be able to unfollow when not following');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly handles unfollow when not following');
      } else {
        console.log('⚠️ Double unfollow handled differently:', error.response?.status);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Main test runner
async function runFollowTests() {
  console.log('🚀 Starting Follow Logic Tests\n');
  console.log('='.repeat(50));
  
  try {
    await testFollowStatusPersistence();
    await testPrivateUserFollowRequests();
    await testFollowUnfollowCycle();
    await testFollowerCounts();
    await testDatabaseFrontendSync();
    await testEdgeCases();
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 All follow logic tests completed!');
    
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  runFollowTests().catch(console.error);
}

module.exports = {
  runFollowTests,
  testFollowStatusPersistence,
  testPrivateUserFollowRequests,
  testFollowUnfollowCycle,
  testFollowerCounts,
  testDatabaseFrontendSync,
  testEdgeCases
};
