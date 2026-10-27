CREATE TABLE IF NOT EXISTS password_vault (
  id TEXT PRIMARY KEY,
  project TEXT NOT NULL,
  username TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0,1)),
  secret TEXT NOT NULL,
  iv TEXT NOT NULL
);
