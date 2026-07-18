import { storage } from "./storage";
import { LeaderboardService, POINT_VALUES } from "./leaderboard-service";
import { sendPushToUser } from "./push-service";

const DAILY_LOGIN_XP = POINT_VALUES.daily_login;

// Specific milestone days and their XP bonuses
const STREAK_MILESTONES: { day: number; bonus: number }[] = [
  { day: 2, bonus: 50 },
  { day: 3, bonus: 75 },
  { day: 5, bonus: 150 },
  { day: 7, bonus: 300 },
  { day: 14, bonus: 500 },
  { day: 30, bonus: 1000 },
];

function getMilestoneBonus(streak: number): number {
  if (streak <= 0) return 0;
  // Check explicit milestones first
  const explicit = STREAK_MILESTONES.find(m => m.day === streak);
  if (explicit) return explicit.bonus;
  // Beyond 30: scale by doubling every 30 days
  if (streak > 30 && streak % 30 === 0) {
    const multiplier = Math.floor(streak / 30);
    return 1000 * Math.pow(2, multiplier - 1);
  }
  return 0;
}

export function getNextMilestone(currentStreak: number): { day: number; bonus: number } | null {
  // Check explicit milestones
  const next = STREAK_MILESTONES.find(m => m.day > currentStreak);
  if (next) return next;
  // Beyond 30
  const nextMultiple = Math.ceil((currentStreak + 1) / 30) * 30;
  if (nextMultiple > 30) {
    const multiplier = Math.floor(nextMultiple / 30);
    return { day: nextMultiple, bonus: 1000 * Math.pow(2, multiplier - 1) };
  }
  return null;
}

export { STREAK_MILESTONES };

// A claim is too soon if less than this many hours have passed since the
// last one — guards the reward regardless of which calendar day either
// timestamp falls on in any particular timezone. Kept comfortably under 24h
// so a user who logs in at a slightly earlier or later time each day isn't
// penalized, while still blocking a same-day repeat claim.
const MIN_HOURS_BETWEEN_CLAIMS = 20;
// A claim beyond this many hours since the last one breaks the streak
// instead of continuing it, giving a grace window past exactly 24h.
const MAX_HOURS_FOR_STREAK_CONTINUATION = 48;

export class StreakService {
  private static hoursBetween(earlier: Date, later: Date): number {
    return (later.getTime() - earlier.getTime()) / (60 * 60 * 1000);
  }

  static async updateLoginStreak(userId: number): Promise<{
    currentStreak: number;
    bonusAwarded: number;
    dailyXP: number;
    isNewMilestone: boolean;
    message: string;
    isFirstLogin: boolean;
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

      const isFirstLogin = !lastStreakUpdate;

      if (isFirstLogin) {
        currentStreak = 1;
        message = `Welcome! Your login streak has started!`;
      } else {
        const hoursSinceLastClaim = this.hoursBetween(lastStreakUpdate, now);

        if (hoursSinceLastClaim < MIN_HOURS_BETWEEN_CLAIMS) {
          return {
            currentStreak,
            bonusAwarded: 0,
            dailyXP: 0,
            isNewMilestone: false,
            message: "Already logged in today",
            isFirstLogin: false,
          };
        } else if (hoursSinceLastClaim <= MAX_HOURS_FOR_STREAK_CONTINUATION) {
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
      }

      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }

      // Claim this update atomically before awarding anything — if a
      // concurrent login (e.g. two auth providers firing at once) already
      // claimed it first, back off instead of double-awarding.
      const claimed = await storage.updateUserStreak?.({
        userId,
        currentStreak,
        longestStreak,
        lastStreakUpdate: now,
        expectedPreviousLastStreakUpdate: lastStreakUpdate ?? null,
      });

      if (claimed === false) {
        return {
          currentStreak: user.currentStreak || 0,
          bonusAwarded: 0,
          dailyXP: 0,
          isNewMilestone: false,
          message: "Already logged in today",
          isFirstLogin: false,
        };
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

      if (!isFirstLogin) {
        try {
          const notif = await storage.createNotification({
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
            actionUrl: '/level-tracker',
          });
          void sendPushToUser(userId, {
            title: notif.title,
            body: notif.message,
            actionUrl: notif.actionUrl,
            data: { notificationId: String(notif.id), type: notif.type },
          }).catch(err => console.warn('[streak-service] push fan-out failed:', err));
        } catch (notifError) {
          console.error("Error creating streak notification:", notifError);
        }
      }

      return {
        currentStreak,
        bonusAwarded,
        dailyXP,
        isNewMilestone,
        message,
        isFirstLogin,
      };
    } catch (error) {
      console.error("Error updating login streak:", error);
      return {
        currentStreak: 0,
        bonusAwarded: 0,
        dailyXP: 0,
        isNewMilestone: false,
        message: "Error updating streak",
        isFirstLogin: false,
      };
    }
  }

  static async getUserStreak(userId: number): Promise<{
    currentStreak: number;
    longestStreak: number;
    nextMilestone: number | null;
    nextMilestoneBonus: number | null;
    allMilestones: { day: number; bonus: number }[];
  }> {
    try {
      const user = await storage.getUserById(userId);
      if (!user) {
        return {
          currentStreak: 0,
          longestStreak: 0,
          nextMilestone: null,
          nextMilestoneBonus: null,
          allMilestones: STREAK_MILESTONES
        };
      }

      const currentStreak = user.currentStreak || 0;
      const longestStreak = user.longestStreak || 0;

      const nextMilestoneData = getNextMilestone(currentStreak);
      const nextMilestone = nextMilestoneData?.day ?? null;
      const nextMilestoneBonus = nextMilestoneData?.bonus ?? null;

      return {
        currentStreak,
        longestStreak,
        nextMilestone,
        nextMilestoneBonus: nextMilestoneBonus && nextMilestoneBonus > 0 ? nextMilestoneBonus : null,
        allMilestones: STREAK_MILESTONES
      };
    } catch (error) {
      console.error("Error getting user streak:", error);
      return {
        currentStreak: 0,
        longestStreak: 0,
        nextMilestone: null,
        nextMilestoneBonus: null,
        allMilestones: STREAK_MILESTONES
      };
    }
  }
}
