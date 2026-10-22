CREATE TABLE employee_push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX employee_push_subscriptions_employee ON employee_push_subscriptions(employee_id);
