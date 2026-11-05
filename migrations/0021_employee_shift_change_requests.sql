CREATE TABLE employee_shift_change_requests (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  request_month TEXT NOT NULL CHECK (request_month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
  day TEXT NOT NULL,
  start_time TEXT NOT NULL CHECK (start_time GLOB '[0-2][0-9]:[0-5][0-9]'),
  end_time TEXT NOT NULL CHECK (end_time GLOB '[0-2][0-9]:[0-5][0-9]'),
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  admin_note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  decided_at INTEGER,
  used_at INTEGER
);
CREATE INDEX employee_shift_change_month ON employee_shift_change_requests(employee_id,request_month,created_at);
CREATE INDEX employee_shift_change_day ON employee_shift_change_requests(employee_id,day,status);
