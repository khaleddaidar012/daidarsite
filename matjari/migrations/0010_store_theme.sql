-- Additive migration: per-store selectable storefront theme (5 built-in themes)
CREATE TABLE IF NOT EXISTS store_themes (
  store_id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL DEFAULT 'classic',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(store_id) REFERENCES stores(id) ON DELETE CASCADE
);
