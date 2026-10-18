-- Keep the original attendance table as a historical backup; copy every record with its original id.
CREATE TABLE attendance_shifts (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  day TEXT NOT NULL,
  check_in INTEGER NOT NULL,
  check_out INTEGER,
  CHECK(check_out IS NULL OR check_out >= check_in)
);
INSERT INTO attendance_shifts(id,employee_id,day,check_in,check_out)
  SELECT id,employee_id,day,check_in,check_out FROM attendance;
CREATE UNIQUE INDEX attendance_shifts_one_open ON attendance_shifts(employee_id) WHERE check_out IS NULL;
CREATE INDEX attendance_shifts_month ON attendance_shifts(day,employee_id,check_in);
