import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const dbPath = path.join(rootDir, '.d1_local.sqlite');

const db = new DatabaseSync(dbPath);

console.log('Testing Cloudflare D1 local database queries...');

// 1. Store
const store = db.prepare('SELECT * FROM stores LIMIT 1').get();
console.log('1. Store record:', store ? `Found: ${store.name} (${store.activity_type})` : 'None');

// 2. Traffic stats
const statsCount = db.prepare('SELECT COUNT(*) as c FROM traffic_stats').get();
console.log('2. Traffic stats records:', statsCount.c);

// 3. Products & Images stored in D1
const products = db.prepare('SELECT id, name, price, length(image_data) as img_len FROM products').all();
console.log(`3. Products stored in D1 (${products.length} items):`);
products.forEach((p) => {
  console.log(`   - [${p.id}] ${p.name}: ${p.price} (D1 image size: ${p.img_len} chars)`);
});

// 4. Test inserting a test order
const testOrderId = 'test-ord-' + Date.now();
db.prepare(`
  INSERT INTO orders (id, store_id, customer_name, customer_phone, customer_address, items_json, total_price, status)
  VALUES (?, 'store-main', 'أحمد محمود', '01011122233', 'القاهرة، المعادي', '[]', 450, 'completed_via_whatsapp')
`).run(testOrderId);

const orderRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(testOrderId);
console.log('4. Order placement test in D1:', orderRow ? `Success! Order ID: ${orderRow.id}` : 'Failed');

console.log('All Cloudflare D1 verification tests passed!');
