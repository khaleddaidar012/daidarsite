import { hash, json, type Env } from './store'
export type Employee = { id: string; name: string; job_title: string; email: string; active: number; password_hash: string; created_at: number; manage_projects: number; manage_hub_subscriptions: number; track_projects: number; view_d1_usage: number; monthly_salary_piasters: number; weekly_days_off: string; view_absences: number; view_due: number }
export type Attendance = { id: string; employee_id: string; day: string; check_in: number; check_out: number | null; accomplishments?: string }
export type PayrollRow = { employee_id: string; name: string; job_title: string; active: number; monthly_salary_piasters: number; weekly_days_off: number[]; scheduled_days: number; elapsed_workdays: number; attended_days: number; approved_leave_days: number; absent_days: number; absent_dates: string[]; daily_rate_piasters: number; deduction_piasters: number; due_piasters: number }
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
export function safeEmployee(employee: Employee) { return { id: employee.id, name: employee.name, job_title: employee.job_title, email: employee.email, active: employee.active, manage_projects: employee.manage_projects, manage_hub_subscriptions: employee.manage_hub_subscriptions, view_d1_usage: employee.view_d1_usage, track_projects: employee.track_projects, view_absences: employee.view_absences, view_due: employee.view_due, weekly_days_off: parseDaysOff(employee.weekly_days_off) } }
export async function monthlyAttendance(env: Env, month: string, employeeId?: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null
  const rows = await env.DB!.prepare(`SELECT * FROM attendance_shifts WHERE day >= ? AND day <= ?${employeeId ? ' AND employee_id = ?' : ''} ORDER BY day, check_in`)
    .bind(`${month}-01`, `${month}-31`, ...(employeeId ? [employeeId] : [])).all<Attendance>()
  const now = Date.now()
  const today = cairoDay(now)
  const reports = new Map<string,string>()
  try {
    const notes=await env.DB!.prepare(`SELECT r.shift_id,r.accomplishments FROM attendance_shift_reports r JOIN attendance_shifts a ON a.id=r.shift_id WHERE a.day>=? AND a.day<=?${employeeId?' AND a.employee_id=?':''}`).bind(month+'-01',month+'-31',...(employeeId?[employeeId]:[])).all<{shift_id:string;accomplishments:string}>()
    for(const note of notes.results)reports.set(note.shift_id,note.accomplishments)
  }catch(error){if(!(error instanceof Error && /no such table:\s*attendance_shift_reports/i.test(error.message)))throw error}
  return rows.results.map(row => {
    const open = row.check_out === null
    const end = row.check_out ?? (row.day === today ? now : null)
    return { ...row, accomplishments:reports.get(row.id)||'', open, hours: end === null ? null : Math.max(0, (end - row.check_in) / 3600000) }
  })
}
export function calculatePayroll(employees: Employee[], attendance: Attendance[], requests: Array<{ employee_id: string; day: string; type: string; status: string }>, month: string, now = Date.now()): PayrollRow[] | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null
  const [year, monthNumber] = month.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const monthStart = `${month}-01`
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, '0')}`
  const today = cairoDay(now)
  const cutoff = today < monthStart ? `${month}-00` : today > monthEnd ? monthEnd : today
  const attendanceByEmployee = new Map<string, Set<string>>()
  for (const record of attendance) {
    const days = attendanceByEmployee.get(record.employee_id) || new Set<string>()
    days.add(record.day); attendanceByEmployee.set(record.employee_id, days)
  }
  const paidLeave = new Set(requests.filter(r => r.type === 'leave' && r.status === 'approved').map(r => `${r.employee_id}:${r.day}`))
  return employees.map(employee => {
    let weeklyDaysOff: number[] = []
    try { weeklyDaysOff = JSON.parse(employee.weekly_days_off || '[5]') } catch { weeklyDaysOff = [5] }
    const daysOff = new Set(weeklyDaysOff)
    const createdDay = cairoDay(employee.created_at)
    let scheduledDays = 0, eligibleScheduledDays = 0, elapsedWorkdays = 0, absentDays = 0
    const absentDates: string[] = []
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${month}-${String(day).padStart(2, '0')}`
      const weekDay = new Date(`${date}T00:00:00Z`).getUTCDay()
      if (daysOff.has(weekDay)) continue
      scheduledDays++
      if (date < createdDay) continue
      eligibleScheduledDays++
      if (date < cutoff || (date === cutoff && attendanceByEmployee.get(employee.id)?.has(date))) {
        elapsedWorkdays++
        if (!attendanceByEmployee.get(employee.id)?.has(date) && !paidLeave.has(`${employee.id}:${date}`)) { absentDays++; absentDates.push(date) }
      }
    }
    const monthly = employee.monthly_salary_piasters || 0
    const dailyRate = monthly / 26
    const eligiblePayDays = createdDay <= monthStart ? 26 : eligibleScheduledDays
    const proratedBase = dailyRate * Math.min(eligiblePayDays, 26)
    const deduction = Math.min(proratedBase, dailyRate * absentDays)
    return { employee_id: employee.id, name: employee.name, job_title: employee.job_title, active: employee.active, monthly_salary_piasters: monthly, weekly_days_off: Array.from(daysOff), scheduled_days: scheduledDays, elapsed_workdays: elapsedWorkdays, attended_days: attendanceByEmployee.get(employee.id)?.size || 0, approved_leave_days: requests.filter(r => r.employee_id === employee.id && r.type === 'leave' && r.status === 'approved' && r.day >= monthStart && r.day <= cutoff).length, absent_days: absentDays, absent_dates: absentDates, daily_rate_piasters: Math.round(dailyRate), deduction_piasters: Math.round(deduction / 100) * 100, due_piasters: Math.max(0, Math.round((proratedBase - deduction) / 100) * 100) }
  })
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
  if (path === 'payroll' && request.method === 'GET') {
    const month = new URL(request.url).searchParams.get('month') || cairoDay().slice(0, 7)
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return json({ error: 'شهر غير صحيح' }, 400)
    const employees = await env.DB!.prepare('SELECT id,name,job_title,active,created_at,monthly_salary_piasters,weekly_days_off,view_absences,view_due FROM employees ORDER BY created_at').all<Employee>()
    const [attendance, requests] = await Promise.all([
      env.DB!.prepare('SELECT id,employee_id,day,check_in,check_out FROM attendance_shifts WHERE day>=? AND day<=?').bind(month + '-01', month + '-31').all<Attendance>(),
      env.DB!.prepare("SELECT employee_id,day,type,status FROM employee_requests WHERE type='leave' AND status='approved' AND day>=? AND day<=?").bind(month + '-01', month + '-31').all<{ employee_id: string; day: string; type: string; status: string }>(),
    ])
    const payroll = calculatePayroll(employees.results, attendance.results, requests.results, month)
    if (!payroll) return json({ error: 'شهر غير صحيح' }, 400)
    const adjustments = await env.DB!.prepare('SELECT employee_id,due_piasters,note,updated_by,updated_at FROM employee_payroll_adjustments WHERE month=?').bind(month).all<{ employee_id: string; due_piasters: number; note: string; updated_by: string; updated_at: number }>()
    const byEmployee = new Map(adjustments.results.map(row => [row.employee_id, row]))
    return json({ payroll: payroll.map(row => { const adjustment = byEmployee.get(row.employee_id); return { ...row, calculated_due_piasters: row.due_piasters, due_piasters: adjustment?.due_piasters ?? row.due_piasters, manual_due_piasters: adjustment?.due_piasters ?? null, adjustment_note: adjustment?.note || '', adjusted_by: adjustment?.updated_by || null, adjusted_at: adjustment?.updated_at || null } }), month })
  }
  if (path === 'payroll' && request.method === 'POST') {
    const raw = await request.text()
    if (raw.length > 4096) return json({ error: 'طلب كبير جدًا' }, 413)
    const body = JSON.parse(raw) as { employee_id?: unknown; month?: unknown; due_piasters?: unknown; note?: unknown; clear?: unknown }
    if (typeof body.employee_id !== 'string' || body.employee_id.length > 64 || typeof body.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month)) return json({ error: 'الموظف أو الشهر غير صحيح' }, 422)
    const employee = await env.DB!.prepare('SELECT id FROM employees WHERE id=?').bind(body.employee_id).first()
    if (!employee) return json({ error: 'الموظف غير موجود' }, 404)
    if (body.clear === true) {
      await env.DB!.prepare('DELETE FROM employee_payroll_adjustments WHERE employee_id=? AND month=?').bind(body.employee_id, body.month).run()
      return json({ success: true, cleared: true })
    }
    if (!Number.isSafeInteger(body.due_piasters) || (body.due_piasters as number) < 0 || (body.due_piasters as number) > 10000000000 || (body.due_piasters as number) % 100 !== 0 || (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 500))) return json({ error: 'أدخل المستحق النهائي بالجنيه الصحيح، مع ملاحظة اختيارية.' }, 422)
    await env.DB!.prepare('INSERT INTO employee_payroll_adjustments(employee_id,month,due_piasters,note,updated_by,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(employee_id,month) DO UPDATE SET due_piasters=excluded.due_piasters,note=excluded.note,updated_by=excluded.updated_by,updated_at=excluded.updated_at').bind(body.employee_id, body.month, body.due_piasters, typeof body.note === 'string' ? body.note.trim() : '', env.ADMIN_EMAIL?.trim() || 'admin', Date.now()).run()
    return json({ success: true })
  }
  if (path !== 'employees') return json({ error: 'غير مسموح' }, 405)
  if (request.method === 'GET') {
    const rows = await env.DB!.prepare('SELECT id, name, job_title, email, active, manage_projects, manage_hub_subscriptions, track_projects, view_d1_usage, monthly_salary_piasters, weekly_days_off, view_absences, view_due FROM employees ORDER BY created_at').all<Employee>()
    return json({ employees: rows.results.map(row => ({ ...row, weekly_days_off: parseDaysOff(row.weekly_days_off) })) })
  }
  if (request.method === 'DELETE') {
    const raw = await request.text()
    if (raw.length > 1024) return json({ error: 'طلب كبير جدًا' }, 413)
    const body = JSON.parse(raw) as { id?: unknown }
    if (typeof body.id !== 'string' || body.id.length > 64) return json({ error: 'حساب الموظف غير صحيح' }, 422)
    const employee = await env.DB!.prepare('SELECT id FROM employees WHERE id = ?').bind(body.id).first()
    if (!employee) return json({ error: 'الموظف غير موجود' }, 404)
    // Keep attendance, requests, and payroll history; revoke login access immediately.
    await env.DB!.prepare('UPDATE employees SET active = 0 WHERE id = ?').bind(body.id).run()
    await env.DB!.prepare('DELETE FROM employee_sessions WHERE employee_id = ?').bind(body.id).run()
    return json({ success: true, deactivated: true })
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
    for (const key of ['track_projects', 'manage_projects', 'manage_hub_subscriptions', 'view_d1_usage', 'view_absences', 'view_due']) if (body[key] !== undefined && ![0, 1].includes(body[key])) return json({ error: 'صلاحية موظف غير صحيحة' }, 422)
    if (body.monthly_salary_piasters !== undefined && (!Number.isSafeInteger(body.monthly_salary_piasters) || body.monthly_salary_piasters < 0 || body.monthly_salary_piasters > 10000000000)) return json({ error: 'المرتب الشهري غير صحيح' }, 422)
    if (body.weekly_days_off !== undefined && (!Array.isArray(body.weekly_days_off) || body.weekly_days_off.length > 6 || body.weekly_days_off.some((day: unknown) => !Number.isInteger(day) || (day as number) < 0 || (day as number) > 6) || new Set(body.weekly_days_off).size !== body.weekly_days_off.length)) return json({ error: 'اختار أيام راحة أسبوعية صحيحة (بحد أقصى ٦ أيام)' }, 422)
    const email = body.email.trim().toLowerCase()
    const duplicate = await env.DB!.prepare('SELECT id FROM employees WHERE email = ? AND id != ?').bind(email, existing?.id || '').first()
    if (duplicate) return json({ error: 'الإيميل مستخدم لموظف آخر' }, 409)
    const id = existing?.id || crypto.randomUUID()
    const credential = body.password ? await passwordHash(body.password) : existing!.password_hash
    const active = body.active ?? existing?.active ?? 1
    const manageProjects = body.manage_projects ?? existing?.manage_projects ?? 0
    const manageHubSubscriptions = body.manage_hub_subscriptions ?? existing?.manage_hub_subscriptions ?? 0
    const trackProjects = body.track_projects ?? existing?.track_projects ?? 0
    const viewD1Usage = body.view_d1_usage ?? existing?.view_d1_usage ?? 0
    const viewAbsences = body.view_absences ?? existing?.view_absences ?? 1
    const viewDue = body.view_due ?? existing?.view_due ?? 0
    const salary = body.monthly_salary_piasters ?? existing?.monthly_salary_piasters ?? 0
    const daysOff = JSON.stringify(body.weekly_days_off ?? parseDaysOff(existing?.weekly_days_off || '[5]'))
    await env.DB!.prepare('INSERT INTO employees(id,name,job_title,email,password_hash,active,created_at,manage_projects,manage_hub_subscriptions,track_projects,view_d1_usage,monthly_salary_piasters,weekly_days_off,view_absences,view_due) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, job_title = excluded.job_title, email = excluded.email, password_hash = excluded.password_hash, active = excluded.active, manage_projects = excluded.manage_projects, manage_hub_subscriptions = excluded.manage_hub_subscriptions, track_projects = excluded.track_projects, view_d1_usage = excluded.view_d1_usage, monthly_salary_piasters=excluded.monthly_salary_piasters, weekly_days_off=excluded.weekly_days_off, view_absences=excluded.view_absences, view_due=excluded.view_due')
      .bind(id, body.name.trim(), body.job_title.trim(), email, credential, active, existing?.created_at || Date.now(), manageProjects, manageHubSubscriptions, trackProjects, viewD1Usage, salary, daysOff, viewAbsences, viewDue).run()
    if (!active || body.password || email !== existing?.email) await env.DB!.prepare('DELETE FROM employee_sessions WHERE employee_id = ?').bind(id).run()
    return json({ success: true })
  }
  return json({ error: 'غير مسموح' }, 405)
}
function parseDaysOff(value: string) { try { const days = JSON.parse(value || '[5]'); return Array.isArray(days) && days.every(day => Number.isInteger(day) && day >= 0 && day <= 6) ? days : [5] } catch { return [5] } }
