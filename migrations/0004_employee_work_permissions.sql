-- Granular staff permissions for portfolio publishing and manual paid subscriptions.
ALTER TABLE employees ADD COLUMN manage_projects INTEGER NOT NULL DEFAULT 0 CHECK(manage_projects IN (0,1));
ALTER TABLE employees ADD COLUMN manage_hub_subscriptions INTEGER NOT NULL DEFAULT 0 CHECK(manage_hub_subscriptions IN (0,1));

ALTER TABLE hub_orders ADD COLUMN manual_operation_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS hub_orders_manual_operation ON hub_orders(manual_operation_key) WHERE manual_operation_key IS NOT NULL;
