import { storage } from "./storage";
import { LeaderboardService } from "./leaderboard-service";
import { NotificationService } from "./notification-service";

// Per-clip view milestone thresholds and their XP rewards
const VIEW_MILESTONES: { views: number; xp: number }[] = [
  { views: 50, xp: 50 },
  { views: 100, xp: 100 },
  { views: 250, xp: 200 },
  { views: 500, xp: 400 },
  { views: 1000, xp: 800 },
  { views: 5000, xp: 1500 },
  { views: 10000, xp: 3000 },
  { views: 25000, xp: 6000 },
  { views: 50000, xp: 12000 },
  { views: 100000, xp: 24000 },
];

export function getViewMilestoneSource(views: number): string {
  return `view_milestone_${views}`;
}

// In-memory lock set to prevent race conditions where concurrent view events
// all pass the DB check before any award has been written.
// Key format: `${userId}:${clipId}:${source}`
const inFlightMilestones = new Set<string>();

export class PerformanceMilestoneService {
  static getViewMilestones(): { views: number; xp: number }[] {
    return VIEW_MILESTONES;
  }

  static async checkAndAwardViewMilestones(
    clipId: number,
    ownerId: number,
    newViewCount: number
  ): Promise<void> {
    try {
      for (const milestone of VIEW_MILESTONES) {
        if (newViewCount >= milestone.views) {
          const source = getViewMilestoneSource(milestone.views);
          const lockKey = `${ownerId}:${clipId}:${source}`;

          // Skip if another concurrent request is already processing this milestone
          if (inFlightMilestones.has(lockKey)) continue;

          const alreadyAwarded = await this.hasMilestoneBeenAwarded(ownerId, clipId, source);
          if (!alreadyAwarded) {
            inFlightMilestones.add(lockKey);
            try {
              await LeaderboardService.awardCustomPoints(
                ownerId,
                source,
                milestone.xp,
                `Clip #${clipId} reached ${milestone.views.toLocaleString()} views`,
              );
              // Notify the clip owner
              await NotificationService.createViewMilestoneNotification(
                clipId,
                ownerId,
                newViewCount,
                milestone.views
              );
            } finally {
              inFlightMilestones.delete(lockKey);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking view milestones:", error);
    }
  }

  private static async hasMilestoneBeenAwarded(
    userId: number,
    clipId: number,
    source: string
  ): Promise<boolean> {
    try {
      // Milestone awards are recorded in user_points_history (via awardCustomPoints),
      // NOT in user_xp_history. Check the correct table and match by action + clip reference.
      const history = await storage.getUserPointsHistory(userId, 9999);
      return history.some(
        (h) =>
          h.action === source &&
          (h.description ?? "").includes(`Clip #${clipId}`)
      );
    } catch {
      return false;
    }
  }
}
