import type { QueryClient } from "@tanstack/react-query";
import type { ClipWithUser } from "@shared/schema";

export type DeletedContentType = "clip" | "screenshot";

type DeleteCacheClient = Pick<
  QueryClient,
  "setQueriesData" | "removeQueries" | "invalidateQueries"
>;

type CachedContentIdentity = Pick<ClipWithUser, "id" | "userId"> &
  Partial<Pick<ClipWithUser, "shareCode">> & {
    user?: Pick<ClipWithUser["user"], "username"> | null;
  };

function removeDeletedItem(old: unknown, deletedId: number): unknown {
  if (!old) return old;
  if (Array.isArray(old)) {
    return old.filter((item: { id?: number }) => item.id !== deletedId);
  }

  if (typeof old !== "object") return old;

  const cached = old as {
    clips?: Array<{ id?: number }>;
    screenshots?: Array<{ id?: number }>;
  };

  if (Array.isArray(cached.clips)) {
    return {
      ...cached,
      clips: cached.clips.filter((item) => item.id !== deletedId),
    };
  }

  if (Array.isArray(cached.screenshots)) {
    return {
      ...cached,
      screenshots: cached.screenshots.filter((item) => item.id !== deletedId),
    };
  }

  return old;
}

export function evictDeletedContent(
  queryClient: DeleteCacheClient,
  item: CachedContentIdentity,
  contentType: DeletedContentType,
): void {
  const username = item.user?.username;
  const listKeys = contentType === "screenshot"
    ? [
        username ? `/api/users/${username}/screenshots` : null,
        `/api/users/${item.userId}/screenshots`,
        "/api/screenshots",
        "/api/screenshots/latest",
        "/api/trending/screenshots",
      ]
    : [
        username ? `/api/users/${username}/clips` : null,
        "/api/clips",
        "/api/clips/latest",
        "/api/clips/trending",
        "/api/clips/reels/trending",
        "/api/reels",
        "/api/reels/latest",
        "/api/reels/trending",
      ];

  for (const key of listKeys) {
    if (!key) continue;
    queryClient.setQueriesData(
      { queryKey: [key] },
      (old: unknown) => removeDeletedItem(old, item.id),
    );
    void queryClient.invalidateQueries({ queryKey: [key] });
  }

  const exactKeys = contentType === "screenshot"
    ? [
        `/api/screenshots/${item.id}`,
        item.shareCode ? `/api/screenshots/share/${item.shareCode}` : null,
      ]
    : [
        `/api/clips/${item.id}`,
        item.shareCode ? `/api/clips/share/${item.shareCode}` : null,
        item.shareCode ? `/api/reels/share/${item.shareCode}` : null,
      ];

  for (const key of exactKeys) {
    if (!key) continue;
    queryClient.removeQueries({ queryKey: [key], exact: true });
  }
}
