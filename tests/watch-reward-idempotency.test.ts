import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

process.env.DATABASE_URL ??= "postgres://watch-reward-test.invalid/gamefolio";
process.env.SUPABASE_URL ??= "https://watch-reward-test.invalid";
process.env.SUPABASE_ANON_KEY ??= "watch-reward-test-key";

const { storage } = await import("../server/storage");
const { LeaderboardService } = await import("../server/leaderboard-service");

test("concurrent once-only awards update totals and caches exactly once", async () => {
  const storageAny = storage as any;
  const serviceAny = LeaderboardService as any;
  const originals = {
    addUserPointsHistoryIfAbsent: storageAny.addUserPointsHistoryIfAbsent,
    incrementUserPoints: storageAny.incrementUserPoints,
    updateUserLevel: serviceAny.updateUserLevel,
    updateMonthlyLeaderboard: serviceAny.updateMonthlyLeaderboard,
    updateWeeklyLeaderboard: serviceAny.updateWeeklyLeaderboard,
  };

  let claimed = false;
  let historyAttempts = 0;
  let totalUpdates = 0;
  let levelUpdates = 0;
  let monthlyUpdates = 0;
  let weeklyUpdates = 0;

  storageAny.addUserPointsHistoryIfAbsent = async (row: any) => {
    historyAttempts += 1;
    if (claimed) return null;
    claimed = true;
    return { id: 1, createdAt: new Date(), ...row };
  };
  storageAny.incrementUserPoints = async () => { totalUpdates += 1; };
  serviceAny.updateUserLevel = async () => { levelUpdates += 1; };
  serviceAny.updateMonthlyLeaderboard = async () => { monthlyUpdates += 1; };
  serviceAny.updateWeeklyLeaderboard = async () => { weeklyUpdates += 1; };

  try {
    const results = await Promise.all(
      Array.from({ length: 32 }, () =>
        LeaderboardService.awardCustomPointsIfAbsent(
          42,
          "watch_20_clips",
          30,
          "Watched 20 clips today!",
        ),
      ),
    );

    assert.equal(historyAttempts, 32);
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(totalUpdates, 1);
    assert.equal(levelUpdates, 1);
    assert.equal(monthlyUpdates, 1);
    assert.equal(weeklyUpdates, 1);
  } finally {
    storageAny.addUserPointsHistoryIfAbsent = originals.addUserPointsHistoryIfAbsent;
    storageAny.incrementUserPoints = originals.incrementUserPoints;
    serviceAny.updateUserLevel = originals.updateUserLevel;
    serviceAny.updateMonthlyLeaderboard = originals.updateMonthlyLeaderboard;
    serviceAny.updateWeeklyLeaderboard = originals.updateWeeklyLeaderboard;
  }
});

test("repair migration archives duplicates before deleting and installs the daily unique guard", async () => {
  const migration = await readFile(
    new URL("../migrations/0034_dedupe_daily_watch_rewards.sql", import.meta.url),
    "utf8",
  );

  const archiveAt = migration.indexOf('INSERT INTO "user_points_history_duplicate_archive"');
  const deleteAt = migration.indexOf('DELETE FROM "user_points_history"');
  const uniqueIndexAt = migration.indexOf('CREATE UNIQUE INDEX IF NOT EXISTS "user_points_history_watch_daily_unique"');

  assert.ok(archiveAt >= 0, "expected an audit archive insert");
  assert.ok(deleteAt > archiveAt, "duplicates must be archived before deletion");
  assert.ok(uniqueIndexAt > deleteAt, "the unique index must be installed after cleanup");
  assert.match(migration, /PARTITION BY h\."user_id", h\."action", h\."created_at"::date/);
  assert.match(migration, /WHERE award_number > 1/);
  assert.match(migration, /AND "points" > 0/);
});
