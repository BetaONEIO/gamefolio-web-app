import cron from "node-cron";
import * as RewardService from "./services/reward-service";
import { createAndPush } from "./notification-service";

// How far back "active" goes when deciding who to issue rewards to and ping.
// 30 days lines up with the existing streak / last-login cadence and avoids
// resurrecting dormant accounts with daily push spam.
const ACTIVE_DAYS = 30;

async function tickCadence(cadence: RewardService.Cadence) {
  const tag = cadence === "daily" ? "[reward-scheduler:daily]" : "[reward-scheduler:weekly]";
  try {
    const userIds = await RewardService.listRecentlyActiveUserIds(ACTIVE_DAYS);
    console.log(`${tag} issuing to ${userIds.length} users`);
    let issued = 0;
    let pushed = 0;
    for (const userId of userIds) {
      try {
        const row = await RewardService.issueReward(userId, cadence);
        if (!row) continue;
        issued++;
        await createAndPush({
          userId,
          type: "reward_available",
          title: cadence === "daily" ? "Daily reward ready" : "Weekly reward ready",
          message:
            cadence === "daily"
              ? `Claim ${row.xpAmount} XP or ${row.gftAmount} GFT before it expires.`
              : `Your weekly reward is here — ${row.xpAmount} XP or ${row.gftAmount} GFT.`,
          actionUrl: cadence === "daily" ? "/?reward=daily" : "/?reward=weekly",
        });
        pushed++;
      } catch (err) {
        console.error(`${tag} failed for user ${userId}:`, err);
      }
    }
    console.log(`${tag} done — issued=${issued} pushed=${pushed}`);
  } catch (err) {
    console.error(`${tag} run failed:`, err);
  }
}

let started = false;
export function startRewardScheduler(): void {
  if (started) return;
  started = true;
  // Daily: 00:00 UTC every day
  cron.schedule("0 0 * * *", () => void tickCadence("daily"), { timezone: "UTC" });
  // Weekly: 00:00 UTC Monday
  cron.schedule("0 0 * * 1", () => void tickCadence("weekly"), { timezone: "UTC" });
  console.log("[reward-scheduler] started — daily 00:00 UTC, weekly Mon 00:00 UTC");
}

// Exposed for admin/debug routes if we ever want to trigger a backfill.
export async function runRewardTickNow(cadence: RewardService.Cadence): Promise<void> {
  await tickCadence(cadence);
}
