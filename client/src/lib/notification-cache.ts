import type { QueryClient } from "@tanstack/react-query";

export const notificationsQueryKey = ["/api/notifications"] as const;
export const notificationUnreadCountQueryKey = ["/api/notifications/unread-count"] as const;

/**
 * Keep every notification surface in sync after a bulk delete without issuing
 * an immediate GET that can restore a response started before the DELETE.
 */
export async function clearNotificationCaches(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: notificationsQueryKey }),
    queryClient.cancelQueries({ queryKey: notificationUnreadCountQueryKey }),
  ]);

  queryClient.setQueryData(notificationsQueryKey, []);
  queryClient.setQueryData(notificationUnreadCountQueryKey, 0);
}
