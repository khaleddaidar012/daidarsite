import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const SUBPATH = '/daidarsoluations/ar/new_test_store/';

// Vite Plugin for Cloudflare D1 Multi-Tenant Emulation using native node:sqlite
function cloudflareD1Plugin(): Plugin {
  return {
    name: 'cloudflare-d1-local-plugin',
    configureServer(server) {
      const rootDir = process.cwd();
      const dbPath = path.join(rootDir, '.d1_local.sqlite');
      const migrationFile = path.join(rootDir, 'migrations', '0001_initial_schema.sql');

      // Initialize SQLite DB as local Cloudflare D1
      const db = new DatabaseSync(dbPath);
      if (fs.existsSync(migrationFile)) {
        const schema = fs.readFileSync(migrationFile, 'utf8');
        db.exec(schema);
      }
      try {
        db.exec("ALTER TABLE users ADD COLUMN email TEXT DEFAULT '';");
      } catch {}

      // Root redirect helper to subpath
      server.middlewares.use((req, res, next) => {
        if (req.url === '/' || req.url === '/daidarsoluations' || req.url === '/daidarsoluations/ar') {
          res.writeHead(302, { Location: SUBPATH });
          return res.end();
        }
        next();
      });

      // API Request Handler
      server.middlewares.use(async (req, res, next) => {
        const isApi = req.url?.includes('/api/');
        if (!isApi) {
          return next();
        }

        const url = new URL(req.url!, `http://${req.headers.host}`);
        let pathPart = url.pathname;
        if (pathPart.includes('/api/')) {
          pathPart = pathPart.substring(pathPart.indexOf('/api/') + 5);
        }
        const method = req.method;

        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        // Helper to read JSON body
        const readBody = () => new Promise<any>((resolve) => {
          let data = '';
          req.on('data', chunk => { data += chunk; });
          req.on('end', () => {
            try {
              resolve(data ? JSON.parse(data) : {});
            } catch {
              resolve({});
            }
          });
        });

        try {
          // 1. Auth: Login (Supports Google Email or Username)
          if (pathPart === 'auth/login') {
            if (method === 'POST') {
              const body = await readBody();
              const { username, password } = body;
              const loginId = (username || '').trim();
              
              const user = db.prepare("SELECT id, username, email, role, store_id, is_active FROM users WHERE (username = ? OR (email != '' AND email = ?)) AND password = ?").get(loginId, loginId, password) as any;
              
              if (!user) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ success: false, error: 'البريد الإلكتروني / اسم المستخدم أو كلمة المرور غير صحيحة' }));
              }

              if (user.role === 'super_admin' && user.is_active === 0) {
                res.statusCode = 403;
                return res.end(JSON.stringify({ success: false, error: 'حساب الأدمن موقوف حالياً.' }));
              }

              let store = null;
              let subscription = null;

              if (user.store_id) {
                store = db.prepare('SELECT * FROM stores WHERE id = ?').get(user.store_id) as any;
                subscription = db.prepare('SELECT * FROM subscriptions WHERE store_id = ? ORDER BY created_at DESC LIMIT 1').get(user.store_id) as any;
              }

              // Inactive store/user can log in to view their dashboard in Preview-Only Mode
              return res.end(JSON.stringify({
                success: true,
                user,
                store,
                subscription,
              }));
            }
          }

          // 1.5. Auth: Register (New Merchant Self-Signup -> Inactive by default, Preview Only)
          if (pathPart === 'auth/register') {
            if (method === 'POST') {
              const body = await readBody();
              const {
                store_name,
                activity_type = 'عام',
                whatsapp_number,
                currency = 'ج.م',
                email = '',
                username,
                password,
              } = body;

              const cleanEmail = email.trim().toLowerCase();
              const cleanUsername = (username || cleanEmail.split('@')[0] || '').trim();

              if (!store_name || !cleanEmail || !password || !whatsapp_number) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'يرجى ملء جميع الحقول المطلوبة بما في ذلك بريد Google واسم المتجر' }));
              }

              // Verify Google Email format
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(cleanEmail)) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'يرجى إدخال بريد إلكتروني حقيقي من Google (مثال: name@gmail.com)' }));
              }

              // Check existing username or email
              const existingUser = db.prepare("SELECT id FROM users WHERE username = ? OR (email != '' AND email = ?)").get(cleanUsername, cleanEmail);
              if (existingUser) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'البريد الإلكتروني أو اسم المستخدم هذا مسجل مسبقاً، يرجى تسجيل الدخول' }));
              }

              const storeId = 'store-' + Date.now();
              const userId = 'usr-' + Date.now();
              const subId = 'sub-' + Date.now();

              // Insert Store with is_active = 0 (Requires Super Admin Activation)
              db.prepare(`
                INSERT INTO stores (id, name, activity_type, whatsapp_number, currency, bio, is_active)
                VALUES (?, ?, ?, ?, ?, '', 0)
              `).run(storeId, store_name.trim(), activity_type.trim(), whatsapp_number.trim(), currency);

              // Insert Merchant User with is_active = 0
              db.prepare(`
                INSERT INTO users (id, username, email, password, role, store_id, is_active)
                VALUES (?, ?, ?, ?, 'merchant', ?, 0)
              `).run(userId, cleanUsername, cleanEmail, password.trim(), storeId);

              // Insert Default Starter Subscription
              db.prepare(`
                INSERT INTO subscriptions (id, store_id, plan_name, status, start_date, end_date, price)
                VALUES (?, ?, 'الباقة الترحيبية', 'active', date('now'), date('now', '+12 month'), 0)
              `).run(subId, storeId);

              const createdStore = db.prepare('SELECT * FROM stores WHERE id = ?').get(storeId) as any;
              const createdUser = db.prepare('SELECT id, username, email, role, store_id, is_active FROM users WHERE id = ?').get(userId) as any;
              const createdSub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(subId) as any;

              return res.end(JSON.stringify({
                success: true,
                user: createdUser,
                store: createdStore,
                subscription: createdSub,
              }));
            }
          }

          // 2. Super Admin: Merchants Directory
          if (pathPart === 'admin/merchants') {
            if (method === 'GET') {
              const stores = db.prepare('SELECT * FROM stores ORDER BY created_at DESC').all() as any[];
              const result = stores.map(store => {
                const user = db.prepare('SELECT id, username, email, role, is_active FROM users WHERE store_id = ?').get(store.id) as any;
                const subscription = db.prepare('SELECT * FROM subscriptions WHERE store_id = ? ORDER BY created_at DESC LIMIT 1').get(store.id) as any;
                const pCount = db.prepare('SELECT COUNT(*) as c FROM products WHERE store_id = ?').get(store.id) as any;
                return {
                  store,
                  user: user || { id: '', username: 'غير مرتبط', email: '', is_active: store.is_active },
                  subscription: subscription || { status: 'expired', end_date: 'غير محدد', plan_name: 'لا يوجد' },
                  productCount: pCount?.c || 0,
                };
              });

              return res.end(JSON.stringify({ success: true, merchants: result }));
            }

            if (method === 'POST') {
              const body = await readBody();
              const {
                store_name,
                activity_type,
                whatsapp_number,
                currency = 'ج.م',
                username,
                password,
                plan_name = 'الباقة السنوية الاحترافية',
                duration_months = 12,
                price = 1200,
                email = '',
              } = body;

              if (!store_name || !username || !password || !whatsapp_number) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'جميع الحقول الأساسية مطلوبة' }));
              }

              // Check existing username
              const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
              if (existingUser) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ success: false, error: 'اسم المستخدم محجوز بالفعل' }));
              }

              const storeId = 'store-' + Date.now();
              const userId = 'usr-' + Date.now();
              const subId = 'sub-' + Date.now();

              // Insert Store
              db.prepare(`
                INSERT INTO stores (id, name, activity_type, whatsapp_number, currency, bio, is_active)
                VALUES (?, ?, ?, ?, ?, '', 1)
              `).run(storeId, store_name, activity_type, whatsapp_number, currency);

              // Insert User
              db.prepare(`
                INSERT INTO users (id, username, email, password, role, store_id, is_active)
                VALUES (?, ?, ?, ?, 'merchant', ?, 1)
              `).run(userId, username, email.trim(), password, storeId);

              // Insert Subscription
              const months = Number(duration_months) || 12;
              db.prepare(`
                INSERT INTO subscriptions (id, store_id, plan_name, status, start_date, end_date, price)
                VALUES (?, ?, ?, 'active', date('now'), date('now', '+' || ? || ' month'), ?)
              `).run(subId, storeId, plan_name, months, Number(price) || 0);

              const createdStore = db.prepare('SELECT * FROM stores WHERE id = ?').get(storeId);
              const createdUser = db.prepare('SELECT id, username, email, role, is_active FROM users WHERE id = ?').get(userId);
              const createdSub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(subId);

              return res.end(JSON.stringify({
                success: true,
                merchant: {
                  store: createdStore,
                  user: createdUser,
                  subscription: createdSub,
                  productCount: 0,
                }
              }));
            }
          }

          // 3. Super Admin: Toggle Store & User Status
          if (pathPart.startsWith('admin/merchants/') && pathPart.endsWith('/toggle-status')) {
            if (method === 'PUT') {
              const storeId = pathPart.replace('admin/merchants/', '').replace('/toggle-status', '');
              const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(storeId) as any;
              
              if (!store) {
                res.statusCode = 404;
                return res.end(JSON.stringify({ success: false, error: 'المتجر غير موجود' }));
              }

              const nextState = store.is_active === 1 ? 0 : 1;
              db.prepare("UPDATE stores SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(nextState, storeId);
              db.prepare("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE store_id = ?").run(nextState, storeId);

              return res.end(JSON.stringify({ success: true, is_active: nextState }));
            }
          }

          // 4.5. Super Admin: Delete Store & Associated Records
          if (pathPart.startsWith('admin/merchants/') && !pathPart.includes('/toggle-status') && !pathPart.includes('/renew-subscription')) {
            if (method === 'DELETE') {
              const storeId = pathPart.replace('admin/merchants/', '');
              
              const store = db.prepare('SELECT id FROM stores WHERE id = ?').get(storeId) as any;
              if (!store) {
                res.statusCode = 404;
                return res.end(JSON.stringify({ success: false, error: 'المتجر غير موجود' }));
              }

              db.prepare('DELETE FROM products WHERE store_id = ?').run(storeId);
              db.prepare('DELETE FROM orders WHERE store_id = ?').run(storeId);
              db.prepare('DELETE FROM traffic_stats WHERE store_id = ?').run(storeId);
              db.prepare('DELETE FROM subscriptions WHERE store_id = ?').run(storeId);
              db.prepare('DELETE FROM users WHERE store_id = ?').run(storeId);
              db.prepare('DELETE FROM stores WHERE id = ?').run(storeId);

              return res.end(JSON.stringify({ success: true, message: 'تم حذف المتجر وجميع بياناته بنجاح' }));
            }
          }

          // 4. Super Admin: Renew / Adjust Subscription (Add or Subtract Months)
          if (pathPart.startsWith('admin/merchants/') && pathPart.endsWith('/renew-subscription')) {
            if (method === 'POST') {
              const storeId = pathPart.replace('admin/merchants/', '').replace('/renew-subscription', '');
              const body = await readBody();
              const monthsDelta = Number(body.months);
              const validDelta = isNaN(monthsDelta) || monthsDelta === 0 ? 12 : monthsDelta;
              const modifier = validDelta >= 0 ? `+${validDelta} month` : `${validDelta} month`;

              const existingSub = db.prepare('SELECT * FROM subscriptions WHERE store_id = ? ORDER BY created_at DESC LIMIT 1').get(storeId) as any;

              if (existingSub) {
                // When adding, start from MAX(end_date, now); when subtracting, calculate from existing end_date
                const baseDateExpr = validDelta >= 0
                  ? "CASE WHEN end_date > date('now') THEN end_date ELSE date('now') END"
                  : "end_date";

                db.prepare(`
                  UPDATE subscriptions 
                  SET end_date = date(${baseDateExpr}, ?),
                      status = CASE WHEN date(${baseDateExpr}, ?) >= date('now') THEN 'active' ELSE 'expired' END,
                      updated_at = datetime('now')
                  WHERE id = ?
                `).run(modifier, modifier, existingSub.id);
              } else {
                const subId = 'sub-' + Date.now();
                db.prepare(`
                  INSERT INTO subscriptions (id, store_id, plan_name, status, start_date, end_date, price)
                  VALUES (?, ?, 'الباقة المجددة', 'active', date('now'), date('now', ?), 1000)
                `).run(subId, storeId, modifier);
              }

              const updatedSub = db.prepare('SELECT * FROM subscriptions WHERE store_id = ? ORDER BY created_at DESC LIMIT 1').get(storeId);
              return res.end(JSON.stringify({ success: true, subscription: updatedSub }));
            }
          }

          // 4.9. Super Admin: Real Platform Analytics (From Cloudflare D1 tables)
          if (pathPart === 'admin/analytics') {
            if (method === 'GET') {
              const ordersCountRow = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };
              const totalOrders = ordersCountRow?.count || 0;

              const productsCountRow = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
              const totalProducts = productsCountRow?.count || 0;

              const currentYear = new Date().getFullYear();
              const monthlyStats = db.prepare(`
                SELECT strftime('%m', visited_at) as month_num, COUNT(*) as count
                FROM traffic_stats
                WHERE strftime('%Y', visited_at) = ?
                GROUP BY strftime('%m', visited_at)
              `).all(String(currentYear)) as { month_num: string; count: number }[];

              const monthMap: Record<string, number> = {};
              for (const row of monthlyStats) {
                monthMap[row.month_num] = row.count;
              }

              return res.end(JSON.stringify({
                success: true,
                analytics: {
                  totalOrders,
                  totalProducts,
                  monthMap,
                }
              }));
            }
          }

          // 5. Stores Directory & Individual Store
          if (pathPart === 'stores') {
            if (method === 'GET') {
              const allStores = db.prepare('SELECT * FROM stores WHERE is_active = 1 ORDER BY created_at DESC').all();
              return res.end(JSON.stringify({ success: true, stores: allStores }));
            }
          }

          if (pathPart === 'store') {
            if (method === 'GET') {
              const requestedId = url.searchParams.get('id');
              const store = requestedId 
                ? db.prepare('SELECT * FROM stores WHERE id = ?').get(requestedId)
                : db.prepare('SELECT * FROM stores WHERE is_active = 1 LIMIT 1').get();
              return res.end(JSON.stringify({ success: true, store: store || null }));
            }
            if (method === 'POST' || method === 'PUT') {
              const body = await readBody();
              const id = body.id || 'store-' + Date.now();
              const { name, activity_type, whatsapp_number = '201061532875', currency = 'ج.م', bio = '', logo_data = '' } = body;
              
              const existing = db.prepare('SELECT id FROM stores WHERE id = ?').get(id);

              if (existing) {
                db.prepare(`
                  UPDATE stores 
                  SET name = ?, activity_type = ?, whatsapp_number = ?, currency = ?, bio = ?, logo_data = ?, updated_at = datetime('now')
                  WHERE id = ?
                `).run(name, activity_type, whatsapp_number, currency, bio, logo_data, id);
              } else {
                db.prepare(`
                  INSERT INTO stores (id, name, activity_type, whatsapp_number, currency, bio, logo_data, is_active)
                  VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                `).run(id, name, activity_type, whatsapp_number, currency, bio, logo_data);
              }

              const saved = db.prepare('SELECT * FROM stores WHERE id = ?').get(id);
              return res.end(JSON.stringify({ success: true, store: saved }));
            }
          }

          // 6. Products
          if (pathPart === 'products' || pathPart.startsWith('products/')) {
            if (method === 'GET') {
              const storeId = url.searchParams.get('store_id');
              const products = storeId
                ? db.prepare('SELECT * FROM products WHERE store_id = ? ORDER BY created_at DESC').all(storeId)
                : db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
              return res.end(JSON.stringify({ success: true, products }));
            }

            if (method === 'POST') {
              const body = await readBody();
              const id = 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
              const { store_id = 'store-elegance', name, description = '', price, category = 'عام', image_data, is_available = 1 } = body;
              
              db.prepare(`
                INSERT INTO products (id, store_id, name, description, price, category, image_data, is_available)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `).run(id, store_id, name, description, Number(price), category, image_data, is_available ? 1 : 0);

              const created = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
              return res.end(JSON.stringify({ success: true, product: created }));
            }

            if (method === 'PUT') {
              const id = pathPart.replace('products/', '');
              const body = await readBody();
              const { name, description = '', price, category = 'عام', image_data, is_available = 1 } = body;

              if (image_data) {
                db.prepare(`
                  UPDATE products 
                  SET name = ?, description = ?, price = ?, category = ?, image_data = ?, is_available = ?, updated_at = datetime('now')
                  WHERE id = ?
                `).run(name, description, Number(price), category, image_data, is_available ? 1 : 0, id);
              } else {
                db.prepare(`
                  UPDATE products 
                  SET name = ?, description = ?, price = ?, category = ?, is_available = ?, updated_at = datetime('now')
                  WHERE id = ?
                `).run(name, description, Number(price), category, is_available ? 1 : 0, id);
              }

              const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
              return res.end(JSON.stringify({ success: true, product: updated }));
            }

            if (method === 'DELETE') {
              const id = pathPart.replace('products/', '');
              db.prepare('DELETE FROM products WHERE id = ?').run(id);
              return res.end(JSON.stringify({ success: true, deletedId: id }));
            }
          }

          // 7. Orders
          if (pathPart === 'orders') {
            if (method === 'GET') {
              const storeId = url.searchParams.get('store_id');
              const orders = storeId 
                ? db.prepare('SELECT * FROM orders WHERE store_id = ? ORDER BY created_at DESC').all(storeId)
                : db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
              return res.end(JSON.stringify({ success: true, orders }));
            }
            if (method === 'POST') {
              const body = await readBody();
              const id = 'ord-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
              db.prepare(`
                INSERT INTO orders (id, store_id, customer_name, customer_phone, customer_address, items_json, total_price, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'completed_via_whatsapp')
              `).run(id, body.store_id || 'store-elegance', body.customer_name, body.customer_phone, body.customer_address || '', JSON.stringify(body.items), Number(body.total_price));

              return res.end(JSON.stringify({ success: true, orderId: id }));
            }
          }

          // 8. Traffic & Visitor Stats
          if (pathPart === 'visit') {
            if (method === 'POST') {
              const body = await readBody();
              const storeId = body.store_id || 'store-elegance';
              let device = body.device;
              if (!device) {
                const ua = (req.headers['user-agent'] || '').toLowerCase();
                if (ua.includes('ipad') || ua.includes('tablet')) device = 'الأجهزة اللوحية (Tablet)';
                else if (ua.includes('iphone') || ua.includes('android') || ua.includes('mobile')) device = 'أجهزة الجوال (Mobile)';
                else device = 'أجهزة الكمبيوتر (Desktop)';
              }
              const referrer = body.referrer || (req.headers['referer'] ? 'إحالة خارجية' : 'زيارة مباشرة');
              const page = body.page || '/store';
              const id = 'vis-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

              db.prepare(`
                INSERT INTO traffic_stats (id, store_id, visited_at, device, page, referrer)
                VALUES (?, ?, datetime('now'), ?, ?, ?)
              `).run(id, storeId, device, page, referrer);

              return res.end(JSON.stringify({ success: true, visitId: id }));
            }
          }

          if (pathPart === 'stats') {
            if (method === 'GET') {
              const storeId = url.searchParams.get('store_id') || 'store-elegance';
              const range = url.searchParams.get('range') || '7days';

              // Total visits
              const totalRow = db.prepare('SELECT COUNT(*) as count FROM traffic_stats WHERE store_id = ?').get(storeId) as { count: number };
              const totalVisits = totalRow?.count || 0;

              // Today's visits
              const todayRow = db.prepare("SELECT COUNT(*) as count FROM traffic_stats WHERE store_id = ? AND date(visited_at) = date('now')").get(storeId) as { count: number };
              const todayVisits = todayRow?.count || 0;

              // Yesterday's visits
              const yesterdayRow = db.prepare("SELECT COUNT(*) as count FROM traffic_stats WHERE store_id = ? AND date(visited_at) = date('now', '-1 day')").get(storeId) as { count: number };
              const yesterdayVisits = yesterdayRow?.count || 0;

              // Growth rate
              let growthRate = 0;
              if (yesterdayVisits > 0) {
                growthRate = Number((((todayVisits - yesterdayVisits) / yesterdayVisits) * 100).toFixed(1));
              } else if (todayVisits > 0) {
                growthRate = 100;
              }

              // Devices breakdown
              const deviceRows = db.prepare(`
                SELECT device, COUNT(*) as count 
                FROM traffic_stats 
                WHERE store_id = ? 
                GROUP BY device 
                ORDER BY count DESC
              `).all(storeId) as Array<{ device: string; count: number }>;

              const devicesWithPercentage = deviceRows.map(d => ({
                device: d.device,
                count: d.count,
                percentage: totalVisits > 0 ? Number(((d.count / totalVisits) * 100).toFixed(1)) : 0
              }));

              // Daily activity for last 7 or 30 days
              const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
              const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
              const daily: Array<{ day: string; count: number; date: string; active: boolean; dayNumber: string; shortDate: string; fullFormatted: string }> = [];
              const numDays = range === '30days' ? 30 : 7;

              for (let i = numDays - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                const dayName = arabicDays[d.getDay()];
                const dayNum = String(d.getDate());
                const monthName = arabicMonths[d.getMonth()];

                const row = db.prepare("SELECT COUNT(*) as count FROM traffic_stats WHERE store_id = ? AND date(visited_at) = ?").get(storeId, dateStr) as { count: number };
                const count = row?.count || 0;

                daily.push({
                  day: dayName,
                  count,
                  date: dateStr,
                  active: i === 0,
                  dayNumber: dayNum,
                  shortDate: `${d.getMonth() + 1}/${d.getDate()}`,
                  fullFormatted: `${dayName}، ${dayNum} ${monthName}`,
                });
              }

              const rangeVisits = daily.reduce((sum, item) => sum + item.count, 0);
              const dailyAverage = Math.round(rangeVisits / numDays);
              const peakDay = daily.reduce((max, item) => item.count > max.count ? item : max, daily[0] || { count: 0, fullFormatted: '' });

              // Recent visits log
              const recent = db.prepare(`
                SELECT id, visited_at, device, referrer, page
                FROM traffic_stats
                WHERE store_id = ?
                ORDER BY visited_at DESC
                LIMIT 8
              `).all(storeId) as any[];

              // Orders summary for this store
              const ordersSummary = db.prepare(`
                SELECT 
                  COUNT(*) as total_orders,
                  COALESCE(SUM(total_price), 0) as total_revenue
                FROM orders
                WHERE store_id = ?
              `).get(storeId) as { total_orders: number; total_revenue: number };

              // Products summary for this store
              const productsSummary = db.prepare(`
                SELECT 
                  COUNT(*) as total_products,
                  COALESCE(SUM(CASE WHEN is_available = 1 THEN 1 ELSE 0 END), 0) as available_products
                FROM products
                WHERE store_id = ?
              `).get(storeId) as { total_products: number; available_products: number };

              return res.end(JSON.stringify({
                success: true,
                stats: {
                  totalVisits,
                  todayVisits,
                  yesterdayVisits,
                  growthRate,
                  devices: devicesWithPercentage,
                  daily,
                  rangeVisits,
                  dailyAverage,
                  peakDay,
                  recent,
                  ordersSummary,
                  productsSummary,
                }
              }));
            }
          }

          // 9. Simulate Live Visit
          if (pathPart === 'simulate-visit') {
            if (method === 'POST') {
              const body = await readBody();
              const storeId = body.store_id || 'store-elegance';
              const devices = ['أجهزة الجوال (Mobile)', 'أجهزة الكمبيوتر (Desktop)', 'الأجهزة اللوحية (Tablet)'];
              const randVal = Math.random();
              const randDev = randVal < 0.85 ? devices[0] : (randVal < 0.95 ? devices[1] : devices[2]);
              const id = 'vis-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

              db.prepare(`
                INSERT INTO traffic_stats (id, store_id, visited_at, device, page, referrer)
                VALUES (?, ?, datetime('now'), ?, '/store', 'تجربة تفاعلية مباشرة')
              `).run(id, storeId, randDev);

              const todayRow = db.prepare("SELECT COUNT(*) as count FROM traffic_stats WHERE store_id = ? AND date(visited_at) = date('now')").get(storeId) as { count: number };
              const totalRow = db.prepare('SELECT COUNT(*) as count FROM traffic_stats WHERE store_id = ?').get(storeId) as { count: number };

              return res.end(JSON.stringify({
                success: true,
                newVisit: { id, device: randDev, visited_at: new Date().toISOString() },
                todayVisits: todayRow?.count || 0,
                totalVisits: totalRow?.count || 0,
              }));
            }
          }

          // 10. Simulate Live Order (Strictly store-context aware)
          if (pathPart === 'simulate-order') {
            if (method === 'POST') {
              const body = await readBody();
              const storeId = body.store_id || 'store-elegance';
              const names = ['أحمد محمود', 'سارة خالد', 'محمد علي', 'نور الدين', 'فاطمة الزهراء', 'مريم إبراهيم'];
              const randomName = names[Math.floor(Math.random() * names.length)];

              // Pull an actual product from this specific store
              const storeProds = db.prepare('SELECT id, name, price, category, image_data FROM products WHERE store_id = ?').all(storeId) as any[];
              let chosenProd = storeProds.length > 0 ? storeProds[Math.floor(Math.random() * storeProds.length)] : null;
              const items = chosenProd ? [{ product: chosenProd, quantity: 1 }] : [];
              const orderPrice = chosenProd ? Number(chosenProd.price) : 340;
              const id = 'ord-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

              db.prepare(`
                INSERT INTO orders (id, store_id, customer_name, customer_phone, customer_address, items_json, total_price, status)
                VALUES (?, ?, ?, '010' || ABS(RANDOM() % 90000000 + 10000000), 'القاهرة، مصر', ?, ?, 'completed_via_whatsapp')
              `).run(id, storeId, randomName, JSON.stringify(items), orderPrice);

              return res.end(JSON.stringify({
                success: true,
                orderId: id,
                customer_name: randomName,
                total_price: orderPrice,
                product_name: chosenProd ? chosenProd.name : null
              }));
            }
          }

          // 10.5. Reset Stats
          if (pathPart === 'reset-stats') {
            if (method === 'POST') {
              const body = await readBody();
              const storeId = body.store_id || 'store-elegance';
              db.prepare('DELETE FROM traffic_stats WHERE store_id = ?').run(storeId);
              db.prepare('DELETE FROM orders WHERE store_id = ?').run(storeId);
              return res.end(JSON.stringify({ success: true }));
            }
          }

          // 11. D1 Status
          if (pathPart === 'd1-status') {
            const sc = db.prepare('SELECT COUNT(*) as c FROM stores').get() as { c: number };
            const pc = db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number };
            const uc = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
            return res.end(JSON.stringify({
              success: true,
              engine: 'Cloudflare D1 Multi-Tenant Engine',
              database: 'my-store-d1',
              subpath: SUBPATH,
              tables: {
                stores: sc.c,
                products: pc.c,
                users: uc.c,
              }
            }));
          }

          res.statusCode = 404;
          return res.end(JSON.stringify({ error: 'Endpoint not found' }));
        } catch (e: any) {
          console.error('[Cloudflare D1 API Error]:', e);
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: e.message || 'Internal server error' }));
        }
      });
    }
  };
}

export default defineConfig({
  base: SUBPATH,
  plugins: [react(), cloudflareD1Plugin()],
  server: {
    port: 5173,
    host: true,
  }
});
