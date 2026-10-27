CREATE TABLE IF NOT EXISTS password_vault_projects (
  project TEXT PRIMARY KEY,
  login_url TEXT NOT NULL DEFAULT '',
  admin_url TEXT NOT NULL DEFAULT ''
);
INSERT OR IGNORE INTO password_vault_projects(project) SELECT DISTINCT project FROM password_vault;
ALTER TABLE employees ADD COLUMN add_passwords INTEGER NOT NULL DEFAULT 0 CHECK (add_passwords IN (0,1));
ALTER TABLE employees ADD COLUMN view_passwords INTEGER NOT NULL DEFAULT 0 CHECK (view_passwords IN (0,1));
