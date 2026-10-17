import { hash, json, sameOrigin, type Env } from '../../lib/store'

const encoder = new TextEncoder()
const DAY = 86400000

export async function onRequest({ request, env }: { request: Request; env: Env }) {
  if (!env.DB) return json({ error: 'قاعدة بيانات البوابة غير مربوطة على Cloudflare.' }, 503)
  const path = new URL(request.url).pathname.replace(/^\/api\/hub\/?/, '').replace(/\/$/, '')
  const now = Date.now()
  try {
    if (request.method !== 'GET' && !sameOrigin(request)) return json({ error: 'طلب غير مسموح' }, 403)
    if (path === 'google' && request.method === 'GET') {
      if (!env.HUB_GOOGLE_CLIENT_ID || !env.HUB_GOOGLE_CLIENT_SECRET) return json({ error: 'تسجيل Google غير مفعّل. أضف مفاتيح OAuth في Cloudflare.' }, 503)
      const state = crypto.randomUUID() + crypto.randomUUID()
      const callback = `${new URL(request.url).origin}/api/hub/google/callback`
      const target = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      target.search = new URLSearchParams({ client_id: env.HUB_GOOGLE_CLIENT_ID, redirect_uri: callback, response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' }).toString()
      const headers = new Headers({ Location: target.toString(), 'Cache-Control': 'no-store' })
      headers.append('Set-Cookie', `daidar_hub_oauth=${state}; Path=/api/hub/google; HttpOnly; SameSite=Lax; Max-Age=600${secure(request)}`)
      headers.append('Set-Cookie', `daidar_hub_locale=${new URL(request.url).searchParams.get('locale') === 'en' ? 'en' : 'ar'}; Path=/api/hub/google; HttpOnly; SameSite=Lax; Max-Age=600${secure(request)}`)
      return new Response(null, { status: 302, headers })
    }
    if (path === 'google/callback' && request.method === 'GET') {
      const query = new URL(request.url).searchParams
      const state = query.get('state') || ''
      const expected = cookie(request, 'daidar_hub_oauth')
      const fail = new URL(`/${cookie(request, 'daidar_hub_locale') === 'en' ? 'en' : 'ar'}/hub`, request.url); fail.searchParams.set('oauth', 'failed')
      if (!env.HUB_GOOGLE_CLIENT_ID || !env.HUB_GOOGLE_CLIENT_SECRET || !query.get('code') || !state || state !== expected) return Response.redirect(fail.toString(), 303)
      const callback = `${new URL(request.url).origin}/api/hub/google/callback`
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: query.get('code')!, client_id: env.HUB_GOOGLE_CLIENT_ID, client_secret: env.HUB_GOOGLE_CLIENT_SECRET, redirect_uri: callback, grant_type: 'authorization_code' }) })
      if (!tokenResponse.ok) return Response.redirect(fail.toString(), 303)
      const tokenData = await tokenResponse.json() as { access_token?: string }
      if (!tokenData.access_token) return Response.redirect(fail.toString(), 303)
      const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tokenData.access_token}` } })
      if (!profileRes.ok) return Response.redirect(fail.toString(), 303)
      const profile = await profileRes.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string }
      if (!profile.sub || !profile.email || !profile.email_verified) return Response.redirect(fail.toString(), 303)
      let account = await env.DB.prepare('SELECT id FROM hub_users WHERE google_subject=?').bind(profile.sub).first<{ id: string }>()
      if (!account) {
        const matching = await env.DB.prepare('SELECT id,google_subject,active FROM hub_users WHERE email=? COLLATE NOCASE').bind(profile.email).first<{ id: string; google_subject: string | null; active: number }>()
        if (matching?.google_subject || matching?.active === 0) return Response.redirect(fail.toString(), 303)
        const id = matching?.id || crypto.randomUUID()
        await env.DB.prepare(matching ? 'UPDATE hub_users SET google_subject=? WHERE id=?' : 'INSERT INTO hub_users(id,email,name,google_subject,created_at) VALUES(?,?,?,?,?)').bind(...(matching ? [profile.sub, id] : [id, profile.email.toLowerCase(), (profile.name || profile.email).slice(0,120), profile.sub, Date.now()])).run()
        account = { id }
      }
      const token = crypto.randomUUID() + crypto.randomUUID()
      await env.DB.prepare('INSERT INTO hub_sessions(token,user_id,expires_at) VALUES(?,?,?)').bind(await hash(token), account.id, Date.now() + 30 * DAY).run()
      const home = new URL(`/${cookie(request, 'daidar_hub_locale') === 'en' ? 'en' : 'ar'}/hub`, request.url)
      const headers = new Headers({ Location: home.toString(), 'Cache-Control': 'no-store' })
      headers.append('Set-Cookie', `daidar_hub_session=${token}; Path=/api/hub; HttpOnly; SameSite=Lax; Max-Age=2592000${secure(request)}`)
      headers.append('Set-Cookie', `daidar_hub_oauth=; Path=/api/hub/google; HttpOnly; SameSite=Lax; Max-Age=0${secure(request)}`)
      headers.append('Set-Cookie', `daidar_hub_locale=; Path=/api/hub/google; HttpOnly; SameSite=Lax; Max-Age=0${secure(request)}`)
      return new Response(null, { status: 303, headers })
    }
    if (path === 'signup' && request.method === 'POST') {
      const body = await readBody(request)
      const email = str(body.email, 254).toLowerCase()
      const name = str(body.name, 120)
      const password = str(body.password, 256, false)
      if (!/^\S+@\S+\.\S+$/.test(email) || name.length < 2 || password.length < 12) return json({ error: 'أدخل اسمًا وبريدًا صحيحين وكلمة مرور من 12 حرفًا على الأقل.' }, 422)
      const salt = crypto.randomUUID() + crypto.randomUUID()
      const userId = crypto.randomUUID()
      const passHash = await passwordHash(password, salt)
      await env.DB.prepare('INSERT INTO hub_users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)').bind(userId, email, name, `${salt}:${passHash}`, now).run()
      return sessionResponse(request, env, userId, now)
    }
    if (path === 'login' && request.method === 'POST') {
      const body = await readBody(request)
      const email = str(body.email, 254).toLowerCase()
      const ipKey = await hash(request.headers.get('CF-Connecting-IP') || 'unknown')
      const bucket = Math.floor(now / 900000)
      const limitKey = `hub:${ipKey}:${bucket}`
      await env.DB.prepare('INSERT INTO login_attempts(key,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1').bind(limitKey, now + 900000).run()
      const attempts = await env.DB.prepare('SELECT attempts FROM login_attempts WHERE key=?').bind(limitKey).first<{ attempts: number }>()
      if ((attempts?.attempts || 0) > 8) return json({ error: 'محاولات كثيرة. حاول بعد 15 دقيقة.' }, 429)
      const user = await env.DB.prepare('SELECT id,password_hash,active FROM hub_users WHERE email=? COLLATE NOCASE').bind(email).first<{ id: string; password_hash: string | null; active: number }>()
      if (!user?.active || !user.password_hash || !await verify(user.password_hash, str(body.password, 256, false))) return json({ error: 'البريد أو كلمة المرور غير صحيحة.' }, 401)
      return sessionResponse(request, env, user.id, now)
    }
    if (path === 'password-reset' && request.method === 'POST') {
      if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return json({ error: 'استعادة كلمة المرور غير مفعلة بعد. يلزم إعداد بريد الإرسال في Cloudflare.' }, 503)
      const body = await readBody(request)
      const email = str(body.email, 254).toLowerCase()
      const user = await env.DB.prepare('SELECT id,name FROM hub_users WHERE email=? COLLATE NOCASE AND active=1').bind(email).first<{ id: string; name: string }>()
      if (user) {
        const token = crypto.randomUUID() + crypto.randomUUID()
        await env.DB.prepare('INSERT INTO hub_password_resets(token,user_id,expires_at) VALUES(?,?,?)').bind(await hash(token), user.id, now + 3600000).run()
        const origin = new URL(request.url).origin
      const resetUrl = `${origin}/ar/hub?token=${encodeURIComponent(token)}`
        const sent = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, to: [email], subject: 'استعادة كلمة مرور دعيدر هب', html: `<p>مرحبًا ${escapeHtml(user.name)}،</p><p><a href="${resetUrl}">اضغط هنا لاختيار كلمة مرور جديدة</a></p><p>الرابط صالح لمدة ساعة.</p>` }) })
        if (!sent.ok) return json({ error: 'تعذر إرسال رسالة الاستعادة الآن.' }, 502)
      }
      return json({ success: true, message: 'إذا كان البريد مسجلًا، ستصلك رسالة استعادة خلال دقائق.' })
    }
    if (path === 'reset' && request.method === 'POST') {
      const body = await readBody(request)
      const token = str(body.token, 128, false)
      const password = str(body.password, 256, false)
      if (password.length < 12) return json({ error: 'كلمة المرور يجب أن تكون 12 حرفًا على الأقل.' }, 422)
      const row = await env.DB.prepare('SELECT user_id FROM hub_password_resets WHERE token=? AND expires_at>? AND used_at IS NULL').bind(await hash(token), now).first<{ user_id: string }>()
      if (!row) return json({ error: 'رابط الاستعادة منتهي أو مستخدم.' }, 410)
      const salt = crypto.randomUUID() + crypto.randomUUID()
      await env.DB.batch([
        env.DB.prepare('UPDATE hub_users SET password_hash=? WHERE id=?').bind(`${salt}:${await passwordHash(password, salt)}`, row.user_id),
        env.DB.prepare('UPDATE hub_password_resets SET used_at=? WHERE token=?').bind(now, await hash(token)),
        env.DB.prepare('DELETE FROM hub_sessions WHERE user_id=?').bind(row.user_id),
      ])
      return json({ success: true })
    }
    if (path === 'session' && request.method === 'GET') {
      const user = await currentUser(request, env)
      return user ? json({ user }) : json({ user: null })
    }
    if (path === 'logout' && request.method === 'POST') {
      const token = cookie(request, 'daidar_hub_session')
      if (token) await env.DB.prepare('DELETE FROM hub_sessions WHERE token=?').bind(await hash(token)).run()
      return json({ success: true }, 200, { 'Set-Cookie': `daidar_hub_session=; Path=/api/hub; HttpOnly; SameSite=Lax; Max-Age=0${secure(request)}` })
    }
    const user = await currentUser(request, env)
    if (!user) return json({ error: 'سجل دخولك للمتابعة.' }, 401)
    if (path.startsWith('download/') && request.method === 'GET') {
      if (!env.HUB_FILES) return json({ error: 'التخزين الخاص غير مضبوط.' }, 503)
      const id = path.slice('download/'.length)
      const allowed = await env.DB.prepare("SELECT 1 AS ok FROM hub_subscriptions s JOIN hub_releases r ON r.published=1 WHERE s.user_id=? AND s.status IN ('active','awaiting_activation') AND r.id=? LIMIT 1").bind(user.id, id).first()
      if (!allowed) return json({ error: 'لا تملك صلاحية تنزيل هذا الإصدار.' }, 403)
      const release = await env.DB.prepare('SELECT object_key,filename FROM hub_releases WHERE id=? AND published=1').bind(id).first<{ object_key: string; filename: string }>()
      const object = release && await env.HUB_FILES.get(release.object_key)
      if (!object || !release) return json({ error: 'الملف غير موجود.' }, 404)
      const filename = release.filename.replace(/[^\\w.-]/g, '_').slice(0,120)
      return new Response(object.body, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
    }
    if (path === 'license/activate' && request.method === 'POST') {
      if (!env.HUB_LICENSE_SIGNING_PRIVATE_JWK || !env.HUB_LICENSE_VERIFY_PUBLIC_JWK) return json({ error: 'تفعيل الرخص غير مضبوط على الخادم.' }, 503)
      const body = await readBody(request)
      const subscriptionId = str(body.subscriptionId, 64)
      const deviceHash = str(body.deviceHash, 128)
      if (!/^[a-f0-9]{32,128}$/i.test(deviceHash)) return json({ error: 'معرف الجهاز غير صالح.' }, 422)
      const subscription = await env.DB.prepare("SELECT * FROM hub_subscriptions WHERE id=? AND user_id=? AND status IN ('awaiting_activation','active')").bind(subscriptionId, user.id).first<{ id: string; status: string; snapshot: string; expires_at: number | null; starts_at: number | null }>()
      if (!subscription) return json({ error: 'الاشتراك غير موجود أو غير معتمد.' }, 404)
      if (!await env.DB.prepare('SELECT id FROM hub_releases WHERE published=1 LIMIT 1').first()) return json({ error: 'لا يوجد إصدار متاح للتفعيل بعد.' }, 409)
      const existingDevice = await env.DB.prepare('SELECT device_hash FROM hub_devices WHERE subscription_id=?').bind(subscriptionId).first<{ device_hash: string }>()
      if (existingDevice && existingDevice.device_hash !== deviceHash) return json({ error: 'هذا الاشتراك مرتبط بجهاز آخر. تواصل مع الإدارة لنقل الرخصة.' }, 409)
      const now = Date.now()
      if (subscription.status === 'active' && subscription.expires_at && subscription.expires_at <= now) return json({ error: 'انتهى الاشتراك. جدده من حسابك.' }, 410)
      await env.DB.prepare('INSERT OR IGNORE INTO hub_devices(id,subscription_id,device_hash,activated_at,last_seen_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(), subscriptionId, deviceHash, now, now).run()
      const bound = await env.DB.prepare('SELECT device_hash FROM hub_devices WHERE subscription_id=?').bind(subscriptionId).first<{ device_hash: string }>()
      if (!bound || bound.device_hash !== deviceHash) return json({ error: 'تم ربط الاشتراك بجهاز مختلف.' }, 409)
      let startsAt = subscription.starts_at
      let expiresAt = subscription.expires_at
      if (subscription.status === 'awaiting_activation') {
        const snapshot = JSON.parse(subscription.snapshot) as { period?: string }
        startsAt = now
        expiresAt = billingExpiry(now, snapshot.period)
        await env.DB.prepare("UPDATE hub_subscriptions SET status='active',starts_at=?,expires_at=? WHERE id=? AND status='awaiting_activation'").bind(startsAt, expiresAt, subscriptionId).run()
      } else {
        await env.DB.prepare('UPDATE hub_devices SET last_seen_at=? WHERE subscription_id=?').bind(now, subscriptionId).run()
      }
      const latest = await env.DB.prepare('SELECT version,payload,signature FROM hub_licenses WHERE subscription_id=? AND status=\'issued\' ORDER BY version DESC LIMIT 1').bind(subscriptionId).first<{ version: number; payload: string; signature: string }>()
      const latestPayload = latest ? JSON.parse(latest.payload) as { expiresAt?: number } : null
      if (latest && existingDevice && latestPayload?.expiresAt === expiresAt) return json({ license: { version: latest.version, payload: latestPayload, signature: latest.signature, publicKey: JSON.parse(env.HUB_LICENSE_VERIFY_PUBLIC_JWK) } })
      const snapshot = JSON.parse(subscription.snapshot) as Record<string, unknown>
      const previous = await env.DB.prepare('SELECT MAX(version) AS v FROM hub_licenses WHERE subscription_id=?').bind(subscriptionId).first<{ v: number | null }>()
      const version = (previous?.v || 0) + 1
      const payload = { schema: 1, licenseId: crypto.randomUUID(), customerId: user.id, subscriptionId, productId: snapshot.productId, modules: snapshot.addons, devicesAllowed: 1, deviceHash, activatedAt: startsAt, expiresAt, offlineClockPolicy: 'Store last trusted UTC check in secure app storage; reject significant rollback and revalidate online. Fully offline rollback prevention is limited.' }
      const privateKey = await crypto.subtle.importKey('jwk', JSON.parse(env.HUB_LICENSE_SIGNING_PRIVATE_JWK), { name: 'Ed25519' }, false, ['sign'])
      const bytes = encoder.encode(canonical(payload))
      const sig = new Uint8Array(await crypto.subtle.sign('Ed25519', privateKey, bytes))
      const signature = btoa(String.fromCharCode(...sig))
      await env.DB.batch([
        env.DB.prepare('UPDATE hub_licenses SET status=\'replaced\' WHERE subscription_id=? AND status=\'issued\'').bind(subscriptionId),
        env.DB.prepare('INSERT INTO hub_licenses(id,subscription_id,version,payload,signature,status,created_at) VALUES(?,?,?,?,?,\'issued\',?)').bind(payload.licenseId, subscriptionId, version, JSON.stringify(payload), signature, now),
        env.DB.prepare('INSERT INTO hub_audit(id,actor,action,entity_id,data,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(), user.email, 'activate_license', subscriptionId, JSON.stringify({ version }), now),
      ])
      return json({ license: { version, payload, signature, publicKey: JSON.parse(env.HUB_LICENSE_VERIFY_PUBLIC_JWK) } })
    }
    if (path.startsWith('license/') && request.method === 'GET') {
      const subscriptionId = path.slice('license/'.length)
      const own = await env.DB.prepare('SELECT id FROM hub_subscriptions WHERE id=? AND user_id=?').bind(subscriptionId,user.id).first()
      if (!own) return json({ error: 'الرخصة غير موجودة.' },404)
      const row = await env.DB.prepare("SELECT version,payload,signature FROM hub_licenses WHERE subscription_id=? AND status='issued' ORDER BY version DESC LIMIT 1").bind(subscriptionId).first<{version:number;payload:string;signature:string}>()
      if (!row || !env.HUB_LICENSE_VERIFY_PUBLIC_JWK) return json({ error: 'الرخصة ستتاح بعد أول تفعيل ناجح.' },404)
      const license = { version:row.version,payload:JSON.parse(row.payload),signature:row.signature,publicKey:JSON.parse(env.HUB_LICENSE_VERIFY_PUBLIC_JWK) }
      return new Response(JSON.stringify(license),{headers:{'Content-Type':'application/json','Content-Disposition':`attachment; filename="license-${subscriptionId}.json"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})
    }
    if (path === 'catalog' && request.method === 'GET') return json({ catalog: await catalog(env) })
    if (path === 'orders' && request.method === 'GET') {
      const rows = await env.DB.prepare('SELECT id,order_number,snapshot,status,proof_requested_at,created_at,updated_at,rejection_reason,admin_note FROM hub_orders WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(user.id).all<Record<string, unknown>>()
      const subs = await env.DB.prepare('SELECT id,source_order_id,snapshot,status,starts_at,expires_at,allowed_devices FROM hub_subscriptions WHERE user_id=? ORDER BY created_at DESC').bind(user.id).all<Record<string, unknown>>()
      const releases = subs.results.length ? (await env.DB.prepare('SELECT id,version,filename,created_at FROM hub_releases WHERE published=1 ORDER BY created_at DESC').all()).results : []
      return json({ serverNow: now, orders: rows.results.map(r => ({ ...r, proof_available_at: Number(r.created_at) + 120000, snapshot: JSON.parse(String(r.snapshot)) })), subscriptions: subs.results.map(r => ({ ...r, snapshot: JSON.parse(String(r.snapshot)), ...(typeof r.expires_at === 'number' && r.expires_at <= now && r.status === 'active' ? { status: 'expired' } : {}) })), releases })
    }
    if (path === 'orders' && request.method === 'POST') {
      const body = await readBody(request)
      const config = await catalog(env)
      const product = config.products.find(p => p.id === body.productId)
      if (!product || (!product.available && config.commercialEnabled)) return json({ error: 'هذا النظام غير متاح للشراء حاليًا.' }, 409)
      const activity = config.activities.find(a => a.id === body.activityId)
      const addons = Array.isArray(body.addons) ? [...new Set(body.addons.filter(x => typeof x === 'string'))] : []
      if (!activity || body.devices !== 1 || !['monthly', 'yearly'].includes(String(body.period))) return json({ error: 'اختيارات الطلب غير مكتملة.' }, 422)
      const requiredModules = config.modules.filter(m => m.essential && m.availableFor.includes(activity.id)).map(m => m.id)
      const selectedIds = [...new Set([...requiredModules, ...addons])]
      const modules = selectedIds.map(id => config.modules.find(m => m.id === id)).filter((m): m is HubModule => !!m)
      if (modules.length !== selectedIds.length || modules.some(m => !m.availableFor.includes(activity.id) || (!m.essential && (m.priceStatus !== 'approved' || m.monthlyPrice == null || m.yearlyPrice == null)))) return json({ error: 'بعض الإضافات غير متاحة للتسعير والطلب الآن.' }, 409)
      if (modules.some(m => m.requires.some(required => !selectedIds.includes(required)) || m.conflicts.some(conflict => selectedIds.includes(conflict)))) return json({ error: 'راجع اعتماديات الإضافات وتعارضاتها.' }, 422)
      const renewalId = typeof body.renewSubscriptionId === 'string' ? body.renewSubscriptionId : ''
      if (renewalId && !await env.DB.prepare('SELECT id FROM hub_subscriptions WHERE id=? AND user_id=? AND product_id=?').bind(renewalId, user.id, product.id).first()) return json({ error: 'الاشتراك المطلوب تجديده غير موجود.' }, 404)
      const period = body.period as 'monthly' | 'yearly'
      const base = period === 'monthly' ? config.billing.monthly : config.billing.yearly
      const total = base + modules.reduce((sum, m) => sum + (period === 'monthly' ? m.monthlyPrice! : m.yearlyPrice!), 0)
      const snapshot = { productId: product.id, product: product.nameAr, activityId: activity.id, activity: activity.nameAr, addons: modules.map(m => ({ id: m.id, name: m.nameAr, monthlyPrice: m.monthlyPrice, yearlyPrice: m.yearlyPrice })), devices: 1, period, basePrice: base, total, currency: 'EGP', paymentMode: config.commercialEnabled ? 'instapay' : 'demo', renewalSubscriptionId: renewalId || null, note: config.commercialEnabled ? '' : 'رحلة تجريبية؛ لا تحوّل أموالًا ولا ترسل إثبات دفع. المنتج غير متاح للتسليم بعد.' }
      const id = crypto.randomUUID()
      const number = `DH-${new Date(now).toISOString().slice(2,10).replaceAll('-', '')}-${crypto.randomUUID().slice(0,6).toUpperCase()}`
      await env.DB.prepare('INSERT INTO hub_orders(id,order_number,user_id,snapshot,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(id, number, user.id, JSON.stringify(snapshot), 'awaiting_transfer', now, now).run()
      return json({ serverNow: now, order: { id, orderNumber: number, snapshot, status: 'awaiting_transfer', createdAt: now, proofAvailableAt: now + 120000 } }, 201)
    }
    if (/^orders\/[^/]+\/proof-intent$/.test(path) && request.method === 'POST') {
      const id = path.split('/')[1]
      const row = await env.DB.prepare('SELECT created_at,status,snapshot FROM hub_orders WHERE id=? AND user_id=?').bind(id, user.id).first<{ created_at: number; status: string; snapshot: string }>()
      if (!row) return json({ error: 'الطلب غير موجود.' }, 404)
      if (row.status !== 'awaiting_transfer') return json({ error: 'حالة الطلب لا تسمح بهذا الإجراء.' }, 409)
      if (now < row.created_at + 120000) return json({ error: 'انتظر انتهاء العداد المحفوظ في الطلب.' }, 425)
      await env.DB.prepare("UPDATE hub_orders SET status='under_review',proof_requested_at=?,updated_at=? WHERE id=? AND user_id=? AND status='awaiting_transfer'").bind(now, now, id, user.id).run()
      const demo = JSON.parse(row.snapshot).paymentMode === 'demo'
      return json({ success: true, demo, message: demo ? 'هذا مسار تجريبي ولم يتم إرسال دفعة أو رسالة واتساب.' : 'تم تسجيل طلب إرسال الإثبات. فتح واتساب لا يثبت إرسال الرسالة أو وصول التحويل.' })
    }
    if (path === 'transfer-requests' && request.method === 'POST') {
      const body = await readBody(request)
      const reason = str(body.reason, 1000)
      const sub = await env.DB.prepare('SELECT id FROM hub_subscriptions WHERE id=? AND user_id=?').bind(str(body.subscriptionId, 64), user.id).first<{ id: string }>()
      if (!sub || reason.length < 5) return json({ error: 'بيانات الطلب غير صحيحة.' }, 422)
      const id = crypto.randomUUID()
      await env.DB.prepare('INSERT INTO hub_device_transfer_requests(id,subscription_id,user_id,reason,created_at) VALUES(?,?,?,?,?)').bind(id, sub.id, user.id, reason, now).run()
      return json({ success: true, id }, 201)
    }
    return json({ error: 'المسار غير موجود.' }, 404)
  } catch (error) {
    if (String(error).includes('hub_users.email') || (error instanceof Error && error.message === 'EMAIL_TAKEN')) return json({ error: 'هذا البريد مسجل بالفعل.' }, 409)
    console.error('[hub-api]', error)
    return json({ error: 'تعذر إكمال الطلب الآن.' }, 500)
  }
}

interface HubModule { id: string; nameAr: string; nameEn: string; descriptionAr: string; descriptionEn: string; availableFor: string[]; requires: string[]; conflicts: string[]; essential: boolean; recommendedFor: string[]; monthlyPrice: number | null; yearlyPrice: number | null; priceStatus: 'approved' | 'draft' }
interface HubCatalog { products: { id: string; nameAr: string; nameEn: string; descriptionAr: string; descriptionEn: string; available: boolean; status?: string }[]; activities: { id: string; nameAr: string; nameEn: string; descriptionAr: string; descriptionEn: string }[]; modules: HubModule[]; devices?: { count: number; available: boolean }[]; billing: { monthly: number; yearly: number; currency: string }; commercialEnabled: boolean }
export async function catalog(env: Env): Promise<HubCatalog> {
  const row = await env.DB!.prepare("SELECT data FROM hub_catalog WHERE key='catalog'").first<{ data: string }>()
  if (row) return JSON.parse(row.data)
  return {
    products: [{ id: 'daidar-flow', nameAr: 'دعيدر فلو', nameEn: 'Daidar Flow', descriptionAr: 'المبيعات والمخزون والكاشير', descriptionEn: 'Sales, inventory and cashier', available: false, status: 'coming_soon' }],
    activities: [
      ['general', 'متجر عام', 'General store', 'إدارة متنوعة للمنتجات والمبيعات.', 'Flexible products and sales.'],
      ['supermarket', 'سوبر ماركت', 'Supermarket', 'منتجات وعبوات ووزن وصلاحية.', 'Products, packs, weights and expiry.'],
      ['restaurant', 'مطعم أو كافيه', 'Restaurant or cafe', 'طلبات وطاولات ومكونات الوجبات.', 'Orders, tables and meal ingredients.'],
      ['clothing', 'ملابس وأحذية', 'Clothes and shoes', 'مقاسات وألوان وموديلات.', 'Sizes, colors and styles.'],
      ['electronics', 'أجهزة كهربائية', 'Electrical appliances', 'أجهزة وأرقام تسلسلية وضمان.', 'Devices, serial numbers and warranties.'],
    ].map(([id, nameAr, nameEn, descriptionAr, descriptionEn]) => ({ id, nameAr, nameEn, descriptionAr, descriptionEn })),
    modules: moduleSeeds(),
    devices: [{ count: 1, available: true }, { count: 2, available: false }],
    billing: { monthly: 35000, yearly: 350000, currency: 'EGP' },
    commercialEnabled: false,
  }
}
function moduleSeeds(): HubModule[] {
  const mods: [string,string,string,string|string[]][] = [
    ['core-sales','المبيعات','Sales','supermarket restaurant clothing electronics general'],
    ['core-inventory','المخزون','Inventory','supermarket restaurant clothing electronics general'],
    ['core-cashier','الكاشير','Cashier','supermarket restaurant clothing electronics general'],
    ['weight','الوزن','Weight-based sales',['supermarket']],['expiry','الصلاحية والتشغيلات','Expiry and batches',['supermarket']],['packs','العبوات والعروض','Packs and offers',['supermarket']],
    ['tables','الطاولات','Tables',['restaurant']],['meal-extras','إضافات الوجبات','Meal extras',['restaurant']],['kitchen-recipes','المطبخ والوصفات','Kitchen and recipes',['restaurant']],
    ['sizes-colors','الألوان والمقاسات','Colors and sizes',['clothing']],['serial-warranty','الأرقام التسلسلية والضمان','Serial numbers and warranty',['electronics']],
  ]
  return mods.map(([id,nameAr,nameEn,raw]) => { const availableFor = typeof raw === 'string' ? raw.split(' ') : raw; const essential = id.startsWith('core-'); return { id,nameAr,nameEn,descriptionAr: essential ? 'وظيفة أساسية لازمة لتشغيل النظام.' : 'إضافة اختيارية. سعرها ما زال مسودة ويحتاج اعتمادًا من الإدارة.',descriptionEn: essential ? 'Required core feature.' : 'Optional add-on. Pricing is a draft pending admin approval.',availableFor,requires:[],conflicts:[],essential,recommendedFor: essential ? [] : availableFor,monthlyPrice: essential ? 0 : null,yearlyPrice: essential ? 0 : null,priceStatus: essential ? 'approved' : 'draft' } })
}
function cookie(request: Request, name: string) { return request.headers.get('Cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(`${name}=`))?.slice(name.length + 1) || '' }
async function currentUser(request: Request, env: Env) {
  const token = cookie(request, 'daidar_hub_session')
  if (!token) return null
  const row = await env.DB!.prepare('SELECT u.id,u.email,u.name FROM hub_sessions s JOIN hub_users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>? AND u.active=1').bind(await hash(token), Date.now()).first<{ id: string; email: string; name: string }>()
  return row
}
async function sessionResponse(request: Request, env: Env, userId: string, now: number) {
  const token = crypto.randomUUID() + crypto.randomUUID()
  await env.DB!.prepare('INSERT INTO hub_sessions(token,user_id,expires_at) VALUES(?,?,?)').bind(await hash(token), userId, now + 30 * DAY).run()
  return json({ success: true }, 200, { 'Set-Cookie': `daidar_hub_session=${token}; Path=/api/hub; HttpOnly; SameSite=Lax; Max-Age=2592000${secure(request)}` })
}
function secure(request: Request) { return new URL(request.url).protocol === 'https:' ? '; Secure' : '' }
async function readBody(request: Request): Promise<Record<string, unknown>> { const raw = await request.text(); if (raw.length > 20000) throw new Error('body too large'); const parsed = JSON.parse(raw); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid body'); return parsed }
function str(value: unknown, max: number, trim = true) { if (typeof value !== 'string' || value.length > max) return ''; return trim ? value.trim() : value }
async function passwordHash(password: string, salt: string) { const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']); const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 180000, hash: 'SHA-256' }, key, 256); return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2,'0')).join('') }
function canonical(value: unknown): string { if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`; if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`; return JSON.stringify(value) }
function billingExpiry(start: number, period: unknown) { const date = new Date(start); const day = date.getUTCDate(); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + (period === 'yearly' ? 12 : 1)); const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth()+1, 0)).getUTCDate(); date.setUTCDate(Math.min(day,lastDay)); return date.getTime() }
async function verify(stored: string, password: string) { const [salt, expected] = stored.split(':'); if (!salt || !/^[a-f\d]{64}$/i.test(expected || '') || !password) return false; const actual = await passwordHash(password,salt); let diff=0; for(let i=0;i<64;i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i); return diff===0 }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)) }
