DROP TRIGGER IF EXISTS store_default_short_link;
UPDATE store_short_links SET is_primary=0
WHERE slug GLOB 'shop-[0-9]*' AND substr(slug,6) NOT GLOB '*[^0-9]*';
INSERT INTO store_short_links(slug,store_id)
SELECT 'm-'||lower(hex(randomblob(6))),s.id FROM stores s
WHERE NOT EXISTS(SELECT 1 FROM store_short_links l WHERE l.store_id=s.id AND l.is_primary=1);
DELETE FROM store_short_links
WHERE slug GLOB 'shop-[0-9]*' AND substr(slug,6) NOT GLOB '*[^0-9]*';
CREATE TRIGGER store_default_short_link AFTER INSERT ON stores BEGIN
 INSERT INTO store_short_links(slug,store_id) VALUES('m-'||lower(hex(randomblob(6))),NEW.id);
END;
