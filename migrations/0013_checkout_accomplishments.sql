CREATE TABLE attendance_shift_reports (
 shift_id TEXT PRIMARY KEY REFERENCES attendance_shifts(id),
 employee_id TEXT NOT NULL REFERENCES employees(id),
 accomplishments TEXT NOT NULL CHECK(length(trim(accomplishments)) BETWEEN 1 AND 2000),
 submitted_at INTEGER NOT NULL
);
CREATE INDEX attendance_shift_reports_employee ON attendance_shift_reports(employee_id,submitted_at);
CREATE TABLE IF NOT EXISTS admin_notifications (
 id TEXT PRIMARY KEY, actor TEXT NOT NULL, event_type TEXT NOT NULL,
 title TEXT NOT NULL, detail TEXT NOT NULL,
 target TEXT NOT NULL CHECK(target IN ('overview','projects','employees','messages','hub')),
 created_at INTEGER NOT NULL, read_at INTEGER
);
CREATE INDEX IF NOT EXISTS admin_notifications_created ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_notifications_unread ON admin_notifications(read_at,created_at DESC);
