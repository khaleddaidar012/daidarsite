import { workProjects } from '../../lib/work-projects'
import { hash, json, sameOrigin, verifyPassword, type Env } from '../../lib/store'
import { cairoDay, calculatePayroll, employeeSession, monthlyAttendance, safeEmployee, type Employee, type Attendance } from '../../lib/employees'
import { manageProjects } from '../../lib/projects'
import { adminHub } from '../../lib/hub-admin'
import { d1UsageResponse } from '../../lib/d1-usage'
import { recordAdminNotification } from '../../lib/notifications'
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
      let payrollView: { absent_days?: number; absent_dates?: string[]; due_piasters?: number } | null = null
      if (employee.view_absences || employee.view_due) {
        const approvedLeaves = await env.DB.prepare("SELECT employee_id,day,type,status FROM employee_requests WHERE employee_id=? AND type='leave' AND status='approved' AND day>=? AND day<=?").bind(employee.id, month + '-01', month + '-31').all<{ employee_id: string; day: string; type: string; status: string }>()
        const calculated = calculatePayroll([employee], rows, approvedLeaves.results, month)
        const ownPayroll = calculated?.[0]
        if (ownPayroll) {
          payrollView = {}
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
      const inserted = await env.DB.prepare('INSERT OR IGNORE INTO attendance_shifts VALUES (?, ?, ?, ?, NULL)').bind(crypto.randomUUID(), employee.id, cairoDay(now), now).run() as { meta?: { changes?: number }; changes?: number }
      const row = await env.DB.prepare('SELECT * FROM attendance_shifts WHERE employee_id = ? AND check_out IS NULL').bind(employee.id).first<Attendance>()
      if ((inserted.meta?.changes ?? inserted.changes ?? 0) > 0) await recordAdminNotification(env, { actor: employee.name, eventType: 'attendance_checkin', title: 'تسجيل حضور', detail: `${employee.name} سجّل حضوره`, target: 'employees' })
      return row ? json({ record: row }) : json({ error: 'تعذر بدء وردية جديدة. حدّث الصفحة وحاول مرة أخرى' }, 409)
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
      ]) as Array<{meta?:{changes?:number};changes?:number}>
      if((results[1]?.meta?.changes??results[1]?.changes??0)===0)return json({error:'تم إغلاق هذه الوردية بالفعل. حدّث الصفحة'},409)
      await recordAdminNotification(env, { actor: employee.name, eventType: 'attendance_checkout', title: 'انصراف وتقرير إنجازات', detail: `${employee.name} سجّل انصرافه وأرسل إنجازات ورديته: ${body.accomplishments.trim().slice(0,300)}`, target: 'employees' })
      return json({ success: true })
    }
    return json({ error: 'غير موجود' }, 404)
  } catch (error) {
    console.error('Employee request failed', error)
    if(error instanceof Error&&/no such table:\s*attendance_shift_reports/i.test(error.message))return json({error:'نفّذ تحديث 0013_checkout_accomplishments.sql لحفظ الإنجازات وتأكيد الانصراف'},503)
    if (error instanceof Error && /no such table:\s*attendance_shifts/i.test(error.message)) return json({error:'يلزم تنفيذ تحديث قاعدة البيانات 0011_employee_multiple_shifts.sql لتفعيل الورديات المتعددة'},503)
    return json({ error: 'تعذر تنفيذ الطلب. تأكد من تشغيل migration 0002 في D1.' }, 500)
  }
}
