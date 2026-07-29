/**
 * One-time legacy data import.
 *
 * This project was remixed from another project whose database kept evolving
 * until the cutover on 2026-07-29. This module merges the data that the old
 * (previously live) app accumulated after the remix snapshot into the current
 * database, WITHOUT touching rows created since the new app went live.
 *
 * Strategy per table:
 * - Identity-preserving tables (games, users, clips, comments): other rows
 *   reference their ids, so we keep the dump id when it is free. If the id is
 *   already taken by a DIFFERENT row (created post-cutover), we insert with a
 *   fresh id and remap all dependent foreign keys in the payload.
 * - Append-only tables (likes, follows, reactions, notifications, points/XP
 *   history): ids are not referenced elsewhere, so we always insert with a
 *   fresh id and dedupe on a natural key.
 *
 * The payload (server/data/legacy-import.json.gz) was extracted from the old
 * project's pg_dump. All values are COPY text form (strings or null) and rely
 * on PostgreSQL input coercion for the target column types.
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { sql } from "drizzle-orm";
import { pool as pg } from "./db";

type TableData = { columns: string[]; rows: (string | null)[][] };
type Payload = Record<string, TableData> & { ambassador_usernames?: string[] };

const asRows = (r: any): any[] => (Array.isArray(r) ? r : r?.rows ?? []);

// quote an identifier defensively (payload is trusted, but be safe)
const qi = (name: string) => `"${name.replace(/"/g, '""')}"`;

export async function runLegacyImport(db: any) {
  const file = path.resolve(process.cwd(), "server/data/legacy-import.json.gz");
  if (!fs.existsSync(file)) {
    throw new Error("legacy-import payload not found: " + file);
  }
  const payload: Payload = JSON.parse(
    zlib.gunzipSync(fs.readFileSync(file)).toString("utf8"),
  );

  // Only one import may run at a time (double-clicks, concurrent admins).
  const lock = await pg.unsafe(`SELECT pg_try_advisory_lock(872634001) AS ok`);
  if (!lock?.[0]?.ok) {
    throw new Error("A legacy import is already running — try again later.");
  }
  try {
    return await doImport(payload);
  } finally {
    await pg.unsafe(`SELECT pg_advisory_unlock(872634001)`);
  }
}

async function doImport(payload: Payload) {
  const db = (await import("./db")).db;

  // old id -> current id, per identity table
  const remap: Record<string, Map<string, string>> = {
    games: new Map(),
    users: new Map(),
    clips: new Map(),
    comments: new Map(),
  };
  const mapped = (table: string, v: string | null) =>
    v == null ? null : remap[table]?.get(v) ?? v;

  const report: Record<string, { inserted: number; skipped: number; remapped: number; errors: number }> = {};
  const track = (t: string) => (report[t] ??= { inserted: 0, skipped: 0, remapped: 0, errors: 0 });

  const insertRow = async (
    table: string,
    columns: string[],
    values: (string | null)[],
    withId: boolean,
  ): Promise<string | null> => {
    const cols: string[] = [];
    const vals: (string | null)[] = [];
    for (let i = 0; i < columns.length; i++) {
      if (!withId && columns[i] === "id") continue;
      cols.push(qi(columns[i]));
      vals.push(values[i]);
    }
    // parameterized insert via the postgres-js session (drizzle sql.raw cannot bind params)
    const res = await pg.unsafe(
      `INSERT INTO ${qi(table)} (${cols.join(",")}) VALUES (${vals
        .map((_, i) => `$${i + 1}`)
        .join(",")}) RETURNING id`,
      vals,
    );
    return res?.[0]?.id != null ? String(res[0].id) : null;
  };

  // Identity-preserving merge. naturalKeyCols values are read from the row
  // (after FK remap) and used to detect "same row already present".
  const mergeIdentity = async (
    table: string,
    data: TableData,
    naturalKeys: string[][], // alternative key sets, tried in order
    fkRemap: Record<string, string>, // column -> referenced table
  ) => {
    const r = track(table);
    const colIdx = Object.fromEntries(data.columns.map((c, i) => [c, i]));
    for (const raw of data.rows) {
      const row = [...raw];
      for (const [col, refTable] of Object.entries(fkRemap)) {
        if (colIdx[col] != null) row[colIdx[col]] = mapped(refTable, row[colIdx[col]]);
      }
      const oldId = raw[colIdx.id]!;
      try {
        // does a row with any of the natural keys already exist?
        let existingId: string | null = null;
        for (const keyCols of naturalKeys) {
          const nkWhere = keyCols
            .map((c, i) => `${qi(c)} IS NOT DISTINCT FROM $${i + 1}`)
            .join(" AND ");
          const nkVals = keyCols.map((c) => row[colIdx[c]]);
          // skip all-null keys (e.g. users without email)
          if (nkVals.every((v) => v == null)) continue;
          const byNk = await pg.unsafe(
            `SELECT id FROM ${qi(table)} WHERE ${nkWhere} LIMIT 1`,
            nkVals,
          );
          if (byNk.length) { existingId = String(byNk[0].id); break; }
        }
        if (existingId != null) {
          remap[table].set(oldId, existingId);
          r.skipped++;
          continue;
        }
        // natural key absent -> we need to insert. Is the dump id free?
        const byId = await pg.unsafe(`SELECT id FROM ${qi(table)} WHERE id = $1`, [oldId]);
        if (byId.length) {
          // id taken by a different (post-cutover) row: insert with fresh id
          const newId = await insertRow(table, data.columns, row, false);
          remap[table].set(oldId, newId!);
          r.inserted++;
          r.remapped++;
        } else {
          // the dump id looks free, but a concurrent live insert can grab it
          // between check and insert — fall back to a fresh id on collision
          try {
            await insertRow(table, data.columns, row, true);
            remap[table].set(oldId, oldId);
            r.inserted++;
          } catch (e: any) {
            if (e?.code === "23505") {
              const newId = await insertRow(table, data.columns, row, false);
              remap[table].set(oldId, newId!);
              r.inserted++;
              r.remapped++;
            } else {
              throw e;
            }
          }
        }
      } catch (e) {
        r.errors++;
        console.error(`legacy-import ${table} id=${oldId}:`, (e as Error).message);
      }
    }
  };

  // Append-only merge: dedupe on natural key, always insert without id.
  const mergeAppend = async (
    table: string,
    data: TableData,
    naturalKeyCols: string[],
    fkRemap: Record<string, string>,
  ) => {
    const r = track(table);
    const colIdx = Object.fromEntries(data.columns.map((c, i) => [c, i]));
    for (const raw of data.rows) {
      const row = [...raw];
      for (const [col, refTable] of Object.entries(fkRemap)) {
        if (colIdx[col] != null) row[colIdx[col]] = mapped(refTable, row[colIdx[col]]);
      }
      try {
        const nkWhere = naturalKeyCols
          .map((c, i) => `${qi(c)} IS NOT DISTINCT FROM $${i + 1}`)
          .join(" AND ");
        const nkVals = naturalKeyCols.map((c) => row[colIdx[c]]);
        const exists = await pg.unsafe(
          `SELECT 1 FROM ${qi(table)} WHERE ${nkWhere} LIMIT 1`,
          nkVals,
        );
        if (exists.length) {
          r.skipped++;
          continue;
        }
        await insertRow(table, data.columns, row, false);
        r.inserted++;
      } catch (e) {
        r.errors++;
        console.error(`legacy-import ${table}:`, (e as Error).message);
      }
    }
  };

  const allTables = [
    "games", "users", "clips", "comments", "comment_likes", "likes",
    "clip_reactions", "follows", "notifications",
    "user_points_history", "user_xp_history",
  ];

  // Fix sequences BEFORE inserting: several sequences historically fell behind
  // max(id), and fresh-id inserts would collide with existing rows.
  const fixSequences = async () => {
    for (const t of allTables) {
      await db.execute(sql.raw(
        `SELECT setval(pg_get_serial_sequence('${t}', 'id'),
          GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${qi(t)}), 1))`,
      ));
    }
  };
  await fixSequences();

  // ---- merge, in FK dependency order ----
  await mergeIdentity("games", payload.games, [["name"]], {});
  // NOTE: users.referred_by holds a referral CODE string, not a user id — no remap.
  await mergeIdentity("users", payload.users, [["username"], ["email"]], {});
  await mergeIdentity("clips", payload.clips, [["share_code"]], {
    user_id: "users",
    game_id: "games",
  });
  await mergeIdentity(
    "comments",
    payload.comments,
    [["user_id", "clip_id", "created_at"]],
    { user_id: "users", clip_id: "clips" },
  );
  await mergeAppend("comment_likes", payload.comment_likes, ["comment_id", "user_id"], {
    comment_id: "comments",
    user_id: "users",
  });
  await mergeAppend("likes", payload.likes, ["user_id", "clip_id"], {
    user_id: "users",
    clip_id: "clips",
  });
  await mergeAppend(
    "clip_reactions",
    payload.clip_reactions,
    ["user_id", "clip_id", "emoji", "created_at"],
    { user_id: "users", clip_id: "clips" },
  );
  await mergeAppend("follows", payload.follows, ["follower_id", "following_id"], {
    follower_id: "users",
    following_id: "users",
  });
  await mergeAppend(
    "notifications",
    payload.notifications,
    ["user_id", "type", "created_at"],
    { user_id: "users", from_user_id: "users", clip_id: "clips", comment_id: "comments" },
  );
  await mergeAppend(
    "user_points_history",
    payload.user_points_history,
    ["user_id", "action", "points", "created_at"],
    { user_id: "users" },
  );
  await mergeAppend(
    "user_xp_history",
    payload.user_xp_history,
    ["user_id", "source", "xp_amount", "created_at", "clip_id"],
    { user_id: "users", clip_id: "clips" },
  );

  // ---- restore ambassador flags ----
  let ambassadorsFlagged = 0;
  for (const username of payload.ambassador_usernames ?? []) {
    const res = await pg.unsafe(
      `UPDATE users SET is_ambassador = true WHERE username = $1 AND is_ambassador = false RETURNING id`,
      [username],
    );
    ambassadorsFlagged += res.length;
  }

  // ---- re-fix sequences after inserting identity-preserved ids ----
  await fixSequences();

  // ---- recompute totals + levels from both ledgers (same as repair) ----
  const drifted = asRows(await db.execute(sql`
    UPDATE users u
    SET total_xp = h.hist
    FROM (
      SELECT u2.id AS user_id,
             COALESCE(p.pts, 0) + COALESCE(x.xp, 0) AS hist
      FROM users u2
      LEFT JOIN (
        SELECT user_id, SUM(points) AS pts FROM user_points_history GROUP BY user_id
      ) p ON p.user_id = u2.id
      LEFT JOIN (
        SELECT user_id, SUM(xp_amount) AS xp FROM user_xp_history GROUP BY user_id
      ) x ON x.user_id = u2.id
    ) h
    WHERE h.user_id = u.id
      AND ABS(u.total_xp - h.hist) > 1
    RETURNING u.id, u.username, u.total_xp, u.level
  `));
  const { calculateLevel } = await import("./level-system");
  let levelsUpdated = 0;
  for (const row of drifted) {
    const newLevel = calculateLevel(Number(row.total_xp));
    if (newLevel !== Number(row.level)) {
      await db.execute(sql`UPDATE users SET level = ${newLevel} WHERE id = ${row.id}`);
      levelsUpdated++;
    }
  }

  return { tables: report, ambassadorsFlagged, xpTotalsRecomputed: drifted.length, levelsUpdated };
}
