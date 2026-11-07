CREATE TABLE IF NOT EXISTS subscription_payment_requests (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  features_json TEXT NOT NULL,
  monthly_total REAL NOT NULL,
  annual_total REAL NOT NULL,
  due_now REAL NOT NULL,
  proof_mime TEXT NOT NULL,
  proof_base64 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  review_token TEXT UNIQUE,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subscription_payment_requests_status_created
  ON subscription_payment_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_payment_requests_store_created
  ON subscription_payment_requests(store_id, created_at DESC);
