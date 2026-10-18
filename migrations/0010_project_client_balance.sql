CREATE TABLE work_project_client_visibility (
  project_id TEXT PRIMARY KEY REFERENCES work_projects(id) ON DELETE CASCADE,
  show_remaining INTEGER NOT NULL DEFAULT 0 CHECK(show_remaining IN (0,1)),
  updated_at INTEGER NOT NULL
);
