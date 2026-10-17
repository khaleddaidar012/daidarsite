import { hash, json, sameOrigin, verifyPassword, type Env } from '../../lib/store'
import { cairoDay, employeeSession, monthlyAttendance, safeEmployee, type Employee, type Attendance } from '../../lib/employees'
import { manageProjects } from '../../lib/projects'
import { adminHub } from '../../lib/hub-admin'
import { d1UsageResponse } from '../../lib/d1-usage'
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
    if (path === 'd1-usage' && request.method === 'GET') {
      if (!employee.view_d1_usage) return json({ error: 'حسابك لا يملك صلاحية عرض سعة قواعد البيانات.' }, 403)
      return await d1UsageResponse(env)
    }
    if (path === 'projects') {
      if (!employee.manage_projects) return json({ error: 'حسابك لا يملك صلاحية إدارة معرض الأعمال.' }, 403)
      if (request.method === 'DELETE') return json({ error: 'صلاحية الموظف تسمح بإضافة المشروع وتعديله أو إخفائه، والحذف النهائي للإدارة فقط.' }, 403)
      return await manageProjects(request, env)
    }
    if (['hub-catalog', 'hub-customers', 'hub-manual-subscriptions'].includes(path)) {
      if (!employee.manage_hub_subscriptions) return json({ error: 'حسابك لا يملك صلاحية تسجيل اشتراكات دعيدر هب.' }, 403)
      if (path === 'hub-catalog' && request.method !== 'GET') return json({ error: 'طريقة الطلب غير مسموحة' }, 405)
      return await adminHub(request, env, path, employee.email)
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
      return json({ success: true })
    }
    if (path === 'session' && request.method === 'GET') return json({ employee: safeEmployee(employee) })
    if (path === 'logout' && request.method === 'POST') {
      const token = request.headers.get('Cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith('daidar_employee='))?.slice('daidar_employee='.length)
      if (token) await env.DB.prepare('DELETE FROM employee_sessions WHERE token = ?').bind(await hash(token)).run()
      return json({ success: true }, 200, { 'Set-Cookie': 'daidar_employee=; Path=/api/employee; HttpOnly; SameSite=Strict; Max-Age=0; Secure' })
    }
    if (path === 'attendance' && request.method === 'GET') {
      const rows = await monthlyAttendance(env, new URL(request.url).searchParams.get('month') || cairoDay().slice(0, 7), employee.id)
      if (!rows) return json({ error: 'شهر غير صحيح' }, 400)
      const open = await env.DB.prepare('SELECT * FROM attendance WHERE employee_id = ? AND check_out IS NULL').bind(employee.id).first<Attendance>()
      const today = await env.DB.prepare('SELECT * FROM attendance WHERE employee_id = ? AND day = ?').bind(employee.id, cairoDay()).first<Attendance>()
      return json({ records: rows, open, today, serverDay: cairoDay() })
    }
    if (path === 'check-in' && request.method === 'POST') {
      await env.DB.prepare('INSERT OR IGNORE INTO attendance VALUES (?, ?, ?, ?, NULL)').bind(crypto.randomUUID(), employee.id, cairoDay(now), now).run()
      const row = await env.DB.prepare('SELECT * FROM attendance WHERE employee_id = ? AND check_out IS NULL').bind(employee.id).first<Attendance>()
      return row ? json({ record: row }) : json({ error: 'تم تسجيل حضور وانصراف اليوم بالفعل' }, 409)
    }
    if (path === 'check-out' && request.method === 'POST') {
      const row = await env.DB.prepare('SELECT * FROM attendance WHERE employee_id = ? AND check_out IS NULL').bind(employee.id).first<Attendance>()
      if (!row) return json({ error: 'لا يوجد حضور مفتوح لتسجيل الانصراف' }, 409)
      await env.DB.prepare('UPDATE attendance SET check_out = ? WHERE id = ? AND check_out IS NULL').bind(now, row.id).run()
      return json({ success: true })
    }
    return json({ error: 'غير موجود' }, 404)
  } catch (error) {
    console.error('Employee request failed', error)
    return json({ error: 'تعذر تنفيذ الطلب. تأكد من تشغيل migration 0002 في D1.' }, 500)
  }
}
