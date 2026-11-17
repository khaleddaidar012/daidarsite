CREATE TABLE store_short_links (
 slug TEXT PRIMARY KEY, store_id TEXT NOT NULL REFERENCES stores(id),
 is_primary INTEGER NOT NULL DEFAULT 1 CHECK(is_primary IN (0,1))
);
CREATE UNIQUE INDEX store_primary_short_link ON store_short_links(store_id) WHERE is_primary=1;
INSERT INTO store_short_links(slug,store_id) SELECT 'shop-'||rowid,id FROM stores;
CREATE TRIGGER store_default_short_link AFTER INSERT ON stores BEGIN
 INSERT INTO store_short_links(slug,store_id) VALUES('shop-'||NEW.rowid,NEW.id);
END;
