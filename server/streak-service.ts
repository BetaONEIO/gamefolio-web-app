import { storage } from "./storage";
import { LeaderboardService, POINT_VALUES } from "./leaderboard-service";

const DAILY_LOGIN_XP = POINT_VALUES.daily_login;

const MILESTONE_INTERVAL = 5;

function getMilestoneBonus(streak: number): number {
  if (streak <= 0 || streak % MILESTONE_INTERVAL !== 0) return 0;
  const tier = streak / MILESTONE_INTERVAL;
  if (tier <= 2) return 25;
  if (tier <= 4) return 50;
  if (tier <= 6) return 100;
  if (tier <= 10) return 200;
  if (tier <= 20) return 500;
  return 1000;
}

export class StreakService {
  private static getCalendarDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private static areConsecutiveDays(date1: Date, date2: Date): boolean {
    const cal1 = this.getCalendarDate(date1);
    const cal2 = this.getCalendarDate(date2);
    const oneDay = 24 * 60 * 60 * 1000;
    const diffMs = cal2.getTime() - cal1.getTime();
    const diffDays = Math.round(diffMs / oneDay);
    return diffDays === 1;
  }

  private static isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  static async updateLoginStreak(userId: number): Promise<{
    currentStreak: number;
    bonusAwarded: number;
    dailyXP: number;
    isNewMilestone: boolean;
    message: string;
  }> {
    try {
      const user = await storage.getUserById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      const now = new Date();
      const lastStreakUpdate = user.lastStreakUpdate;
      
      let currentStreak = user.currentStreak || 0;
      let longestStreak = user.longestStreak || 0;
      let bonusAwarded = 0;
      let dailyXP = 0;
      let isNewMilestone = false;
      let message = "";

      if (!lastStreakUpdate) {
        currentStreak = 1;
        dailyXP = DAILY_LOGIN_XP;
        message = `Welcome! Your login streak has started! +${DAILY_LOGIN_XP} XP`;
      } else if (this.isSameDay(lastStreakUpdate, now)) {
        return {
          currentStreak,
          bonusAwarded: 0,
          dailyXP: 0,
          isNewMilestone: false,
          message: "Already logged in today"
        };
      } else if (this.areConsecutiveDays(lastStreakUpdate, now)) {
        currentStreak++;
        dailyXP = DAILY_LOGIN_XP;

        const milestoneBonus = getMilestoneBonus(currentStreak);
        if (milestoneBonus > 0) {
          bonusAwarded = milestoneBonus;
          isNewMilestone = true;
          message = `🎉 ${currentStreak} day streak milestone! +${DAILY_LOGIN_XP} daily XP + ${bonusAwarded} bonus XP!`;
        } else {
          message = `${currentStreak} day streak! +${DAILY_LOGIN_XP} XP. Keep going!`;
        }
      } else {
        currentStreak = 1;
        dailyXP = DAILY_LOGIN_XP;
        message = `Streak reset! Starting fresh at day 1. +${DAILY_LOGIN_XP} XP`;
      }

      await LeaderboardService.awardPoints(
        userId,
        'daily_login',
        `Daily login streak (day ${currentStreak})`
      );

      if (bonusAwarded > 0) {
        await LeaderboardService.awardCustomPoints(
          userId,
          'streak_milestone',
          bonusAwarded,
          `Login streak milestone: ${currentStreak} days (${bonusAwarded} bonus XP)`
        );
      }

      try {
        await storage.createNotification({
          userId,
          type: 'streak',
          title: isNewMilestone ? `🔥 ${currentStreak}-Day Streak Milestone!` : `🔥 Day ${currentStreak} Streak!`,
          message: isNewMilestone
            ? `You earned ${DAILY_LOGIN_XP} daily XP + ${bonusAwarded} milestone bonus XP for your ${currentStreak}-day streak!`
            : `You earned ${DAILY_LOGIN_XP} XP for logging in ${currentStreak} day${currentStreak > 1 ? 's' : ''} in a row.`,
          isRead: false,
          fromUserId: null,
          clipId: null,
          screenshotId: null,
          commentId: null,
          metadata: { streakDay: currentStreak, dailyXP, milestoneBonus: bonusAwarded },
          actionUrl: '/profile',
        });
      } catch (notifError) {
        console.error("Error creating streak notification:", notifError);
      }

      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }

      await storage.updateUserStreak?.({
        userId,
        currentStreak,
        longestStreak,
        lastStreakUpdate: now
      });

      return {
        currentStreak,
        bonusAwarded,
        dailyXP,
        isNewMilestone,
        message
      };
    } catch (error) {
      console.error("Error updating login streak:", error);
      return {
        currentStreak: 0,
        bonusAwarded: 0,
        dailyXP: 0,
        isNewMilestone: false,
        message: "Error updating streak"
      };
    }
  }

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

      const remainder = currentStreak % MILESTONE_INTERVAL;
      const nextMilestone = currentStreak + (MILESTONE_INTERVAL - remainder);
      const nextMilestoneBonus = getMilestoneBonus(nextMilestone);

      return {
        currentStreak,
        longestStreak,
        nextMilestone,
        nextMilestoneBonus: nextMilestoneBonus > 0 ? nextMilestoneBonus : null
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
