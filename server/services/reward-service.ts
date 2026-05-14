import { and, eq, gte, inArray, isNull } from "drizzle-orm";
import { db } from "../db";
import { serverSettings, userRewards, users, type UserReward } from "@shared/schema";
import { LeaderboardService } from "../leaderboard-service";
import { transferGfTokens } from "../gf-token-service";

// Config is stored in the key/value `server_settings` table — same pattern as
// PSN tokens etc. Keys with sensible fallback defaults so the system has
// non-zero rewards even before an admin has touched the form.
const CONFIG_KEYS = {
  dailyXpMin: "reward_daily_xp_min",
  dailyXpMax: "reward_daily_xp_max",
  dailyGftMin: "reward_daily_gft_min",
  dailyGftMax: "reward_daily_gft_max",
  weeklyXpMin: "reward_weekly_xp_min",
  weeklyXpMax: "reward_weekly_xp_max",
  weeklyGftMin: "reward_weekly_gft_min",
  weeklyGftMax: "reward_weekly_gft_max",
  proMultiplier: "reward_pro_multiplier",
} as const;

export interface RewardConfig {
  dailyXpMin: number;
  dailyXpMax: number;
  dailyGftMin: number;
  dailyGftMax: number;
  weeklyXpMin: number;
  weeklyXpMax: number;
  weeklyGftMin: number;
  weeklyGftMax: number;
  proMultiplier: number;
}

const DEFAULT_CONFIG: RewardConfig = {
  dailyXpMin: 50,
  dailyXpMax: 150,
  dailyGftMin: 1,
  dailyGftMax: 5,
  weeklyXpMin: 500,
  weeklyXpMax: 1500,
  weeklyGftMin: 10,
  weeklyGftMax: 30,
  proMultiplier: 2,
};

export type Cadence = "daily" | "weekly";

export type ClaimError =
  | "NOT_FOUND"
  | "ALREADY_CLAIMED"
  | "EXPIRED"
  | "WALLET_REQUIRED"
  | "TRANSFER_FAILED";

export interface ClaimResult {
  reward: UserReward;
  newTotalXp?: number;
  txHash?: string;
}

// ─── Period helpers (all UTC) ────────────────────────────────────────────────

export function dailyPeriod(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function weeklyPeriod(now: Date = new Date()): string {
  // ISO week per RFC 5545 / ISO 8601: Monday is day 1, week 1 contains the
  // first Thursday of the year.
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function periodEndsAt(cadence: Cadence, now: Date = new Date()): Date {
  if (cadence === "daily") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  }
  // Weekly: next Monday 00:00 UTC
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = next.getUTCDay() || 7;
  next.setUTCDate(next.getUTCDate() + (8 - dayNum));
  return next;
}

function currentPeriod(cadence: Cadence, now: Date = new Date()): string {
  return cadence === "daily" ? dailyPeriod(now) : weeklyPeriod(now);
}

// ─── Config ──────────────────────────────────────────────────────────────────

export async function getRewardConfig(): Promise<RewardConfig> {
  const rows = await db
    .select()
    .from(serverSettings)
    .where(inArray(serverSettings.key, Object.values(CONFIG_KEYS)));
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const read = (key: string, fallback: number): number => {
    const v = byKey.get(key);
    if (v == null) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    dailyXpMin: read(CONFIG_KEYS.dailyXpMin, DEFAULT_CONFIG.dailyXpMin),
    dailyXpMax: read(CONFIG_KEYS.dailyXpMax, DEFAULT_CONFIG.dailyXpMax),
    dailyGftMin: read(CONFIG_KEYS.dailyGftMin, DEFAULT_CONFIG.dailyGftMin),
    dailyGftMax: read(CONFIG_KEYS.dailyGftMax, DEFAULT_CONFIG.dailyGftMax),
    weeklyXpMin: read(CONFIG_KEYS.weeklyXpMin, DEFAULT_CONFIG.weeklyXpMin),
    weeklyXpMax: read(CONFIG_KEYS.weeklyXpMax, DEFAULT_CONFIG.weeklyXpMax),
    weeklyGftMin: read(CONFIG_KEYS.weeklyGftMin, DEFAULT_CONFIG.weeklyGftMin),
    weeklyGftMax: read(CONFIG_KEYS.weeklyGftMax, DEFAULT_CONFIG.weeklyGftMax),
    proMultiplier: read(CONFIG_KEYS.proMultiplier, DEFAULT_CONFIG.proMultiplier),
  };
}

export async function setRewardConfig(patch: Partial<RewardConfig>): Promise<RewardConfig> {
  const now = new Date();
  const entries: { key: string; value: string }[] = [];
  for (const [field, dbKey] of Object.entries(CONFIG_KEYS) as [keyof RewardConfig, string][]) {
    const value = patch[field];
    if (value != null && Number.isFinite(value)) {
      entries.push({ key: dbKey, value: String(value) });
    }
  }
  for (const entry of entries) {
    await db
      .insert(serverSettings)
      .values({ key: entry.key, value: entry.value, updatedAt: now })
      .onConflictDoUpdate({
        target: serverSettings.key,
        set: { value: entry.value, updatedAt: now },
      });
  }
  return getRewardConfig();
}

// ─── Rolling ────────────────────────────────────────────────────────────────

function rollInt(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.floor(lo + Math.random() * (hi - lo + 1));
}

function rollDecimal(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.round((lo + Math.random() * (hi - lo)) * 100) / 100;
}

// ─── Issuance ───────────────────────────────────────────────────────────────

export async function issueReward(
  userId: number,
  cadence: Cadence,
  now: Date = new Date(),
): Promise<UserReward | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const period = currentPeriod(cadence, now);
  const existing = await db
    .select()
    .from(userRewards)
    .where(
      and(
        eq(userRewards.userId, userId),
        eq(userRewards.cadence, cadence),
        eq(userRewards.period, period),
      ),
    )
    .limit(1);
  if (existing[0]) return existing[0];

  const config = await getRewardConfig();
  const multiplier = user.isPro ? config.proMultiplier : 1;
  const xpRange =
    cadence === "daily"
      ? [config.dailyXpMin, config.dailyXpMax]
      : [config.weeklyXpMin, config.weeklyXpMax];
  const gftRange =
    cadence === "daily"
      ? [config.dailyGftMin, config.dailyGftMax]
      : [config.weeklyGftMin, config.weeklyGftMax];

  const xpAmount = Math.max(0, Math.round(rollInt(xpRange[0], xpRange[1]) * multiplier));
  const gftAmount = Math.max(0, Math.round(rollDecimal(gftRange[0], gftRange[1]) * multiplier * 100) / 100);

  const [inserted] = await db
    .insert(userRewards)
    .values({
      userId,
      cadence,
      period,
      xpAmount,
      gftAmount,
      expiresAt: periodEndsAt(cadence, now),
    })
    .onConflictDoNothing({
      target: [userRewards.userId, userRewards.cadence, userRewards.period],
    })
    .returning();

  if (inserted) return inserted;

  // Lost the insert race; another request issued it concurrently. Re-read.
  const [row] = await db
    .select()
    .from(userRewards)
    .where(
      and(
        eq(userRewards.userId, userId),
        eq(userRewards.cadence, cadence),
        eq(userRewards.period, period),
      ),
    )
    .limit(1);
  return row ?? null;
}

// ─── Read ───────────────────────────────────────────────────────────────────

export interface ActiveRewards {
  daily: UserReward | null;
  weekly: UserReward | null;
}

export async function getActiveRewards(
  userId: number,
  now: Date = new Date(),
): Promise<ActiveRewards> {
  const [daily, weekly] = await Promise.all([
    issueReward(userId, "daily", now),
    issueReward(userId, "weekly", now),
  ]);
  const isActive = (r: UserReward | null): UserReward | null => {
    if (!r) return null;
    if (r.claimedAt) return null;
    if (r.expiresAt.getTime() <= now.getTime()) return null;
    return r;
  };
  return { daily: isActive(daily), weekly: isActive(weekly) };
}

// ─── Claim ──────────────────────────────────────────────────────────────────

export async function claimReward(
  userId: number,
  rewardId: number,
  type: "xp" | "gft",
): Promise<{ ok: true; result: ClaimResult } | { ok: false; error: ClaimError }> {
  const [row] = await db
    .select()
    .from(userRewards)
    .where(and(eq(userRewards.id, rewardId), eq(userRewards.userId, userId)))
    .limit(1);
  if (!row) return { ok: false, error: "NOT_FOUND" };
  if (row.claimedAt) return { ok: false, error: "ALREADY_CLAIMED" };
  if (row.expiresAt.getTime() <= Date.now()) return { ok: false, error: "EXPIRED" };

  if (type === "xp") {
    const description = `${row.cadence === "daily" ? "Daily" : "Weekly"} reward (XP)`;
    const action = row.cadence === "daily" ? "daily_reward_xp" : "weekly_reward_xp";
    // Mark claim row BEFORE awarding to keep the conditional update atomic and
    // avoid double-claiming on duplicate requests. If the conditional update
    // affects 0 rows another request beat us.
    const updated = await db
      .update(userRewards)
      .set({ claimedAt: new Date(), claimedType: "xp", claimedAmount: row.xpAmount })
      .where(and(eq(userRewards.id, rewardId), isNull(userRewards.claimedAt)))
      .returning();
    if (updated.length === 0) return { ok: false, error: "ALREADY_CLAIMED" };
    await LeaderboardService.awardCustomPoints(userId, action, row.xpAmount, description);
    const [refreshed] = await db.select({ totalXP: users.totalXP }).from(users).where(eq(users.id, userId));
    return {
      ok: true,
      result: { reward: updated[0], newTotalXp: refreshed?.totalXP ?? undefined },
    };
  }

  // GFT path
  const [user] = await db
    .select({ walletAddress: users.walletAddress })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user?.walletAddress) return { ok: false, error: "WALLET_REQUIRED" };

  const transfer = await transferGfTokens(user.walletAddress, row.gftAmount);
  if (!transfer.success) {
    console.error("[rewards] GFT transfer failed", { userId, rewardId, error: transfer.error });
    return { ok: false, error: "TRANSFER_FAILED" };
  }

  const updated = await db
    .update(userRewards)
    .set({
      claimedAt: new Date(),
      claimedType: "gft",
      claimedAmount: row.gftAmount,
      txHash: transfer.txHash ?? null,
    })
    .where(and(eq(userRewards.id, rewardId), isNull(userRewards.claimedAt)))
    .returning();
  if (updated.length === 0) {
    // Extremely unlikely: tokens went out but a concurrent request beat us
    // to the claim row. Log loudly so it can be reconciled manually.
    console.error("[rewards] CRITICAL: GFT sent but claim row already updated", {
      userId,
      rewardId,
      txHash: transfer.txHash,
    });
    return { ok: false, error: "ALREADY_CLAIMED" };
  }
  return { ok: true, result: { reward: updated[0], txHash: transfer.txHash } };
}

// ─── Cron support: list users active recently ───────────────────────────────

export async function listRecentlyActiveUserIds(sinceDays: number): Promise<number[]> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(gte(users.lastStreakUpdate, since));
  return rows.map((r) => r.id);
}
