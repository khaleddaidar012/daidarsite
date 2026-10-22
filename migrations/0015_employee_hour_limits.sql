ALTER TABLE employees ADD COLUMN max_daily_hours REAL NOT NULL DEFAULT 4 CHECK(max_daily_hours > 0 AND max_daily_hours <= 24);
ALTER TABLE employees ADD COLUMN max_monthly_hours REAL NOT NULL DEFAULT 104 CHECK(max_monthly_hours > 0 AND max_monthly_hours <= 744);

CREATE TABLE employee_presence_checks (
  shift_id TEXT PRIMARY KEY REFERENCES attendance_shifts(id),
  employee_id TEXT NOT NULL REFERENCES employees(id),
  state TEXT NOT NULL CHECK(state IN ('waiting', 'prompted', 'retry_wait', 'closed')) DEFAULT 'waiting',
  prompt_stage INTEGER NOT NULL DEFAULT 0 CHECK(prompt_stage BETWEEN 0 AND 3),
  last_confirmed_at INTEGER NOT NULL,
  next_check_at INTEGER NOT NULL,
  prompt_sent_at INTEGER,
  updated_at INTEGER NOT NULL
);
CREATE INDEX employee_presence_due ON employee_presence_checks(state, next_check_at);
