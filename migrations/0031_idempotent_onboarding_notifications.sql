CREATE TABLE IF NOT EXISTS onboarding_notification_claims (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  claimed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- The notification predates this claim table. Treat every existing onboarded
-- account as already handled so a later persona edit cannot emit a false
-- onboarding-complete message after this migration is deployed.
INSERT INTO onboarding_notification_claims (user_id, claimed_at)
SELECT id, COALESCE(updated_at, created_at, NOW())
FROM users
WHERE NULLIF(BTRIM(user_type), '') IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;
