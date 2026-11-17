CREATE TABLE domain_settings (
 id INTEGER PRIMARY KEY CHECK(id=1), usd_egp REAL NOT NULL CHECK(usd_egp>0),
 margin_egp INTEGER NOT NULL CHECK(margin_egp>=0), rate_date TEXT NOT NULL,
 updated_by TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE domain_requests (
 id TEXT PRIMARY KEY, store_id TEXT NOT NULL REFERENCES stores(id), user_id TEXT NOT NULL REFERENCES users(id),
 domain TEXT NOT NULL, registration_usd TEXT NOT NULL, renewal_usd TEXT NOT NULL,
 usd_egp REAL NOT NULL, margin_egp INTEGER NOT NULL, total_piasters INTEGER NOT NULL,
 quote_expires INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'quoted'
 CHECK(status IN ('quoted','pending','approved','rejected','purchased','linking','active')),
 proof_mime TEXT, proof_base64 TEXT, note TEXT NOT NULL DEFAULT '', reviewed_by TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX domain_open_request ON domain_requests(domain) WHERE status IN ('pending','approved','purchased','linking','active');
CREATE INDEX domain_requests_store ON domain_requests(store_id,created_at);
INSERT INTO domain_settings(id,usd_egp,margin_egp,rate_date) VALUES(1,53.8626,150,'2026-11-15');
