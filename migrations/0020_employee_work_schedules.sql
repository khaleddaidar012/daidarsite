ALTER TABLE employees ADD COLUMN weekly_work_windows TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(weekly_work_windows));
ALTER TABLE employees ADD COLUMN work_schedule_locked INTEGER NOT NULL DEFAULT 0 CHECK (work_schedule_locked IN (0, 1));
ALTER TABLE employees ADD COLUMN work_schedule_effective_day TEXT NOT NULL DEFAULT '';
