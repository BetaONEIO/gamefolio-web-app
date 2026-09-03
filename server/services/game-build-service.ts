/**
 * Quota accounting and subscription-lifecycle handling for hosted game builds.
 *
 * Kept out of the route file because two of these are called from Stripe and
 * RevenueCat webhooks rather than from a request: when a Game Developer
 * subscription lapses, the downloads it was paying for have to stop being
 * public, and when it comes back they have to return.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import {
  BILLABLE_BUILD_STATUSES,
  LAPSED_RETENTION_DAYS,
  type BuildQuota,
  type QuotaUsage,
} from "@shared/game-builds";
import { buildRootPrefix, deletePrefix, isR2Configured } from "../r2-storage";

/**
 * `status IN (…)` with one bound parameter per value. Postgres array binding
 * for `= ANY($1)` is driver-specific; an explicit list behaves the same on any
 * of them, and quota accounting silently returning 0 would be an expensive way
 * to discover the difference.
 */
const BILLABLE_STATUS_LIST = sql.join(
  BILLABLE_BUILD_STATUSES.map((status) => sql`${status}`),
  sql`, `,
);

/** db.execute() return shape differs by driver — normalize to a plain array. */
function rowsOf(result: unknown): any[] {
  return ((result as any).rows ?? result) as any[];
}

/**
 * Bytes a user is currently holding. Reads stored_bytes where known and falls
 * back to the declared size, because a web build's expanded tree is what
 * actually occupies R2 — not the archive that was uploaded.
 */
export async function getAccountUsedBytes(userId: number): Promise<number> {
  const result = await db.execute(sql`
    SELECT COALESCE(SUM(COALESCE(stored_bytes, size_bytes)), 0)::bigint AS "usedBytes"
    FROM game_builds
    WHERE user_id = ${userId}
      AND status IN (${BILLABLE_STATUS_LIST})
  `);
  return Number(rowsOf(result)[0]?.usedBytes ?? 0);
}

export async function getBuildCountForGame(profileId: number): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS "count"
    FROM game_builds
    WHERE profile_id = ${profileId}
      AND status IN (${BILLABLE_STATUS_LIST})
  `);
  return Number(rowsOf(result)[0]?.count ?? 0);
}

export async function getQuotaUsage(userId: number, profileId: number): Promise<QuotaUsage> {
  const [usedBytes, buildsOnGame] = await Promise.all([
    getAccountUsedBytes(userId),
    getBuildCountForGame(profileId),
  ]);
  return { usedBytes, buildsOnGame };
}

export interface QuotaSummary extends QuotaUsage {
  quota: BuildQuota;
  remainingBytes: number;
}

export function summariseQuota(usage: QuotaUsage, quota: BuildQuota): QuotaSummary {
  return {
    ...usage,
    quota,
    remainingBytes: Math.max(0, quota.accountBytes - usage.usedBytes),
  };
}

/**
 * Called when a Game Developer subscription ends.
 *
 * Downloadable builds stop being public immediately — that capability is what
 * was being paid for. Browser-playable builds are left alone because they are
 * available on the free tier too, so pulling them would be taking away
 * something the developer never needed to pay for.
 *
 * Bytes are NOT deleted here. The build stays recoverable for
 * LAPSED_RETENTION_DAYS so an expired card is an inconvenience rather than the
 * loss of someone's only hosted copy.
 */
export async function hideBuildsForLapsedSubscriber(userId: number): Promise<number> {
  const result = await db.execute(sql`
    UPDATE game_builds
    SET hidden_at = now(),
        hidden_reason = 'subscription_lapsed',
        updated_at = now()
    WHERE user_id = ${userId}
      AND build_type = 'download'
      AND hidden_at IS NULL
      AND status IN ('approved', 'pending_review')
    RETURNING id
  `);
  const hidden = rowsOf(result).length;
  if (hidden > 0) {
    console.log(`[GameBuilds] Hid ${hidden} downloadable build(s) for lapsed subscriber ${userId}`);
  }
  return hidden;
}

/** Called when the subscription resumes — undoes the above, nothing more. */
export async function restoreBuildsForSubscriber(userId: number): Promise<number> {
  const result = await db.execute(sql`
    UPDATE game_builds
    SET hidden_at = NULL,
        hidden_reason = NULL,
        updated_at = now()
    WHERE user_id = ${userId}
      AND hidden_reason = 'subscription_lapsed'
    RETURNING id
  `);
  const restored = rowsOf(result).length;
  if (restored > 0) {
    console.log(`[GameBuilds] Restored ${restored} build(s) for resubscribed user ${userId}`);
  }
  return restored;
}

/**
 * Deletes the R2 objects for builds hidden longer than the retention window,
 * then marks the rows removed so they stop counting against quota.
 *
 * Rows are only marked removed once the objects are actually gone. Doing it the
 * other way round is how the Supabase bucket ended up with ~35GB of orphans
 * that nothing referenced and nothing could find.
 */
export async function purgeExpiredHiddenBuilds(): Promise<{ purged: number; failed: number }> {
  if (!isR2Configured()) return { purged: 0, failed: 0 };

  const result = await db.execute(sql`
    SELECT id, user_id AS "userId"
    FROM game_builds
    WHERE hidden_at IS NOT NULL
      AND hidden_at < now() - make_interval(days => ${LAPSED_RETENTION_DAYS})
      AND status IN (${BILLABLE_STATUS_LIST})
  `);

  let purged = 0;
  let failed = 0;
  for (const row of rowsOf(result)) {
    try {
      await deletePrefix(buildRootPrefix(Number(row.userId), Number(row.id)));
      await db.execute(sql`
        UPDATE game_builds
        SET status = 'removed', stored_bytes = 0, updated_at = now()
        WHERE id = ${row.id}
      `);
      purged += 1;
    } catch (err) {
      failed += 1;
      console.error(`[GameBuilds] Failed to purge build ${row.id}:`, err);
    }
  }
  if (purged || failed) {
    console.log(`[GameBuilds] Retention sweep: purged ${purged}, failed ${failed}`);
  }
  return { purged, failed };
}
