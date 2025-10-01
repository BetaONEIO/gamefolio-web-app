
import { DatabaseStorage } from './server/database-storage.js';

const storage = new DatabaseStorage();

async function getAppMetrics() {
  console.log('📊 Fetching Gamefolio App Metrics...\n');
  
  try {
    
    // Get basic counts
    console.log('👥 USER METRICS:');
    const totalUsers = await storage.getUserCount();
    console.log(`  Total Users: ${totalUsers}`);
    
    const userTypeDistribution = await storage.getUserTypeDistribution();
    console.log('  User Types:');
    userTypeDistribution.forEach(type => {
      console.log(`    ${type.userType || 'Not Set'}: ${type.count}`);
    });
    
    console.log('\n🎮 CONTENT METRICS:');
    const totalClips = await storage.getClipCount();
    console.log(`  Total Video Clips: ${totalClips}`);
    
    // Get clips by type (reels vs regular clips)
    const { eq, sql } = await import('drizzle-orm');
    const { clips } = await import('./shared/schema.js');
    const { db } = await import('./server/db.js');
    
    const [reelsResult] = await db
      .select({ count: sql`count(*)` })
      .from(clips)
      .where(eq(clips.videoType, 'reel'));
    
    const [regularClipsResult] = await db
      .select({ count: sql`count(*)` })
      .from(clips)
      .where(eq(clips.videoType, 'clip'));
    
    const reelsCount = reelsResult?.count || 0;
    const regularClipsCount = regularClipsResult?.count || 0;
    
    console.log(`  Reels: ${reelsCount}`);
    console.log(`  Regular Clips: ${regularClipsCount}`);
    
    const totalScreenshots = await storage.getScreenshotCount();
    console.log(`  Screenshots: ${totalScreenshots}`);
    
    console.log('\n🎯 ENGAGEMENT METRICS:');
    
    // Get likes count
    const { likes, comments, follows } = await import('./shared/schema.js');
    const [likesResult] = await db
      .select({ count: sql`count(*)` })
      .from(likes);
    const totalLikes = likesResult?.count || 0;
    console.log(`  Total Likes: ${totalLikes}`);
    
    // Get comments count
    const [commentsResult] = await db
      .select({ count: sql`count(*)` })
      .from(comments);
    const totalComments = commentsResult?.count || 0;
    console.log(`  Total Comments: ${totalComments}`);
    
    // Get follows count
    const [followsResult] = await db
      .select({ count: sql`count(*)` })
      .from(follows);
    const totalFollows = followsResult?.count || 0;
    console.log(`  Total Follows: ${totalFollows}`);
    
    console.log('\n🎮 GAME METRICS:');
    const totalGames = await storage.getGameCount();
    console.log(`  Total Games: ${totalGames}`);
    
    const topGames = await storage.getTopGames(5);
    console.log('  Top 5 Games by Content:');
    topGames.forEach((game, index) => {
      console.log(`    ${index + 1}. ${game.name}: ${game.clipCount} clips`);
    });
    
    console.log('\n📈 GROWTH METRICS:');
    
    // Get recent signups (last 7 days)
    const { users } = await import('./shared/schema.js');
    const { gte } = await import('drizzle-orm');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [recentUsersResult] = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(gte(users.createdAt, sevenDaysAgo));
    
    const recentUsers = recentUsersResult?.count || 0;
    console.log(`  New Users (Last 7 days): ${recentUsers}`);
    
    // Get recent content (last 7 days)
    const [recentClipsResult] = await db
      .select({ count: sql`count(*)` })
      .from(clips)
      .where(gte(clips.createdAt, sevenDaysAgo));
    
    const recentClips = recentClipsResult?.count || 0;
    console.log(`  New Content (Last 7 days): ${recentClips} clips/reels`);
    
    console.log('\n📊 SUMMARY:');
    console.log(`  Total Platform Users: ${totalUsers}`);
    console.log(`  Total Content Items: ${totalClips + totalScreenshots}`);
    console.log(`  Total Engagement Actions: ${totalLikes + totalComments + totalFollows}`);
    console.log(`  Content per User: ${((totalClips + totalScreenshots) / Math.max(totalUsers, 1)).toFixed(2)}`);
    console.log(`  Engagement Rate: ${((totalLikes + totalComments) / Math.max(totalClips, 1)).toFixed(2)} per content item`);
    
  } catch (error) {
    console.error('❌ Error fetching metrics:', error);
  }
}

getAppMetrics();
