import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import {
  clearNotificationCaches,
  notificationsQueryKey,
  notificationUnreadCountQueryKey,
} from "../client/src/lib/notification-cache";

test("bulk notification clear empties shared caches without refetching", async () => {
  let fetchCount = 0;
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryFn: async () => {
          fetchCount += 1;
          return [{ id: 1, isRead: false }];
        },
      },
    },
  });

  queryClient.setQueryData(notificationsQueryKey, [{ id: 1, isRead: false }]);
  queryClient.setQueryData(notificationUnreadCountQueryKey, 1);

  await clearNotificationCaches(queryClient);

  assert.deepEqual(queryClient.getQueryData(notificationsQueryKey), []);
  assert.equal(queryClient.getQueryData(notificationUnreadCountQueryKey), 0);
  assert.equal(fetchCount, 0);
});
