CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, credential TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS visits (visitor TEXT NOT NULL, day TEXT NOT NULL, seen_at INTEGER NOT NULL, PRIMARY KEY(visitor, day));
CREATE INDEX IF NOT EXISTS visits_seen ON visits(seen_at);
CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, service TEXT NOT NULL, description TEXT NOT NULL, created_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending');
CREATE INDEX IF NOT EXISTS messages_created ON messages(created_at, status);
CREATE TABLE IF NOT EXISTS managed_projects (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at INTEGER NOT NULL);
