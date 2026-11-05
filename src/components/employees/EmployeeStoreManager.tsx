'use client'
import { useEffect, useState, type FormEvent } from 'react'

type Merchant = { store: { id: string; name: string; is_active: number }; user: { username: string }; subscription: { status: string; end_date: string; plan_name: string }; productCount: number }
const blank = { store_name: '', activity_type: '', whatsapp_number: '', username: '', password: '' }
const field = 'mt-1 w-full rounded-xl border border-slate-300 bg-white p-3'

export default function EmployeeStoreManager({ createStore, renewSubscriptions }: { createStore: boolean; renewSubscriptions: boolean }) {
  const [form, setForm] = useState(blank)
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [months, setMonths] = useState(12)
  const [loading, setLoading] = useState(renewSubscriptions)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function api(path: string, method = 'GET', body?: unknown) {
    const response = await fetch(`/api/employee/${path}`, { method, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || 'تعذر تنفيذ العملية')
    return data
  }
  async function load() {
    if (!renewSubscriptions) return
    setLoading(true)
    try { const data = await api('store-admin'); setMerchants(data.merchants || []) }
    catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [renewSubscriptions])
  async function create(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      await api('store-admin', 'POST', { ...form, plan_name: 'الباقة السنوية الاحترافية', duration_months: 12, price: 1200 })
      setForm(blank); setNotice(`تم إنشاء متجر «${form.store_name.trim()}» بالباقة السنوية.`); await load()
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }
  async function renew(merchant: Merchant) {
    if (!window.confirm(`تجديد اشتراك متجر «${merchant.store.name}» لمدة ${months} شهر؟`)) return
    setBusy(true); setError(''); setNotice('')
    try { await api(`store-admin/${encodeURIComponent(merchant.store.id)}/renew-subscription`, 'POST', { months }); setNotice(`تم تجديد اشتراك «${merchant.store.name}».`); await load() }
    catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }
  return <section dir="rtl" className="space-y-6">
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}{notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
    {createStore && <section className="rounded-2xl border bg-white p-5 sm:p-7"><h2 className="text-xl font-extrabold">إنشاء متجر جديد</h2><p className="mt-2 text-sm text-slate-600">سيُنشأ المتجر بالباقة السنوية الاحترافية، بقيمة ١٢٠٠ جنيه، ويظهر في قائمة المتاجر فورًا.</p><form onSubmit={create} className="mt-5 grid gap-4 sm:grid-cols-2">
      <label>اسم المتجر<input className={field} required maxLength={160} value={form.store_name} onChange={e => setForm({ ...form, store_name: e.target.value })}/></label>
      <label>نوع النشاط<input className={field} required maxLength={100} value={form.activity_type} onChange={e => setForm({ ...form, activity_type: e.target.value })}/></label>
      <label>رقم واتساب<input className={field} required type="tel" dir="ltr" pattern="\+?[0-9]{8,15}" value={form.whatsapp_number} onChange={e => setForm({ ...form, whatsapp_number: e.target.value })}/></label>
      <label>اسم مستخدم المتجر<input className={field} required maxLength={80} autoComplete="off" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}/></label>
      <label>كلمة مرور حساب المتجر<input className={field} required type="password" minLength={8} maxLength={256} autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/></label>
      <div className="flex items-end"><button disabled={busy} className="w-full rounded-xl bg-sky-700 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? 'جارٍ إنشاء المتجر…' : 'إنشاء المتجر'}</button></div>
    </form></section>}
    {renewSubscriptions && <section className="rounded-2xl border bg-white p-5 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-extrabold">تجديد اشتراك متجر</h2><p className="mt-1 text-sm text-slate-500">اختر مدة التجديد، ثم جدّد اشتراك المتجر المطلوب.</p></div><label>مدة التجديد<select className={field} value={months} onChange={e => setMonths(Number(e.target.value))}>{[1,3,6,12].map(value => <option key={value} value={value}>{value} شهر</option>)}</select></label></div>
      {loading ? <p className="mt-5">جارٍ تحميل المتاجر…</p> : merchants.length ? <div className="mt-5 space-y-3">{merchants.map(merchant => <article key={merchant.store.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div><h3 className="font-bold">{merchant.store.name}</h3><p className="text-sm text-slate-500">{merchant.user.username} · {merchant.subscription.plan_name} · {merchant.subscription.status} · ينتهي {merchant.subscription.end_date}</p></div><button type="button" disabled={busy} onClick={() => void renew(merchant)} className="rounded-xl border border-sky-200 px-4 py-2 font-bold text-sky-800 disabled:opacity-50">تجديد {months} شهر</button></article>)}</div> : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-slate-500">لا توجد متاجر مسجلة.</p>}
      <button type="button" disabled={busy || loading} onClick={() => void load()} className="mt-4 rounded-xl border px-4 py-2 text-sm font-bold">تحديث المتاجر</button>
    </section>}
  </section>
}
