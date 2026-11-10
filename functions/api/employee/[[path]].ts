import { passwordVault } from '../../lib/password-vault'
import { staffChat } from '../../lib/staff-chat'
import { workProjects } from '../../lib/work-projects'
import { hash, json, sameOrigin, verifyPassword, type Env } from '../../lib/store'
import { cairoDay, cairoTime, calculatePayroll, checkInSchedule, employeeSession, monthlyAttendance, parseWorkWindows, safeEmployee, validCalendarDay, type Employee, type Attendance } from '../../lib/employees'
import { manageProjects } from '../../lib/projects'
import { adminHub } from '../../lib/hub-admin'
import { d1UsageResponse } from '../../lib/d1-usage'
import { recordAdminNotification } from '../../lib/notifications'
import { VAPID_PUBLIC_KEY } from '../../lib/vapid'
import { handleStoreRequest } from '../../../matjari/functions/api/[[route]]'
export async function onRequest({ request, env }: { request: Request; env: Env }) {
  try {
    if (!env.DB) return json({ error: 'الخدمة غير جاهزة' }, 503)
    const path = new URL(request.url).pathname.replace(/^\/api\/employee\/?/, '').replace(/\/$/, '')
    if (request.method !== 'GET' && !sameOrigin(request)) return json({ error: 'طلب غير مسموح' }, 403)
    const now = Date.now()
    if (path === 'login' && request.method === 'POST') {
      const raw = await request.text()
      if (raw.length > 4096) return json({ error: 'طلب كبير جدًا' }, 413)
      const body = JSON.parse(raw)
      if (typeof body.email !== 'string' || typeof body.password !== 'string' || body.email.length > 254 || body.password.length > 256) return json({ error: 'بيانات الدخول غير صحيحة' }, 401)
      const bucket = Math.floor(now / 900000)
      const keys = ['employee-ip:' + await hash(request.headers.get('CF-Connecting-IP') || 'local') + ':' + bucket, 'employee-email:' + await hash(body.email.trim().toLowerCase()) + ':' + bucket]
      await env.DB.batch(keys.map(key => env.DB!.prepare('INSERT INTO login_attempts VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1').bind(key, now + 900000)))
      const attempts = await Promise.all(keys.map(key => env.DB!.prepare('SELECT attempts FROM login_attempts WHERE key = ?').bind(key).first<{ attempts: number }>()))
      if (attempts.some(row => (row?.attempts || 0) > 10)) return json({ error: 'محاولات كثيرة. حاول بعد ١٥ دقيقة.' }, 429)
      const employee = await env.DB.prepare('SELECT * FROM employees WHERE email = ? AND active = 1').bind(body.email.trim().toLowerCase()).first<Employee>()
      const valid = await verifyPassword(body.password, employee?.password_hash || ('00'.repeat(24) + ':' + '00'.repeat(32)))
      if (!employee || !valid) return json({ error: 'بيانات الدخول غير صحيحة' }, 401)
      const token = crypto.randomUUID() + crypto.randomUUID()
      await env.DB.batch([
        env.DB.prepare('DELETE FROM employee_sessions WHERE expires_at <= ?').bind(now),
        env.DB.prepare('DELETE FROM login_attempts WHERE expires_at <= ?').bind(now),
        env.DB.prepare('INSERT INTO employee_sessions VALUES (?, ?, ?, ?)').bind(await hash(token), employee.id, now + 43200000, employee.password_hash),
      ])
      return json({ employee: safeEmployee(employee) }, 200, { 'Set-Cookie': `daidar_employee=${token}; Path=/api/employee; HttpOnly; SameSite=Strict; Max-Age=43200${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}` })
    }
    const employee = await employeeSession(request, env)
    if (!employee) return json({ error: 'سجل دخولك أولاً' }, 401)
    if (path === 'ecosystem-stats' && request.method === 'GET') {
      if (!employee.view_ecosystem_stats) return json({ error: 'حسابك لا يملك صلاحية عرض إحصائيات دعيدر هب.' }, 403)
      if (!env.ECOSYSTEM_DB || !env.ECOSYSTEM_STORE_DB || !env.ECOSYSTEM_HUB_DB) return json({ error: 'مصادر بيانات المنظومة غير مكتملة.' }, 503)
      const now = Date.now()
      const [customers, stores, hubSubs, pendingHub, activeHub, expiredHub, pendingStores, activeStores, expiredStores] = await Promise.all([
        env.ECOSYSTEM_DB.prepare('SELECT COUNT(*) AS count FROM ec_users WHERE active=1').first<{count:number}>(),
        env.ECOSYSTEM_STORE_DB.prepare('SELECT COUNT(*) AS count FROM stores').first<{count:number}>(),
        env.ECOSYSTEM_HUB_DB.prepare('SELECT COUNT(*) AS count FROM hub_subscriptions').first<{count:number}>(),
        env.ECOSYSTEM_HUB_DB.prepare("SELECT COUNT(*) AS count FROM hub_orders WHERE status IN ('under_review','needs_info')").first<{count:number}>(),
        env.ECOSYSTEM_HUB_DB.prepare("SELECT COUNT(*) AS count FROM hub_subscriptions WHERE status='active' AND (starts_at IS NULL OR starts_at<=?) AND (expires_at IS NULL OR expires_at>?)").bind(now,now).first<{count:number}>(),
        env.ECOSYSTEM_HUB_DB.prepare("SELECT COUNT(*) AS count FROM hub_subscriptions WHERE status='expired' OR expires_at<=?").bind(now).first<{count:number}>(),
        env.ECOSYSTEM_STORE_DB.prepare("SELECT COUNT(*) AS count FROM stores s JOIN subscriptions b ON b.id=(SELECT x.id FROM subscriptions x WHERE x.store_id=s.id ORDER BY x.created_at DESC LIMIT 1) WHERE b.status IN ('pending','awaiting_activation') OR (s.is_active=0 AND EXISTS(SELECT 1 FROM users u WHERE u.store_id=s.id AND u.is_active=1))").first<{count:number}>(),
        env.ECOSYSTEM_STORE_DB.prepare("SELECT COUNT(*) AS count FROM stores s JOIN subscriptions b ON b.id=(SELECT x.id FROM subscriptions x WHERE x.store_id=s.id ORDER BY x.created_at DESC LIMIT 1) WHERE s.is_active=1 AND b.status IN ('active','trial') AND b.start_date<=date('now') AND b.end_date>=date('now') AND EXISTS(SELECT 1 FROM users u WHERE u.store_id=s.id AND u.is_active=1)").first<{count:number}>(),
        env.ECOSYSTEM_STORE_DB.prepare("SELECT COUNT(*) AS count FROM stores s JOIN subscriptions b ON b.id=(SELECT x.id FROM subscriptions x WHERE x.store_id=s.id ORDER BY x.created_at DESC LIMIT 1) WHERE b.status='expired' OR b.end_date<date('now')").first<{count:number}>(),
      ])
      return json({ counts: { customers: customers?.count || 0, stores: stores?.count || 0, systems: hubSubs?.count || 0, pending: (pendingHub?.count || 0) + (pendingStores?.count || 0), active: (activeHub?.count || 0) + (activeStores?.count || 0), expired: (expiredHub?.count || 0) + (expiredStores?.count || 0) } })
    }
    if (path === 'store-admin' && request.method === 'GET') {
      if (!employee.manage_store_subscriptions) return json({ error: 'حسابك لا يملك صلاحية عرض وتجديد اشتراكات المتاجر.' }, 403)
      if (!env.ECOSYSTEM_STORE_DB) return json({ error: 'مصدر بيانات المتاجر غير مربوط.' }, 503)
      const target = new URL('/api/admin/merchants', request.url)
      const result = await handleStoreRequest(new Request(target, request), { ...env, DB: env.ECOSYSTEM_STORE_DB, READ_ONLY_PREVIEW: 'false' }, { id: employee.id, username: employee.email, email: employee.email, role: 'super_admin', store_id: null, is_active: 1, password: '' })
      if (!result.ok) return result
      const data = await result.clone().json().catch(() => ({})) as Record<string, unknown>
      let renewalRequests: unknown[] = []
      let customerPaymentRequests: Array<{ id: string; store_id: string; status: string; created_at: string; has_receipt: boolean }> = []
      let customerPaymentTrackingAvailable = false
      try {
        const rows = await env.ECOSYSTEM_STORE_DB.prepare('SELECT id,store_id,months,status,created_at,reviewed_at FROM employee_store_renewal_requests WHERE employee_id=? ORDER BY created_at DESC LIMIT 100').bind(employee.id).all()
        renewalRequests = rows.results || []
      } catch (error) {
        if (!(error instanceof Error) || !/no such table/i.test(error.message)) throw error
      }
      try {
        const rows = await env.ECOSYSTEM_STORE_DB.prepare(`SELECT r.id,r.store_id,r.status,r.created_at,CASE WHEN COALESCE(r.proof_base64,'')<>'' THEN 1 ELSE 0 END AS has_receipt
          FROM subscription_payment_requests r
          WHERE r.id=(SELECT x.id FROM subscription_payment_requests x WHERE x.store_id=r.store_id ORDER BY x.created_at DESC LIMIT 1)`).all()
        customerPaymentRequests = (rows.results || []).map((row: any) => ({ ...row, has_receipt: !!row.has_receipt }))
        customerPaymentTrackingAvailable = true
      } catch (error) {
        if (!(error instanceof Error) || !/no such table/i.test(error.message)) throw error
      }
      const paymentRequestByStore = new Map(customerPaymentRequests.map(item => [item.store_id,item]))
      const merchants = Array.isArray(data.merchants) ? data.merchants.map((merchant: any) => ({ ...merchant, customer_payment_tracking_available: customerPaymentTrackingAvailable, customer_subscription_request: paymentRequestByStore.get(merchant.store?.id) || null })) : data.merchants
      return json({ ...data, merchants, renewal_requests: renewalRequests })
    }
    if (path === 'store-admin' && request.method === 'POST') {
      if (!employee.create_store) return json({ error: 'حسابك لا يملك صلاحية إنشاء متجر.' }, 403)
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'يلزم إرسال بيانات المتجر بصيغة JSON.' }, 415)
      if (!env.ECOSYSTEM_STORE_DB) return json({ error: 'مصدر بيانات المتاجر غير مربوط.' }, 503)
      const body = await request.clone().json().catch(() => null) as Record<string, unknown> | null
      if (!body || typeof body.store_name !== 'string' || typeof body.activity_type !== 'string' || typeof body.whatsapp_number !== 'string' || typeof body.username !== 'string' || typeof body.password !== 'string') return json({ error: 'راجع بيانات المتجر وبيانات حساب الدخول.' }, 422)
      const target = new URL('/api/admin/merchants', request.url)
      const safeRequest = new Request(target, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, plan_name: 'الباقة السنوية الاحترافية', duration_months: 12, price: 1200 }) })
      const result = await handleStoreRequest(safeRequest, { ...env, DB: env.ECOSYSTEM_STORE_DB, READ_ONLY_PREVIEW: 'false' }, { id: employee.id, username: employee.email, email: employee.email, role: 'super_admin', store_id: null, is_active: 1, password: '' })
      if (result.ok) await recordAdminNotification(env, { actor: employee.name, eventType: 'store_created_by_employee', title: 'إنشاء متجر', detail: `${employee.name} أنشأ متجرًا من لوحة الموظفين`, target: 'hub' })
      return result
    }
    const storeRenewal = path.match(/^store-admin\/([a-zA-Z0-9-]+)\/renew-subscription$/)
    const customerReceiptDownload = path.match(/^store-admin\/([a-zA-Z0-9-]+)\/subscription-receipt$/)
    if (customerReceiptDownload && request.method === 'GET') {
      if (!employee.manage_store_subscriptions) return json({ error: 'حسابك لا يملك صلاحية عرض إيصالات اشتراكات المتاجر.' }, 403)
      if (!env.ECOSYSTEM_STORE_DB) return json({ error: 'مصدر بيانات المتاجر غير مربوط.' }, 503)
      const receipt = await env.ECOSYSTEM_STORE_DB.prepare('SELECT proof_mime,proof_base64 FROM subscription_payment_requests WHERE store_id=? ORDER BY created_at DESC LIMIT 1').bind(customerReceiptDownload[1]).first<{proof_mime:string;proof_base64:string}>()
      if (!receipt?.proof_base64) return json({ error: 'لا يوجد إيصال اشتراك مرفق لهذا المتجر.' }, 404)
      if (!['image/png','image/jpeg','image/webp'].includes(receipt.proof_mime)) return json({ error: 'صيغة إيصال الاشتراك غير مدعومة.' }, 422)
      let bytes: Uint8Array
      try { bytes = Uint8Array.from(atob(receipt.proof_base64), char => char.charCodeAt(0)) }
      catch { return json({ error: 'تعذر قراءة صورة إيصال الاشتراك.' }, 422) }
      const extension = receipt.proof_mime === 'image/jpeg' ? 'jpg' : receipt.proof_mime.split('/')[1]
      return new Response(bytes, { headers: { 'Content-Type': receipt.proof_mime, 'Content-Disposition': `attachment; filename="subscription-receipt-${customerReceiptDownload[1]}.${extension}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
    }
    if (storeRenewal && request.method === 'POST') {
      if (!employee.manage_store_subscriptions) return json({ error: 'حسابك لا يملك صلاحية تجديد اشتراكات المتاجر.' }, 403)
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'يلزم إرسال بيانات التجديد بصيغة JSON.' }, 415)
      if (!env.ECOSYSTEM_STORE_DB) return json({ error: 'مصدر بيانات المتاجر غير مربوط.' }, 503)
      const raw = await request.text()
      if (raw.length > 1450000) return json({ error: 'حجم الإيصال كبير. الحد الأقصى 1 ميجابايت.' }, 413)
      const body = JSON.parse(raw) as Record<string, unknown>
      if (!Number.isSafeInteger(body.months) || Number(body.months) < 1 || Number(body.months) > 12) return json({ error: 'مدة التجديد غير صحيحة.' }, 422)
      if (!['customer_receipt', 'device_upload'].includes(String(body.receipt_source))) return json({ error: 'اختر إيصال العميل أو ارفع صورة من جهازك.' }, 422)
      const storeId = storeRenewal[1]
      const store = await env.ECOSYSTEM_STORE_DB.prepare('SELECT id,name FROM stores WHERE id=?').bind(storeId).first<{id:string;name:string}>()
      if (!store) return json({ error: 'المتجر غير موجود.' }, 404)
      const pending = await env.ECOSYSTEM_STORE_DB.prepare("SELECT id FROM employee_store_renewal_requests WHERE store_id=? AND status='pending'").bind(storeId).first()
      if (pending) return json({ error: 'يوجد طلب تجديد لهذا المتجر بانتظار موافقة الإدارة.' }, 409)
      let proofMime = '', proofBase64 = '', sourcePaymentRequestId: string | null = null
      if (body.receipt_source === 'customer_receipt') {
        const receipt = await env.ECOSYSTEM_STORE_DB.prepare("SELECT id,proof_mime,proof_base64 FROM subscription_payment_requests WHERE store_id=? AND status='pending' ORDER BY created_at DESC LIMIT 1").bind(storeId).first<{id:string;proof_mime:string;proof_base64:string}>()
        if (!receipt) return json({ error: 'لم أجد إيصالًا مرفوعًا من العميل. اختر «رفع صورة من الجهاز» وأرفق الإيصال يدويًا.' }, 422)
        sourcePaymentRequestId = receipt.id
        proofMime = receipt.proof_mime
        proofBase64 = receipt.proof_base64
      } else {
        if (typeof body.proof !== 'string') return json({ error: 'ارفع صورة إيصال التحويل من جهازك.' }, 422)
        const match = body.proof.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/)
        if (!match) return json({ error: 'صيغة الإيصال غير صحيحة. استخدم PNG أو JPG أو WEBP.' }, 422)
        let imageBytes: string
        try { imageBytes = atob(match[2]) } catch { return json({ error: 'تعذر قراءة صورة الإيصال.' }, 422) }
        if (imageBytes.length > 1024 * 1024) return json({ error: 'حجم الإيصال يجب ألا يتجاوز 1 ميجابايت.' }, 413)
        proofMime = match[1]
        proofBase64 = match[2]
      }
      const id = crypto.randomUUID()
      try {
        await env.ECOSYSTEM_STORE_DB.prepare(`INSERT INTO employee_store_renewal_requests(id,store_id,employee_id,employee_name,employee_email,months,proof_mime,proof_base64,source_payment_request_id,status)
          VALUES(?,?,?,?,?,?,?,?,?,'pending')`).bind(id,storeId,employee.id,employee.name,employee.email,Number(body.months),proofMime,proofBase64,sourcePaymentRequestId).run()
      } catch (error) {
        if (error instanceof Error && /no such table/i.test(error.message)) return json({ error: 'ميزة طلبات التجديد تحتاج تحديث قاعدة المتاجر: 0004_employee_store_renewal_requests.sql' }, 503)
        throw error
      }
      try { await recordAdminNotification(env, { actor: employee.name, eventType: 'employee_store_renewal_request', title: 'طلب تجديد اشتراك متجر', detail: `${employee.name} طلب تجديد متجر «${store.name}» لمدة ${Number(body.months)} شهرًا مع إيصال تحويل`, target: 'hub' }) }
      catch (error) { console.error('[employee-store-renewal-notification]', error) }
      return json({ success: true, id, status: 'pending' })
    }
    if (path === 'presence-test' && request.method === 'POST') {
      const shift = await env.DB.prepare('SELECT id FROM attendance_shifts WHERE employee_id=? AND check_out IS NULL').bind(employee.id).first<{id:string}>()
      if (!shift) return json({ error: 'سجّل الحضور أولًا لبدء اختبار التنبيه.' }, 409)
      const subscription = await env.DB.prepare('SELECT endpoint FROM employee_push_subscriptions WHERE employee_id=? LIMIT 1').bind(employee.id).first()
      if (!subscription) return json({ error: 'فعّل إشعارات النظام على هذا الجهاز أولًا.' }, 409)
      const nextCheckAt = now + 60000
      const result = await env.DB.prepare("UPDATE employee_presence_checks SET state='waiting',prompt_stage=0,next_check_at=?,prompt_sent_at=NULL,updated_at=? WHERE shift_id=? AND employee_id=? AND state!='closed'").bind(nextCheckAt, now, shift.id, employee.id).run() as {meta?:{changes?:number};changes?:number}
      if ((result.meta?.changes ?? result.changes ?? 0) < 1) return json({ error: 'تعذر تجهيز الاختبار. حدّث الصفحة وحاول مرة أخرى.' }, 409)
      return json({ success: true, next_check_at: nextCheckAt })
    }
    if(path==='chat')return await staffChat(request,env,{key:'employee:'+employee.id,name:employee.name,employeeId:employee.id})
    if (path === 'password-vault') return await passwordVault(request, env, { admin: false, add: employee.add_passwords === 1, reveal: employee.view_passwords === 1 })
    if (path === 'work-projects') { if (!employee.track_projects) return json({error:'حسابك لا يملك صلاحية تتبع المشاريع'},403); return await workProjects(request, env, false) }
    if (path === 'd1-usage' && request.method === 'GET') {
      if (!employee.view_d1_usage) return json({ error: 'حسابك لا يملك صلاحية عرض سعة قواعد البيانات.' }, 403)
      return await d1UsageResponse(env)
    }
    if (path === 'projects') {
      if (!employee.manage_projects) return json({ error: 'حسابك لا يملك صلاحية إدارة معرض الأعمال.' }, 403)
      if (request.method === 'DELETE') return json({ error: 'صلاحية الموظف تسمح بإضافة المشروع وتعديله أو إخفائه، والحذف النهائي للإدارة فقط.' }, 403)
      const body = request.method === 'POST' ? await request.clone().json().catch(() => ({})) as Record<string, unknown> : {}
      const response = await manageProjects(request, env)
      if (request.method === 'POST' && response.ok) {
        const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 160) : 'مشروع جديد'
        const action = body.id ? 'عدّل مشروعًا' : 'أضاف مشروعًا'
        await recordAdminNotification(env, { actor: employee.name, eventType: body.id ? 'project_updated' : 'project_added', title: 'نشاط في معرض الأعمال', detail: `${employee.name} ${action}: «${title}»`, target: 'projects' })
      }
      return response
    }
    if (['hub-catalog', 'hub-customers', 'hub-manual-subscriptions'].includes(path)) {
      if (!employee.manage_hub_subscriptions) return json({ error: 'حسابك لا يملك صلاحية تسجيل اشتراكات دعيدر هب.' }, 403)
      if (path === 'hub-catalog' && request.method !== 'GET') return json({ error: 'طريقة الطلب غير مسموحة' }, 405)
      if (path !== 'hub-manual-subscriptions' || request.method !== 'POST') return await adminHub(request, env, path, employee.email)
      const body = await request.clone().json().catch(() => ({})) as Record<string, unknown>
      const response = await adminHub(request, env, path, employee.email)
      if (response.ok) {
        const data = await response.clone().json().catch(() => ({})) as Record<string, unknown>
        if (!data.idempotent) {
          const customer = typeof body.userId === 'string' ? await env.DB.prepare('SELECT name FROM hub_users WHERE id=?').bind(body.userId).first<{ name: string }>() : null
          const renewal = !!body.renewalSubscriptionId
          await recordAdminNotification(env, { actor: employee.name, eventType: renewal ? 'hub_subscription_renewed' : 'hub_subscription_created', title: renewal ? 'تجديد اشتراك عميل' : 'تسجيل اشتراك عميل', detail: `${employee.name} ${renewal ? 'جدّد اشتراك' : 'سجّل اشتراك'} ${customer?.name || 'عميل'}`, target: 'hub' })
        }
      }
      return response
    }
    if (path === 'requests' && request.method === 'GET') {
      const month = new URL(request.url).searchParams.get('month') || cairoDay().slice(0, 7)
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return json({ error: 'شهر غير صحيح' }, 400)
      const [rows, shiftChanges, usage] = await Promise.all([
        env.DB.prepare('SELECT * FROM employee_requests WHERE employee_id = ? AND day >= ? AND day <= ? ORDER BY created_at DESC').bind(employee.id, month + '-01', month + '-31').all(),
        env.DB.prepare("SELECT id,employee_id,'shift_change' AS type,day,start_time AS requested_time,end_time AS requested_end,reason,status,admin_note,created_at,decided_at FROM employee_shift_change_requests WHERE employee_id=? AND day>=? AND day<=? ORDER BY created_at DESC").bind(employee.id, month + '-01', month + '-31').all(),
        env.DB.prepare('SELECT COUNT(*) AS count FROM employee_shift_change_requests WHERE employee_id=? AND request_month=?').bind(employee.id, cairoDay(now).slice(0, 7)).first<{count:number}>(),
      ])
      return json({ requests: [...rows.results, ...shiftChanges.results].sort((a:any,b:any)=>Number(b.created_at)-Number(a.created_at)), shift_change_requests_used: usage?.count || 0, shift_change_requests_limit: 3 })
    }
    if (path === 'requests' && request.method === 'POST') {
      const raw = await request.text()
      if (raw.length > 4096) return json({ error: 'طلب كبير جدًا' }, 413)
      const body = JSON.parse(raw)
      if (body.type === 'shift_change') {
        if (!validCalendarDay(body.day) || body.day < cairoDay(now) || typeof body.start_time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.start_time) || typeof body.end_time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.end_time) || body.start_time >= body.end_time || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 1000) return json({ error: 'راجع يوم وفترة الشفت والسبب؛ يجب أن تكون الفترة في نفس اليوم.' }, 422)
        const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM employee_shift_change_requests WHERE employee_id=? AND request_month=?').bind(employee.id, cairoDay(now).slice(0, 7)).first<{count:number}>()
        if ((count?.count || 0) >= 3) return json({ error: 'استخدمت طلبات تغيير الشفت الثلاثة لهذا الشهر.' }, 429)
        const duplicate = await env.DB.prepare("SELECT id FROM employee_shift_change_requests WHERE employee_id=? AND day=? AND status IN ('pending','approved')").bind(employee.id, body.day).first()
        if (duplicate) return json({ error: 'يوجد طلب تغيير شفت قيد المراجعة أو موافق عليه لهذا اليوم.' }, 409)
        const workday = new Date(`${body.day}T00:00:00Z`).getUTCDay()
        const baseWindows = parseWorkWindows(employee.weekly_work_windows)[String(workday)] || []
        if (employee.work_schedule_locked === 1 && !baseWindows.length) return json({ error: 'لا يمكن طلب تغيير شفت في يوم راحة أسبوعية.' }, 422)
        if (baseWindows.some(window => body.start_time >= window.start && body.end_time <= window.end)) return json({ error: 'الفترة المطلوبة موجودة بالفعل ضمن جدولك.' }, 422)
        const id = crypto.randomUUID()
        await env.DB.prepare("INSERT INTO employee_shift_change_requests(id,employee_id,request_month,day,start_time,end_time,reason,status,admin_note,created_at) VALUES(?,?,?,?,?,?,?,'pending','',?)").bind(id, employee.id, cairoDay(now).slice(0, 7), body.day, body.start_time, body.end_time, body.reason.trim(), now).run()
        await recordAdminNotification(env, { actor: employee.name, eventType: 'employee_shift_change_request', title: 'طلب تغيير شفت', detail: `${employee.name} طلب العمل يوم ${body.day} من ${body.start_time} إلى ${body.end_time}`, target: 'employees' })
        return json({ success: true, id, shift_change_requests_used: (count?.count || 0) + 1, shift_change_requests_limit: 3 })
      }
      if (!['leave', 'early'].includes(body.type) || typeof body.day !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(body.day) || new Date(body.day + 'T00:00:00Z').toISOString().slice(0, 10) !== body.day || body.day < cairoDay() || typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 1000 || (body.type === 'early' && (typeof body.requested_time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.requested_time)))) return json({ error: 'راجع التاريخ والسبب ووقت الاستئذان؛ التاريخ يجب أن يكون اليوم أو بعده' }, 422)
      const duplicate = await env.DB.prepare("SELECT id FROM employee_requests WHERE employee_id = ? AND day = ? AND type = ? AND status IN ('pending','approved')").bind(employee.id, body.day, body.type).first()
      if (duplicate) return json({ error: 'يوجد طلب لنفس اليوم بالفعل' }, 409)
      await env.DB.prepare('INSERT OR IGNORE INTO employee_requests VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)').bind(crypto.randomUUID(), employee.id, body.type, body.day, body.type === 'early' ? body.requested_time : null, body.reason.trim(), 'pending', '', now).run()
      await recordAdminNotification(env, { actor: employee.name, eventType: 'employee_request', title: body.type === 'leave' ? 'طلب إجازة جديد' : 'طلب انصراف مبكر', detail: `${employee.name} أرسل طلبًا ليوم ${body.day}${body.type === 'early' ? ` الساعة ${body.requested_time}` : ''}`, target: 'employees' })
      return json({ success: true })
    }
    if (path === 'session' && request.method === 'GET') return json({ employee: safeEmployee(employee) })
    if (path === 'push-config' && request.method === 'GET') return json({ publicKey: VAPID_PUBLIC_KEY })
    if (path === 'push-subscription' && request.method === 'POST') {
      const raw = await request.text(); if (raw.length > 4096) return json({ error: 'بيانات الإشعار كبيرة جدًا' }, 413)
      const body = JSON.parse(raw) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
      let pushHost = ''
      try { const url = new URL(String(body.endpoint)); pushHost = url.hostname.toLowerCase(); if (url.protocol !== 'https:' || url.username || url.password || url.port) pushHost = '' } catch {}
      const allowedPushHost = pushHost === 'fcm.googleapis.com' || pushHost.endsWith('.push.services.mozilla.com') || pushHost.endsWith('.notify.windows.com') || pushHost.endsWith('.push.apple.com')
      if (typeof body.endpoint !== 'string' || body.endpoint.length > 2048 || !allowedPushHost || typeof body.keys?.p256dh !== 'string' || !/^[A-Za-z0-9_-]{80,100}$/.test(body.keys.p256dh) || typeof body.keys?.auth !== 'string' || !/^[A-Za-z0-9_-]{20,40}$/.test(body.keys.auth)) return json({ error: 'بيانات اشتراك الإشعارات غير صحيحة' }, 422)
      const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM employee_push_subscriptions WHERE employee_id=?').bind(employee.id).first<{ count: number }>()
      const already = await env.DB.prepare('SELECT endpoint FROM employee_push_subscriptions WHERE endpoint=? AND employee_id=?').bind(body.endpoint, employee.id).first()
      if (!already && (count?.count || 0) >= 5) return json({ error: 'وصلت للحد الأقصى وهو ٥ أجهزة. ألغِ إشعار جهاز قديم أولًا.' }, 409)
      await env.DB.prepare('INSERT INTO employee_push_subscriptions(endpoint,employee_id,p256dh,auth,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET employee_id=excluded.employee_id,p256dh=excluded.p256dh,auth=excluded.auth,updated_at=excluded.updated_at').bind(body.endpoint, employee.id, body.keys.p256dh, body.keys.auth, now, now).run()
      return json({ success: true })
    }
    if (path === 'push-subscription' && request.method === 'DELETE') {
      const body = await request.json().catch(() => ({})) as { endpoint?: unknown }
      if (typeof body.endpoint !== 'string' || body.endpoint.length > 2048) return json({ error: 'الاشتراك غير صحيح' }, 422)
      await env.DB.prepare('DELETE FROM employee_push_subscriptions WHERE endpoint=? AND employee_id=?').bind(body.endpoint, employee.id).run()
      return json({ success: true })
    }
    if (path === 'logout' && request.method === 'POST') {
      const token = request.headers.get('Cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith('daidar_employee='))?.slice('daidar_employee='.length)
      if (token) await env.DB.prepare('DELETE FROM employee_sessions WHERE token = ?').bind(await hash(token)).run()
      return json({ success: true }, 200, { 'Set-Cookie': 'daidar_employee=; Path=/api/employee; HttpOnly; SameSite=Strict; Max-Age=0; Secure' })
    }
    if (path === 'attendance' && request.method === 'GET') {
      const month = new URL(request.url).searchParams.get('month') || cairoDay().slice(0, 7)
      const rows = await monthlyAttendance(env, month, employee.id)
      if (!rows) return json({ error: 'شهر غير صحيح' }, 400)
      const open = await env.DB.prepare('SELECT * FROM attendance_shifts WHERE employee_id = ? AND check_out IS NULL').bind(employee.id).first<Attendance>()
      const today = await env.DB.prepare('SELECT * FROM attendance_shifts WHERE employee_id = ? AND day = ? ORDER BY check_in DESC LIMIT 1').bind(employee.id, cairoDay()).first<Attendance>()
      let checkIn = checkInSchedule(employee, now)
      if (!checkIn.allowed && employee.work_schedule_locked === 1) {
        const currentTime = cairoTime(now)
        const override = await env.DB.prepare("SELECT id,start_time,end_time FROM employee_shift_change_requests WHERE employee_id=? AND day=? AND status='approved' AND used_at IS NULL AND start_time<=? AND end_time>? ORDER BY decided_at DESC LIMIT 1").bind(employee.id, cairoDay(now), currentTime, currentTime).first<{id:string;start_time:string;end_time:string}>()
        if (override) checkIn = { allowed: true, windows: [...checkIn.windows, { start: override.start_time, end: override.end_time }] }
      }
      let payrollView: { absent_days?: number; absent_dates?: string[]; due_piasters?: number; actual_hours?: number; paid_hours?: number; max_daily_hours?: number; max_monthly_hours?: number; hourly_rate_piasters?: number } | null = null
      {
        const approvedLeaves = await env.DB.prepare("SELECT employee_id,day,type,status FROM employee_requests WHERE employee_id=? AND type='leave' AND status='approved' AND day>=? AND day<=?").bind(employee.id, month + '-01', month + '-31').all<{ employee_id: string; day: string; type: string; status: string }>()
        const calculated = calculatePayroll([employee], rows, approvedLeaves.results, month)
        const ownPayroll = calculated?.[0]
        if (ownPayroll) {
          payrollView = {}
          payrollView.actual_hours = ownPayroll.actual_hours
          payrollView.paid_hours = ownPayroll.paid_hours
          payrollView.max_daily_hours = ownPayroll.max_daily_hours
          payrollView.max_monthly_hours = ownPayroll.max_monthly_hours
          payrollView.hourly_rate_piasters = ownPayroll.hourly_rate_piasters
          if (employee.view_absences) { payrollView.absent_days = ownPayroll.absent_days; payrollView.absent_dates = ownPayroll.absent_dates }
          if (employee.view_due) {
            const adjustment = await env.DB.prepare('SELECT due_piasters FROM employee_payroll_adjustments WHERE employee_id=? AND month=?').bind(employee.id, month).first<{ due_piasters: number }>()
            payrollView.due_piasters = adjustment?.due_piasters ?? ownPayroll.due_piasters
          }
        }
      }
      return json({ records: rows, open, today, serverDay: cairoDay(), checkIn, payroll: payrollView })
    }
    if (path === 'check-in' && request.method === 'POST') {
      const schedule = checkInSchedule(employee, now)
      let approvedOverride: { id: string; start_time: string; end_time: string } | null = null
      if (!schedule.allowed && employee.work_schedule_locked === 1) {
        const currentTime = cairoTime(now)
        approvedOverride = await env.DB.prepare("SELECT id,start_time,end_time FROM employee_shift_change_requests WHERE employee_id=? AND day=? AND status='approved' AND used_at IS NULL AND start_time<=? AND end_time>? ORDER BY decided_at DESC LIMIT 1").bind(employee.id, cairoDay(now), currentTime, currentTime).first<{id:string;start_time:string;end_time:string}>()
      }
      if (!schedule.allowed && !approvedOverride) {
        const hours = schedule.windows.map(window => `${window.start}–${window.end}`).join('، ')
        return json({ error: hours ? `تسجيل الحضور متاح اليوم بتوقيت القاهرة خلال: ${hours}` : 'لا يوجد وقت حضور مثبت لهذا اليوم.' }, 403)
      }
      const shiftId = crypto.randomUUID()
      const inserted = await env.DB.prepare('INSERT OR IGNORE INTO attendance_shifts VALUES (?, ?, ?, ?, NULL)').bind(shiftId, employee.id, cairoDay(now), now).run() as { meta?: { changes?: number }; changes?: number }
      const row = await env.DB.prepare('SELECT * FROM attendance_shifts WHERE employee_id = ? AND check_out IS NULL').bind(employee.id).first<Attendance>()
      if ((inserted.meta?.changes ?? inserted.changes ?? 0) > 0 && row) {
        if (approvedOverride) await env.DB.prepare("UPDATE employee_shift_change_requests SET used_at=? WHERE id=? AND employee_id=? AND status='approved' AND used_at IS NULL").bind(now, approvedOverride.id, employee.id).run()
        await env.DB.prepare("INSERT INTO employee_presence_checks(shift_id,employee_id,state,prompt_stage,last_confirmed_at,next_check_at,updated_at) VALUES(?,?,'waiting',0,?,?,?)").bind(row.id, employee.id, now, now + 3600000, now).run()
        await recordAdminNotification(env, { actor: employee.name, eventType: 'attendance_checkin', title: 'تسجيل حضور', detail: `${employee.name} سجّل حضوره`, target: 'employees' })
      }
      return row ? json({ record: row }) : json({ error: 'تعذر بدء وردية جديدة. حدّث الصفحة وحاول مرة أخرى' }, 409)
    }
    if (path === 'presence-check' && request.method === 'GET') {
      const monitor = await env.DB.prepare("SELECT p.*,a.check_in,a.day FROM employee_presence_checks p JOIN attendance_shifts a ON a.id=p.shift_id WHERE p.employee_id=? AND p.state!='closed' AND a.check_out IS NULL ORDER BY p.updated_at DESC LIMIT 1").bind(employee.id).first<{ shift_id:string;state:string;prompt_stage:number;last_confirmed_at:number;next_check_at:number;prompt_sent_at:number|null;check_in:number;day:string }>()
      if (!monitor) {
        const openShift = await env.DB.prepare('SELECT id FROM attendance_shifts WHERE employee_id=? AND check_out IS NULL').bind(employee.id).first()
        return json({ prompt: null, closed: !openShift })
      }
      if (monitor.state !== 'prompted' || monitor.next_check_at <= now) return json({ prompt: null })
      return json({ prompt: { shift_id: monitor.shift_id, stage: monitor.prompt_stage || 1, delivery_failed: monitor.prompt_stage === 0, deadline: monitor.next_check_at } })
    }
    if (path === 'presence-response' && request.method === 'POST') {
      const raw=await request.text(); if(raw.length>1024)return json({error:'طلب كبير جدًا'},413)
      const body=JSON.parse(raw) as {shift_id?:unknown;response?:unknown}
      if(typeof body.shift_id!=='string'||!['here','away'].includes(String(body.response)))return json({error:'الإجابة غير صحيحة'},422)
      const monitor=await env.DB.prepare("SELECT shift_id FROM employee_presence_checks WHERE shift_id=? AND employee_id=? AND state='prompted'").bind(body.shift_id,employee.id).first<{shift_id:string}>()
      if(!monitor)return json({error:'انتهت مهلة التأكيد أو لا يوجد إشعار حالي'},409)
      const prompt=await env.DB.prepare('SELECT next_check_at FROM employee_presence_checks WHERE shift_id=?').bind(monitor.shift_id).first<{next_check_at:number}>()
      if(!prompt || prompt.next_check_at<=now)return json({error:'انتهت مهلة التأكيد؛ انتظر التنبيه التالي'},409)
      if(body.response==='away')return json({error:'اكتب إنجازات ورديتك لإتمام الانصراف.',requires_checkout_report:true,shift_id:monitor.shift_id},409)
      await env.DB.prepare("UPDATE employee_presence_checks SET state='waiting',prompt_stage=0,last_confirmed_at=?,next_check_at=?,prompt_sent_at=NULL,updated_at=? WHERE shift_id=? AND employee_id=?").bind(now,now+3600000,now,monitor.shift_id,employee.id).run()
      return json({success:true,closed:false,next_check_at:now+3600000})
    }
    if (path === 'check-out' && request.method === 'POST') {
      const row = await env.DB.prepare('SELECT * FROM attendance_shifts WHERE employee_id = ? AND check_out IS NULL').bind(employee.id).first<Attendance>()
      if (!row) return json({ error: 'لا يوجد حضور مفتوح لتسجيل الانصراف' }, 409)
      const raw=await request.text()
      if(raw.length>10000)return json({error:'طلب كبير جدًا'},413)
      let body:Record<string,unknown>
      try{body=JSON.parse(raw)}catch{return json({error:'اكتب إنجازات الوردية قبل تأكيد الانصراف'},422)}
      if(!body||typeof body!=='object'||typeof body.accomplishments!=='string'||!body.accomplishments.trim()||body.accomplishments.length>2000)return json({error:'اكتب إنجازات الوردية من حرف إلى ٢٠٠٠ حرف قبل تأكيد الانصراف'},422)
      if(body.shift_id!==row.id)return json({error:'تغيّرت الوردية الحالية. حدّث الصفحة قبل تأكيد الانصراف'},409)
      const results=await env.DB.batch([
        env.DB.prepare('INSERT INTO attendance_shift_reports(shift_id,employee_id,accomplishments,submitted_at) SELECT id,employee_id,?,? FROM attendance_shifts WHERE id=? AND employee_id=? AND check_out IS NULL ON CONFLICT(shift_id) DO NOTHING').bind(body.accomplishments.trim(),now,row.id,employee.id),
        env.DB.prepare('UPDATE attendance_shifts SET check_out=? WHERE id=? AND employee_id=? AND check_out IS NULL').bind(now,row.id,employee.id),
        env.DB.prepare("UPDATE employee_presence_checks SET state='closed',updated_at=? WHERE shift_id=?").bind(now,row.id),
      ]) as Array<{meta?:{changes?:number};changes?:number}>
      if((results[1]?.meta?.changes??results[1]?.changes??0)===0)return json({error:'تم إغلاق هذه الوردية بالفعل. حدّث الصفحة'},409)
      await recordAdminNotification(env, { actor: employee.name, eventType: 'attendance_checkout', title: 'انصراف وتقرير إنجازات', detail: `${employee.name} سجّل انصرافه وأرسل إنجازات ورديته: ${body.accomplishments.trim().slice(0,300)}`, target: 'employees' })
      return json({ success: true })
    }
    return json({ error: 'غير موجود' }, 404)
  } catch (error) {
    console.error('Employee request failed', error)
    if (error instanceof Error && /no such table:\s*employee_store_renewal_requests/i.test(error.message)) return json({ error: 'طلبات تجديد المتاجر تحتاج تشغيل matjari/migrations/0004_employee_store_renewal_requests.sql على قاعدة ECOSYSTEM_STORE_DB المرتبطة ببيئة الإنتاج.' }, 503)
    if(error instanceof Error&&/no such table:\s*attendance_shift_reports/i.test(error.message))return json({error:'نفّذ تحديث 0013_checkout_accomplishments.sql لحفظ الإنجازات وتأكيد الانصراف'},503)
    if(error instanceof Error&&/no such table:\s*employee_presence_checks/i.test(error.message))return json({error:'نفّذ migration 0015_employee_hour_limits.sql لتفعيل حدود الساعات وتأكيد التواجد.'},503)
    if(error instanceof Error&&/no such table:\s*employee_push_subscriptions/i.test(error.message))return json({error:'نفّذ migration 0016_employee_web_push.sql لتسجيل إشعارات الجهاز.'},503)
    if (error instanceof Error && /no such table:\s*attendance_shifts/i.test(error.message)) return json({error:'يلزم تنفيذ تحديث قاعدة البيانات 0011_employee_multiple_shifts.sql لتفعيل الورديات المتعددة'},503)
    return json({ error: 'تعذر تنفيذ الطلب. تأكد من تشغيل migration 0002 في D1.' }, 500)
  }
}
