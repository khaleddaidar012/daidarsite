ALTER TABLE employees ADD COLUMN track_projects INTEGER NOT NULL DEFAULT 0;
CREATE TABLE work_projects (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, client_name TEXT NOT NULL DEFAULT '',
 start_date TEXT NOT NULL, end_date TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('scheduled','started','in_progress','completed')),
 public_note TEXT NOT NULL DEFAULT '', share_token TEXT NOT NULL UNIQUE,
 amount_piasters INTEGER NOT NULL DEFAULT 0, paid_piasters INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX work_projects_dates ON work_projects(start_date,end_date);
