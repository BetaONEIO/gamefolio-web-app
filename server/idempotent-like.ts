import { sql, type SQL } from "drizzle-orm";

export type ContentLikeNamespace = "clip_like" | "screenshot_like";

/**
 * Transaction-scoped lock for one account/content pair.
 *
 * The lock does not depend on a unique index. Production likes were inserted
 * with ON CONFLICT before migration 0033 created that index, and Postgres
 * rejects ON CONFLICT when no matching constraint exists.
 */
export function likePairLock(namespace: ContentLikeNamespace, userId: number, contentId: number): SQL {
  return sql`SELECT pg_advisory_xact_lock(hashtext(${namespace}), hashtext(${`${userId}:${contentId}`}))`;
}

export async function insertLikeOnce<T>(ops: {
  findExisting: () => Promise<T | undefined>;
  insert: () => Promise<T>;
}): Promise<T> {
  const existing = await ops.findExisting();
  if (existing) return existing;
  return ops.insert();
}

type LikeClient = {
  execute(query: SQL): Promise<unknown>;
  transaction<T>(fn: (tx: LikeClient) => Promise<T>): Promise<T>;
};

/**
 * Insert a like if this account has none for the content yet.
 *
 * Existing duplicate rows are left in place so like counts do not change on
 * the request path. A later migration can collapse those duplicates.
 * `find` and `insert` receive the transaction client while the advisory lock
 * is held, and `find` again on the outer client if a unique index rejects
 * the insert after the transaction aborts.
 */
export async function createIdempotentLike<T, Client extends LikeClient>(
  executor: Client,
  options: {
    namespace: ContentLikeNamespace;
    userId: number;
    contentId: number;
    find: (tx: Client) => Promise<T | undefined>;
    insert: (tx: Client) => Promise<T>;
  },
): Promise<T> {
  try {
    return await executor.transaction(async (tx) => {
      const client = tx as Client;
      await client.execute(likePairLock(options.namespace, options.userId, options.contentId));
      return insertLikeOnce({
        findExisting: () => options.find(client),
        insert: () => options.insert(client),
      });
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    // The unique index may already exist. A conflict means the row is there;
    // return it instead of failing the like.
    const existing = await options.find(executor);
    if (!existing) throw error;
    return existing;
  }
}

export function isUniqueViolation(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if ((current as { code?: unknown }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
