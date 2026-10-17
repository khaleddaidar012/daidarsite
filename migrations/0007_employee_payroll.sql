ALTER TABLE employees ADD COLUMN monthly_salary_piasters INTEGER NOT NULL DEFAULT 0 CHECK(monthly_salary_piasters >= 0);
ALTER TABLE employees ADD COLUMN weekly_days_off TEXT NOT NULL DEFAULT '[5]';
CREATE TABLE IF NOT EXISTS employee_payroll_adjustments (
  employee_id TEXT NOT NULL REFERENCES employees(id),
  month TEXT NOT NULL CHECK(month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
  due_piasters INTEGER NOT NULL CHECK(due_piasters >= 0),
  note TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(employee_id, month)
);
