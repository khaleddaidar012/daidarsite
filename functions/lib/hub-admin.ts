import { json, type Env } from './store'
import { catalog as defaultCatalog } from '../api/hub/[[path]]'
const DAY = 86400000

export async function adminHub(request: Request, env: Env, path: string, actor = 'admin') {
  const db = env.DB!
  const now = Date.now()
  if (path === 'hub-customers' && request.method === 'GET') {
    const query = new URL(request.url).searchParams.get('q')?.trim().slice(0, 120) || ''
    const search = query.replace(/[\\%_]/g, '\\$&')
    const users = await db.prepare(`SELECT id,email,name FROM hub_users WHERE (?='' OR email LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\') ORDER BY created_at DESC LIMIT 50`).bind(query, `%${search}%`, `%${search}%`).all<{ id: string; email: string; name: string }>()
    const ids = users.results.map(user => user.id)
    const subscriptions = ids.length
      ? await db.prepare(`SELECT id,user_id,product_id,status,snapshot,starts_at,expires_at,created_at FROM hub_subscriptions WHERE user_id IN (${ids.map(() => '?').join(',')}) ORDER BY created_at DESC`).bind(...ids).all<Record<string, unknown>>()
      : { results: [] as Record<string, unknown>[] }
    const byUser = new Map(ids.map(id => [id, [] as Record<string, unknown>[]]))
    for (const sub of subscriptions.results) {
      const userSubs = byUser.get(String(sub.user_id))
      userSubs?.push({ ...sub, snapshot: parse(String(sub.snapshot)) })
    }
    return json({ customers: users.results.map(user => ({ ...user, subscriptions: byUser.get(user.id) || [] })) })
  }
  if (path === 'hub-manual-subscriptions' && request.method === 'POST') {
    const body = await request.json() as Record<string, unknown>
    const operationKey = text(body.operationKey, 64)
    const userId = text(body.userId, 64)
    const productId = text(body.productId, 64)
    const period = body.period === 'yearly' ? 'yearly' : body.period === 'monthly' ? 'monthly' : ''
    const renewalId = text(body.renewalSubscriptionId, 64)
    const user = await db.prepare('SELECT id,email,name FROM hub_users WHERE id=? AND active=1').bind(userId).first<{ id: string; email: string; name: string }>()
    if (!/^[\da-f-]{36}$/i.test(operationKey) || !user || !productId || !period) return json({ error: 'اختر عميلًا ومنتجًا ومدة اشتراك صحيحة.' }, 422)
    const products = await defaultCatalog(env)
    const product = products.products.find(item => item.id === productId)
    if (!product) return json({ error: 'المنتج غير موجود في الكتالوج.' }, 422)
    let activityId = text(body.activityId, 64)
    let addonIds = Array.isArray(body.addons) ? body.addons.filter((id): id is string => typeof id === 'string').slice(0, 64) : []
    let renewal: { id: string; status: string; expires_at: number | null; snapshot: string } | null = null
    if (renewalId) {
      renewal = await db.prepare('SELECT id,status,expires_at,snapshot FROM hub_subscriptions WHERE id=? AND user_id=? AND product_id=?').bind(renewalId, user.id, productId).first<{ id: string; status: string; expires_at: number | null; snapshot: string }>()
      if (!renewal) return json({ error: 'الاشتراك المطلوب تجديده لا يخص هذا العميل أو المنتج.' }, 409)
      const oldSnapshot = parse(renewal.snapshot)
      activityId = String(oldSnapshot.activityId || '')
      addonIds = Array.isArray(oldSnapshot.addons) ? oldSnapshot.addons.map((item: any) => String(item.id || '')).filter((id: string) => id && !products.modules.find(module => module.id === id)?.essential) : []
    }
    const activity = products.activities.find(item => item.id === activityId)
    if (!activity) return json({ error: 'اختر نشاطًا صحيحًا.' }, 422)
    const modules = products.modules.filter(module => module.availableFor.includes(activityId))
    const selected = new Set(addonIds)
    for (const module of modules) if (module.essential) selected.add(module.id)
    if (addonIds.some(id => !modules.some(module => module.id === id && !module.essential))) return json({ error: 'إحدى الإضافات المختارة غير متاحة لهذا النشاط.' }, 422)
    const chosen = modules.filter(module => selected.has(module.id))
    for (const module of chosen) {
      if (!module.essential && (module.priceStatus !== 'approved' || !Number.isSafeInteger(module.monthlyPrice) || !Number.isSafeInteger(module.yearlyPrice))) return json({ error: `سعر الإضافة «${module.nameAr}» غير معتمد.` }, 409)
      if (module.requires.some((required: string) => !selected.has(required)) || module.conflicts.some((conflict: string) => selected.has(conflict))) return json({ error: `راجع اعتماديات أو تعارضات الإضافة «${module.nameAr}».` }, 422)
    }
    const basePrice = products.billing[period]
    const total = chosen.reduce((sum, module) => sum + (module.essential ? 0 : module[period === 'yearly' ? 'yearlyPrice' : 'monthlyPrice'] || 0), basePrice)
    if (!Number.isSafeInteger(basePrice) || basePrice < 0 || !Number.isSafeInteger(total) || total < 0 || body.amountReceived !== total) return json({ error: 'المبلغ المستلم لا يطابق السعر المحسوب من الكتالوج.' }, 409)
    const snapshot = {
      product: product.nameAr, productId, activity: activity.nameAr, activityId,
      addons: chosen.map(module => ({ id: module.id, name: module.nameAr, price: module.essential ? 0 : module[period === 'yearly' ? 'yearlyPrice' : 'monthlyPrice'] })),
      period, devices: 1, total, currency: products.billing.currency || 'EGP',
      paymentMode: 'manual', paymentStatus: 'received', paymentReceivedAt: now,
      renewalSubscriptionId: renewal?.id || null,
    }
    const previous = await db.prepare('SELECT id,user_id,snapshot FROM hub_orders WHERE manual_operation_key=?').bind(operationKey).first<{ id: string; user_id: string; snapshot: string }>()
    if (previous) {
      const effect = await db.prepare('SELECT subscription_id FROM hub_approval_effects WHERE order_id=?').bind(previous.id).first<{ subscription_id: string }>()
      if (previous.user_id !== user.id || !sameManualSnapshot(parse(previous.snapshot), snapshot) || !effect) return json({ error: 'مفتاح العملية مستخدم لطلب مختلف أو ما زال قيد المعالجة.' }, 409)
      return json({ success: true, orderId: previous.id, subscriptionId: effect.subscription_id, idempotent: true })
    }
    const orderId = crypto.randomUUID(), orderNumber = `DH-M-${now.toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
    const attempt = crypto.randomUUID(), subscriptionId = renewal?.id || crypto.randomUUID()
    const expiryBase = renewal?.status === 'active' && renewal.expires_at && renewal.expires_at > now ? renewal.expires_at : now
    const renewedUntil = renewal?.status === 'active' && renewal.expires_at && renewal.expires_at > now ? billingExpiry(expiryBase, period) : null
    await db.batch([
      db.prepare("INSERT OR IGNORE INTO hub_orders(id,order_number,user_id,snapshot,status,proof_requested_at,created_at,updated_at,reviewed_at,rejection_reason,admin_note,manual_operation_key) VALUES(?,?,?,?, 'approved',NULL,?,?,?,NULL,?,?)").bind(orderId, orderNumber, user.id, JSON.stringify(snapshot), now, now, now, `تم تسجيل الدفع يدويًا بواسطة ${actor}`, operationKey),
      db.prepare('INSERT OR IGNORE INTO hub_approval_effects(order_id,attempt_token,subscription_id,processed_at) SELECT id,?,?,? FROM hub_orders WHERE manual_operation_key=?').bind(attempt, subscriptionId, now, operationKey),
      renewal
        ? db.prepare("UPDATE hub_subscriptions SET snapshot=?,status=CASE WHEN status='active' AND expires_at>? THEN 'active' ELSE 'awaiting_activation' END,starts_at=CASE WHEN status='active' AND expires_at>? THEN starts_at ELSE NULL END,expires_at=CASE WHEN status='active' AND expires_at>? THEN ? ELSE NULL END WHERE id=? AND EXISTS(SELECT 1 FROM hub_approval_effects e JOIN hub_orders o ON o.id=e.order_id WHERE o.manual_operation_key=? AND e.attempt_token=?)").bind(JSON.stringify(snapshot), now, now, now, renewedUntil, subscriptionId, operationKey, attempt)
        : db.prepare("INSERT OR IGNORE INTO hub_subscriptions(id,user_id,source_order_id,product_id,snapshot,status,starts_at,expires_at,allowed_devices,created_at) SELECT ?,o.user_id,o.id,?,?,'awaiting_activation',NULL,NULL,1,? FROM hub_orders o JOIN hub_approval_effects e ON e.order_id=o.id WHERE o.manual_operation_key=? AND e.attempt_token=?").bind(subscriptionId, productId, JSON.stringify(snapshot), now, operationKey, attempt),
      db.prepare("INSERT INTO hub_audit(id,actor,action,entity_id,data,created_at) SELECT ?,?,'manual_subscription',o.id,?,? FROM hub_orders o JOIN hub_approval_effects e ON e.order_id=o.id WHERE o.manual_operation_key=? AND e.attempt_token=?").bind(crypto.randomUUID(), actor, JSON.stringify({ orderNumber, subscriptionId, userId: user.id, email: user.email, amountReceived: total, period, renewal: !!renewal }), now, operationKey, attempt),
    ])
    const created = await db.prepare('SELECT id FROM hub_orders WHERE manual_operation_key=?').bind(operationKey).first<{ id: string }>()
    const createdOrder = created && await db.prepare('SELECT user_id,snapshot FROM hub_orders WHERE id=?').bind(created.id).first<{ user_id: string; snapshot: string }>()
    const effect = created && await db.prepare('SELECT subscription_id FROM hub_approval_effects WHERE order_id=?').bind(created.id).first<{ subscription_id: string }>()
    if (!created || !createdOrder || !effect) return json({ error: 'تعذر تسجيل العملية؛ حدّث الصفحة وتحقق من سجل العميل قبل إعادة المحاولة.' }, 500)
    if (createdOrder.user_id !== user.id || !sameManualSnapshot(parse(createdOrder.snapshot), snapshot)) return json({ error: 'مفتاح العملية مستخدم لطلب مختلف.' }, 409)
    return json({ success: true, orderId: created.id, subscriptionId: effect.subscription_id })
  }
  if (path === 'hub-orders' && request.method === 'GET') {
    const status = new URL(request.url).searchParams.get('status')
    const rows = status
      ? await db.prepare('SELECT o.*,u.email,u.name FROM hub_orders o JOIN hub_users u ON u.id=o.user_id WHERE o.status=? ORDER BY o.created_at DESC LIMIT 500').bind(status).all<Record<string, unknown>>()
      : await db.prepare('SELECT o.*,u.email,u.name FROM hub_orders o JOIN hub_users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 500').all<Record<string, unknown>>()
    return json({ orders: rows.results.map(r => ({ ...r, snapshot: parse(String(r.snapshot)) })) })
  }
  if (path === 'hub-orders' && request.method === 'POST') {
    const body = await request.json() as Record<string, unknown>
    const id = text(body.id, 64), action = text(body.action, 32), reason = text(body.reason, 1500)
    const order = await db.prepare('SELECT * FROM hub_orders WHERE id=?').bind(id).first<{ id: string; user_id: string; snapshot: string; status: string; order_number: string }>()
    if (!order) return json({ error: 'الطلب غير موجود.' }, 404)
    if (!['under_review', 'needs_info', 'awaiting_transfer'].includes(order.status)) return json({ error: 'تم اتخاذ إجراء على الطلب مسبقًا.' }, 409)
    const snapshot = parse(order.snapshot)
    if(['consultation','system-management'].includes(String(snapshot.kind))){
      const next=action==='approve'?'approved':action==='reject'?'rejected':action==='request-info'?'needs_info':null;
      if(!next)return json({error:'إجراء غير صالح'},422);
      await db.batch([
        db.prepare("UPDATE hub_orders SET status=?,reviewed_at=?,updated_at=?,admin_note=? WHERE id=? AND status IN ('under_review','needs_info')").bind(next,now,now,reason,id),
        db.prepare('INSERT INTO hub_audit(id,actor,action,entity_id,data,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,'service_request_'+action,id,JSON.stringify({requestOnly:true,paymentConfirmed:false}),now)
      ]);
      return json({success:true,status:next,requestOnly:true});
    }
    if (action === 'approve') {
      if (snapshot.paymentMode === 'demo') return json({ error: 'هذا طلب تجريبي؛ لا يمكن اعتماده كدفعة حقيقية.' }, 409)
      const release = await db.prepare('SELECT id FROM hub_releases WHERE published=1 ORDER BY created_at DESC LIMIT 1').first()
      if (!release) return json({ error: 'لا يمكن اعتماد طلب تجاري قبل نشر إصدار قابل للتسليم.' }, 409)
      const renewalId = typeof snapshot.renewalSubscriptionId === 'string' ? snapshot.renewalSubscriptionId : ''
      const renewal = renewalId ? await db.prepare('SELECT id,status,expires_at FROM hub_subscriptions WHERE id=? AND user_id=? AND product_id=?').bind(renewalId, order.user_id, snapshot.productId).first<{ id: string; status: string; expires_at: number | null }>() : null
      if (renewalId && !renewal) return json({ error: 'الاشتراك المطلوب تجديده غير موجود.' }, 409)
      const subId = renewal?.id || crypto.randomUUID()
      const expiryBase = renewal?.status === 'active' && renewal.expires_at && renewal.expires_at > now ? renewal.expires_at : now
      const renewedUntil = renewal?.status === 'active' && renewal.expires_at && renewal.expires_at > now ? billingExpiry(expiryBase, snapshot.period) : null
      const attempt = crypto.randomUUID()
      await db.batch([
        db.prepare("INSERT OR IGNORE INTO hub_approval_effects(order_id,attempt_token,subscription_id,processed_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM hub_orders WHERE id=? AND status IN ('under_review','needs_info','awaiting_transfer'))").bind(id, attempt, subId, now, id),
        db.prepare("UPDATE hub_orders SET status='approved',reviewed_at=?,updated_at=? WHERE id=? AND status IN ('under_review','needs_info','awaiting_transfer') AND EXISTS(SELECT 1 FROM hub_approval_effects WHERE order_id=? AND attempt_token=?)").bind(now, now, id, id, attempt),
        renewal
          ? db.prepare("UPDATE hub_subscriptions SET snapshot=?,status=CASE WHEN status='active' AND expires_at>? THEN 'active' ELSE 'awaiting_activation' END,starts_at=CASE WHEN status='active' AND expires_at>? THEN starts_at ELSE NULL END,expires_at=CASE WHEN status='active' AND expires_at>? THEN ? ELSE NULL END WHERE id=? AND EXISTS(SELECT 1 FROM hub_approval_effects WHERE order_id=? AND attempt_token=?)").bind(JSON.stringify(snapshot), now, now, now, renewedUntil, subId, id, attempt)
          : db.prepare("INSERT OR IGNORE INTO hub_subscriptions(id,user_id,source_order_id,product_id,snapshot,status,starts_at,expires_at,allowed_devices,created_at) SELECT ?,?,?,?,?,'awaiting_activation',NULL,NULL,1,? WHERE EXISTS(SELECT 1 FROM hub_approval_effects WHERE order_id=? AND attempt_token=?)").bind(subId, order.user_id, id, snapshot.productId, JSON.stringify(snapshot), now, id, attempt),
        db.prepare("INSERT INTO hub_audit(id,actor,action,entity_id,data,created_at) SELECT ?, ?,'approve_order',?,?,? WHERE EXISTS(SELECT 1 FROM hub_approval_effects WHERE order_id=? AND attempt_token=?)").bind(crypto.randomUUID(), actor, id, JSON.stringify({ orderNumber: order.order_number, subscriptionId: subId, period: snapshot.period, renewal: !!renewal, renewedUntil }), now, id, attempt),
      ])
      const winner = await db.prepare('SELECT attempt_token FROM hub_approval_effects WHERE order_id=?').bind(id).first<{ attempt_token: string }>()
      if (winner?.attempt_token !== attempt) return json({ error: 'تمت معالجة الطلب مسبقًا.' }, 409)
      return json({ success: true, status: 'approved', subscriptionId: subId })
    }
    if (action === 'reject' && reason.length < 4) return json({ error: 'اكتب سبب الرفض الذي سيظهر للعميل.' }, 422)
    if (action === 'request-info' && reason.length < 4) return json({ error: 'اكتب المعلومات المطلوبة من العميل.' }, 422)
    const status = action === 'reject' ? 'rejected' : action === 'request-info' ? 'needs_info' : ''
    if (!status) return json({ error: 'الإجراء غير معروف.' }, 422)
    await db.batch([
      db.prepare('UPDATE hub_orders SET status=?,reviewed_at=?,updated_at=?,rejection_reason=?,admin_note=? WHERE id=?').bind(status, now, now, action === 'reject' ? reason : null, action === 'request-info' ? reason : null, id),
      db.prepare('INSERT INTO hub_audit(id,actor,action,entity_id,data,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(), actor, action, id, JSON.stringify({ reason }), now),
    ])
    return json({ success: true, status })
  }
  if (path === 'hub-catalog' && request.method === 'GET') {
    const row = await db.prepare("SELECT data FROM hub_catalog WHERE key='catalog'").first<{ data: string }>()
    return json({ catalog: row ? parse(row.data) : await defaultCatalog(env) })
  }
  if (path === 'hub-catalog' && request.method === 'POST') {
    const body = await request.json() as { catalog?: unknown }
    if (!body.catalog || typeof body.catalog !== 'object') return json({ error: 'بيانات الكتالوج غير صحيحة.' }, 422)
    const catalog = body.catalog as Record<string, any>
    if (!Array.isArray(catalog.products) || !Array.isArray(catalog.activities) || !Array.isArray(catalog.modules) || !catalog.billing) return json({ error: 'الكتالوج يفتقد حقولًا لازمة.' }, 422)
    if (!Number.isSafeInteger(catalog.billing.monthly) || catalog.billing.monthly < 0 || !Number.isSafeInteger(catalog.billing.yearly) || catalog.billing.yearly < 0) return json({ error: 'السعر الأساسي يجب أن يكون عدد قروش صحيحًا.' }, 422)
    const moduleIds = catalog.modules.map((m:any)=>m?.id)
    const activityIds = catalog.activities.map((a:any)=>a?.id)
    if (moduleIds.some((id:any)=>typeof id!=='string') || new Set(moduleIds).size!==moduleIds.length || activityIds.some((id:any)=>typeof id!=='string') || new Set(activityIds).size!==activityIds.length) return json({ error: 'معرفات الأنشطة والإضافات يجب أن تكون فريدة.' }, 422)
    for (const m of catalog.modules) {
      if (!m || typeof m.id !== 'string' || typeof m.essential !== 'boolean' || !Array.isArray(m.availableFor) || m.availableFor.some((id:string)=>!activityIds.includes(id))) return json({ error: 'بيانات إضافة غير صحيحة.' }, 422)
      m.requires = Array.isArray(m.requires) ? m.requires : []
      m.conflicts = Array.isArray(m.conflicts) ? m.conflicts : []
      if ([...m.requires,...m.conflicts].some((id:string)=>id===m.id||!moduleIds.includes(id)) || new Set(m.requires).size!==m.requires.length || new Set(m.conflicts).size!==m.conflicts.length || m.requires.some((id:string)=>m.conflicts.includes(id))) return json({ error: 'تحقق من اعتماديات الإضافة وتعارضاتها.' }, 422)
      if (m.essential && (m.monthlyPrice !== 0 || m.yearlyPrice !== 0)) return json({ error: 'الإضافات الأساسية يجب أن تظل مشمولة.' }, 422)
      if (m.priceStatus !== 'approved') { m.monthlyPrice = null; m.yearlyPrice = null; m.priceStatus = 'draft' }
      if (m.monthlyPrice != null && (!Number.isSafeInteger(m.monthlyPrice) || m.monthlyPrice < 0 || !Number.isSafeInteger(m.yearlyPrice) || m.yearlyPrice < 0)) return json({ error: 'أسعار الإضافات أرقام قروش غير صالحة.' }, 422)
    }
    const visiting = new Set<string>(), visited = new Set<string>()
    const hasCycle = (id:string):boolean => { if(visiting.has(id)) return true; if(visited.has(id)) return false; visiting.add(id); const module=catalog.modules.find((m:any)=>m.id===id); if(module?.requires.some((child:string)=>hasCycle(child))) return true; visiting.delete(id); visited.add(id); return false }
    if (moduleIds.some((id:string)=>hasCycle(id))) return json({ error: 'اعتماديات الإضافات لا يمكن أن تحتوي دورة متبادلة.' }, 422)
    catalog.commercialEnabled = !!catalog.commercialEnabled && catalog.products.some(p => p.id === 'daidar-flow' && p.available) && !!await db.prepare('SELECT id FROM hub_releases WHERE published=1 LIMIT 1').first()
    await db.prepare("INSERT INTO hub_catalog(key,data,updated_at) VALUES('catalog',?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at").bind(JSON.stringify(catalog), now).run()
    await db.prepare('INSERT INTO hub_audit(id,actor,action,entity_id,data,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(), actor, 'update_catalog', 'catalog', JSON.stringify({ productCount: catalog.products.length, moduleCount: catalog.modules.length }), now).run()
    return json({ success: true, catalog })
  }
  if (path === 'hub-releases' && request.method === 'GET') {
    const rows = await db.prepare('SELECT id,version,filename,published,created_at FROM hub_releases ORDER BY created_at DESC').all()
    return json({ releases: rows.results })
  }
  if (path === 'hub-releases' && request.method === 'POST') {
    if (!env.HUB_FILES) return json({ error: 'اربط R2 خاصًا باسم HUB_FILES قبل رفع الملفات.' }, 503)
    const form = await request.formData()
    const file = form.get('file'), version = text(form.get('version'), 40)
    if (!(file instanceof File) || !/^[\w.-]{1,40}$/.test(version) || file.size < 1 || file.size > 80 * 1024 * 1024) return json({ error: 'أدخل إصدارًا صالحًا وملفًا حتى 80 ميجابايت.' }, 422)
    const key = `releases/${crypto.randomUUID()}/${safeName(file.name)}`
    await env.HUB_FILES.put(key, file.stream(), { httpMetadata: { contentType: 'application/octet-stream' } })
    const id = crypto.randomUUID()
    await db.prepare('INSERT INTO hub_releases(id,version,object_key,filename,published,created_at) VALUES(?,?,?,?,0,?)').bind(id, version, key, file.name.slice(0,200), now).run()
    await db.prepare('INSERT INTO hub_audit(id,actor,action,entity_id,data,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(), actor, 'upload_release', id, JSON.stringify({ version, file: file.name, size: file.size }), now).run()
    return json({ success: true, id, version }, 201)
  }
  if (path === 'hub-transfers' && request.method === 'GET') {
    const rows = await db.prepare("SELECT t.*,u.email,u.name,s.status AS subscription_status FROM hub_device_transfer_requests t JOIN hub_users u ON u.id=t.user_id JOIN hub_subscriptions s ON s.id=t.subscription_id WHERE t.status='pending' ORDER BY t.created_at").all()
    return json({ requests: rows.results })
  }
  if (path === 'hub-transfers' && request.method === 'POST') {
    const body = await request.json() as Record<string, unknown>
    const id = text(body.id, 64), action = text(body.action, 20), reason = text(body.reason, 1000)
    const transfer = await db.prepare("SELECT * FROM hub_device_transfer_requests WHERE id=? AND status='pending'").bind(id).first<{ id:string;subscription_id:string;user_id:string }>()
    if (!transfer) return json({ error: 'طلب النقل غير موجود أو عولج من قبل.' }, 404)
    if (!['approve','reject'].includes(action) || (action === 'reject' && reason.length < 4)) return json({ error: 'الإجراء أو السبب غير صحيح.' }, 422)
    if (action === 'approve') await db.batch([
      db.prepare('DELETE FROM hub_devices WHERE subscription_id=?').bind(transfer.subscription_id),
      db.prepare("UPDATE hub_licenses SET status='revoked' WHERE subscription_id=? AND status='issued'").bind(transfer.subscription_id),
      db.prepare("UPDATE hub_device_transfer_requests SET status='approved',decided_at=? WHERE id=? AND status='pending'").bind(now,id),
      db.prepare('INSERT INTO hub_audit(id,actor,action,entity_id,data,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,'approve_device_transfer',id,JSON.stringify({subscriptionId:transfer.subscription_id}),now),
    ])
    else await db.batch([
      db.prepare("UPDATE hub_device_transfer_requests SET status='rejected',decided_at=? WHERE id=? AND status='pending'").bind(now,id),
      db.prepare('INSERT INTO hub_audit(id,actor,action,entity_id,data,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,'reject_device_transfer',id,JSON.stringify({reason}),now),
    ])
    return json({ success:true })
  }
  if (path === 'hub-release-publish' && request.method === 'POST') {
    const body = await request.json() as { id?: string; published?: boolean }
    const release = await db.prepare('SELECT id FROM hub_releases WHERE id=?').bind(text(body.id,64)).first()
    if (!release) return json({ error: 'الإصدار غير موجود.' }, 404)
    const publish = body.published === true
    await db.batch([
      db.prepare('UPDATE hub_releases SET published=0').bind(),
      ...(publish ? [db.prepare('UPDATE hub_releases SET published=1 WHERE id=?').bind(body.id)] : []),
      db.prepare('INSERT INTO hub_audit(id,actor,action,entity_id,data,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(), actor, publish ? 'publish_release' : 'unpublish_release', String(body.id), '{}', now),
    ])
    return json({ success: true })
  }
  if (path.startsWith('hub-download/') && request.method === 'GET') {
    if (!env.HUB_FILES) return json({ error: 'التخزين الخاص غير مضبوط.' }, 503)
    const id = path.slice('hub-download/'.length)
    const access = await db.prepare("SELECT 1 AS ok FROM hub_subscriptions s JOIN hub_releases r ON r.published=1 WHERE s.user_id=? AND s.status IN ('active','awaiting_activation') AND r.id=? LIMIT 1").bind(text((request as any).hubUserId,64), id).first()
    if (!access) return json({ error: 'لا تملك صلاحية تنزيل هذا الإصدار.' }, 403)
    const release = await db.prepare('SELECT object_key,filename FROM hub_releases WHERE id=? AND published=1').bind(id).first<{ object_key: string; filename: string }>()
    const object = release && await env.HUB_FILES.get(release.object_key)
    if (!object) return json({ error: 'الملف غير موجود.' }, 404)
    return new Response(object.body, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${safeName(release.filename)}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
  }
  return json({ error: 'المسار غير موجود.' }, 404)
}
function parse(s: string) { try { return JSON.parse(s) } catch { return {} } }
function sameManualSnapshot(a: Record<string, any>, b: Record<string, any>) {
  return a.productId === b.productId && a.activityId === b.activityId && a.period === b.period && a.total === b.total && a.renewalSubscriptionId === b.renewalSubscriptionId && JSON.stringify(a.addons?.map((item: any) => item.id)) === JSON.stringify(b.addons?.map((item: any) => item.id))
}
function text(x: unknown, max: number) { return typeof x === 'string' ? x.trim().slice(0,max) : '' }
function safeName(s: string) { return s.replace(/[^\w.-]/g, '_').slice(0,120) || 'release.bin' }
function billingExpiry(start:number,period:unknown){const date=new Date(start),day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+(period==='yearly'?12:1));const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,last));return date.getTime()}
