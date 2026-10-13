CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS employee_sessions (
  token TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  expires_at INTEGER NOT NULL,
  credential TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  day TEXT NOT NULL,
  check_in INTEGER NOT NULL,
  check_out INTEGER,
  UNIQUE(employee_id, day),
  CHECK(check_out IS NULL OR check_out >= check_in)
);
CREATE UNIQUE INDEX IF NOT EXISTS attendance_one_open ON attendance(employee_id) WHERE check_out IS NULL;
CREATE INDEX IF NOT EXISTS attendance_month ON attendance(day, employee_id);
CREATE TABLE IF NOT EXISTS employee_requests (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  type TEXT NOT NULL CHECK(type IN ('leave','early')),
  day TEXT NOT NULL,
  requested_time TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  admin_note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  decided_at INTEGER
);
CREATE INDEX IF NOT EXISTS employee_requests_month ON employee_requests(day, employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS employee_requests_one_live ON employee_requests(employee_id, day, type) WHERE status IN ('pending','approved');
