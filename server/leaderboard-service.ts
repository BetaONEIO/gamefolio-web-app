import { storage } from "./storage";
import { InsertUserPointsHistory, InsertWeeklyLeaderboard, InsertTopContributor } from "@shared/schema";

// Point values for different actions
export const POINT_VALUES = {
  upload: 5,
  like: 2,
  comment: 5,
  fire: 3,
  view: 1, // 1 point per view (also awards 1 XP for leveling)
} as const;

export class LeaderboardService {
  // Get current week in ISO format (e.g., "2024-W01")
  static getCurrentWeek(): { week: string; year: number } {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    const week = `${now.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
    return { week, year: now.getFullYear() };
  }

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
    
    // Update both monthly and weekly leaderboards
    await Promise.all([
      this.updateMonthlyLeaderboard(userId, action, points),
      this.updateWeeklyLeaderboard(userId, action, points)
    ]);
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
        firesGivenCount: action === 'fire' ? 1 : 0,
        viewsCount: action === 'view' ? 1 : 0,
        totalPoints: points,
      });
    } else {
      // Update existing entry
      const updates = {
        uploadsCount: entry.uploadsCount + (action === 'upload' ? 1 : 0),
        likesGivenCount: entry.likesGivenCount + (action === 'like' ? 1 : 0),
        commentsCount: entry.commentsCount + (action === 'comment' ? 1 : 0),
        firesGivenCount: entry.firesGivenCount + (action === 'fire' ? 1 : 0),
        viewsCount: entry.viewsCount + (action === 'view' ? 1 : 0),
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

  // Update the weekly leaderboard for a user
  static async updateWeeklyLeaderboard(
    userId: number,
    action: keyof typeof POINT_VALUES,
    points: number
  ): Promise<void> {
    const { week, year } = this.getCurrentWeek();

    // Get or create weekly leaderboard entry
    let entry = await storage.getWeeklyLeaderboardEntry(userId, week, year);
    
    if (!entry) {
      // Create new entry
      entry = await storage.createWeeklyLeaderboardEntry({
        userId,
        week,
        year,
        uploadsCount: action === 'upload' ? 1 : 0,
        likesGivenCount: action === 'like' ? 1 : 0,
        commentsCount: action === 'comment' ? 1 : 0,
        firesGivenCount: action === 'fire' ? 1 : 0,
        viewsCount: action === 'view' ? 1 : 0,
        totalPoints: points,
      });
    } else {
      // Update existing entry
      const updates = {
        uploadsCount: entry.uploadsCount + (action === 'upload' ? 1 : 0),
        likesGivenCount: entry.likesGivenCount + (action === 'like' ? 1 : 0),
        commentsCount: entry.commentsCount + (action === 'comment' ? 1 : 0),
        firesGivenCount: entry.firesGivenCount + (action === 'fire' ? 1 : 0),
        viewsCount: entry.viewsCount + (action === 'view' ? 1 : 0),
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
            // Check if user already has this badge for this specific month
            const existingBadges = await storage.getUserBadges(topContributor.userId);
            const alreadyHasBadgeForPeriod = existingBadges.some(
              ub => ub.badgeType === 'monthly_top_contributor' && 
                    ub.createdAt && 
                    ub.createdAt.toISOString().startsWith(`${year}-${period.split('-')[1]}`)
            );

            if (!alreadyHasBadgeForPeriod) {
              await storage.createUserBadge({
                userId: topContributor.userId,
                badgeType: 'monthly_top_contributor',
                assignedBy: 'system',
                assignedById: null,
                expiresAt: null // Badge doesn't expire
              });
              
              console.log(`🏆 Monthly Top Contributor badge awarded to user ${topContributor.userId} for ${period}`);
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