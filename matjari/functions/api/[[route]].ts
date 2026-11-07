import { currentActor, publicUser, newSession, passwordHash, passwordMatches, digest, token, cookie, rateLimit, type Actor } from '../../lib/auth';
import { ecoLogout, type EcoEnv, type EcoDB } from '../../../shared/ecosystem';
import { syncStoreResource } from '../../lib/ecosystem';
import { displayStorePlan, effectiveStoreStatus, storeIsAvailable } from '../../lib/store-status';
// Cloudflare Pages Function with Cloudflare D1 Binding
export interface Env extends EcoEnv {
  DB: EcoDB;
  READ_ONLY_PREVIEW?: string;
}

export const onRequest = ({request,env}:{request:Request;env:Env}) => handleStoreRequest(request,env);

// Server-only delegation. The public HTTP entry point never accepts an actor.
export async function handleStoreRequest(request:Request, env:Env, delegatedActor?:Actor) {
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
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Public preview has no authenticated management API yet. Only catalog reads
  // are enabled, so demo visitors cannot read customer records or mutate data.
  if (env.READ_ONLY_PREVIEW === 'true' &&
      (method !== 'GET' || !['stores', 'store', 'products'].includes(path))) {
    return new Response(JSON.stringify({ success: false, error: 'هذه نسخة معاينة للعرض فقط. التسجيل وإدارة المتاجر غير متاحين حالياً.' }), { status: 403, headers });
  }

  try {
    const db = env.DB;
    const fail = (message: string, status = 403) => new Response(JSON.stringify({ success: false, error: message }), { status, headers });
    if (!['GET', 'OPTIONS'].includes(method)) {
      if (request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) return fail('الطلب غير مسموح');
      if (request.headers.get('Sec-Fetch-Site') === 'cross-site') return fail('الطلب غير مسموح');
      if (method !== 'DELETE' && !request.headers.get('Content-Type')?.startsWith('application/json')) return fail('يلزم إرسال JSON', 415);
      if (Number(request.headers.get('Content-Length') || 0) > 2097152) return fail('حجم البيانات كبير جداً', 413);
    }
    const actor = delegatedActor || await currentActor(db, request, env);
    if(path==='auth/create-store'&&method==='POST'){
      if(!actor)return fail('سجل الدخول أولاً',401);
      if(actor.store_id||actor.role!=='merchant')return fail('الحساب لديه متجر بالفعل',409);
      const b=await request.json() as any;
      if(typeof b.name!=='string'||!b.name.trim()||b.name.length>160||typeof b.whatsapp_number!=='string'||!/^\+?[0-9]{8,15}$/.test(b.whatsapp_number))return fail('أدخل اسم المتجر ورقم واتساب صحيح',400);
      const id='store-'+crypto.randomUUID();
      await db.batch([
        db.prepare("INSERT INTO stores(id,name,activity_type,whatsapp_number,is_active) SELECT ?,?,?,?,0 WHERE EXISTS(SELECT 1 FROM users WHERE id=? AND store_id IS NULL)").bind(id,b.name.trim(),String(b.activity_type||'عام').slice(0,100),b.whatsapp_number,actor.id),
        db.prepare('UPDATE users SET store_id=? WHERE id=? AND store_id IS NULL').bind(id,actor.id),
        db.prepare("INSERT INTO subscriptions(id,store_id,plan_name,status,price) SELECT ?,?,'اشتراك مجاني','awaiting_activation',0 WHERE EXISTS(SELECT 1 FROM users WHERE id=? AND store_id=?)").bind(crypto.randomUUID(),id,actor.id,id)
      ]);
      return new Response(JSON.stringify({success:true}),{headers});
    }
    if (path === 'auth/session' && method === 'GET') {
      if (!actor) return fail('يرجى تسجيل الدخول', 401);
      const store = actor.store_id ? await db.prepare('SELECT * FROM stores WHERE id=?').bind(actor.store_id).first() : null;
      const subscription = actor.store_id ? await db.prepare('SELECT * FROM subscriptions WHERE store_id=? ORDER BY created_at DESC LIMIT 1').bind(actor.store_id).first() : null;
      const userActive = actor.store_id ? await db.prepare('SELECT is_active FROM users WHERE id=?').bind(actor.id).first() : null;
      const effective_status = store ? effectiveStoreStatus(userActive?.is_active, store.is_active, subscription) : null;
      return new Response(JSON.stringify({ success: true, user: publicUser(actor), store: store ? { ...store, effective_status } : null, subscription: subscription ? { ...subscription, plan_name: displayStorePlan(subscription) } : null }), { headers });
    }
    if (path === 'auth/logout' && method === 'POST') {
      await db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await digest(token(request))).run();
      const out=new Headers(headers);out.append('Set-Cookie',cookie('',0));if(env.ECOSYSTEM_DB)out.append('Set-Cookie',await ecoLogout(request,env));
      return new Response(JSON.stringify({ success: true }), { headers:out });
    }
    const adminPath = path.startsWith('admin/') || path === 'd1-status';
    const privatePath = adminPath || ['stats','reset-stats','simulate-visit','simulate-order'].includes(path) ||
      (path === 'orders' && method === 'GET') || (path === 'store' && method !== 'GET') ||
      (path.startsWith('products') && method !== 'GET');
    if (privatePath && !actor) return fail('يرجى تسجيل الدخول', 401);
    if (adminPath && actor?.role !== 'super_admin') return fail('هذه الصلاحية للإدارة فقط');
    if (['simulate-visit','simulate-order','reset-stats'].includes(path)) return fail('هذه العملية غير متاحة', 404);
    // Only the server session determines ownership. Body/localStorage roles are ignored.
    if (privatePath && actor?.role !== 'super_admin') {
      let storeId = url.searchParams.get('store_id');
      if (path === 'store') storeId = (await request.clone().json() as any).id;
      if (path === 'products' && method === 'POST') storeId = (await request.clone().json() as any).store_id;
      if (path.startsWith('products/')) {
        const product = await db.prepare('SELECT store_id FROM products WHERE id=?').bind(path.slice(9)).first() as any;
        if (!product) return fail('المنتج غير موجود', 404);
        storeId = product.store_id;
      }
      storeId ||= actor!.store_id;
      if (!storeId || storeId !== actor!.store_id) return fail('لا يمكنك الوصول إلى متجر آخر');
      url.searchParams.set('store_id', storeId);
      const store = await db.prepare('SELECT is_active FROM stores WHERE id=?').bind(storeId).first() as any;
      if (!store?.is_active && !['orders','stats'].includes(path)) return fail('متجرك بانتظار التفعيل من الإدارة');
      if(!['GET','HEAD'].includes(method)){
        const sub=await db.prepare('SELECT status,start_date,end_date FROM subscriptions WHERE store_id=? ORDER BY created_at DESC LIMIT 1').bind(storeId).first() as any;
        if(!storeIsAvailable(effectiveStoreStatus(1,store?.is_active,sub)))return fail('الاشتراك غير فعال. تواصل مع الدعم للتجديد.');
      }
    }
    if (path === 'store' && method === 'GET' && url.searchParams.get('id')) {
      const id = url.searchParams.get('id');
      const row = await db.prepare('SELECT is_active FROM stores WHERE id=?').bind(id).first() as any;
      if (!row || (!row.is_active && actor?.role !== 'super_admin' && actor?.store_id !== id)) return fail('المتجر غير متاح', 404);
    }
    if (path === 'stats' && method === 'GET') {
      const storeId = url.searchParams.get('store_id') || actor?.store_id;
      if (!storeId) return fail('حدد المتجر', 400);
      const summary = await db.prepare(`SELECT COUNT(*) AS totalVisits, COALESCE(SUM(date(visited_at)=date('now')),0) AS todayVisits FROM traffic_stats WHERE store_id=?`).bind(storeId).first();
      const devices = await db.prepare('SELECT device,COUNT(*) AS count FROM traffic_stats WHERE store_id=? GROUP BY device').bind(storeId).all();
      const recent = await db.prepare('SELECT * FROM traffic_stats WHERE store_id=? ORDER BY visited_at DESC LIMIT 8').bind(storeId).all();
      const daily = await db.prepare("SELECT date(visited_at) AS day,COUNT(*) AS count FROM traffic_stats WHERE store_id=? AND visited_at>=datetime('now','-30 days') GROUP BY date(visited_at) ORDER BY day").bind(storeId).all();
      return new Response(JSON.stringify({ success: true, stats: { ...summary as any, devices: devices.results, recent: recent.results, daily: daily.results } }), { headers });
    }
    if (path === 'visit' && method === 'POST') {
      await rateLimit(db,request,'visit',120,3600000);
      const b = await request.json() as any;
      const storeAccess = typeof b.store_id === 'string' ? await getStoreAccess(db,b.store_id) : null;
      if (!storeAccess || !storeIsAvailable(storeAccess.status)) return fail('المتجر غير متاح',404);
      await db.prepare('INSERT INTO traffic_stats(id,store_id,device,referrer) VALUES(?,?,?,?)').bind(crypto.randomUUID(),b.store_id,String(b.device||'موبايل').slice(0,80),String(b.referrer||'مباشر').slice(0,300)).run();
      return new Response(JSON.stringify({success:true}),{headers});
    }

    // 1. Auth: Login
    if (path === 'auth/login') {
      if (method === 'POST') {
        const body = await request.json() as any;
        const { username, password } = body;
        await rateLimit(db, request, 'login', 20, 900000);
        if (typeof username !== 'string' || typeof password !== 'string' || password.length > 256 || username.length > 254) return fail('بيانات الدخول غير صحيحة', 400);
        const loginId = (username || '').trim();

        const user = await db.prepare('SELECT * FROM users WHERE username=? OR (length(email)>0 AND email=?)').bind(loginId, loginId.toLowerCase()).first() as any;

        if (!user || !await passwordMatches(password, user.password)) {
          if (!user) await passwordHash(password);
          return new Response(JSON.stringify({ success: false, error: 'البريد الإلكتروني / اسم المستخدم أو كلمة المرور غير صحيحة' }), { status: 401, headers });
        }

        if ((user as any).is_active === 0) {
          return new Response(JSON.stringify({ success: false, error: 'حساب الأدمن موقوف حالياً.' }), { status: 403, headers });
        }

        let store: any = null;
        let subscription: any = null;

        if ((user as any).store_id) {
          store = await db.prepare('SELECT * FROM stores WHERE id = ?').bind((user as any).store_id).first();
          subscription = await db.prepare('SELECT * FROM subscriptions WHERE store_id = ? ORDER BY created_at DESC LIMIT 1').bind((user as any).store_id).first();
        }

        const effective_status = store ? effectiveStoreStatus(user.is_active,store.is_active,subscription) : null;
        return new Response(JSON.stringify({
          success: true,
          user: publicUser(user),
          store: store ? { ...store, effective_status } : null,
          subscription: subscription ? { ...subscription, plan_name: displayStorePlan(subscription) } : null,
        }), { headers: { ...headers, 'Set-Cookie': await newSession(db, user, env, request, body.link_identity===true) } });
      }
    }

    // 1.5. Auth: Register (New Merchant Self-Signup)
    if (path === 'auth/register') {
      if (method === 'POST') {
        await rateLimit(db, request, 'register', 5, 3600000);
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
        if (typeof password !== 'string' || password.length < 8 || password.length > 256 || !cleanUsername || cleanUsername.length > 80 || String(store_name).length > 160 || String(whatsapp_number).length > 30 || cleanEmail.length > 254) return fail('أدخل بيانات صحيحة وكلمة مرور من ٨ إلى ٢٥٦ حرفاً', 400);
        const hashedPassword = await passwordHash(password);

        if (!store_name || !cleanEmail || !password || !whatsapp_number) {
          return new Response(JSON.stringify({ success: false, error: 'يرجى ملء جميع الحقول المطلوبة بما في ذلك بريد Google واسم المتجر' }), { status: 400, headers });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
          return new Response(JSON.stringify({ success: false, error: 'يرجى إدخال بريد إلكتروني حقيقي من Google (مثال: name@gmail.com)' }), { status: 400, headers });
        }

        const existingUser = await db.prepare('SELECT id FROM users WHERE username = ? OR (length(email)>0 AND email = ?)').bind(cleanUsername, cleanEmail).first();
        if (existingUser) {
          return new Response(JSON.stringify({ success: false, error: 'البريد الإلكتروني أو اسم المستخدم هذا مسجل مسبقاً، يرجى تسجيل الدخول' }), { status: 400, headers });
        }

        const storeId = 'store-' + crypto.randomUUID();
        const userId = 'usr-' + crypto.randomUUID();
        const subId = 'sub-' + crypto.randomUUID();

        await db.batch([db.prepare(`
          INSERT INTO stores (id, name, activity_type, whatsapp_number, currency, bio, is_active)
          VALUES (?, ?, ?, ?, ?, '', 0)
        `).bind(storeId, store_name.trim(), activity_type.trim(), whatsapp_number.trim(), currency),

        db.prepare(`
          INSERT INTO users (id, username, email, password, role, store_id, is_active)
          VALUES (?, ?, ?, ?, 'merchant', ?, 1)
        `).bind(userId, cleanUsername, cleanEmail, hashedPassword, storeId),

        db.prepare(`
          INSERT INTO subscriptions (id, store_id, plan_name, status, start_date, end_date, price)
          VALUES (?, ?, 'الباقة الترحيبية', 'active', date('now'), date('now', '+12 month'), 0)
        `).bind(subId, storeId)]);

        const createdStore = await db.prepare('SELECT * FROM stores WHERE id = ?').bind(storeId).first();
        const createdUser = await db.prepare('SELECT id, username, email, role, store_id, is_active FROM users WHERE id = ?').bind(userId).first();
        const createdSub = await db.prepare('SELECT * FROM subscriptions WHERE id = ?').bind(subId).first();

        return new Response(JSON.stringify({
          success: true,
          user: createdUser,
          store: createdStore,
          subscription: createdSub,
        }), { headers: { ...headers, 'Set-Cookie': await newSession(db, { ...createdUser as any, password: hashedPassword }, env, request) } });
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
          const effective_status = effectiveStoreStatus(user?.is_active, (store as any).is_active, sub);
          results.push({
            store: { ...(store as any), effective_status },
            user: user || { id: '', username: 'غير مرتبط', is_active: (store as any).is_active },
            subscription: sub ? { ...(sub as any), plan_name: displayStorePlan(sub as any) } : { status: 'unsubscribed', end_date: 'غير محدد', plan_name: 'غير محدد' },
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

        if (typeof username !== 'string' || !username.trim() || username.length > 80 || typeof password !== 'string' || password.length < 8 || password.length > 256 || !store_name || !activity_type || !whatsapp_number) return fail('راجع بيانات التاجر وكلمة المرور (٨ أحرف على الأقل)', 400);
        const hashedPassword = await passwordHash(password);
        const existingUser = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
        if (existingUser) {
          return new Response(JSON.stringify({ success: false, error: 'اسم المستخدم محجوز بالفعل' }), { status: 400, headers });
        }

        const storeId = 'store-' + crypto.randomUUID();
        const userId = 'usr-' + crypto.randomUUID();
        const subId = 'sub-' + crypto.randomUUID();

        await db.prepare(`
          INSERT INTO stores (id, name, activity_type, whatsapp_number, currency, bio, is_active)
          VALUES (?, ?, ?, ?, ?, '', 1)
        `).bind(storeId, store_name, activity_type, whatsapp_number, currency).run();

        await db.prepare(`
          INSERT INTO users (id, username, password, role, store_id, is_active)
          VALUES (?, ?, ?, 'merchant', ?, 1)
        `).bind(userId, username.trim(), hashedPassword, storeId).run();

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
    if (/^admin\/merchants\/[^/]+$/.test(path) && method === 'DELETE') {
      const id=path.split('/')[2];
      await db.batch([
        db.prepare('DELETE FROM users WHERE store_id=?').bind(id),
        db.prepare('DELETE FROM stores WHERE id=?').bind(id)
      ]);
      return new Response(JSON.stringify({success:true}),{headers});
    }
    if (path === 'd1-status' && method === 'GET') {
      const counts: Record<string,number>={};
      for (const table of ['stores','products','users']) {
        counts[table]=((await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first()) as any).n;
      }
      return new Response(JSON.stringify({success:true,engine:'Cloudflare D1',tables:counts}),{headers});
    }
    if (path.startsWith('admin/merchants/') && path.endsWith('/toggle-status')) {
      if (method === 'PUT') {
        const storeId = path.replace('admin/merchants/', '').replace('/toggle-status', '');
        const store = await db.prepare('SELECT * FROM stores WHERE id = ?').bind(storeId).first();
        
        if (!store) {
          return new Response(JSON.stringify({ success: false, error: 'المتجر غير موجود' }), { status: 404, headers });
        }

        const nextState = (store as any).is_active === 1 ? 0 : 1;
        if (nextState) {
          const subscription = await db.prepare('SELECT * FROM subscriptions WHERE store_id=? ORDER BY created_at DESC LIMIT 1').bind(storeId).first() as any;
          if (subscription?.status === 'awaiting_activation' && Number(subscription.price) === 0) {
            await db.prepare("UPDATE subscriptions SET status='active',plan_name='اشتراك مجاني',start_date=date('now'),end_date=date('now','+1 year'),updated_at=datetime('now') WHERE id=?").bind(subscription.id).run();
          } else if (!storeIsAvailable(effectiveStoreStatus(1, 1, subscription))) {
            return new Response(JSON.stringify({ success: false, error: 'لا يمكن تفعيل المتجر قبل تفعيل أو تجديد اشتراكه.' }), { status: 409, headers });
          }
        }
        await db.prepare('UPDATE stores SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(nextState, storeId).run();
        await db.prepare('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE store_id = ?').bind(nextState, storeId).run();
        if (!nextState) await db.prepare('DELETE FROM auth_sessions WHERE user_id IN (SELECT id FROM users WHERE store_id=?)').bind(storeId).run();
        await syncStoreResource(env,storeId);

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

        const updatedSub = await db.prepare('SELECT * FROM subscriptions WHERE store_id = ? ORDER BY created_at DESC LIMIT 1').bind(storeId).first() as any;
        if (validDelta > 0 && storeIsAvailable(effectiveStoreStatus(1, 1, updatedSub))) {
          await db.batch([
            db.prepare('UPDATE stores SET is_active=1,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(storeId),
            db.prepare('UPDATE users SET is_active=1,updated_at=CURRENT_TIMESTAMP WHERE store_id=?').bind(storeId),
          ]);
        }
        await syncStoreResource(env,storeId);
        return new Response(JSON.stringify({ success: true, subscription: updatedSub }), { headers });
      }
    }

    // 5. Stores & Store Info
    if (path === 'admin/analytics' && method === 'GET') {
      const orders = await db.prepare('SELECT COUNT(*) AS n FROM orders').first() as any;
      const products = await db.prepare('SELECT COUNT(*) AS n FROM products').first() as any;
      const months = await db.prepare("SELECT strftime('%Y-%m',created_at) AS month,COUNT(*) AS amount FROM orders GROUP BY month").all();
      return new Response(JSON.stringify({success:true,analytics:{totalOrders:orders.n,totalProducts:products.n,monthMap:Object.fromEntries((months.results||[]).map((r:any)=>[r.month,r.amount]))}}),{headers});
    }
    if (path === 'stores') {
      if (method === 'GET') {
        const allStores = await db.prepare(`SELECT s.* FROM stores s WHERE s.is_active=1 AND NOT EXISTS(SELECT 1 FROM users u WHERE u.store_id=s.id AND u.is_active=0) AND EXISTS(SELECT 1 FROM subscriptions b WHERE b.id=(SELECT x.id FROM subscriptions x WHERE x.store_id=s.id ORDER BY x.created_at DESC LIMIT 1) AND b.status IN ('active','trial') AND b.start_date<=date('now') AND b.end_date>=date('now')) ORDER BY s.created_at DESC`).all();
        return new Response(JSON.stringify({ success: true, stores: allStores.results || [] }), { headers });
      }
    }

    if (path === 'store') {
      if (method === 'GET') {
        const requestedId = url.searchParams.get('id');
        const record = requestedId ? await getStoreAccess(db, requestedId) : null;
        const fallback = !requestedId ? await db.prepare(`SELECT s.* FROM stores s WHERE s.is_active=1 AND NOT EXISTS(SELECT 1 FROM users u WHERE u.store_id=s.id AND u.is_active=0) AND EXISTS(SELECT 1 FROM subscriptions b WHERE b.id=(SELECT x.id FROM subscriptions x WHERE x.store_id=s.id ORDER BY x.created_at DESC LIMIT 1) AND b.status IN ('active','trial') AND b.start_date<=date('now') AND b.end_date>=date('now') LIMIT 1`).first() : null;
        const store = requestedId ? record?.store : fallback;
        if (requestedId && record && !storeIsAvailable(record.status) && actor?.role !== 'super_admin' && actor?.store_id !== requestedId) return fail('المتجر غير متاح حاليًا',404);
        return new Response(JSON.stringify({ success: true, store: store ? { ...store, effective_status: requestedId ? record?.status : 'active' } : null }), { headers });
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
        if (storeId) {
          const access = await getStoreAccess(db,storeId);
          if (!access || (!storeIsAvailable(access.status) && actor?.role !== 'super_admin' && actor?.store_id !== storeId)) return fail('المتجر غير متاح حاليًا',404);
        }
        const products = storeId
          ? await db.prepare(`SELECT * FROM products WHERE store_id = ? ${actor?.role === 'super_admin' || actor?.store_id === storeId ? '' : 'AND is_available=1'} ORDER BY created_at DESC`).bind(storeId).all()
          : await db.prepare(`SELECT p.* FROM products p JOIN stores s ON s.id=p.store_id JOIN subscriptions b ON b.id=(SELECT x.id FROM subscriptions x WHERE x.store_id=s.id ORDER BY x.created_at DESC LIMIT 1) WHERE s.is_active=1 AND p.is_available=1 AND b.status IN ('active','trial') AND b.start_date<=date('now') AND b.end_date>=date('now') AND NOT EXISTS(SELECT 1 FROM users u WHERE u.store_id=s.id AND u.is_active=0) ORDER BY p.created_at DESC`).all();
        return new Response(JSON.stringify({ success: true, products: products.results || [] }), { headers });
      }

      if (method === 'POST') {
        const body = await request.json() as any;
        const id = 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        const { store_id = 'store-elegance', name, description = '', price, category = 'عام', image_data, is_available = 1 } = body;
        if (!name || String(name).length > 200 || !Number.isFinite(Number(price)) || Number(price) < 0 || typeof image_data !== 'string' || image_data.length > 1000000 || !/^(data:image\/(png|jpeg|webp|gif);base64,|https:\/\/)/.test(image_data)) return fail('راجع اسم المنتج والسعر والصورة (حتى ١ ميجابايت)',400);

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
        if (!name || String(name).length > 200 || !Number.isFinite(Number(price)) || Number(price) < 0 || (image_data && (typeof image_data !== 'string' || image_data.length > 1000000 || !/^(data:image\/(png|jpeg|webp|gif);base64,|https:\/\/)/.test(image_data)))) return fail('راجع بيانات المنتج',400);

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
        await rateLimit(db,request,'orders',30,60000);
        const body = await request.json() as any;
        const id = 'ord-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        const { store_id, customer_name, customer_phone, customer_address = '', items, total_price } = body;
        if(typeof store_id!=='string'||!store_id.trim())return fail('تعذر تحديد المتجر المطلوب',400);
        const storeAccess=await getStoreAccess(db,store_id);
        if(!storeAccess)return fail('المتجر غير متاح',404);
        if(!storeIsAvailable(storeAccess.status))return fail('المتجر لا يستقبل طلبات حاليًا',403);
        if (typeof customer_name !== 'string' || !customer_name.trim() || customer_name.length>160 || typeof customer_phone !== 'string' || !customer_phone || customer_phone.length>30 || String(customer_address).length>1000 || !Array.isArray(items) || !items.length || items.length>50) return fail('راجع بيانات الطلب',400);
        let calculatedTotal = 0;
        const verifiedItems = [];
        for (const item of items) {
          if (!Number.isInteger(item.quantity) || item.quantity<1 || item.quantity>999) return fail('كمية غير صحيحة',400);
          const product = await db.prepare('SELECT * FROM products WHERE id=? AND store_id=? AND is_available=1').bind(item.product?.id||'',store_id).first() as any;
          if (!product) return fail('أحد المنتجات غير متاح',400);
          calculatedTotal += Math.round(Number(product.price)*100)*item.quantity;
          verifiedItems.push({product:{id:product.id,name:product.name,price:product.price,category:product.category},quantity:item.quantity});
        }

        await db.prepare(`
          INSERT INTO orders (id, store_id, customer_name, customer_phone, customer_address, items_json, total_price, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'completed_via_whatsapp')
        `).bind(id, store_id, customer_name, customer_phone, customer_address, JSON.stringify(verifiedItems), calculatedTotal/100).run();

        return new Response(JSON.stringify({ success: true, orderId: id }), { headers });
      }
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found: ' + path }), { status: 404, headers });
  } catch (error: any) {
    const status = error.status || (error instanceof SyntaxError || error instanceof TypeError ? 400 : /UNIQUE constraint/.test(error.message || '') ? 409 : 500);
    if (status === 500) console.error('Matjari request failed', error);
    return new Response(JSON.stringify({ success: false, error: status === 429 ? error.message : status === 409 ? 'البيانات مسجلة بالفعل' : status === 400 ? 'راجع البيانات المرسلة' : 'تعذر تنفيذ الطلب. حاول مرة أخرى.' }), { status, headers });
  }
};

async function getStoreAccess(db:any,storeId:string,now=Date.now()){
  const store=await db.prepare('SELECT * FROM stores WHERE id=?').bind(storeId).first() as any;
  if(!store)return null;
  const [user,subscription]=await Promise.all([
    db.prepare('SELECT is_active FROM users WHERE store_id=? ORDER BY created_at LIMIT 1').bind(storeId).first() as Promise<any>,
    db.prepare('SELECT * FROM subscriptions WHERE store_id=? ORDER BY created_at DESC LIMIT 1').bind(storeId).first() as Promise<any>,
  ]);
  return {store,subscription,user,status:effectiveStoreStatus(user?.is_active ?? 1,store.is_active,subscription,now)};
}
