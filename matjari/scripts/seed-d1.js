import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dbPath = path.join(rootDir, '.d1_local.sqlite');

const db = new DatabaseSync(dbPath);

console.log('[Cloudflare D1 Multi-Tenant Stores Seeder]');

// 1. Seed Multiple Client Stores in D1
const stores = [
  {
    id: 'store-elegance',
    name: 'متجر الأناقة العصري',
    activity_type: 'ملابس وأزياء عصرية',
    whatsapp_number: '201061532875',
    currency: 'ج.م',
    bio: 'أحدث صيحات الموضة والأزياء الرجالية والنسائية بجودة عالية وتوصيل سريع لكافة المحافظات.',
    facebook_url: 'https://www.facebook.com/daidarsoluations/',
    logo_data: '',
  },
  {
    id: 'store-riyadh',
    name: 'متجر الرياض تك',
    activity_type: 'إلكترونيات وهواتف ذكية',
    whatsapp_number: '966501234567',
    currency: 'ر.س',
    bio: 'الوجهة الأولى لأحدث الأجهزة الذكية وملحقات الهواتف الأصلية مع ضمان معتمد وشحن سريع.',
    facebook_url: 'https://www.facebook.com/daidarsoluations/',
    logo_data: '',
  },
  {
    id: 'store-perfume',
    name: 'بريق للعطور ومستحضرات التجميل',
    activity_type: 'عطور ومستحضرات تجميل',
    whatsapp_number: '201012345678',
    currency: 'ج.م',
    bio: 'أفخم العطور الشرقية والفرنسية والزيوت العطرية النقية ومستحضرات العناية الطبيعية.',
    facebook_url: 'https://www.facebook.com/daidarsoluations/',
    logo_data: '',
  },
];

for (const s of stores) {
  const existing = db.prepare('SELECT id FROM stores WHERE id = ?').get(s.id);
  if (!existing) {
    db.prepare(`
      INSERT INTO stores (id, name, activity_type, whatsapp_number, currency, bio, facebook_url, logo_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(s.id, s.name, s.activity_type, s.whatsapp_number, s.currency, s.bio, s.facebook_url, s.logo_data);
    console.log(`✅ Seeded store: ${s.name} (${s.id})`);
  }
}

// 2. Seed Products for these stores with SVG base64 strictly in D1
const sampleProd1 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23f0f7ff"/><rect x="40" y="40" width="320" height="320" rx="24" fill="%23e0f2fe"/><circle cx="200" cy="170" r="75" fill="%23bae6fd"/><path d="M140 130 Q200 160 260 130 L275 260 Q200 280 125 260 Z" fill="%230e1f38"/><text x="200" y="325" font-family="sans-serif" font-size="20" font-weight="bold" fill="%230084d6" text-anchor="middle">قميص أوكسفورد قطن 100%</text></svg>`;
const sampleProd2 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23fdf4ff"/><rect x="40" y="40" width="320" height="320" rx="24" fill="%23fae8ff"/><circle cx="200" cy="170" r="75" fill="%23f5d0fe"/><path d="M160 115 L240 115 L265 265 L135 265 Z" fill="%230084d6"/><text x="200" y="325" font-family="sans-serif" font-size="20" font-weight="bold" fill="%230e1f38" text-anchor="middle">فستان كلاسيك أنيق</text></svg>`;
const sampleProd3 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23f0fdf4"/><rect x="40" y="40" width="320" height="320" rx="24" fill="%23dcfce7"/><circle cx="200" cy="170" r="75" fill="%23bbf7d0"/><rect x="140" y="130" width="120" height="130" rx="15" fill="%230e1f38"/><text x="200" y="325" font-family="sans-serif" font-size="20" font-weight="bold" fill="%230084d6" text-anchor="middle">حقيبة يد جلد طبيعي</text></svg>`;

const sampleTech1 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23f8fafc"/><rect x="130" y="70" width="140" height="260" rx="28" fill="%230e1f38"/><rect x="140" y="85" width="120" height="230" rx="20" fill="%230084d6"/><circle cx="200" cy="295" r="12" fill="%23ffffff"/><text x="200" y="370" font-family="sans-serif" font-size="18" font-weight="bold" fill="%230084d6" text-anchor="middle">هاتف ذكي ألترا برو</text></svg>`;
const sampleTech2 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23f0fdfa"/><circle cx="200" cy="180" r="100" fill="%23ccfbf1"/><circle cx="200" cy="180" r="75" fill="%230e1f38"/><circle cx="200" cy="180" r="60" fill="%2300b4d8"/><text x="200" y="340" font-family="sans-serif" font-size="18" font-weight="bold" fill="%230e1f38" text-anchor="middle">ساعة ذكية مقاومة للماء</text></svg>`;

const samplePerfume1 = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23fffbeb"/><rect x="140" y="120" width="120" height="180" rx="20" fill="%23fef3c7" stroke="%23d97706" stroke-width="4"/><rect x="170" y="80" width="60" height="40" rx="8" fill="%230e1f38"/><text x="200" y="210" font-family="serif" font-size="18" font-weight="bold" fill="%23d97706" text-anchor="middle">عطر العود الملكي</text><text x="200" y="350" font-family="sans-serif" font-size="18" font-weight="bold" fill="%230e1f38" text-anchor="middle">عطر أو دو بارفان 100مل</text></svg>`;

const products = [
  { id: 'p1', store_id: 'store-elegance', name: 'قميص أوكسفورد رجالي فاخر', description: 'قطن مصري 100% بتصميم عصري وألوان متعددة تناسب كل المناسبات', price: 450, category: 'ملابس رجالي', img: sampleProd1 },
  { id: 'p2', store_id: 'store-elegance', name: 'فستان سهرة كلاسيك', description: 'خامة مريحة وتطريز ناعم بتفاصيل راقية وتصميم مميز', price: 780, category: 'ملابس حريمي', img: sampleProd2 },
  { id: 'p3', store_id: 'store-elegance', name: 'حقيبة يد جلد طبيعي', description: 'حقيبة يد عملية بتصميم أنيق وجيوب متعددة مع حزام كتف', price: 550, category: 'إكسسوارات', img: sampleProd3 },
  { id: 'p4', store_id: 'store-riyadh', name: 'هاتف ذكي ألترا برو 256GB', description: 'شاشة AMOLED فائقة الوضوح، معالج جيل تاسع، كاميرا 108 ميجابكسل', price: 2850, category: 'هواتف ذكية', img: sampleTech1 },
  { id: 'p5', store_id: 'store-riyadh', name: 'ساعة ذكية رياضية برو', description: 'مقاومة للماء حتى 50 متر، بطارية تدوم 14 يوم، مستشعر نبضات القلب', price: 650, category: 'ساعات ذكية', img: sampleTech2 },
  { id: 'p6', store_id: 'store-perfume', name: 'عطر العود الملكي الفاخر 100مل', description: 'مزيج ساحر من دهن العود الكمبودي والمسك الأبيض والورد الطائفي بثبات يدوم 48 ساعة', price: 620, category: 'عطور شرقية', img: samplePerfume1 },
];

for (const p of products) {
  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(p.id);
  if (!existing) {
    db.prepare(`
      INSERT INTO products (id, store_id, name, description, price, category, image_data, is_available)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(p.id, p.store_id, p.name, p.description, p.price, p.category, p.img);
  }
}
console.log('✅ Sample products initialized across client stores in Cloudflare D1.');
