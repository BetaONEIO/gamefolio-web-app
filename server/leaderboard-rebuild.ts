import { pool } from "./db";
import { LeaderboardService } from "./leaderboard-service";

// One-time admin repair: rebuild monthly_leaderboard and weekly_leaderboard
// from user_points_history + user_xp_history. The legacy data import inserted
// history rows but never touched the incrementally-maintained leaderboard
// cache tables, so legacy-era points are missing from the leaderboards.
//
// Uses a session advisory lock on a reserved connection (same pattern as
// legacy-import.ts) so concurrent invocations can't double-run.

const REBUILD_LOCK = 872634003;

interface PeriodAgg {
  userId: number;
  totalPoints: number;
  uploadsCount: number;
  likesGivenCount: number;
  commentsCount: number;
  firesGivenCount: number;
  viewsCount: number;
}

export interface LeaderboardRebuildResult {
  historyRowsProcessed: number;
  monthlyRowsBefore: number;
  monthlyRowsAfter: number;
  weeklyRowsBefore: number;
  weeklyRowsAfter: number;
  monthlyPointsTotal: number;
  weeklyPointsTotal: number;
}

function bump(
  map: Map<string, PeriodAgg>,
  key: string,
  userId: number,
  category: string | null,
  points: number,
) {
  let agg = map.get(key);
  if (!agg) {
    agg = {
      userId,
      totalPoints: 0,
      uploadsCount: 0,
      likesGivenCount: 0,
      commentsCount: 0,
      firesGivenCount: 0,
      viewsCount: 0,
    };
    map.set(key, agg);
  }
  agg.totalPoints += points;
  const delta = points < 0 ? -1 : 1;
  switch (category) {
    case "upload":
      agg.uploadsCount = Math.max(0, agg.uploadsCount + delta);
      break;
    case "like":
      agg.likesGivenCount = Math.max(0, agg.likesGivenCount + delta);
      break;
    case "comment":
      agg.commentsCount = Math.max(0, agg.commentsCount + delta);
      break;
    case "fire":
      agg.firesGivenCount = Math.max(0, agg.firesGivenCount + delta);
      break;
    case "view":
      agg.viewsCount = Math.max(0, agg.viewsCount + delta);
      break;
  }
}

function monthKeyOf(d: Date): { month: string; year: number } {
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return { month, year: d.getFullYear() };
}

export async function runLeaderboardRebuild(): Promise<LeaderboardRebuildResult> {
  const connection = await pool.reserve();
  let lockAcquired = false;
  try {
    const lockRows = await connection.unsafe(
      `SELECT pg_try_advisory_lock(${REBUILD_LOCK}) AS ok`,
    );
    if (!lockRows[0]?.ok) {
      throw new Error("Leaderboard rebuild already in progress");
    }
    lockAcquired = true;

    const monthly = new Map<string, PeriodAgg>();
    const weekly = new Map<string, PeriodAgg>();

    // Map an xp_history source to the count category the live updater uses.
    // Only "upload" and "view" sources correspond to countable categories;
    // like_received / fire_received etc. are received-side and don't count
    // toward the "given" columns.
    const xpSourceCategory: Record<string, string | null> = {
      upload: "upload",
      view: "view",
    };

    let processed = 0;
    const addRow = (
      userId: number,
      category: string | null,
      points: number,
      createdAt: Date,
    ) => {
      const { month, year } = monthKeyOf(createdAt);
      bump(monthly, `${userId}|${month}|${year}`, userId, category, points);
      const { week, year: wYear } = LeaderboardService.getCurrentWeek(createdAt);
      bump(weekly, `${userId}|${week}|${wYear}`, userId, category, points);
      processed++;
    };

    const before = await connection.unsafe(
      `SELECT (SELECT COUNT(*) FROM monthly_leaderboard) AS ml,
              (SELECT COUNT(*) FROM weekly_leaderboard) AS wl`,
    );

    let monthlyRowsAfter = 0;
    let weeklyRowsAfter = 0;
    let monthlyPointsTotal = 0;
    let weeklyPointsTotal = 0;

    // Reserved connections don't expose .begin(); run the transaction manually.
    // Take EXCLUSIVE locks on the history + cache tables so concurrent award
    // writes block for the few seconds the rebuild runs — otherwise an award
    // committed between our history read and our cache rewrite would be
    // silently dropped from the leaderboards. Reads are unaffected.
    const tx = connection;
    await tx.unsafe(`BEGIN`);
    try {
      await tx.unsafe(
        `LOCK TABLE user_points_history, user_xp_history,
                    monthly_leaderboard, weekly_leaderboard IN EXCLUSIVE MODE`,
      );

      const pointsRows = await tx.unsafe(
        `SELECT user_id, action, points, created_at FROM user_points_history`,
      );
      const xpRows = await tx.unsafe(
        `SELECT user_id, source, xp_amount, created_at FROM user_xp_history`,
      );
      for (const r of pointsRows) {
        addRow(
          Number(r.user_id),
          typeof r.action === "string" ? r.action : null,
          Number(r.points),
          new Date(r.created_at),
        );
      }
      for (const r of xpRows) {
        addRow(
          Number(r.user_id),
          xpSourceCategory[String(r.source)] ?? null,
          Number(r.xp_amount),
          new Date(r.created_at),
        );
      }

      await tx.unsafe(`DELETE FROM monthly_leaderboard`);
      await tx.unsafe(`DELETE FROM weekly_leaderboard`);

      const monthlyValues: any[][] = [];
      for (const [key, agg] of Array.from(monthly.entries())) {
        const [, month, year] = key.split("|");
        monthlyValues.push([
          agg.userId,
          month,
          Number(year),
          agg.uploadsCount,
          agg.likesGivenCount,
          agg.commentsCount,
          agg.firesGivenCount,
          agg.viewsCount,
          agg.totalPoints,
        ]);
        monthlyPointsTotal += agg.totalPoints;
      }
      const weeklyValues: any[][] = [];
      for (const [key, agg] of Array.from(weekly.entries())) {
        const [, week, year] = key.split("|");
        weeklyValues.push([
          agg.userId,
          week,
          Number(year),
          agg.uploadsCount,
          agg.likesGivenCount,
          agg.commentsCount,
          agg.firesGivenCount,
          agg.viewsCount,
          agg.totalPoints,
        ]);
        weeklyPointsTotal += agg.totalPoints;
      }

      const insertBatch = async (table: string, periodCol: string, values: any[][]) => {
        const chunkSize = 500;
        for (let i = 0; i < values.length; i += chunkSize) {
          const chunk = values.slice(i, i + chunkSize);
          const placeholders: string[] = [];
          const params: any[] = [];
          chunk.forEach((row, idx) => {
            const base = idx * 9;
            placeholders.push(
              `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`,
            );
            params.push(...row);
          });
          await tx.unsafe(
            `INSERT INTO ${table}
               (user_id, ${periodCol}, year, uploads_count, likes_given_count,
                comments_count, fires_given_count, views_count, total_points)
             VALUES ${placeholders.join(", ")}`,
            params,
          );
        }
      };

      await insertBatch("monthly_leaderboard", "month", monthlyValues);
      await insertBatch("weekly_leaderboard", "week", weeklyValues);

      // Recompute ranks per period
      await tx.unsafe(`
        UPDATE monthly_leaderboard m SET rank = r.rnk FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY month, year ORDER BY total_points DESC, user_id ASC
          ) AS rnk FROM monthly_leaderboard
        ) r WHERE m.id = r.id`);
      await tx.unsafe(`
        UPDATE weekly_leaderboard w SET rank = r.rnk FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY week, year ORDER BY total_points DESC, user_id ASC
          ) AS rnk FROM weekly_leaderboard
        ) r WHERE w.id = r.id`);

      monthlyRowsAfter = monthly.size;
      weeklyRowsAfter = weekly.size;
      await tx.unsafe(`COMMIT`);
    } catch (err) {
      await tx.unsafe(`ROLLBACK`).catch(() => {});
      throw err;
    }

    return {
      historyRowsProcessed: processed,
      monthlyRowsBefore: Number(before[0]?.ml ?? 0),
      monthlyRowsAfter,
      weeklyRowsBefore: Number(before[0]?.wl ?? 0),
      weeklyRowsAfter,
      monthlyPointsTotal: Math.round(monthlyPointsTotal * 100) / 100,
      weeklyPointsTotal: Math.round(weeklyPointsTotal * 100) / 100,
    };
  } finally {
    try {
      if (lockAcquired) {
        await connection.unsafe(`SELECT pg_advisory_unlock(${REBUILD_LOCK})`);
      }
    } finally {
      connection.release();
    }
  }
}
