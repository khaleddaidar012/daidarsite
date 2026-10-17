-- Allow explicitly selected employees to view account D1 capacity only.
ALTER TABLE employees ADD COLUMN view_d1_usage INTEGER NOT NULL DEFAULT 0 CHECK(view_d1_usage IN (0,1));
