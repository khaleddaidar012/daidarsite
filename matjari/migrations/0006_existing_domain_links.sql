CREATE TABLE store_domain_links (
 domain TEXT PRIMARY KEY, store_id TEXT NOT NULL REFERENCES stores(id),
 source_request_id TEXT REFERENCES domain_requests(id),
 status TEXT NOT NULL CHECK(status IN ('linking','active')) DEFAULT 'linking',
 created_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX store_domain_links_store ON store_domain_links(store_id);
