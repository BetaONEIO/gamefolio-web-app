import { sql } from "drizzle-orm";
import { db } from "./db";

let schemaReady: Promise<void> | undefined;

// The production image does not run the standalone migration script. Initialise
// this additive table lazily as well, and retry if the database was unavailable.
export function ensureNotificationEventClaims(): Promise<void> {
  if (!schemaReady) {
    schemaReady = db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_event_claims (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_key TEXT NOT NULL,
        claimed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT notification_event_claims_user_event_unique UNIQUE (user_id, event_key)
      )
    `).then(() => undefined).catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}
