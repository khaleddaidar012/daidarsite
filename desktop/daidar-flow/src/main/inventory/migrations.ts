export const inventoryMigrations = [
  {
    version: 1,
    sql: `
CREATE TABLE products (
 id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 160), search_name TEXT NOT NULL,
 selling_price INTEGER NOT NULL CHECK(selling_price BETWEEN 0 AND 99999999999),
 barcode TEXT CHECK(barcode IS NULL OR (length(barcode) BETWEEN 1 AND 128 AND barcode=trim(barcode))),
 quantity INTEGER NOT NULL CHECK(quantity BETWEEN 0 AND 999999999999),
 unit TEXT NOT NULL DEFAULT 'قطعة' CHECK(unit IN ('قطعة','علبة','كرتونة','كيلوجرام','جرام','لتر')),
 created_at TEXT NOT NULL,updated_at TEXT NOT NULL,is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
 CHECK(unit IN ('كيلوجرام','جرام','لتر') OR quantity%1000=0)
) STRICT;
CREATE UNIQUE INDEX products_barcode_unique ON products(barcode) WHERE barcode IS NOT NULL AND barcode<>'';
CREATE INDEX products_active_created ON products(is_active,created_at DESC,id DESC);
`,
  },
];
