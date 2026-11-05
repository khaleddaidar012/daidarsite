ALTER TABLE employees ADD COLUMN create_store INTEGER NOT NULL DEFAULT 0 CHECK(create_store IN (0,1));
ALTER TABLE employees ADD COLUMN view_ecosystem_stats INTEGER NOT NULL DEFAULT 0 CHECK(view_ecosystem_stats IN (0,1));
ALTER TABLE employees ADD COLUMN manage_store_subscriptions INTEGER NOT NULL DEFAULT 0 CHECK(manage_store_subscriptions IN (0,1));
