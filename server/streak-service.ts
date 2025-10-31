import { storage } from "./storage";
import { LeaderboardService } from "./leaderboard-service";

// Streak bonus rewards at different milestones
const STREAK_BONUSES = {
  3: 10,   // 3 days: 10 bonus points
  7: 25,   // 7 days: 25 bonus points
  14: 50,  // 14 days: 50 bonus points
  30: 100, // 30 days: 100 bonus points
  60: 200, // 60 days: 200 bonus points
  90: 300, // 90 days: 300 bonus points
  180: 500, // 180 days: 500 bonus points
  365: 1000, // 365 days: 1000 bonus points
};

export class StreakService {
  // Get calendar date (normalized to midnight) for comparison
  private static getCalendarDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  // Check if two dates are on consecutive calendar days
  private static areConsecutiveDays(date1: Date, date2: Date): boolean {
    const cal1 = this.getCalendarDate(date1);
    const cal2 = this.getCalendarDate(date2);
    const oneDay = 24 * 60 * 60 * 1000;
    const diffMs = cal2.getTime() - cal1.getTime();
    const diffDays = Math.round(diffMs / oneDay);
    return diffDays === 1;
  }

  // Check if two dates are on the same calendar day
  private static isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  // Update user's login streak and award bonus points
  static async updateLoginStreak(userId: number): Promise<{
    currentStreak: number;
    bonusAwarded: number;
    isNewMilestone: boolean;
    message: string;
  }> {
    try {
      // Get current user data
      const user = await storage.getUserById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      const now = new Date();
      const lastStreakUpdate = user.lastStreakUpdate;
      
      let currentStreak = user.currentStreak || 0;
      let longestStreak = user.longestStreak || 0;
      let bonusAwarded = 0;
      let isNewMilestone = false;
      let message = "";

      // If this is the first time tracking streak
      if (!lastStreakUpdate) {
        currentStreak = 1;
        message = "Welcome! Your login streak has started!";
      } 
      // If user already logged in today, don't update
      else if (this.isSameDay(lastStreakUpdate, now)) {
        return {
          currentStreak,
          bonusAwarded: 0,
          isNewMilestone: false,
          message: "Already logged in today"
        };
      }
      // If user logged in yesterday, increment streak
      else if (this.areConsecutiveDays(lastStreakUpdate, now)) {
        currentStreak++;
        message = `${currentStreak} day streak! Keep it up!`;

        // Check if this is a milestone and award bonus points
        if (STREAK_BONUSES[currentStreak as keyof typeof STREAK_BONUSES]) {
          bonusAwarded = STREAK_BONUSES[currentStreak as keyof typeof STREAK_BONUSES];
          isNewMilestone = true;
          message = `🎉 ${currentStreak} day streak milestone! Bonus: ${bonusAwarded} points!`;

          // Award the bonus points
          await LeaderboardService.awardPoints(
            userId,
            'upload', // Using 'upload' action type for bonus points tracking
            `Login streak milestone: ${currentStreak} days (${bonusAwarded} bonus points)`
          );
        }
      }
      // If user missed a day, reset streak
      else {
        const previousStreak = currentStreak;
        currentStreak = 1;
        message = `Streak reset. Your previous streak was ${previousStreak} days. Starting fresh!`;
      }

      // Update longest streak if current is higher
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }

      // Update user's streak data
      await storage.updateUserStreak?.({
        userId,
        currentStreak,
        longestStreak,
        lastStreakUpdate: now
      });

      return {
        currentStreak,
        bonusAwarded,
        isNewMilestone,
        message
      };
    } catch (error) {
      console.error("Error updating login streak:", error);
      return {
        currentStreak: 0,
        bonusAwarded: 0,
        isNewMilestone: false,
        message: "Error updating streak"
      };
    }
  }

  // Get user's current streak information
  static async getUserStreak(userId: number): Promise<{
    currentStreak: number;
    longestStreak: number;
    nextMilestone: number | null;
    nextMilestoneBonus: number | null;
  }> {
    try {
      const user = await storage.getUserById(userId);
      if (!user) {
        return {
          currentStreak: 0,
          longestStreak: 0,
          nextMilestone: null,
          nextMilestoneBonus: null
        };
      }

      const currentStreak = user.currentStreak || 0;
      const longestStreak = user.longestStreak || 0;

      // Find next milestone
      const milestones = Object.keys(STREAK_BONUSES)
        .map(Number)
        .sort((a, b) => a - b);
      
      const nextMilestone = milestones.find(m => m > currentStreak) || null;
      const nextMilestoneBonus = nextMilestone 
        ? STREAK_BONUSES[nextMilestone as keyof typeof STREAK_BONUSES]
        : null;

      return {
        currentStreak,
        longestStreak,
        nextMilestone,
        nextMilestoneBonus
      };
    } catch (error) {
      console.error("Error getting user streak:", error);
      return {
        currentStreak: 0,
        longestStreak: 0,
        nextMilestone: null,
        nextMilestoneBonus: null
      };
    }
  }
}
