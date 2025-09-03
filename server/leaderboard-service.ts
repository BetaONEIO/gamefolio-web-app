import { storage } from "./storage";
import { InsertUserPointsHistory } from "@shared/schema";

// Point values for different actions
export const POINT_VALUES = {
  upload: 10,
  like: 2,
  comment: 5,
} as const;

export class LeaderboardService {
  // Award points to a user for an action
  static async awardPoints(
    userId: number,
    action: keyof typeof POINT_VALUES,
    description?: string
  ): Promise<void> {
    const points = POINT_VALUES[action];
    
    // Record the points in history
    const pointsHistory: InsertUserPointsHistory = {
      userId,
      action,
      points,
      description: description || `Points awarded for ${action}`,
    };
    
    await storage.addUserPointsHistory(pointsHistory);
    
    // Update the monthly leaderboard
    await this.updateMonthlyLeaderboard(userId, action, points);
  }

  // Update the monthly leaderboard for a user
  static async updateMonthlyLeaderboard(
    userId: number,
    action: keyof typeof POINT_VALUES,
    points: number
  ): Promise<void> {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const monthKey = `${year}-${month}`;

    // Get or create monthly leaderboard entry
    let entry = await storage.getMonthlyLeaderboardEntry(userId, monthKey, year);
    
    if (!entry) {
      // Create new entry
      entry = await storage.createMonthlyLeaderboardEntry({
        userId,
        month: monthKey,
        year,
        uploadsCount: action === 'upload' ? 1 : 0,
        likesGivenCount: action === 'like' ? 1 : 0,
        commentsCount: action === 'comment' ? 1 : 0,
        totalPoints: points,
      });
    } else {
      // Update existing entry
      const updates = {
        uploadsCount: entry.uploadsCount + (action === 'upload' ? 1 : 0),
        likesGivenCount: entry.likesGivenCount + (action === 'like' ? 1 : 0),
        commentsCount: entry.commentsCount + (action === 'comment' ? 1 : 0),
        totalPoints: entry.totalPoints + points,
      };
      
      await storage.updateMonthlyLeaderboardEntry(entry.id, updates);
    }

    // Recalculate rankings for the month
    await this.recalculateRankings(monthKey, year);
  }

  // Recalculate rankings for a specific month
  static async recalculateRankings(month: string, year: number): Promise<void> {
    await storage.recalculateMonthlyRankings(month, year);
  }

  // Get current month leaderboard
  static async getCurrentMonthLeaderboard(limit: number = 10) {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const monthKey = `${year}-${month}`;

    return await storage.getMonthlyLeaderboard(monthKey, year, limit);
  }

  // Get previous month leaderboard
  static async getPreviousMonthLeaderboard(limit: number = 10) {
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const monthKey = `${year}-${String(prevMonth).padStart(2, '0')}`;

    return await storage.getMonthlyLeaderboard(monthKey, year, limit);
  }

  // Get user's current month stats
  static async getUserCurrentMonthStats(userId: number) {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const monthKey = `${year}-${month}`;

    return await storage.getMonthlyLeaderboardEntry(userId, monthKey, year);
  }

  // Initialize leaderboard for all existing users (run once)
  static async initializeLeaderboard(): Promise<void> {
    console.log("Initializing leaderboard system...");
    
    // This would be called once to populate initial data
    // For now, we'll just ensure the current month entries exist for active users
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const monthKey = `${year}-${month}`;

    console.log(`Leaderboard initialized for ${monthKey}`);
  }
}