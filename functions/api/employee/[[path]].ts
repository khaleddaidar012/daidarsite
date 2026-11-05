import { passwordVault } from '../../lib/password-vault'
import { staffChat } from '../../lib/staff-chat'
import { workProjects } from '../../lib/work-projects'
import { hash, json, sameOrigin, verifyPassword, type Env } from '../../lib/store'
import { cairoDay, calculatePayroll, employeeSession, monthlyAttendance, safeEmployee, type Employee, type Attendance } from '../../lib/employees'
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
      return await handleStoreRequest(new Request(target, request), { ...env, DB: env.ECOSYSTEM_STORE_DB, READ_ONLY_PREVIEW: 'false' }, { id: employee.id, username: employee.email, email: employee.email, role: 'super_admin', store_id: null, is_active: 1, password: '' })
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
    if (storeRenewal && request.method === 'POST') {
      if (!employee.manage_store_subscriptions) return json({ error: 'حسابك لا يملك صلاحية تجديد اشتراكات المتاجر.' }, 403)
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'يلزم إرسال بيانات التجديد بصيغة JSON.' }, 415)
      if (!env.ECOSYSTEM_STORE_DB) return json({ error: 'مصدر بيانات المتاجر غير مربوط.' }, 503)
      const body = await request.clone().json().catch(() => null) as Record<string, unknown> | null
      if (!body || !Number.isSafeInteger(body.months) || Number(body.months) < 1 || Number(body.months) > 12) return json({ error: 'مدة التجديد غير صحيحة.' }, 422)
      const target = new URL(`/api/admin/merchants/${storeRenewal[1]}/renew-subscription`, request.url)
      const safeRequest = new Request(target, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ months: Number(body.months) }) })
      const result = await handleStoreRequest(safeRequest, { ...env, DB: env.ECOSYSTEM_STORE_DB, READ_ONLY_PREVIEW: 'false' }, { id: employee.id, username: employee.email, email: employee.email, role: 'super_admin', store_id: null, is_active: 1, password: '' })
      if (result.ok) await recordAdminNotification(env, { actor: employee.name, eventType: 'store_subscription_renewed_by_employee', title: 'تجديد اشتراك متجر', detail: `${employee.name} جدّد اشتراك متجر`, target: 'hub' })
      return result
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
      const rows = await env.DB.prepare('SELECT * FROM employee_requests WHERE employee_id = ? AND day >= ? AND day <= ? ORDER BY created_at DESC').bind(employee.id, month + '-01', month + '-31').all()
      return json({ requests: rows.results })
    }
    if (path === 'requests' && request.method === 'POST') {
      const raw = await request.text()
      if (raw.length > 4096) return json({ error: 'طلب كبير جدًا' }, 413)
      const body = JSON.parse(raw)
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
      return json({ records: rows, open, today, serverDay: cairoDay(), payroll: payrollView })
    }
    if (path === 'check-in' && request.method === 'POST') {
      const shiftId = crypto.randomUUID()
      const inserted = await env.DB.prepare('INSERT OR IGNORE INTO attendance_shifts VALUES (?, ?, ?, ?, NULL)').bind(shiftId, employee.id, cairoDay(now), now).run() as { meta?: { changes?: number }; changes?: number }
      const row = await env.DB.prepare('SELECT * FROM attendance_shifts WHERE employee_id = ? AND check_out IS NULL').bind(employee.id).first<Attendance>()
      if ((inserted.meta?.changes ?? inserted.changes ?? 0) > 0 && row) {
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
    if(error instanceof Error&&/no such table:\s*attendance_shift_reports/i.test(error.message))return json({error:'نفّذ تحديث 0013_checkout_accomplishments.sql لحفظ الإنجازات وتأكيد الانصراف'},503)
    if(error instanceof Error&&/no such table:\s*employee_presence_checks/i.test(error.message))return json({error:'نفّذ migration 0015_employee_hour_limits.sql لتفعيل حدود الساعات وتأكيد التواجد.'},503)
    if(error instanceof Error&&/no such table:\s*employee_push_subscriptions/i.test(error.message))return json({error:'نفّذ migration 0016_employee_web_push.sql لتسجيل إشعارات الجهاز.'},503)
    if (error instanceof Error && /no such table:\s*attendance_shifts/i.test(error.message)) return json({error:'يلزم تنفيذ تحديث قاعدة البيانات 0011_employee_multiple_shifts.sql لتفعيل الورديات المتعددة'},503)
    return json({ error: 'تعذر تنفيذ الطلب. تأكد من تشغيل migration 0002 في D1.' }, 500)
  }
}
