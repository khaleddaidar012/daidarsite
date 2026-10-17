'use client'
import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Database, RefreshCw } from 'lucide-react'

type DatabaseUsage = { id: string; name: string; jurisdiction: string | null; usedBytes: number; limitBytes: number; freeBytes: number; usedPercent: number; status: 'healthy' | 'warning' | 'critical' }
type Usage = {
  plan: 'free' | 'paid'
  warningPercent: number
  criticalPercent: number
  databases: DatabaseUsage[]
  account: Omit<DatabaseUsage, 'id' | 'name' | 'jurisdiction'>
  updatedAt: string
}

const panel = 'rounded-2xl border border-slate-200 bg-white p-5 sm:p-7'
const number = (value: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 }).format(value)
function size(bytes: number) {
  if (bytes < 1_000_000) return `${number(bytes / 1_000)} كيلوبايت`
  if (bytes < 1_000_000_000) return `${number(bytes / 1_000_000)} ميجابايت`
  return `${number(bytes / 1_000_000_000)} جيجابايت`
}
function colors(status: DatabaseUsage['status']) {
  if (status === 'critical') return { text: 'text-red-700', bar: 'bg-red-600', track: 'bg-red-100', badge: 'bg-red-50 text-red-700' }
  if (status === 'warning') return { text: 'text-amber-700', bar: 'bg-amber-500', track: 'bg-amber-100', badge: 'bg-amber-50 text-amber-800' }
  return { text: 'text-emerald-700', bar: 'bg-emerald-600', track: 'bg-emerald-100', badge: 'bg-emerald-50 text-emerald-800' }
}
function Progress({ usage, label }: { usage: Pick<DatabaseUsage, 'usedPercent' | 'status'>; label: string }) {
  const style = colors(usage.status)
  return <div aria-label={label} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={usage.usedPercent} className={`mt-3 h-3 overflow-hidden rounded-full ${style.track}`}>
    <div className={`h-full rounded-full transition-all ${style.bar}`} style={{ width: `${Math.min(100, usage.usedPercent)}%` }} />
  </div>
}

export default function D1UsageDashboard({ scope = 'admin' }: { scope?: 'admin' | 'employee' }) {
  const [usage, setUsage] = useState<Usage | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/${scope}/d1-usage`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'تعذر تحميل سعة قواعد البيانات')
      setUsage(data as Usage)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل سعة قواعد البيانات')
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [scope])
  useEffect(() => { void load() }, [load])

  const alerts = usage?.databases.filter(database => database.status !== 'healthy') || []
  const accountStatus = usage?.account.status || 'healthy'
  const hasAlert = alerts.length > 0 || accountStatus !== 'healthy'
  const accountColors = colors(accountStatus)
  return <section className={panel} dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 text-sm font-bold text-sky-700"><Database size={17} /> تخزين Cloudflare D1</p>
        <h2 className="mt-1 text-2xl font-extrabold">سعة قواعد البيانات</h2>
        <p className="mt-2 text-sm text-slate-500">تُحدّث القائمة من Cloudflare عند فتح الصفحة أو الضغط على تحديث.</p>
      </div>
      <button type="button" onClick={() => void load(true)} disabled={loading || refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> تحديث الآن
      </button>
    </div>

    {error && <div role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>تعذر جلب السعة.</strong> {error}<p className="mt-2">تُحفظ بيانات اعتماد Cloudflare على الخادم فقط؛ لا تضع الـAPI Token في الصفحة أو المحادثة.</p></div>}
    {loading && <p className="py-10 text-center text-slate-500">جارٍ جلب قواعد D1 من Cloudflare…</p>}
    {usage && <>
      {hasAlert && <div role="status" className={`mt-5 flex gap-3 rounded-xl border p-4 ${accountStatus === 'critical' || alerts.some(x => x.status === 'critical') ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}><AlertTriangle className="mt-0.5 shrink-0" size={20} /><div><strong>{accountStatus === 'critical' || alerts.some(x => x.status === 'critical') ? 'تحذير: سعة التخزين قاربت على الامتلاء.' : 'تنبيه: توجد قاعدة بيانات اقتربت من حدها.'}</strong><p className="mt-1 text-sm">يظهر التنبيه عند استخدام {usage.warningPercent}%، ويصبح حرجًا عند {usage.criticalPercent}%.</p></div></div>}
      <article className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-bold">إجمالي مساحة الحساب · خطة {usage.plan === 'free' ? 'Workers Free' : 'Workers Paid'}</h3><strong className={accountColors.text}>{number(usage.account.usedPercent)}%</strong></div>
        <Progress usage={usage.account} label="نسبة استخدام إجمالي مساحة D1 في الحساب" />
        <p className="mt-3 text-sm text-slate-600">مستخدم {size(usage.account.usedBytes)} من {size(usage.account.limitBytes)} · المتبقي {size(usage.account.freeBytes)}</p>
      </article>
      <div className="mt-7 flex items-baseline justify-between gap-3"><h3 className="text-lg font-extrabold">قواعد D1 ({number(usage.databases.length)})</h3><span className="text-xs text-slate-500">حد القاعدة: {size(usage.databases[0]?.limitBytes || (usage.plan === 'free' ? 500_000_000 : 10_000_000_000))}</span></div>
      {!usage.databases.length ? <div className="mt-3 rounded-xl border border-dashed p-8 text-center text-slate-500">لا توجد قواعد D1 في الحساب.</div> : <div className="mt-3 grid gap-3 lg:grid-cols-2">{usage.databases.map(database => {
        const style = colors(database.status)
        return <article key={database.id} className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><Database size={18} className="shrink-0 text-slate-400" /><h4 className="break-all font-bold">{database.name}</h4></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${style.badge}`}>{database.status === 'critical' ? 'حرجة' : database.status === 'warning' ? 'اقتربت من الحد' : 'جيدة'}</span></div>
          <div className="mt-4 flex items-baseline justify-between gap-2"><span className="font-bold">{size(database.usedBytes)} مستخدم</span><span className={`font-extrabold ${style.text}`}>{number(database.usedPercent)}%</span></div>
          <Progress usage={database} label={`نسبة استخدام ${database.name}`} />
          <p className="mt-3 text-sm text-slate-600">المتبقي {size(database.freeBytes)} من {size(database.limitBytes)}</p>
        </article>
      })}</div>}
      <p className="mt-5 text-xs text-slate-500">آخر تحديث: {new Date(usage.updatedAt).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}. الحساب يعتمد على خطة Workers المحددة في إعدادات Pages.</p>
    </>}
  </section>
}
