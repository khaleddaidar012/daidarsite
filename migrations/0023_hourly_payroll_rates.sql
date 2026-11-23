CREATE TABLE employee_hourly_rates (
 employee_id TEXT NOT NULL REFERENCES employees(id),
 month TEXT NOT NULL CHECK(month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
 rate_piasters INTEGER NOT NULL CHECK(rate_piasters>=0),
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(employee_id,month)
);
-- Start the requested hourly policy in November; earlier payroll remains unchanged.
INSERT INTO employee_hourly_rates(employee_id,month,rate_piasters,updated_at)
SELECT id,'2026-11',CAST(ROUND(COALESCE(monthly_salary_piasters,0)/CASE WHEN max_monthly_hours>0 THEN max_monthly_hours ELSE 104 END) AS INTEGER),CAST(strftime('%s','now') AS INTEGER)*1000 FROM employees;
