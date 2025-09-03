
const BASE_URL = 'https://app.gamefolio.com'; // Change to your production URL

async function cleanupTomWattsAccounts() {
  console.log('🧹 Cleaning up tom_watts test accounts from production');
  console.log('================================================\n');

  try {
    // First, we need to get all users and filter for tom_watts emails
    console.log('1. Fetching users with tom_watts in email...');
    
    // We'll need to search through users to find tom_watts accounts
    let page = 1;
    const limit = 50;
    let tomWattsUsers = [];
    let hasMorePages = true;

    while (hasMorePages) {
      const response = await fetch(`${BASE_URL}/api/admin/users?page=${page}&limit=${limit}&search=tom_watts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // You'll need to add authentication headers here
          // 'Authorization': 'Bearer YOUR_ADMIN_TOKEN' or use cookies
        }
      });

      if (!response.ok) {
        console.log('❌ Failed to fetch users. Make sure you have admin access.');
        console.log('   Status:', response.status);
        return;
      }

      const result = await response.json();
      
      // Filter users that have tom_watts in their email
      const pageUsers = result.users.filter(user => 
        user.email && user.email.includes('tom_watts')
      );
      
      tomWattsUsers.push(...pageUsers);
      
      console.log(`   Page ${page}: Found ${pageUsers.length} tom_watts accounts`);
      
      // Check if there are more pages
      hasMorePages = page < result.pagination.totalPages;
      page++;
    }

    console.log(`\n✅ Found ${tomWattsUsers.length} accounts with tom_watts in email:`);
    tomWattsUsers.forEach(user => {
      console.log(`   - ${user.username} (${user.email}) - ID: ${user.id}`);
    });

    if (tomWattsUsers.length === 0) {
      console.log('🎉 No tom_watts accounts found to delete.');
      return;
    }

    console.log('\n2. Deleting tom_watts accounts...');
    
    let deletedCount = 0;
    let failedCount = 0;

    for (const user of tomWattsUsers) {
      try {
        console.log(`   Deleting: ${user.username} (${user.email})`);
        
        const deleteResponse = await fetch(`${BASE_URL}/api/admin/users/${user.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            // You'll need to add authentication headers here
            // 'Authorization': 'Bearer YOUR_ADMIN_TOKEN' or use cookies
          }
        });

        if (deleteResponse.ok) {
          const deleteResult = await deleteResponse.json();
          console.log(`   ✅ Deleted: ${user.username}`);
          deletedCount++;
        } else {
          console.log(`   ❌ Failed to delete ${user.username}:`, deleteResponse.status);
          failedCount++;
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`   ❌ Error deleting ${user.username}:`, error.message);
        failedCount++;
      }
    }

    console.log('\n🎉 Cleanup Summary:');
    console.log(`   Successfully deleted: ${deletedCount} accounts`);
    console.log(`   Failed to delete: ${failedCount} accounts`);
    console.log(`   Total processed: ${tomWattsUsers.length} accounts`);

  } catch (error) {
    console.log('❌ Cleanup failed with error:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('   - Ensure you have admin access');
    console.log('   - Check if production server is running');
    console.log('   - Verify authentication is working');
  }
}

// Instructions for running this script
console.log('⚠️  IMPORTANT: Before running this script:');
console.log('1. Update BASE_URL to your production URL if needed');
console.log('2. Add proper authentication (admin token or cookies)');
console.log('3. Test on a staging environment first if possible');
console.log('4. Make sure you have a database backup');
console.log('\nTo run: node cleanup-tom-watts-accounts.js\n');

// Uncomment the line below to run the cleanup
// cleanupTomWattsAccounts();
