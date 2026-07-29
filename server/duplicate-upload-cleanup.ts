/**
 * Admin-run cleanup for duplicate upload records created by the legacy merge.
 *
 * Only clip rows with the same owner, media, metadata, type, game, and
 * creation timestamp are considered duplicates. The retained row is the one
 * with the greatest view count (then the lowest id). All known clip
 * references are remapped before redundant rows are deleted. Profile banner
 * rows are retained; only older active rows are deactivated.
 */
import { pool } from "./db";

const DUPLICATE_LOCK = 872634002;

type ClipRow = {
  id: number;
  user_id: number;
  game_id: number | null;
  title: string | null;
  description: string | null;
  video_url: string;
  video_type: string | null;
  created_at: string;
  views: number;
};

export async function runDuplicateUploadCleanup() {
  const connection = await pool.reserve();
  let lockAcquired = false;
  try {
    const lock = await connection.unsafe(
      `SELECT pg_try_advisory_lock(${DUPLICATE_LOCK}) AS ok`,
    );
    if (!lock?.[0]?.ok) {
      throw new Error("A duplicate-upload cleanup is already running.");
    }
    lockAcquired = true;

    await connection.unsafe("BEGIN");
    try {
      const bannerResult = await connection.unsafe(`
        WITH ranked AS (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY user_id
                   ORDER BY is_active DESC, created_at DESC, id DESC
                 ) AS rn
          FROM uploaded_banners
          WHERE is_active IS TRUE
        )
        UPDATE uploaded_banners b
        SET is_active = false
        FROM ranked r
        WHERE b.id = r.id AND r.rn > 1
        RETURNING b.id, b.user_id
      `);

      const rows = (await connection.unsafe(`
        SELECT id, user_id, game_id, title, description, video_url,
               video_type, created_at, COALESCE(views, 0) AS views
        FROM clips
        WHERE video_url IS NOT NULL AND video_url <> ''
        ORDER BY user_id, video_url, title, description, video_type,
                 game_id, created_at, views DESC, id
      `)) as ClipRow[];

      const groups = new Map<string, ClipRow[]>();
      for (const row of rows) {
        const key = JSON.stringify([
          row.user_id,
          row.game_id,
          row.title,
          row.description,
          row.video_url,
          row.video_type,
          row.created_at,
        ]);
        const group = groups.get(key) ?? [];
        group.push(row);
        groups.set(key, group);
      }

      const duplicateGroups: Array<{ keepId: number; removedIds: number[] }> = [];
      for (const group of Array.from(groups.values())) {
        if (group.length < 2) continue;
        group.sort(
          (a: ClipRow, b: ClipRow) =>
            Number(b.views) - Number(a.views) || a.id - b.id,
        );
        duplicateGroups.push({
          keepId: group[0].id,
          removedIds: group.slice(1).map((row: ClipRow) => row.id),
        });
      }

      const referenceTables = [
        "clip_mentions",
        "clip_reactions",
        "clip_reports",
        "comments",
        "likes",
        "notifications",
        "user_xp_history",
      ];
      const referencesRemapped: Record<string, number> = {};
      for (const table of referenceTables) referencesRemapped[table] = 0;

      for (const group of duplicateGroups) {
        for (const table of referenceTables) {
          const result = await connection.unsafe(
            `UPDATE "${table}" SET clip_id = $1
             WHERE clip_id = ANY($2::int[])`,
            [group.keepId, group.removedIds],
          );
          referencesRemapped[table] += result.count ?? 0;
        }
        await connection.unsafe(
          `DELETE FROM "clips" WHERE id = ANY($1::int[])`,
          [group.removedIds],
        );
      }

      await connection.unsafe("COMMIT");
      return {
        bannersDeactivated: bannerResult.length,
        duplicateGroups: duplicateGroups.length,
        clipsRemoved: duplicateGroups.reduce(
          (total, group) => total + group.removedIds.length,
          0,
        ),
        referencesRemapped,
      };
    } catch (error) {
      await connection.unsafe("ROLLBACK");
      throw error;
    }
  } finally {
    if (lockAcquired) {
      await connection.unsafe(
        `SELECT pg_advisory_unlock(${DUPLICATE_LOCK})`,
      );
    }
    await connection.release();
  }
}