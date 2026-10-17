ALTER TABLE employees ADD COLUMN view_absences INTEGER NOT NULL DEFAULT 1 CHECK(view_absences IN (0,1));
ALTER TABLE employees ADD COLUMN view_due INTEGER NOT NULL DEFAULT 0 CHECK(view_due IN (0,1));
