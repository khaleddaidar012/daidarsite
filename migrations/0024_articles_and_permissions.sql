ALTER TABLE employees ADD COLUMN manage_articles INTEGER NOT NULL DEFAULT 0 CHECK(manage_articles IN (0,1));

CREATE TABLE IF NOT EXISTS article_categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO article_categories(id, slug, name_ar, name_en, sort_order, created_at) VALUES
  ('cat-development', 'development', 'البرمجة والتطوير', 'Development', 1, 1764153600000),
  ('cat-ecommerce', 'ecommerce', 'المتاجر الإلكترونية', 'E-Commerce', 2, 1764153600000),
  ('cat-business-systems', 'business-systems', 'أنظمة الأعمال', 'Business Systems', 3, 1764153600000),
  ('cat-saas', 'saas', 'حلول SaaS', 'SaaS Solutions', 4, 1764153600000),
  ('cat-business-tips', 'business-tips', 'نصائح للأعمال', 'Business Tips', 5, 1764153600000);

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES article_categories(id),
  cover_mime TEXT NOT NULL,
  cover_base64 TEXT NOT NULL,
  cover_alt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','draft')),
  author_type TEXT NOT NULL CHECK(author_type IN ('admin','employee')),
  author_employee_id TEXT,
  idempotency_key TEXT UNIQUE,
  published_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_status_published ON articles(status, published_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_employee_id);
