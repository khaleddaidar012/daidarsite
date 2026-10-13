'use client'
import { useEffect, useState, type FormEvent } from 'react'
import { action, field, callApi, currentMonth, AttendanceTable, statusLabel, type Employee, type RecordRow, type EmployeeRequest } from '@/components/employees/shared'
const blank = { id: '', name: '', job_title: '', email: '', password: '', active: 1 }
export default function EmployeesManager({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [records, setRecords] = useState<RecordRow[]>([])
  const [requests, setRequests] = useState<EmployeeRequest[]>([])
  const [month, setMonth] = useState(currentMonth)
  const [selected, setSelected] = useState('')
  const [form, setForm] = useState(blank)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  function fail(e: Error & { status?: number }) { setError(e.message); if (e.status === 401) onUnauthorized() }
  useEffect(() => {
    let active = true; setLoading(true); setError('')
    Promise.all([callApi('admin', 'employees'), callApi('admin', `attendance?month=${month}`), callApi('admin', `employee-requests?month=${month}`)]).then(([e, a, r]) => { if (active) { setEmployees(e.employees); setRecords(a.records); setRequests(r.requests); setSelected(old => old || e.employees[0]?.id || '') } }).catch(e => { if (active) fail(e) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, revision])
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('')
    try { await callApi('admin', 'employees', 'POST', form); setForm(blank); setRevision(n => n + 1); setNotice('تم حفظ الحساب. الموظف يدخل من /employee بالإيميل وكلمة المرور التي حددتها.') } catch (e) { fail(e as Error) } finally { setBusy(false) }
  }
  async function decide(r: EmployeeRequest, status: 'approved' | 'rejected') {
    setBusy(true); setError('')
    try { await callApi('admin', 'employee-requests', 'POST', { id: r.id, status, admin_note: notes[r.id] ?? r.admin_note }); setRevision(n => n + 1) } catch (e) { fail(e as Error) } finally { setBusy(false) }
  }
  return <section className="bg-white border rounded-2xl p-5 sm:p-7 mb-8"><h2 className="text-2xl font-bold mb-2">الموظفون والحضور والانصراف</h2><p className="text-slate-500 mb-5">صفحة الموظف: <a href="/employee" className="text-sky-600 underline" target="_blank" rel="noreferrer">/employee</a></p>{error && <p role="alert" className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</p>}{notice && <p role="status" className="text-green-700 mb-4">{notice}</p>}
    <form onSubmit={save} className="grid sm:grid-cols-2 gap-4"><h3 className="sm:col-span-2 font-bold">{form.id ? 'تعديل حساب الموظف' : 'إنشاء حساب موظف'}</h3>{([['name', 'اسم الموظف', 'text'], ['job_title', 'الوظيفة', 'text'], ['email', 'البريد الإلكتروني', 'email'], ['password', form.id ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور (١٢ حرفًا على الأقل)', 'password']] as const).map(([key, label, type]) => <label key={key}>{label}<input className={field} value={form[key]} type={type} required={key !== 'password' || !form.id} minLength={key === 'password' ? 12 : undefined} maxLength={key === 'password' ? 256 : key === 'email' ? 254 : 150} autoComplete={key === 'password' ? 'new-password' : 'off'} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}<label>حالة الحساب<select className={field} value={form.active} onChange={e => setForm({ ...form, active: Number(e.target.value) })}><option value={1}>نشط</option><option value={0}>موقوف</option></select></label><div className="flex items-end gap-3"><button className={action} disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ الحساب'}</button>{form.id && <button type="button" onClick={() => setForm(blank)}>إلغاء</button>}</div></form>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">{employees.map(e => <div key={e.id} className="border rounded-xl p-4"><h3 className="font-bold">{e.name}</h3><p>{e.job_title}</p><p className="text-sm break-all text-slate-500">{e.email}</p><p className="text-sm mt-1">{e.active ? 'نشط' : 'موقوف'}</p><button className="text-sky-700 mt-2" onClick={() => setForm({ ...e, password: '' })}>تعديل الحساب / إعادة كلمة المرور</button></div>)}</div>
    <div className="flex flex-wrap gap-4 items-end mt-8"><label>الشهر<input type="month" className={field} value={month} onChange={e => { if (e.target.value) setMonth(e.target.value) }} /></label><label>الموظف<select className={field} value={selected} onChange={e => setSelected(e.target.value)}>{!employees.length && <option value="">لا يوجد موظفون</option>}{employees.map(e => <option value={e.id} key={e.id}>{e.name} — {e.job_title}</option>)}</select></label><button className={action} disabled={loading} onClick={() => setRevision(n => n + 1)}>تحديث التقرير</button></div>
    {loading ? <p className="py-5">جارٍ تحميل التقرير…</p> : <><div className="overflow-x-auto mt-5"><table className="w-full text-right text-sm"><thead><tr className="bg-slate-100"><th className="p-3">الموظف</th><th>أيام الحضور</th><th>ساعات الشهر</th></tr></thead><tbody>{employees.map(e => { const rows = records.filter(r => r.employee_id === e.id); return <tr key={e.id} className="border-b"><td className="p-3"><button className="text-sky-700" onClick={() => setSelected(e.id)}>{e.name}</button></td><td>{rows.length.toLocaleString('ar-EG')}</td><td>{rows.reduce((n, r) => n + (r.hours || 0), 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })}</td></tr> })}</tbody></table></div>{selected && <><h3 className="mt-6 font-bold text-lg">سجل {employees.find(e => e.id === selected)?.name}</h3><AttendanceTable month={month} records={records.filter(r => r.employee_id === selected)} requests={requests.filter(r => r.employee_id === selected)} /></>}</>}
    <h3 className="font-bold text-xl mt-8 mb-4">طلبات الإجازات والاستئذان — الشهر المختار</h3><div className="space-y-3">{requests.map(r => <article className="border rounded-xl p-4" key={r.id}><div className="flex flex-wrap justify-between gap-2"><h4 className="font-bold">{r.name} · {r.type === 'leave' ? 'إجازة' : 'انصراف مبكر'} · {r.day} {r.requested_time || ''}</h4><span>{statusLabel[r.status]}</span></div><p className="whitespace-pre-wrap break-words mt-2">{r.reason}</p>{r.admin_note && <p className="text-slate-500 mt-2">ملاحظة الإدارة: {r.admin_note}</p>}<label className="block mt-3">ملاحظة للموظف (اختياري)<input className={field} maxLength={1000} value={notes[r.id] ?? r.admin_note} onChange={e => setNotes({ ...notes, [r.id]: e.target.value })} /></label><div className="flex gap-3 mt-3"><button className={action} disabled={busy} onClick={() => decide(r, 'approved')}>موافقة</button><button className="rounded-xl bg-red-50 text-red-700 px-5 py-3 disabled:opacity-50" disabled={busy} onClick={() => decide(r, 'rejected')}>رفض</button></div></article>)}{!loading && !requests.length && <p className="text-slate-500">لا توجد طلبات لهذا الشهر.</p>}</div>
  </section>
}
