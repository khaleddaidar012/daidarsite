export type Employee = { id: string; name: string; job_title: string; email: string; active: number }
export type RecordRow = { id: string; employee_id: string; day: string; check_in: number; check_out: number | null; hours: number | null }
export type EmployeeRequest = { id: string; employee_id: string; name?: string; type: 'leave' | 'early'; day: string; requested_time: string | null; reason: string; status: 'pending' | 'approved' | 'rejected'; admin_note: string }
export const field = 'w-full rounded-xl border border-slate-300 bg-white text-slate-900 p-3 focus:outline-none focus:ring-2 focus:ring-sky-500'
export const action = 'rounded-xl bg-sky-600 text-white px-5 py-3 font-bold disabled:opacity-50 hover:bg-sky-700'
export const statusLabel = { pending: 'قيد المراجعة', approved: 'موافق عليه', rejected: 'مرفوض' }
export function currentMonth() { const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit' }).formatToParts(new Date()); return `${p.find(x => x.type === 'year')!.value}-${p.find(x => x.type === 'month')!.value}` }
export function time(value: number | null) { return value === null ? '—' : new Date(value).toLocaleTimeString('ar-EG', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hour12: true }) }
export async function callApi(scope: 'admin' | 'employee', path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`/api/${scope}/${path}`, { method, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  const data = await res.json().catch(() => ({ error: 'تعذر الاتصال' }))
  if (!res.ok) throw Object.assign(new Error(data.error || 'تعذر تنفيذ الطلب'), { status: res.status })
  return data
}
export function AttendanceTable({ month, records, requests = [] }: { month: string; records: RecordRow[]; requests?: EmployeeRequest[] }) {
  const [year, m] = month.split('-').map(Number)
  const count = new Date(Date.UTC(year, m, 0)).getUTCDate()
  return <div><p className="my-4 font-bold">إجمالي ساعات العمل: {records.reduce((sum, r) => sum + (r.hours || 0), 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ساعة · أيام الحضور: {records.length.toLocaleString('ar-EG')}</p><div className="overflow-x-auto"><table className="w-full text-sm text-right whitespace-nowrap"><thead><tr className="bg-slate-100">{['اليوم والتاريخ', 'حضور', 'انصراف', 'ساعات العمل', 'الإجازات والاستئذان'].map(h => <th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{Array.from({ length: count }, (_, i) => {
    const day = `${month}-${String(i + 1).padStart(2, '0')}`
    const row = records.find(r => r.day === day)
    const labels = requests.filter(r => r.day === day).map(r => `${r.type === 'leave' ? 'إجازة' : `استئذان ${r.requested_time}`} (${statusLabel[r.status]})`)
    return <tr key={day} className="border-b"><td className="p-3">{new Date(day + 'T12:00:00Z').toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'numeric' })}</td><td className="p-3">{row ? time(row.check_in) : '—'}</td><td className="p-3">{row ? time(row.check_out) : '—'}</td><td className="p-3">{row ? row.hours === null ? 'حضور مفتوح' : row.hours.toLocaleString('ar-EG', { maximumFractionDigits: 2 }) : 'لم يسجل'}</td><td className="p-3">{labels.join(' · ') || '—'}</td></tr>
  })}</tbody></table></div><p className="text-xs text-slate-500 mt-3">كل الأوقات بتوقيت القاهرة. الحضور المفتوح لا يدخل في الإجمالي حتى الانصراف. الوردية الممتدة لليوم التالي تُحسب في يوم الحضور.</p></div>
}
