-- Cloudflare D1 Database Migration: 0001_initial_schema.sql
-- Multi-Tenant Store System Architecture (Super Admin & Store Owner)

CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'ج.م',
    bio TEXT DEFAULT '',
    facebook_url TEXT NOT NULL DEFAULT 'https://www.facebook.com/daidarsoluations/',
    logo_data TEXT DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT DEFAULT '',
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'merchant', -- 'super_admin' | 'merchant'
    store_id TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(store_id) REFERENCES stores(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    plan_name TEXT NOT NULL DEFAULT 'الباقة الاحترافية السنوية',
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'expired' | 'suspended'
    start_date TEXT NOT NULL DEFAULT (date('now')),
    end_date TEXT NOT NULL DEFAULT (date('now', '+1 year')),
    price REAL NOT NULL DEFAULT 1200,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price REAL NOT NULL,
    category TEXT DEFAULT 'عام',
    image_data TEXT NOT NULL, -- Stored strictly in Cloudflare D1
    is_available INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS traffic_stats (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    visited_at TEXT NOT NULL DEFAULT (datetime('now')),
    device TEXT DEFAULT 'موبايل',
    page TEXT DEFAULT '/store',
    referrer TEXT DEFAULT 'مباشر',
    FOREIGN KEY(store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT DEFAULT '',
    items_json TEXT NOT NULL,
    total_price REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_store_id ON subscriptions(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);

-- Provision the owner separately with a salted password hash. Never seed a
-- publicly known administrator password.
