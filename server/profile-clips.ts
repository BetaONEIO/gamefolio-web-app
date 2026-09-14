import { desc, eq, getTableColumns, inArray, sql } from "drizzle-orm";
import { clips, users, games, likes, comments, clipReactions, type ClipWithUser } from "../shared/schema";
import type { db } from "./db";
import { measureStage } from "./performance";

/** Preserve the full legacy array response while replacing per-clip queries.
 * Paginated callers can supply a page bound. Aggregate batches are capped at 500.
 */
export async function loadProfileClips(queryDb: typeof db, userId: number,
  opts?: { limit: number; offset: number }): Promise<ClipWithUser[]> {
    let query = queryDb
      .select({
        ...getTableColumns(clips),
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          emailVerified: users.emailVerified,
          nftProfileTokenId: users.nftProfileTokenId,
          nftProfileImageUrl: users.nftProfileImageUrl,
        },
        game: {
          id: games.id,
          name: games.name,
          imageUrl: games.imageUrl,
          twitchId: games.twitchId,
          isApproved: games.isApproved,
          createdAt: games.createdAt,
        },
      })
      .from(clips)
      .leftJoin(users, eq(clips.userId, users.id))
      .leftJoin(games, eq(clips.gameId, games.id))
      .where(eq(clips.userId, userId))
      .orderBy(desc(clips.createdAt), desc(clips.id))
      .$dynamic();
    if (opts) query = query.limit(opts.limit).offset(opts.offset);
    const rows = await measureStage("db.profile_clips.select", () => query);


    const result: ClipWithUser[] = [];
    for (let offset = 0; offset < rows.length; offset += 500) {
      const batch = rows.slice(offset, offset + 500);
      const clipIds = batch.map(row => row.id);
      const [likesRows, commentsRows, reactionsRows] = await measureStage("db.profile_clips.counts", () => Promise.all([
        queryDb.select({ clipId: likes.clipId, count: sql<number>`count(*)` })
          .from(likes).where(inArray(likes.clipId, clipIds)).groupBy(likes.clipId),
        queryDb.select({ clipId: comments.clipId, count: sql<number>`count(*)` })
          .from(comments).where(inArray(comments.clipId, clipIds)).groupBy(comments.clipId),
        queryDb.select({ clipId: clipReactions.clipId, count: sql<number>`count(*)` })
          .from(clipReactions).where(inArray(clipReactions.clipId, clipIds)).groupBy(clipReactions.clipId),
      ]));

      const likesMap = new Map(likesRows.map((r) => [r.clipId, Number(r.count)]));
      const commentsMap = new Map(commentsRows.map((r) => [r.clipId, Number(r.count)]));
      const reactionsMap = new Map(reactionsRows.map((r) => [r.clipId, Number(r.count)]));

      const clipsWithDetails: ClipWithUser[] = batch.map((row) => {
        const { user, game, ...clipData } = row;
        return {
          ...clipData,
          user: user?.id ? { ...user } : null,
          game: game?.id ? { ...game } : null,
          _count: {
            likes: likesMap.get(row.id) || 0,
            comments: commentsMap.get(row.id) || 0,
            reactions: reactionsMap.get(row.id) || 0,
          },
        } as ClipWithUser;
      });

      result.push(...clipsWithDetails);
    }
    return result;
}
