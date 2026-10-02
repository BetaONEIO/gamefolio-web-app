CREATE TABLE IF NOT EXISTS campaign_payments (
  campaign_id INTEGER PRIMARY KEY REFERENCES campaign_instances(id),
  developer_id INTEGER NOT NULL, expected_pence INTEGER NOT NULL,
  session_id TEXT UNIQUE, transaction_id TEXT UNIQUE, amount_paid INTEGER,
  status TEXT NOT NULL DEFAULT 'awaiting_payment', last_error TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
