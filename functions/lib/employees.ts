import { hash, json, type Env } from './store'
export type Employee = { id: string; name: string; job_title: string; email: string; active: number; password_hash: string; created_at: number; manage_projects: number; manage_hub_subscriptions: number }
export type Attendance = { id: string; employee_id: string; day: string; check_in: number; check_out: number | null }
export function cairoDay(now = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now))
  const part = (type: string) => parts.find(p => p.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}
export async function passwordHash(password: string) {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(24)), n => n.toString(16).padStart(2, '0')).join('')
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256)
  return salt + ':' + Array.from(new Uint8Array(bits), n => n.toString(16).padStart(2, '0')).join('')
}
export async function employeeSession(request: Request, env: Env) {
  const token = request.headers.get('Cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith('daidar_employee='))?.slice('daidar_employee='.length)
  if (!token || !env.DB) return null
  return env.DB.prepare('SELECT e.* FROM employees e JOIN employee_sessions s ON s.employee_id = e.id WHERE s.token = ? AND s.expires_at > ? AND s.credential = e.password_hash AND e.active = 1').bind(await hash(token), Date.now()).first<Employee>()
}
export function safeEmployee(employee: Employee) { return { id: employee.id, name: employee.name, job_title: employee.job_title, email: employee.email, active: employee.active, manage_projects: employee.manage_projects, manage_hub_subscriptions: employee.manage_hub_subscriptions } }
export async function monthlyAttendance(env: Env, month: string, employeeId?: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null
  const rows = await env.DB!.prepare(`SELECT * FROM attendance WHERE day >= ? AND day <= ?${employeeId ? ' AND employee_id = ?' : ''} ORDER BY day, check_in`)
    .bind(`${month}-01`, `${month}-31`, ...(employeeId ? [employeeId] : [])).all<Attendance>()
  return rows.results.map(row => ({ ...row, hours: row.check_out === null ? null : (row.check_out - row.check_in) / 3600000 }))
}
export async function adminEmployees(request: Request, env: Env, path: string) {
  if (path === 'employee-requests' && request.method === 'GET') {
    const month = new URL(request.url).searchParams.get('month') || cairoDay().slice(0, 7)
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return json({ error: 'شهر غير صحيح' }, 400)
    const rows = await env.DB!.prepare('SELECT r.*, e.name, e.job_title FROM employee_requests r JOIN employees e ON e.id = r.employee_id WHERE r.day >= ? AND r.day <= ? ORDER BY r.created_at DESC').bind(month + '-01', month + '-31').all()
    return json({ requests: rows.results })
  }
  if (path === 'employee-requests' && request.method === 'POST') {
    const raw = await request.text()
    if (raw.length > 4096) return json({ error: 'طلب كبير جدًا' }, 413)
    const body = JSON.parse(raw)
    if (typeof body.id !== 'string' || !['approved', 'rejected'].includes(body.status) || (body.admin_note !== undefined && (typeof body.admin_note !== 'string' || body.admin_note.length > 1000))) return json({ error: 'بيانات القرار غير صحيحة' }, 422)
    const row = await env.DB!.prepare('SELECT id FROM employee_requests WHERE id = ?').bind(body.id).first()
    if (!row) return json({ error: 'الطلب غير موجود' }, 404)
    if (body.status === 'approved') {
      const duplicate = await env.DB!.prepare("SELECT r.id FROM employee_requests r JOIN employee_requests current ON current.employee_id = r.employee_id AND current.day = r.day AND current.type = r.type WHERE current.id = ? AND r.id != current.id AND r.status IN ('pending','approved')").bind(body.id).first()
      if (duplicate) return json({ error: 'يوجد طلب آخر لنفس النوع واليوم؛ راجعه أولًا' }, 409)
    }
    await env.DB!.prepare('UPDATE employee_requests SET status = ?, admin_note = ?, decided_at = ? WHERE id = ?').bind(body.status, body.admin_note?.trim() || '', Date.now(), body.id).run()
    return json({ success: true })
  }
  if (path === 'attendance' && request.method === 'GET') {
    const url = new URL(request.url)
    const rows = await monthlyAttendance(env, url.searchParams.get('month') || cairoDay().slice(0, 7), url.searchParams.get('employee') || undefined)
    return rows ? json({ records: rows }) : json({ error: 'شهر غير صحيح' }, 400)
  }
  if (path !== 'employees') return json({ error: 'غير مسموح' }, 405)
  if (request.method === 'GET') {
    const rows = await env.DB!.prepare('SELECT id, name, job_title, email, active, manage_projects, manage_hub_subscriptions FROM employees ORDER BY created_at').all()
    return json({ employees: rows.results })
  }
  if (request.method === 'POST') {
    const raw = await request.text()
    if (raw.length > 4096) return json({ error: 'طلب كبير جدًا' }, 413)
    const body = JSON.parse(raw)
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 150 || typeof body.job_title !== 'string' || !body.job_title.trim() || body.job_title.length > 150 || typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) return json({ error: 'راجع اسم الموظف والوظيفة والإيميل' }, 422)
    const existing = body.id ? await env.DB!.prepare('SELECT * FROM employees WHERE id = ?').bind(body.id).first<Employee>() : null
    if (body.id && !existing) return json({ error: 'الموظف غير موجود' }, 404)
    if ((!existing || body.password) && (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 256)) return json({ error: 'كلمة المرور يجب أن تكون بين ١٢ و٢٥٦ حرفًا' }, 422)
    if (body.active !== undefined && ![0, 1].includes(body.active)) return json({ error: 'حالة غير صحيحة' }, 422)
    for (const key of ['manage_projects', 'manage_hub_subscriptions']) if (body[key] !== undefined && ![0, 1].includes(body[key])) return json({ error: 'صلاحية موظف غير صحيحة' }, 422)
    const email = body.email.trim().toLowerCase()
    const duplicate = await env.DB!.prepare('SELECT id FROM employees WHERE email = ? AND id != ?').bind(email, existing?.id || '').first()
    if (duplicate) return json({ error: 'الإيميل مستخدم لموظف آخر' }, 409)
    const id = existing?.id || crypto.randomUUID()
    const credential = body.password ? await passwordHash(body.password) : existing!.password_hash
    const active = body.active ?? existing?.active ?? 1
    const manageProjects = body.manage_projects ?? existing?.manage_projects ?? 0
    const manageHubSubscriptions = body.manage_hub_subscriptions ?? existing?.manage_hub_subscriptions ?? 0
    await env.DB!.prepare('INSERT INTO employees(id,name,job_title,email,password_hash,active,created_at,manage_projects,manage_hub_subscriptions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, job_title = excluded.job_title, email = excluded.email, password_hash = excluded.password_hash, active = excluded.active, manage_projects = excluded.manage_projects, manage_hub_subscriptions = excluded.manage_hub_subscriptions')
      .bind(id, body.name.trim(), body.job_title.trim(), email, credential, active, existing?.created_at || Date.now(), manageProjects, manageHubSubscriptions).run()
    if (!active || body.password || email !== existing?.email) await env.DB!.prepare('DELETE FROM employee_sessions WHERE employee_id = ?').bind(id).run()
    return json({ success: true })
  }
  return json({ error: 'غير مسموح' }, 405)
}
