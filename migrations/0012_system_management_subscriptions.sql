CREATE TABLE system_management_subscriptions (
 id TEXT PRIMARY KEY, operation_key TEXT NOT NULL UNIQUE,
 customer_name TEXT NOT NULL, phone TEXT NOT NULL,
 hours INTEGER NOT NULL CHECK(hours IN (1,2,3)), start_hour INTEGER NOT NULL,
 start_date TEXT NOT NULL, end_date TEXT NOT NULL, months INTEGER NOT NULL,
 monthly_price_piasters INTEGER NOT NULL, amount_received_piasters INTEGER NOT NULL,
 payment_method TEXT NOT NULL CHECK(payment_method IN ('instapay','vodafone')),
 note TEXT NOT NULL DEFAULT '', cancelled INTEGER NOT NULL DEFAULT 0 CHECK(cancelled IN (0,1)),
 created_by TEXT NOT NULL, created_at INTEGER NOT NULL,
 CHECK(start_hour>=18 AND start_hour+hours<=24)
);
CREATE INDEX system_management_subscriptions_dates ON system_management_subscriptions(start_date,end_date);
