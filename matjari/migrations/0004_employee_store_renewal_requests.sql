CREATE TABLE IF NOT EXISTS employee_store_renewal_requests (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  employee_email TEXT NOT NULL,
  months INTEGER NOT NULL CHECK (months BETWEEN 1 AND 12),
  proof_mime TEXT NOT NULL CHECK (proof_mime IN ('image/png','image/jpeg','image/webp')),
  proof_base64 TEXT NOT NULL,
  source_payment_request_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_token TEXT UNIQUE,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_employee_store_renewals_status_created
  ON employee_store_renewal_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_store_renewals_store_created
  ON employee_store_renewal_requests(store_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_store_renewals_one_pending
  ON employee_store_renewal_requests(store_id) WHERE status='pending';
