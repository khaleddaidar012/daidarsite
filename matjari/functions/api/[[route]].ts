// Cloudflare Pages Function with Cloudflare D1 Binding
export interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Clean path
  let path = url.pathname;
  if (path.includes('/api/')) {
    path = path.substring(path.indexOf('/api/') + 5).replace(/\/$/, '');
  } else {
    path = path.replace(/^\//, '').replace(/\/$/, '');
  }

  const method = request.method;

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    const db = env.DB;

    // 1. Auth: Login
    if (path === 'auth/login') {
      if (method === 'POST') {
        const body = await request.json() as any;
        const { username, password } = body;
        const loginId = (username || '').trim();

        const user = await db.prepare('SELECT id, username, email, role, store_id, is_active FROM users WHERE (username = ? OR (email != "" AND email = ?)) AND password = ?').bind(loginId, loginId, password).first();

        if (!user) {
          return new Response(JSON.stringify({ success: false, error: 'البريد الإلكتروني / اسم المستخدم أو كلمة المرور غير صحيحة' }), { status: 401, headers });
        }

        if ((user as any).role === 'super_admin' && (user as any).is_active === 0) {
          return new Response(JSON.stringify({ success: false, error: 'حساب الأدمن موقوف حالياً.' }), { status: 403, headers });
        }

        let store = null;
        let subscription = null;

        if ((user as any).store_id) {
          store = await db.prepare('SELECT * FROM stores WHERE id = ?').bind((user as any).store_id).first();
          subscription = await db.prepare('SELECT * FROM subscriptions WHERE store_id = ? ORDER BY created_at DESC LIMIT 1').bind((user as any).store_id).first();
        }

        return new Response(JSON.stringify({
          success: true,
          user,
          store,
          subscription,
        }), { headers });
      }
    }

    // 1.5. Auth: Register (New Merchant Self-Signup)
    if (path === 'auth/register') {
      if (method === 'POST') {
        const body = await request.json() as any;
        const {
          store_name,
          activity_type = 'عام',
          whatsapp_number,
          currency = 'ج.م',
          email = '',
          username,
          password,
        } = body;

        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanUsername = (username || cleanEmail.split('@')[0] || '').trim();

        if (!store_name || !cleanEmail || !password || !whatsapp_number) {
          return new Response(JSON.stringify({ success: false, error: 'يرجى ملء جميع الحقول المطلوبة بما في ذلك بريد Google واسم المتجر' }), { status: 400, headers });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
          return new Response(JSON.stringify({ success: false, error: 'يرجى إدخال بريد إلكتروني حقيقي من Google (مثال: name@gmail.com)' }), { status: 400, headers });
        }

        const existingUser = await db.prepare('SELECT id FROM users WHERE username = ? OR (email != "" AND email = ?)').bind(cleanUsername, cleanEmail).first();
        if (existingUser) {
          return new Response(JSON.stringify({ success: false, error: 'البريد الإلكتروني أو اسم المستخدم هذا مسجل مسبقاً، يرجى تسجيل الدخول' }), { status: 400, headers });
        }

        const storeId = 'store-' + Date.now();
        const userId = 'usr-' + Date.now();
        const subId = 'sub-' + Date.now();

        await db.prepare(`
          INSERT INTO stores (id, name, activity_type, whatsapp_number, currency, bio, is_active)
          VALUES (?, ?, ?, ?, ?, '', 0)
        `).bind(storeId, store_name.trim(), activity_type.trim(), whatsapp_number.trim(), currency).run();

        await db.prepare(`
          INSERT INTO users (id, username, email, password, role, store_id, is_active)
          VALUES (?, ?, ?, ?, 'merchant', ?, 0)
        `).bind(userId, cleanUsername, cleanEmail, password.trim(), storeId).run();

        await db.prepare(`
          INSERT INTO subscriptions (id, store_id, plan_name, status, start_date, end_date, price)
          VALUES (?, ?, 'الباقة الترحيبية', 'active', date('now'), date('now', '+12 month'), 0)
        `).bind(subId, storeId).run();

        const createdStore = await db.prepare('SELECT * FROM stores WHERE id = ?').bind(storeId).first();
        const createdUser = await db.prepare('SELECT id, username, email, role, store_id, is_active FROM users WHERE id = ?').bind(userId).first();
        const createdSub = await db.prepare('SELECT * FROM subscriptions WHERE id = ?').bind(subId).first();

        return new Response(JSON.stringify({
          success: true,
          user: createdUser,
          store: createdStore,
          subscription: createdSub,
        }), { headers });
      }
    }

    // 2. Super Admin: Merchants Directory
    if (path === 'admin/merchants') {
      if (method === 'GET') {
        const stores = await db.prepare('SELECT * FROM stores ORDER BY created_at DESC').all();
        const results = [];
        for (const store of (stores.results || [])) {
          const user = await db.prepare('SELECT id, username, role, is_active FROM users WHERE store_id = ?').bind((store as any).id).first();
          const sub = await db.prepare('SELECT * FROM subscriptions WHERE store_id = ? ORDER BY created_at DESC LIMIT 1').bind((store as any).id).first();
          const pCount = await db.prepare('SELECT COUNT(*) as c FROM products WHERE store_id = ?').bind((store as any).id).first();
          results.push({
            store,
            user: user || { id: '', username: 'غير مرتبط', is_active: (store as any).is_active },
            subscription: sub || { status: 'expired', end_date: 'غير محدد', plan_name: 'لا يوجد' },
            productCount: (pCount as any)?.c || 0,
          });
        }
        return new Response(JSON.stringify({ success: true, merchants: results }), { headers });
      }

      if (method === 'POST') {
        const body = await request.json() as any;
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
        } = body;

        const existingUser = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
        if (existingUser) {
          return new Response(JSON.stringify({ success: false, error: 'اسم المستخدم محجوز بالفعل' }), { status: 400, headers });
        }

        const storeId = 'store-' + Date.now();
        const userId = 'usr-' + Date.now();
        const subId = 'sub-' + Date.now();

        await db.prepare(`
          INSERT INTO stores (id, name, activity_type, whatsapp_number, currency, bio, is_active)
          VALUES (?, ?, ?, ?, ?, '', 1)
        `).bind(storeId, store_name, activity_type, whatsapp_number, currency).run();

        await db.prepare(`
          INSERT INTO users (id, username, password, role, store_id, is_active)
          VALUES (?, ?, ?, 'merchant', ?, 1)
        `).bind(userId, username, password, storeId).run();

        const months = Number(duration_months) || 12;
        await db.prepare(`
          INSERT INTO subscriptions (id, store_id, plan_name, status, start_date, end_date, price)
          VALUES (?, ?, ?, 'active', date('now'), date('now', '+' || ? || ' month'), ?)
        `).bind(subId, storeId, plan_name, months, Number(price) || 0).run();

        const createdStore = await db.prepare('SELECT * FROM stores WHERE id = ?').bind(storeId).first();
        const createdUser = await db.prepare('SELECT id, username, role, is_active FROM users WHERE id = ?').bind(userId).first();
        const createdSub = await db.prepare('SELECT * FROM subscriptions WHERE id = ?').bind(subId).first();

        return new Response(JSON.stringify({
          success: true,
          merchant: {
            store: createdStore,
            user: createdUser,
            subscription: createdSub,
            productCount: 0,
          }
        }), { headers });
      }
    }

    // 3. Super Admin: Toggle Store & User Status
    if (path.startsWith('admin/merchants/') && path.endsWith('/toggle-status')) {
      if (method === 'PUT') {
        const storeId = path.replace('admin/merchants/', '').replace('/toggle-status', '');
        const store = await db.prepare('SELECT * FROM stores WHERE id = ?').bind(storeId).first();
        
        if (!store) {
          return new Response(JSON.stringify({ success: false, error: 'المتجر غير موجود' }), { status: 404, headers });
        }

        const nextState = (store as any).is_active === 1 ? 0 : 1;
        await db.prepare('UPDATE stores SET is_active = ?, updated_at = datetime("now") WHERE id = ?').bind(nextState, storeId).run();
        await db.prepare('UPDATE users SET is_active = ?, updated_at = datetime("now") WHERE store_id = ?').bind(nextState, storeId).run();

        return new Response(JSON.stringify({ success: true, is_active: nextState }), { headers });
      }
    }

    // 4. Super Admin: Renew / Adjust Subscription (Add or Subtract Months)
    if (path.startsWith('admin/merchants/') && path.endsWith('/renew-subscription')) {
      if (method === 'POST') {
        const storeId = path.replace('admin/merchants/', '').replace('/renew-subscription', '');
        const body = await request.json() as any;
        const monthsDelta = Number(body.months);
        const validDelta = isNaN(monthsDelta) || monthsDelta === 0 ? 12 : monthsDelta;
        const modifier = validDelta >= 0 ? `+${validDelta} month` : `${validDelta} month`;

        const existingSub = await db.prepare('SELECT * FROM subscriptions WHERE store_id = ? ORDER BY created_at DESC LIMIT 1').bind(storeId).first();

        if (existingSub) {
          const baseDateExpr = validDelta >= 0
            ? "CASE WHEN end_date > date('now') THEN end_date ELSE date('now') END"
            : "end_date";

          await db.prepare(`
            UPDATE subscriptions 
            SET end_date = date(${baseDateExpr}, ?),
                status = CASE WHEN date(${baseDateExpr}, ?) >= date('now') THEN 'active' ELSE 'expired' END,
                updated_at = datetime('now')
            WHERE id = ?
          `).bind(modifier, modifier, (existingSub as any).id).run();
        } else {
          const subId = 'sub-' + Date.now();
          await db.prepare(`
            INSERT INTO subscriptions (id, store_id, plan_name, status, start_date, end_date, price)
            VALUES (?, ?, 'الباقة المجددة', 'active', date('now'), date('now', ?), 1000)
          `).bind(subId, storeId, modifier).run();
        }

        const updatedSub = await db.prepare('SELECT * FROM subscriptions WHERE store_id = ? ORDER BY created_at DESC LIMIT 1').bind(storeId).first();
        return new Response(JSON.stringify({ success: true, subscription: updatedSub }), { headers });
      }
    }

    // 5. Stores & Store Info
    if (path === 'stores') {
      if (method === 'GET') {
        const allStores = await db.prepare('SELECT * FROM stores WHERE is_active = 1 ORDER BY created_at DESC').all();
        return new Response(JSON.stringify({ success: true, stores: allStores.results || [] }), { headers });
      }
    }

    if (path === 'store') {
      if (method === 'GET') {
        const requestedId = url.searchParams.get('id');
        const store = requestedId 
          ? await db.prepare('SELECT * FROM stores WHERE id = ?').bind(requestedId).first()
          : await db.prepare('SELECT * FROM stores WHERE is_active = 1 LIMIT 1').first();
        return new Response(JSON.stringify({ success: true, store: store || null }), { headers });
      }

      if (method === 'POST' || method === 'PUT') {
        const body = await request.json() as any;
        const id = body.id || 'store-' + Date.now();
        const { name, activity_type, whatsapp_number = '201061532875', currency = 'ج.م', bio = '', logo_data = '' } = body;

        const existing = await db.prepare('SELECT id FROM stores WHERE id = ?').bind(id).first();
        if (existing) {
          await db.prepare(`
            UPDATE stores 
            SET name = ?, activity_type = ?, whatsapp_number = ?, currency = ?, bio = ?, logo_data = ?, updated_at = datetime('now')
            WHERE id = ?
          `).bind(name, activity_type, whatsapp_number, currency, bio, logo_data, id).run();
        } else {
          await db.prepare(`
            INSERT INTO stores (id, name, activity_type, whatsapp_number, currency, bio, logo_data, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
          `).bind(id, name, activity_type, whatsapp_number, currency, bio, logo_data).run();
        }

        const saved = await db.prepare('SELECT * FROM stores WHERE id = ?').bind(id).first();
        return new Response(JSON.stringify({ success: true, store: saved }), { headers });
      }
    }

    // 6. Products
    if (path === 'products' || path.startsWith('products/')) {
      if (method === 'GET') {
        const storeId = url.searchParams.get('store_id');
        const products = storeId
          ? await db.prepare('SELECT * FROM products WHERE store_id = ? ORDER BY created_at DESC').bind(storeId).all()
          : await db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
        return new Response(JSON.stringify({ success: true, products: products.results || [] }), { headers });
      }

      if (method === 'POST') {
        const body = await request.json() as any;
        const id = 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        const { store_id = 'store-elegance', name, description = '', price, category = 'عام', image_data, is_available = 1 } = body;

        await db.prepare(`
          INSERT INTO products (id, store_id, name, description, price, category, image_data, is_available)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, store_id, name, description, Number(price), category, image_data, is_available ? 1 : 0).run();

        const created = await db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
        return new Response(JSON.stringify({ success: true, product: created }), { headers });
      }

      if (method === 'PUT') {
        const id = path.replace('products/', '');
        const body = await request.json() as any;
        const { name, description = '', price, category = 'عام', image_data, is_available = 1 } = body;

        if (image_data) {
          await db.prepare(`
            UPDATE products 
            SET name = ?, description = ?, price = ?, category = ?, image_data = ?, is_available = ?, updated_at = datetime('now')
            WHERE id = ?
          `).bind(name, description, Number(price), category, image_data, is_available ? 1 : 0, id).run();
        } else {
          await db.prepare(`
            UPDATE products 
            SET name = ?, description = ?, price = ?, category = ?, is_available = ?, updated_at = datetime('now')
            WHERE id = ?
          `).bind(name, description, Number(price), category, is_available ? 1 : 0, id).run();
        }

        const updated = await db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
        return new Response(JSON.stringify({ success: true, product: updated }), { headers });
      }

      if (method === 'DELETE') {
        const id = path.replace('products/', '');
        await db.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
        return new Response(JSON.stringify({ success: true, deletedId: id }), { headers });
      }
    }

    // 7. Orders
    if (path === 'orders') {
      if (method === 'GET') {
        const storeId = url.searchParams.get('store_id');
        const orders = storeId 
          ? await db.prepare('SELECT * FROM orders WHERE store_id = ? ORDER BY created_at DESC').bind(storeId).all()
          : await db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
        return new Response(JSON.stringify({ success: true, orders: orders.results || [] }), { headers });
      }

      if (method === 'POST') {
        const body = await request.json() as any;
        const id = 'ord-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        const { store_id = 'store-elegance', customer_name, customer_phone, customer_address = '', items, total_price } = body;

        await db.prepare(`
          INSERT INTO orders (id, store_id, customer_name, customer_phone, customer_address, items_json, total_price, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'completed_via_whatsapp')
        `).bind(id, store_id, customer_name, customer_phone, customer_address, JSON.stringify(items), Number(total_price)).run();

        return new Response(JSON.stringify({ success: true, orderId: id }), { headers });
      }
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found: ' + path }), { status: 404, headers });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Server error' }), { status: 500, headers });
  }
};
