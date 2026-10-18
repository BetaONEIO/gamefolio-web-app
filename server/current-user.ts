import { measureStage } from './performance';
export const STREAK_CLAIM_INTERVAL_MS = 20 * 60 * 60 * 1000;
export type StreakResult = {
  currentStreak: number; bonusAwarded: number; dailyXP: number;
  isNewMilestone: boolean; message: string; isFirstLogin: boolean;
};
/** Due claims remain awaited: an in-memory background task could lose rewards
 * on restart. A recent claim needs only one fresh read, with no reward work. */
export async function loadCurrentUser<T extends {
  lastStreakUpdate: Date | null; currentStreak: number | null;
}>(userId: number, impersonating: boolean, dependencies: {
  getUser: (id: number) => Promise<T | null>;
  updateStreak: (id: number) => Promise<StreakResult>;
}, now = Date.now()): Promise<{ user: T | null; streakInfo: StreakResult | null }> {
  const user = await measureStage('db.user.lookup', () => dependencies.getUser(userId));
  if (!user || impersonating) return { user, streakInfo: null };
  const lastClaim = user.lastStreakUpdate?.getTime();
  if (lastClaim !== undefined && now - lastClaim < STREAK_CLAIM_INTERVAL_MS) {
    return { user, streakInfo: { currentStreak: user.currentStreak || 0,
      bonusAwarded: 0, dailyXP: 0, isNewMilestone: false,
      message: 'Already logged in today', isFirstLogin: false } };
  }
  const streakInfo = await measureStage('streak.update', () => dependencies.updateStreak(userId));
  const refreshed = await measureStage('db.user.refresh', () => dependencies.getUser(userId));
  return { user: refreshed ?? user, streakInfo };
}
