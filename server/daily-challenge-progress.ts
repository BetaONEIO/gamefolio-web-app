import { sql } from "drizzle-orm";
import type { db } from "./db";

type DailyChallengeProgress = {
  clipsWatchedToday: number;
  watch5Done: boolean;
  watch20Done: boolean;
  commentedToday: boolean;
  likedToday: boolean;
  sharedToday: boolean;
  lootboxOpenedToday: boolean;
  loginXPToday: number;
  streakBonusToday: number;
};

export async function getDailyChallengeProgress(queryDb: Pick<typeof db, "execute">, userId: number, now = new Date()) {
  // Keep the same server-calendar day as the daily challenge widget.
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const from = start.toISOString();
  const until = end.toISOString();

  const [progress] = await queryDb.execute<DailyChallengeProgress>(sql`
    SELECT (
      SELECT CAST(COUNT(*) AS integer) FROM user_xp_history
      WHERE user_id = ${userId} AND source = 'watch_clip_counted'
        AND created_at >= ${from} AND created_at < ${until}
    ) AS "clipsWatchedToday",
    COUNT(*) FILTER (WHERE action = 'watch_5_clips') > 0 AS "watch5Done",
    COUNT(*) FILTER (WHERE action = 'watch_20_clips') > 0 AS "watch20Done",
    COUNT(*) FILTER (WHERE action = 'comment') > 0 AS "commentedToday",
    COUNT(*) FILTER (WHERE action = 'like') > 0 AS "likedToday",
    COUNT(*) FILTER (WHERE action = 'share_given') > 0 AS "sharedToday",
    COUNT(*) FILTER (WHERE action = 'lootbox_bonus') > 0 AS "lootboxOpenedToday",
    COALESCE(SUM(CAST(points AS double precision)) FILTER (WHERE action = 'daily_login'), 0) AS "loginXPToday",
    COALESCE(SUM(CAST(points AS double precision)) FILTER (WHERE action = 'streak_milestone'), 0) AS "streakBonusToday"
    FROM user_points_history
    WHERE user_id = ${userId} AND created_at >= ${from} AND created_at < ${until}
  `);
  return progress;
}
