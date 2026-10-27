export type Employee = { id: string; name: string; job_title: string; email: string; active: number; manage_projects: number; manage_hub_subscriptions: number; track_projects: number; view_d1_usage: number; add_passwords: number; view_passwords: number; monthly_salary_piasters: number; weekly_days_off: number[]; view_absences: number; view_due: number; max_daily_hours: number; max_monthly_hours: number }
export type RecordRow = { id: string; employee_id: string; day: string; check_in: number; check_out: number | null; hours: number | null; open?: boolean; accomplishments?: string }
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
export function AttendanceTable({ month, records, requests = [], daysOff = [] }: { month: string; records: RecordRow[]; requests?: EmployeeRequest[]; daysOff?: number[] }) {
  const [year, m] = month.split('-').map(Number)
  const count = new Date(Date.UTC(year, m, 0)).getUTCDate()
  const attendedDays = new Set(records.map(record => record.day)).size
  const localDay = (value: number) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })
  return <div><p className="my-4 rounded-xl bg-sky-50 p-4 font-bold text-sky-950">إجمالي ساعات الحضور الفعلية: <span className="text-lg">{records.reduce((sum, r) => sum + (r.hours || 0), 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 })}</span> ساعة · أيام الحضور: {attendedDays.toLocaleString('ar-EG')} · الورديات: {records.length.toLocaleString('ar-EG')}</p>
    <div className="overflow-x-auto"><table className="w-full text-sm text-right whitespace-nowrap"><thead><tr className="bg-slate-100">{['اليوم والتاريخ', 'حضور', 'انصراف', 'ساعات العمل', 'إنجازات الوردية', 'الإجازات والاستئذان'].map(h => <th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>{Array.from({ length: count }, (_, i) => {
      const day = `${month}-${String(i + 1).padStart(2, '0')}`
      const shifts = records.filter(record => record.day === day).sort((a, b) => a.check_in - b.check_in)
      const rows: Array<RecordRow | null> = shifts.length ? shifts : [null]
      const isDayOff = daysOff.includes(new Date(day + 'T00:00:00Z').getUTCDay())
      const labels = requests.filter(r => r.day === day).map(r => `${r.type === 'leave' ? 'إجازة' : `استئذان ${r.requested_time}`} (${statusLabel[r.status]})`)
      return rows.map((row, index) => <tr key={row?.id || day} className="border-b">
        {index === 0 && <td className="p-3 align-top" rowSpan={rows.length}>{new Date(day + 'T12:00:00Z').toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'numeric' })}{shifts.length > 1 && <small className="block text-sky-700 mt-1">{shifts.length.toLocaleString('ar-EG')} ورديات</small>}</td>}
        <td className="p-3">{row ? time(row.check_in) : '—'}</td>
        <td className="p-3">{row ? row.open ? 'جارٍ' : <>{time(row.check_out)}{row.check_out !== null && localDay(row.check_out) !== day && <small className="block text-slate-500">{new Date(row.check_out).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'numeric' })}</small>}</> : '—'}</td>
        <td className="p-3">{row ? row.hours === null ? 'حضور مفتوح — لم يُحتسب بعد' : `${row.hours.toLocaleString('ar-EG', { maximumFractionDigits: 2 })}${row.open ? ' (جارٍ)' : ''}` : isDayOff ? 'راحة أسبوعية' : 'لم يسجل'}</td>
        <td className="p-3 min-w-64 max-w-md whitespace-pre-wrap break-words align-top">{row?.accomplishments || (row?.open ? 'تُكتب عند الانصراف' : '—')}</td>
        {index === 0 && <td className="p-3 align-top" rowSpan={rows.length}>{labels.join(' · ') || '—'}</td>}
      </tr>)
    })}</tbody></table></div><p className="text-xs text-slate-500 mt-3">كل الأوقات بتوقيت القاهرة. يمكن تسجيل ورديات متعددة في اليوم، مع حضور مفتوح واحد فقط. تُجمع ساعات كل الورديات، ويُحسب يوم الحضور مرة واحدة. الحضور المفتوح لليوم يُحسب حتى الوقت الحالي، أما الحضور المفتوح في يوم سابق فلا يُحتسب حتى تسجيل الانصراف. الوردية الممتدة لليوم التالي تُحسب في يوم بدايتها.</p></div>
}
