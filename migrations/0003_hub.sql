-- Daidar Hub customer, catalog, order and licensing foundation.
CREATE TABLE IF NOT EXISTS hub_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT,
  google_subject TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);
CREATE TABLE IF NOT EXISTS hub_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES hub_users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS hub_sessions_user ON hub_sessions(user_id, expires_at);
CREATE TABLE IF NOT EXISTS hub_password_resets (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES hub_users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE TABLE IF NOT EXISTS hub_catalog (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS hub_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES hub_users(id),
  snapshot TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('awaiting_transfer','under_review','needs_info','approved','rejected','cancelled')),
  proof_requested_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  rejection_reason TEXT,
  admin_note TEXT
);
CREATE INDEX IF NOT EXISTS hub_orders_user ON hub_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS hub_orders_status ON hub_orders(status, created_at);
CREATE TABLE IF NOT EXISTS hub_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES hub_users(id),
  source_order_id TEXT NOT NULL UNIQUE REFERENCES hub_orders(id),
  product_id TEXT NOT NULL,
  snapshot TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('awaiting_activation','active','expired','suspended')),
  starts_at INTEGER,
  expires_at INTEGER,
  allowed_devices INTEGER NOT NULL DEFAULT 1 CHECK(allowed_devices = 1),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS hub_audit (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS hub_approval_effects (
  order_id TEXT PRIMARY KEY REFERENCES hub_orders(id),
  attempt_token TEXT NOT NULL UNIQUE,
  subscription_id TEXT NOT NULL,
  processed_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS hub_releases (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  object_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS hub_devices (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL UNIQUE REFERENCES hub_subscriptions(id),
  device_hash TEXT NOT NULL,
  activated_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS hub_licenses (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES hub_subscriptions(id),
  version INTEGER NOT NULL,
  payload TEXT NOT NULL,
  signature TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('issued','revoked','replaced')),
  created_at INTEGER NOT NULL,
  UNIQUE(subscription_id, version)
);
CREATE TABLE IF NOT EXISTS hub_device_transfer_requests (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES hub_subscriptions(id),
  user_id TEXT NOT NULL REFERENCES hub_users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  created_at INTEGER NOT NULL,
  decided_at INTEGER
);
