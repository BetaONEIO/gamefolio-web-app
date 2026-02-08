import { storage } from "./storage";
import { InsertUserPointsHistory, InsertWeeklyLeaderboard, InsertTopContributor } from "@shared/schema";

// Point values for different actions
// Points are used for BOTH leaderboards AND leveling
// Every point earned contributes to user's level progression
export const POINT_VALUES = {
  upload: 20,             // 20 points for uploading clips/reels
  screenshot_upload: 2,   // 2 points for uploading screenshots
  like: 1,                // 1 point for liking content
  comment: 1,             // 1 point for commenting
  fire: 5,                // 5 points for fire reactions (permanent, limited daily)
  view: 0.01,             // 0.01 points per view (1 point per 100 views)
} as const;

export class LeaderboardService {
  // Get current week in ISO format (e.g., "2024-W01")
  // Week starts on Monday per ISO 8601 standard
  static getCurrentWeek(date?: Date): { week: string; year: number } {
    const now = date || new Date();
    
    // Calculate start of week (Monday)
    const dayOfWeek = now.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysFromMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Calculate week number using ISO 8601 (Monday start)
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((startOfWeek.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    const week = `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
    return { week, year: now.getFullYear() };
  }

  // Award points to a user for an action
  // Points are used for both leaderboards AND leveling
  static async awardPoints(
    userId: number,
    action: keyof typeof POINT_VALUES,
    description?: string,
    timestamp?: Date
  ): Promise<void> {
    const points = POINT_VALUES[action];
    
    // Record the points in history with the correct timestamp
    const pointsHistory: InsertUserPointsHistory = {
      userId,
      action,
      points,
      description: description || `Points awarded for ${action}`,
      createdAt: timestamp,
    };
    
    await storage.addUserPointsHistory(pointsHistory);
    
    // Update user's total points (stored in totalXP field) and recalculate level
    await storage.incrementUserPoints(userId, points);
    await this.updateUserLevel(userId);
    
    // Update both monthly and weekly leaderboards using the timestamp
    await Promise.all([
      this.updateMonthlyLeaderboard(userId, action, points, timestamp),
      this.updateWeeklyLeaderboard(userId, action, points, timestamp)
    ]);
  }

  // Deduct points from a user when they delete content
  static async deductPoints(
    userId: number,
    action: keyof typeof POINT_VALUES,
    description?: string,
    timestamp?: Date
  ): Promise<void> {
    const points = POINT_VALUES[action];
    
    // Record the point deduction in history (negative points)
    const pointsHistory: InsertUserPointsHistory = {
      userId,
      action,
      points: -points, // Negative to indicate deduction
      description: description || `Points deducted for deleting ${action}`,
      createdAt: timestamp,
    };
    
    await storage.addUserPointsHistory(pointsHistory);
    
    // Deduct from user's total points and recalculate level
    await storage.incrementUserPoints(userId, -points); // Negative to deduct
    await this.updateUserLevel(userId);
    
    // Update both monthly and weekly leaderboards using the timestamp
    await Promise.all([
      this.updateMonthlyLeaderboard(userId, action, -points, timestamp),
      this.updateWeeklyLeaderboard(userId, action, -points, timestamp)
    ]);
  }

  // Update user's level based on their total points
  static async updateUserLevel(userId: number): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user) return;
      
      const { calculateLevel } = await import("./level-system");
      // Note: totalXP field stores total points (field name kept for DB compatibility)
      const newLevel = calculateLevel(user.totalXP);
      
      // Only update if level has changed
      if (newLevel !== user.level) {
        await storage.updateUser(userId, { level: newLevel });
        console.log(`✨ User ${userId} leveled up to level ${newLevel}!`);
      }
    } catch (error) {
      console.error("Error updating user level:", error);
    }
  }

  // Update the monthly leaderboard for a user
  static async updateMonthlyLeaderboard(
    userId: number,
    action: keyof typeof POINT_VALUES,
    points: number,
    timestamp?: Date
  ): Promise<void> {
    const now = timestamp || new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const monthKey = `${year}-${month}`;

    // Get or create monthly leaderboard entry
    let entry = await storage.getMonthlyLeaderboardEntry(userId, monthKey, year);
    
    const isDeduction = points < 0;
    const countDelta = isDeduction ? -1 : 1;

    if (!entry) {
      entry = await storage.createMonthlyLeaderboardEntry({
        userId,
        month: monthKey,
        year,
        uploadsCount: action === 'upload' ? Math.max(0, countDelta) : 0,
        likesGivenCount: action === 'like' ? Math.max(0, countDelta) : 0,
        commentsCount: action === 'comment' ? Math.max(0, countDelta) : 0,
        firesGivenCount: action === 'fire' ? Math.max(0, countDelta) : 0,
        viewsCount: action === 'view' ? Math.max(0, countDelta) : 0,
        totalPoints: points,
      });
    } else {
      const updates = {
        uploadsCount: Math.max(0, entry.uploadsCount + (action === 'upload' ? countDelta : 0)),
        likesGivenCount: Math.max(0, entry.likesGivenCount + (action === 'like' ? countDelta : 0)),
        commentsCount: Math.max(0, entry.commentsCount + (action === 'comment' ? countDelta : 0)),
        firesGivenCount: Math.max(0, entry.firesGivenCount + (action === 'fire' ? countDelta : 0)),
        viewsCount: Math.max(0, entry.viewsCount + (action === 'view' ? countDelta : 0)),
        totalPoints: entry.totalPoints + points,
      };
      
      await storage.updateMonthlyLeaderboardEntry(entry.id, updates);
    }

    await this.recalculateRankings(monthKey, year);
  }

  static async recalculateRankings(month: string, year: number): Promise<void> {
    await storage.recalculateMonthlyRankings(month, year);
  }

  static async updateWeeklyLeaderboard(
    userId: number,
    action: keyof typeof POINT_VALUES,
    points: number,
    timestamp?: Date
  ): Promise<void> {
    const { week, year } = this.getCurrentWeek(timestamp);

    const isDeduction = points < 0;
    const countDelta = isDeduction ? -1 : 1;

    let entry = await storage.getWeeklyLeaderboardEntry(userId, week, year);
    
    if (!entry) {
      entry = await storage.createWeeklyLeaderboardEntry({
        userId,
        week,
        year,
        uploadsCount: action === 'upload' ? Math.max(0, countDelta) : 0,
        likesGivenCount: action === 'like' ? Math.max(0, countDelta) : 0,
        commentsCount: action === 'comment' ? Math.max(0, countDelta) : 0,
        firesGivenCount: action === 'fire' ? Math.max(0, countDelta) : 0,
        viewsCount: action === 'view' ? Math.max(0, countDelta) : 0,
        totalPoints: points,
      });
    } else {
      const updates = {
        uploadsCount: Math.max(0, entry.uploadsCount + (action === 'upload' ? countDelta : 0)),
        likesGivenCount: Math.max(0, entry.likesGivenCount + (action === 'like' ? countDelta : 0)),
        commentsCount: Math.max(0, entry.commentsCount + (action === 'comment' ? countDelta : 0)),
        firesGivenCount: Math.max(0, entry.firesGivenCount + (action === 'fire' ? countDelta : 0)),
        viewsCount: Math.max(0, entry.viewsCount + (action === 'view' ? countDelta : 0)),
        totalPoints: entry.totalPoints + points,
      };
      
      await storage.updateWeeklyLeaderboardEntry(entry.id, updates);
    }

    // Recalculate rankings for the week
    await this.recalculateWeeklyRankings(week, year);
  }

  // Recalculate rankings for a specific week
  static async recalculateWeeklyRankings(week: string, year: number): Promise<void> {
    await storage.recalculateWeeklyRankings(week, year);
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

  // Get current week leaderboard
  static async getCurrentWeekLeaderboard(limit: number = 10) {
    const { week, year } = this.getCurrentWeek();
    return await storage.getWeeklyLeaderboard(week, year, limit);
  }

  // Get previous week leaderboard
  static async getPreviousWeekLeaderboard(limit: number = 10) {
    const now = new Date();
    const prevWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfYear = new Date(prevWeek.getFullYear(), 0, 1);
    const days = Math.floor((prevWeek.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    const week = `${prevWeek.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
    const year = prevWeek.getFullYear();

    return await storage.getWeeklyLeaderboard(week, year, limit);
  }

  // Get user's current week stats
  static async getUserCurrentWeekStats(userId: number) {
    const { week, year } = this.getCurrentWeek();
    return await storage.getWeeklyLeaderboardEntry(userId, week, year);
  }

  // Get all-time leaderboard (aggregated from all monthly leaderboards)
  static async getAllTimeLeaderboard(limit: number = 10) {
    return await storage.getAllTimeLeaderboard(limit);
  }

  // Store top contributors when a period ends (weekly/monthly)
  static async storeTopContributors(periodType: 'weekly' | 'monthly', period: string, year: number): Promise<void> {
    try {
      // Get the top contributor for the period
      let topContributor;
      
      if (periodType === 'weekly') {
        const weeklyLeaderboard = await storage.getWeeklyLeaderboard(period, year, 1);
        if (weeklyLeaderboard.length > 0) {
          topContributor = weeklyLeaderboard[0];
        }
      } else {
        const monthlyLeaderboard = await storage.getMonthlyLeaderboard(period, year, 1);
        if (monthlyLeaderboard.length > 0) {
          topContributor = monthlyLeaderboard[0];
        }
      }

      if (topContributor) {
        // Store the top contributor in the topContributors table
        const contributorData: InsertTopContributor = {
          userId: topContributor.userId,
          periodType,
          period,
          year,
          totalPoints: topContributor.totalPoints,
          uploadsCount: topContributor.uploadsCount,
          likesGivenCount: topContributor.likesGivenCount,
          commentsCount: topContributor.commentsCount,
          firesGivenCount: topContributor.firesGivenCount || 0,
          viewsCount: topContributor.viewsCount || 0,
        };

        await storage.createTopContributor(contributorData);
        console.log(`Top contributor stored for ${periodType} ${period}: User ${topContributor.userId} with ${topContributor.totalPoints} points`);

        // Award "Monthly Top Contributor" badge for monthly winners
        if (periodType === 'monthly') {
          try {
            // Get the "Monthly Top Contributor" badge
            const monthlyBadge = await storage.getBadgeByName('Monthly Top Contributor');
            
            if (monthlyBadge) {
              // Check if user already has this badge for this specific month
              const existingBadges = await storage.getUserBadges(topContributor.userId);
              const alreadyHasBadgeForPeriod = existingBadges.some(
                ub => ub.badgeId === monthlyBadge.id && 
                      ub.createdAt && 
                      ub.createdAt.toISOString().startsWith(`${year}-${period.split('-')[1]}`)
              );

              if (!alreadyHasBadgeForPeriod) {
                await storage.createUserBadge({
                  userId: topContributor.userId,
                  badgeId: monthlyBadge.id,
                  assignedBy: 'system',
                  assignedById: null,
                  expiresAt: null // Badge doesn't expire
                });
                
                console.log(`🏆 Monthly Top Contributor badge awarded to user ${topContributor.userId} for ${period}`);
              }
            }
          } catch (badgeError) {
            console.error(`Error awarding monthly badge to user ${topContributor.userId}:`, badgeError);
          }
        }
      }
    } catch (error) {
      console.error(`Error storing top contributors for ${periodType} ${period}:`, error);
    }
  }

  // Check and process period endings (to be called periodically, e.g., daily cron job)
  static async processPeriodicLeaderboardClosures(): Promise<void> {
    try {
      const now = new Date();
      
      // Check if a week has ended (Sunday to Saturday)
      if (now.getDay() === 1) { // Monday - store last week's winner
        const prevWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startOfYear = new Date(prevWeek.getFullYear(), 0, 1);
        const days = Math.floor((prevWeek.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
        const week = `${prevWeek.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
        
        await this.storeTopContributors('weekly', week, prevWeek.getFullYear());
      }

      // Check if a month has ended
      if (now.getDate() === 1) { // First day of month - store last month's winner
        const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const monthKey = `${year}-${String(prevMonth).padStart(2, '0')}`;
        
        await this.storeTopContributors('monthly', monthKey, year);
      }
    } catch (error) {
      console.error('Error processing periodic leaderboard closures:', error);
    }
  }

  // Get top contributors by period type
  static async getTopContributors(periodType: 'weekly' | 'monthly', limit: number = 10) {
    return await storage.getTopContributors(periodType, limit);
  }

  // Get top contributors for a specific period
  static async getTopContributorsByPeriod(periodType: 'weekly' | 'monthly', period: string, year: number) {
    return await storage.getTopContributorsByPeriod(periodType, period, year);
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