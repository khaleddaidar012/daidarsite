'use client'
import { useEffect, useMemo, useState } from 'react'

type Scope = 'admin' | 'employee'
type Module = { id: string; nameAr: string; essential: boolean; availableFor: string[]; requires: string[]; conflicts: string[]; monthlyPrice: number | null; yearlyPrice: number | null; priceStatus: string }
type Catalog = { products: { id: string; nameAr: string }[]; activities: { id: string; nameAr: string }[]; modules: Module[]; billing: { monthly: number; yearly: number; currency: string } }
type Subscription = { id: string; product_id: string; status: string; snapshot: { activityId?: string; addons?: { id: string }[]; period?: string }; expires_at: number | null }
type Customer = { id: string; name: string; email: string; subscriptions: Subscription[] }

export default function HubManualSubscriptionManager({ scope }: { scope: Scope }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [productId, setProductId] = useState('daidar-flow')
  const [activityId, setActivityId] = useState('general')
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [addonIds, setAddonIds] = useState<string[]>([])
  const [renewalId, setRenewalId] = useState('')
  const [amountReceived, setAmountReceived] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const api = async (path: string, method = 'GET', body?: unknown) => {
    const res = await fetch(`/api/${scope}/${path}`, { method, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    const data = await res.json().catch(() => ({ error: 'تعذر الاتصال بالخدمة' }))
    if (!res.ok) throw new Error(data.error || 'تعذر تنفيذ الطلب')
    return data
  }
  async function loadCustomers(query = search) {
    const data = await api(`hub-customers?q=${encodeURIComponent(query)}`)
    setCustomers(data.customers)
    if (customerId && !data.customers.some((customer: Customer) => customer.id === customerId)) setCustomerId('')
  }
  useEffect(() => {
    Promise.all([api('hub-catalog'), api('hub-customers')]).then(([c, u]) => { setCatalog(c.catalog); setCustomers(u.customers) }).catch(e => setError(e instanceof Error ? e.message : 'تعذر تحميل البيانات'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedCustomer = customers.find(customer => customer.id === customerId)
  const product = catalog?.products.find(item => item.id === productId)
  const activity = catalog?.activities.find(item => item.id === activityId)
  const renewal = selectedCustomer?.subscriptions.find(sub => sub.id === renewalId)
  const modules = (catalog?.modules || []).filter(module => module.availableFor.includes(activityId))
  const selectedModules = modules.filter(module => module.essential || addonIds.includes(module.id))
  const total = selectedModules.reduce((sum, module) => sum + (module.essential ? 0 : module[period === 'yearly' ? 'yearlyPrice' : 'monthlyPrice'] || 0), catalog?.billing[period] || 0)
  const priceReady = selectedModules.every(module => module.essential || (module.priceStatus === 'approved' && module.monthlyPrice !== null && module.yearlyPrice !== null))
  const permittedOptions = useMemo(() => modules.filter(module => !module.essential && module.priceStatus === 'approved' && module.monthlyPrice !== null && module.yearlyPrice !== null), [modules])

  useEffect(() => {
    if (renewal) {
      setActivityId(renewal.snapshot.activityId || 'general')
      setAddonIds((renewal.snapshot.addons || []).map(item => item.id))
      setProductId(renewal.product_id)
    } else if (!renewalId) {
      setAddonIds([])
    }
  }, [renewalId, renewal?.id])
  useEffect(() => { setAmountReceived('') }, [customerId, productId, activityId, period, addonIds.join(','), renewalId])

  const field = 'mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900'
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setNotice('')
    if (!selectedCustomer || !product || !activity || !priceReady || !Number.isSafeInteger(total)) { setError('راجع العميل والمنتج والنشاط والأسعار المعتمدة.'); return }
    const payload = { userId: selectedCustomer.id, productId, activityId, period, addons: addonIds, renewalSubscriptionId: renewalId || null, amountReceived: Math.round(Number(amountReceived) * 100) }
    if (!Number.isFinite(Number(amountReceived)) || payload.amountReceived !== total) { setError('المبلغ المستلم لازم يطابق الإجمالي الظاهر.'); return }
    const fingerprint = JSON.stringify(payload)
    const storeKey = `daidar-hub-manual:${scope}:${fingerprint}`
    let operationKey = sessionStorage.getItem(storeKey)
    if (!operationKey) { operationKey = crypto.randomUUID(); sessionStorage.setItem(storeKey, operationKey) }
    setBusy(true)
    try {
      await api('hub-manual-subscriptions', 'POST', { ...payload, operationKey })
      sessionStorage.removeItem(storeKey)
      setNotice(`تم تسجيل استلام ${formatMoney(total)} وإنشاء ${renewal ? 'التجديد' : 'الاشتراك'}. مدة الاستخدام تبدأ عند أول تفعيل ناجح.`)
      setRenewalId(''); setAmountReceived('')
      await loadCustomers()
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تسجيل الاشتراك') }
    finally { setBusy(false) }
  }
  function formatMoney(amount: number) { return `${(amount / 100).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} جنيه` }

  return <section className="rounded-2xl border bg-white p-5 sm:p-7" dir="rtl">
    <h2 className="text-xl font-extrabold">تسجيل دفعة واشتراك دعيدر هب</h2>
    <p className="mt-2 text-sm text-slate-600">استخدمه بعد التأكد من استلام المبلغ. السعر يتحسب على الخادم من الكتالوج، وتُسجل العملية باسم منفذها. لا يبدأ الاشتراك إلا عند أول تفعيل ناجح.</p>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}{notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-800">{notice}</p>}
    {!catalog ? <p className="mt-4">جارٍ تحميل الأسعار والعملاء…</p> : <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 grid gap-2 sm:grid-cols-[1fr_auto]"><label>ابحث عن العميل بالاسم أو البريد<input className={field} value={search} onChange={e => setSearch(e.target.value)} /></label><button type="button" className="mt-6 rounded-xl border px-4 py-3 font-bold" onClick={() => loadCustomers().catch(e => setError(e.message))}>بحث</button></div>
      <label>حساب العميل<select required className={field} value={customerId} onChange={e => { setCustomerId(e.target.value); setRenewalId('') }}><option value="">اختر حسابًا موجودًا في دعيدر هب</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} — {customer.email}</option>)}</select></label>
      <label>المنتج<select className={field} value={productId} disabled={!!renewal} onChange={e => { setProductId(e.target.value); setRenewalId('') }}>{catalog.products.map(item => <option value={item.id} key={item.id}>{item.nameAr}</option>)}</select></label>
      <label>اشتراك جديد أو تجديد<select className={field} value={renewalId} onChange={e => setRenewalId(e.target.value)}><option value="">اشتراك جديد</option>{(selectedCustomer?.subscriptions || []).filter(sub => ['active', 'awaiting_activation', 'expired'].includes(sub.status)).map(sub => <option value={sub.id} key={sub.id}>تجديد · {sub.product_id} · {sub.status === 'active' ? 'نشط' : sub.status === 'expired' ? 'منتهي' : 'بانتظار التفعيل'}</option>)}</select></label>
      <label>مدة الاشتراك<select className={field} value={period} onChange={e => setPeriod(e.target.value as 'monthly' | 'yearly')}><option value="monthly">شهري</option><option value="yearly">سنوي</option></select></label>
      <label>النشاط<select className={field} disabled={!!renewal} value={activityId} onChange={e => { setActivityId(e.target.value); setAddonIds([]) }}>{catalog.activities.map(item => <option value={item.id} key={item.id}>{item.nameAr}</option>)}</select></label>
      <fieldset className="sm:col-span-2 rounded-xl border p-4"><legend className="px-1 font-bold">الإضافات</legend>{renewal && <p className="mb-2 text-sm text-slate-500">التجديد يحتفظ بنشاط وإضافات الاشتراك الحالي.</p>}<div className="grid gap-2 sm:grid-cols-2">{modules.map(module => <label key={module.id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3"><input type="checkbox" disabled={module.essential || !!renewal} checked={module.essential || addonIds.includes(module.id)} onChange={e => setAddonIds(ids => e.target.checked ? [...ids, module.id] : ids.filter(id => id !== module.id))}/><span>{module.nameAr}{module.essential ? <small className="ms-2 text-emerald-700">أساسية</small> : <small className="ms-2 text-slate-500">{formatMoney(module[period === 'yearly' ? 'yearlyPrice' : 'monthlyPrice'] || 0)} / {period === 'yearly' ? 'سنة' : 'شهر'}</small>}</span></label>)}{!permittedOptions.length && <p className="text-sm text-slate-500">لا توجد إضافات اختيارية بأسعار معتمدة لهذا النشاط.</p>}</div></fieldset>
      <div className="sm:col-span-2 rounded-xl bg-sky-50 p-4"><div className="flex flex-wrap justify-between gap-2 font-bold"><span>{product?.nameAr} · {activity?.nameAr} · {period === 'yearly' ? 'سنوي' : 'شهري'}</span><span>{priceReady ? formatMoney(total) : 'السعر غير مكتمل'}</span></div><p className="mt-1 text-sm text-slate-600">جهاز واحد · {selectedModules.filter(m => !m.essential).map(m => m.nameAr).join('، ') || 'الإضافات الأساسية فقط'}</p></div>
      <label>المبلغ المستلم فعليًا (جنيه)<input className={field} type="number" min="0" step="0.01" required value={amountReceived} onChange={e => setAmountReceived(e.target.value)} /></label>
      <div className="flex items-end"><button disabled={busy || !priceReady || !customerId} className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? 'جارٍ التسجيل…' : renewal ? 'تسجيل الدفعة وتجديد الاشتراك' : 'تسجيل الدفعة وإنشاء الاشتراك'}</button></div>
    </form>}
  </section>
}
