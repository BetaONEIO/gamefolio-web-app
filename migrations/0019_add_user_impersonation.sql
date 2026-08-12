-- Admin "impersonate user" support-tool feature.
-- Every impersonation session (an admin viewing/acting as another user to
-- debug a reported issue) is audited here: who, whom, why, and when it
-- started/ended. token_id is the JWT's jti claim, linking a live
-- impersonation token back to its audit row so it can be closed out.

CREATE TABLE IF NOT EXISTS "impersonation_audit_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "token_id" text NOT NULL UNIQUE,
  "admin_id" integer NOT NULL REFERENCES "users"("id"),
  "admin_username" text NOT NULL,
  "target_user_id" integer NOT NULL REFERENCES "users"("id"),
  "target_username" text NOT NULL,
  "reason" text NOT NULL,
  "ip_address" text,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "ended_at" timestamp,
  "end_reason" text
);

CREATE INDEX IF NOT EXISTS "impersonation_audit_log_admin_id_idx" ON "impersonation_audit_log" ("admin_id");
CREATE INDEX IF NOT EXISTS "impersonation_audit_log_target_user_id_idx" ON "impersonation_audit_log" ("target_user_id");
