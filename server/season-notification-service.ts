import { sql } from "drizzle-orm";
import { db } from "./db";
import { ensureNotificationEventClaims } from "./notification-event-schema";
import { createAndPush } from "./notification-service";
import { getDueSeasonNotifications } from "./season-notification-policy";

const RECIPIENT_BATCH_SIZE = 200;
let running = false;

export async function processSeasonNotifications(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const events = getDueSeasonNotifications(new Date());
    if (!events.length) return;
    await ensureNotificationEventClaims();
    for (const event of events) {
      let lastUserId = 0;
      while (Date.now() < event.expiresAt.getTime()) {
        // Only existing active accounts are in the event's audience. Accounts
        // created afterwards must not receive a backdated announcement.
        const result = await db.execute(sql`
          SELECT u.id FROM users u
          WHERE u.status = 'active' AND u.created_at <= ${event.dueAt.toISOString()}
            AND u.id > ${lastUserId}
            AND NOT EXISTS (
              SELECT 1 FROM notification_event_claims c
              WHERE c.user_id = u.id AND c.event_key = ${event.key}
            )
          ORDER BY u.id LIMIT ${RECIPIENT_BATCH_SIZE}
        `);
        const recipients = ((result as any).rows ?? result) as { id: number }[];
        if (!recipients.length) break;
        for (const { id } of recipients) {
          if (Date.now() >= event.expiresAt.getTime()) break;
          lastUserId = id;
          try {
            await createAndPush({
              userId: id,
              type: "season",
              title: event.title,
              message: event.message,
              actionUrl: "/leaderboard",
              metadata: { seasonNumber: event.seasonNumber, stage: event.stage },
            }, event.key);
          } catch (error) {
            // A failed transaction leaves no claim, so the next tick retries it.
            console.error(`[season-notifications] ${event.key} failed for user ${id}:`, error);
          }
        }
        if (recipients.length < RECIPIENT_BATCH_SIZE) break;
      }
    }
  } finally {
    running = false;
  }
}
