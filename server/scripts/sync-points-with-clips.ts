import { db } from '../db';
import { userPointsHistory, clips, screenshots } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Sync user points history with actual clips and screenshots
 * This ensures points history accurately reflects content upload dates
 */
async function syncPointsWithContent() {
  console.log('🔧 Starting points history sync...');
  
  try {
    // Get all clips
    const allClips = await db.select().from(clips);
    console.log(`📊 Found ${allClips.length} clips`);
    
    // Get all screenshots  
    const allScreenshots = await db.select().from(screenshots);
    console.log(`📊 Found ${allScreenshots.length} screenshots`);
    
    // Delete existing upload points that don't match content
    console.log('🗑️  Removing incorrect upload points...');
    await db.delete(userPointsHistory)
      .where(eq(userPointsHistory.action, 'upload'));
    
    // Recreate accurate upload points for each clip
    console.log('📝 Creating accurate clip upload points...');
    for (const clip of allClips) {
      await db.insert(userPointsHistory).values({
        userId: clip.userId,
        action: 'upload',
        points: 5,
        description: `Upload: Clip - ${clip.title}`,
        createdAt: clip.createdAt,
      });
    }
    
    // Recreate accurate upload points for each screenshot
    console.log('📝 Creating accurate screenshot upload points...');
    for (const screenshot of allScreenshots) {
      await db.insert(userPointsHistory).values({
        userId: screenshot.userId,
        action: 'upload',
        points: 5,
        description: `Upload: Screenshot - ${screenshot.title}`,
        createdAt: screenshot.createdAt,
      });
    }
    
    console.log(`✅ Synced ${allClips.length} clips and ${allScreenshots.length} screenshots to points history`);
    console.log('✅ Points history sync completed successfully!');
  } catch (error) {
    console.error('❌ Error syncing points history:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncPointsWithContent()
    .then(() => {
      console.log('✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { syncPointsWithContent };
