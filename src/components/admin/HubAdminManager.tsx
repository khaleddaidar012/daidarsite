'use client'
import ServiceSubscriptionsManager from './ServiceSubscriptionsManager'
import { useEffect, useState } from 'react'
import { AlertCircle, Check, Upload, RefreshCw, ShieldCheck } from 'lucide-react'
import HubManualSubscriptionManager from '@/components/shared/HubManualSubscriptionManager'

type Catalog = {
  products: { id: string; nameAr: string; nameEn: string; available: boolean }[]
  modules: {
    id: string
    nameAr: string
    nameEn: string
    monthlyPrice: number | null
    yearlyPrice: number | null
    priceStatus: 'approved' | 'draft'
    essential: boolean
    requires: string[]
    conflicts: string[]
  }[]
  billing: { monthly: number; yearly: number }
  commercialEnabled: boolean
}

type Order = {
  id: string
  order_number: string
  name: string
  email: string
  status: string
  created_at: number
  proof_requested_at: number | null
  rejection_reason?: string | null
  admin_note?: string | null
  snapshot: {
    kind?: string
    note?: string
    product: string
    activity: string
    addons?: { name: string }[]
    period: string
    devices: number
    total: number
    paymentMode: string
    transferSourcePhone?: string
  }
}

type OrderDecisionAction = 'approve' | 'request-info' | 'reject'

const orderStatusLabel: Record<string, string> = {
  awaiting_transfer: 'بانتظار التحويل',
  under_review: 'قيد المراجعة',
  needs_info: 'مطلوب معلومات',
  approved: 'تمت الموافقة',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
}

export default function HubAdminManager({
  apiBase = '/api/admin',
  onOrdersChanged,
}: {
  apiBase?: string
  onOrdersChanged?: () => void
} = {}) {
  const jsonApi = async (path: string, method = 'GET', body?: unknown) => {
    const r = await fetch(`${apiBase}/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.error || 'تعذر تنفيذ الطلب')
    return d
  }

  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [releases, setReleases] = useState<any[]>([])
  const [transfers, setTransfers] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<OrderDecisionAction | null>(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [orderNotice, setOrderNotice] = useState('')
  const [orderErrors, setOrderErrors] = useState<Record<string, { message: string; action: OrderDecisionAction; reason: string }>>({})
  const [pendingDecision, setPendingDecision] = useState<{ orderId: string; action: OrderDecisionAction; reason: string } | null>(null)

  const hasPublishedRelease = releases.some((r: any) => Boolean(r.published))

  async function load() {
    const [c, o, r, d] = await Promise.all([
      jsonApi('hub-catalog'),
      jsonApi('hub-orders'),
      jsonApi('hub-releases'),
      jsonApi('hub-transfers'),
    ])
    setCatalog(c.catalog)
    setOrders(o.orders)
    setReleases(r.releases)
    setTransfers(d.requests)
  }

  useEffect(() => {
    load().catch(e => setError(e.message))
  }, [])

  function openDecision(orderId: string, action: OrderDecisionAction) {
    if (busyOrderId) return
    setOrderNotice('')
    setOrderErrors(prev => {
      if (!prev[orderId]) return prev
      const next = { ...prev }
      delete next[orderId]
      return next
    })
    setPendingDecision({ orderId, action, reason: '' })
  }

  async function submitDecision(id: string, action: OrderDecisionAction, reasonInput = '') {
    if (busyOrderId) return
    const cleanReason = reasonInput.trim()
    if ((action === 'reject' || action === 'request-info') && cleanReason.length < 4) {
      setOrderErrors(prev => ({
        ...prev,
        [id]: {
          message:
            action === 'reject'
              ? 'اكتب سبب الرفض (٤ أحرف على الأقل) ليظهر للعميل.'
              : 'اكتب المعلومات المطلوبة من العميل (٤ أحرف على الأقل).',
          action,
          reason: reasonInput,
        },
      }))
      return
    }

    setBusyOrderId(id)
    setBusyAction(action)
    setError('')
    setOrderNotice('')
    setOrderErrors(prev => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })

    try {
      const result = await jsonApi('hub-orders', 'POST', { id, action, reason: cleanReason })
      setPendingDecision(null)
      await load()
      onOrdersChanged?.()
      if (action === 'approve') {
        setOrderNotice(
          result.requestOnly
            ? 'تم إنهاء متابعة الطلب وحفظ الحالة بنجاح (لا يؤكد دفعًا ولا يفعّل اشتراكًا تلقائيًا).'
            : 'تم اعتماد الطلب وحفظ حالة الاشتراك بنجاح.'
        )
      } else if (action === 'reject') {
        setOrderNotice('تم تسجيل رفض الطلب وحفظ السبب للعميل.')
      } else {
        setOrderNotice('تم تسجيل طلب معلومات إضافية من العميل.')
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'تعذر تنفيذ الطلب. حاول مرة أخرى.'
      setOrderErrors(prev => ({ ...prev, [id]: { message, action, reason: cleanReason } }))
    } finally {
      setBusyOrderId(null)
      setBusyAction(null)
    }
  }

  async function saveCatalog() {
    if (!catalog) return
    setBusy(true)
    setError('')
    setNote('')
    try {
      const d = await jsonApi('hub-catalog', 'POST', { catalog })
      setCatalog(d.catalog)
      setNote('تم حفظ كتالوج دعيدر هب.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  async function upload(file?: File) {
    if (!file || !catalog) return
    const version = window.prompt('رقم الإصدار')
    if (!version || !version.trim()) return
    setBusy(true)
    setError('')
    const data = new FormData()
    data.append('file', file)
    data.append('version', version.trim())
    try {
      const r = await fetch(apiBase + '/hub-releases', { method: 'POST', body: data })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'تعذر رفع الإصدار')
      await load()
      setNote('تم رفع الإصدار كمسودة. انشره بعد مراجعة الملف.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الرفع')
    } finally {
      setBusy(false)
    }
  }

  async function publish(id: string, published: boolean) {
    setBusy(true)
    setError('')
    try {
      await jsonApi('hub-release-publish', 'POST', { id, published })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحديث الإصدار')
    } finally {
      setBusy(false)
    }
  }

  async function decideTransfer(id: string, action: string) {
    const reason = action === 'reject' ? window.prompt('سبب الرفض') : ''
    if (action === 'reject' && reason === null) return
    setBusy(true)
    setError('')
    try {
      await jsonApi('hub-transfers', 'POST', { id, action, reason: reason || '' })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر معالجة الطلب')
    } finally {
      setBusy(false)
    }
  }

  if (!catalog) {
    return (
      <div className="space-y-7">
        <ServiceSubscriptionsManager apiBase={apiBase} />
        <section className="rounded-2xl border bg-white p-6">{error || 'جارٍ تحميل بوابة دعيدر هب…'}</section>
      </div>
    )
  }

  const field = 'w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-900'

  return (
    <div className="space-y-7" dir="rtl">
      <ServiceSubscriptionsManager apiBase={apiBase} />
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      {note && <p className="rounded-xl bg-emerald-50 p-4 text-emerald-700">{note}</p>}

      <section className="rounded-2xl border bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">كتالوج دعيدر هب والتسعير</h2>
            <p className="mt-1 text-sm text-slate-500">
              الأسعار بالجنيه؛ خزّنها كقروش صحيحة. أي إضافة مسودة لا تظهر بسعر ولا تُحسب في الطلب.
            </p>
          </div>
          <button onClick={saveCatalog} disabled={busy} className="rounded-xl bg-sky-600 px-4 py-3 font-bold text-white disabled:opacity-50">
            حفظ التغييرات
          </button>
        </div>
        <div className="mt-5 space-y-2">
          {catalog.products.map((p: any, i: number) => (
            <label key={p.id} className="flex items-center gap-3 rounded-xl border p-4">
              <input
                type="checkbox"
                checked={p.available}
                onChange={e =>
                  setCatalog({
                    ...catalog,
                    products: catalog.products.map((x: any, j: number) => (j === i ? { ...x, available: e.target.checked } : x)),
                  })
                }
              />
              <span>
                <b>{p.nameAr}</b>
                <small className="ms-2 text-slate-500">إتاحته للشراء الفعلي تتطلب إصدارًا منشورًا</small>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            السعر الأساسي الشهري (جنيه)
            <input
              className={`${field} mt-1`}
              type="number"
              min="0"
              step="1"
              value={catalog.billing.monthly / 100}
              onChange={e =>
                setCatalog({ ...catalog, billing: { ...catalog.billing, monthly: Math.round(Number(e.target.value) * 100) } })
              }
            />
          </label>
          <label>
            السعر الأساسي السنوي (جنيه)
            <input
              className={`${field} mt-1`}
              type="number"
              min="0"
              step="1"
              value={catalog.billing.yearly / 100}
              onChange={e =>
                setCatalog({ ...catalog, billing: { ...catalog.billing, yearly: Math.round(Number(e.target.value) * 100) } })
              }
            />
          </label>
        </div>
        <div className="mt-6 space-y-3">
          {catalog.modules.map((m, i) => (
            <article key={m.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>
                  {m.nameAr} <small className="text-slate-500">({m.nameEn})</small>
                </strong>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={m.essential}
                    onChange={e =>
                      setCatalog({
                        ...catalog,
                        modules: catalog.modules.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                essential: e.target.checked,
                                monthlyPrice: e.target.checked ? 0 : null,
                                yearlyPrice: e.target.checked ? 0 : null,
                                priceStatus: e.target.checked ? 'approved' : 'draft',
                              }
                            : x
                        ),
                      })
                    }
                  />{' '}
                  أساسية
                </label>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  يتطلب إضافات
                  <select
                    multiple
                    className={`${field} mt-1 min-h-24`}
                    value={m.requires || []}
                    onChange={e =>
                      setCatalog({
                        ...catalog,
                        modules: catalog.modules.map((x, j) =>
                          j === i ? { ...x, requires: Array.from(e.target.selectedOptions, o => o.value) } : x
                        ),
                      })
                    }
                  >
                    {catalog.modules
                      .filter(x => x.id !== m.id)
                      .map(x => (
                        <option key={x.id} value={x.id}>
                          {x.nameAr}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="text-sm">
                  يتعارض مع
                  <select
                    multiple
                    className={`${field} mt-1 min-h-24`}
                    value={m.conflicts || []}
                    onChange={e =>
                      setCatalog({
                        ...catalog,
                        modules: catalog.modules.map((x, j) =>
                          j === i ? { ...x, conflicts: Array.from(e.target.selectedOptions, o => o.value) } : x
                        ),
                      })
                    }
                  >
                    {catalog.modules
                      .filter(x => x.id !== m.id)
                      .map(x => (
                        <option key={x.id} value={x.id}>
                          {x.nameAr}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              {!m.essential && (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="text-sm">
                    شهري
                    <input
                      className={`${field} mt-1`}
                      type="number"
                      min="0"
                      placeholder="مسودة بلا سعر"
                      value={m.monthlyPrice === null ? '' : m.monthlyPrice / 100}
                      onChange={e =>
                        setCatalog({
                          ...catalog,
                          modules: catalog.modules.map((x, j) =>
                            j === i
                              ? { ...x, monthlyPrice: e.target.value ? Math.round(Number(e.target.value) * 100) : null, priceStatus: 'draft' }
                              : x
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="text-sm">
                    سنوي
                    <input
                      className={`${field} mt-1`}
                      type="number"
                      min="0"
                      placeholder="مسودة بلا سعر"
                      value={m.yearlyPrice === null ? '' : m.yearlyPrice / 100}
                      onChange={e =>
                        setCatalog({
                          ...catalog,
                          modules: catalog.modules.map((x, j) =>
                            j === i
                              ? { ...x, yearlyPrice: e.target.value ? Math.round(Number(e.target.value) * 100) : null, priceStatus: 'draft' }
                              : x
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="flex items-center gap-2 self-end pb-3 text-sm">
                    <input
                      type="checkbox"
                      checked={m.priceStatus === 'approved'}
                      disabled={m.monthlyPrice === null || m.yearlyPrice === null}
                      onChange={e =>
                        setCatalog({
                          ...catalog,
                          modules: catalog.modules.map((x, j) =>
                            j === i ? { ...x, priceStatus: e.target.checked ? 'approved' : 'draft' } : x
                          ),
                        })
                      }
                    />{' '}
                    اعتماد السعر
                  </label>
                </div>
              )}
            </article>
          ))}
        </div>
        <label className="mt-6 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 font-bold text-amber-900">
          <input
            type="checkbox"
            checked={catalog.commercialEnabled}
            onChange={e => setCatalog({ ...catalog, commercialEnabled: e.target.checked })}
          />
          تفعيل استقبال طلبات تجارية. لا يُفعّل إلا بعد إصدار منشور وظهور المنتج كمتاح.
        </label>
      </section>

      <section className="rounded-2xl border bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">إصدارات التحميل</h2>
            <p className="mt-1 text-sm text-slate-500">الملفات تحفظ في R2 خاص. لا تنشر إصدارًا تجريبيًا أو غير قابل للتسليم.</p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#0c3156] px-4 py-3 font-bold text-white">
            <Upload size={17} />
            رفع إصدار
            <input type="file" className="hidden" onChange={e => upload(e.target.files?.[0])} />
          </label>
        </div>
        {releases.length ? (
          <div className="mt-5 space-y-3">
            {releases.map(r => (
              <article key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                <span>
                  <b>{r.version}</b> · {r.filename} <small className="text-slate-500">{r.published ? 'منشور' : 'مسودة'}</small>
                </span>
                <button disabled={busy} onClick={() => publish(r.id, !r.published)} className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-50">
                  {r.published ? 'إيقاف النشر' : 'نشر'}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            لا يوجد إصدار. لذلك تظل المشتريات التجارية مغلقة ويظهر للعميل أن التحميل غير متاح.
          </p>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-5 sm:p-7" aria-labelledby="hub-orders-review-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="hub-orders-review-heading" className="text-xl font-extrabold">
              مراجعة الطلبات
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              اعتمد التحويل فقط بعد مراجعته يدويًا. رقم المحوّل منه وفتح واتساب وانتهاء العداد لا تثبت الدفع.
            </p>
          </div>
          <button
            type="button"
            disabled={busy || Boolean(busyOrderId)}
            onClick={() => void load().catch(e => setError(e.message))}
            className="inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} />
            تحديث القائمة
          </button>
        </div>

        {orderNotice && (
          <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-bold text-emerald-800">
            {orderNotice}
          </p>
        )}

        {orders.length ? (
          <div className="mt-5 space-y-4">
            {orders.map(o => {
              const addons = Array.isArray(o.snapshot.addons) ? o.snapshot.addons : []
              const isServiceRequest = ['consultation', 'system-management'].includes(String(o.snapshot.kind || ''))
              const isDemo = o.snapshot.paymentMode === 'demo'
              const needsReleaseBeforeApprove = !isServiceRequest && !isDemo && !hasPublishedRelease
              const canReview = ['under_review', 'needs_info', 'awaiting_transfer'].includes(o.status)
              const isThisOrderBusy = busyOrderId === o.id
              const cardError = orderErrors[o.id]
              const isPendingThis = pendingDecision?.orderId === o.id

              return (
                <article key={o.id} className="rounded-xl border border-slate-200 p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <b className="text-slate-900">
                      {o.order_number} · {o.name}
                    </b>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        o.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-800'
                          : o.status === 'rejected'
                            ? 'bg-red-50 text-red-700'
                            : o.status === 'needs_info'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-sky-50 text-sky-800'
                      }`}
                    >
                      {orderStatusLabel[o.status] || o.status}
                    </span>
                  </div>

                  <p className="text-sm text-slate-700">
                    <bdi>{o.email}</bdi> · {o.snapshot.product}
                    {o.snapshot.activity ? ` · ${o.snapshot.activity}` : ''}
                    {o.snapshot.period ? ` · ${o.snapshot.period === 'yearly' ? 'سنوي' : 'شهري'}` : ''}
                    {' · '}جهاز {o.snapshot.devices || 1} · {((Number(o.snapshot.total) || 0) / 100).toLocaleString('ar-EG')} جنيه
                  </p>

                  <p className="text-sm text-slate-500">
                    الإضافات: {addons.map(a => a.name).join('، ') || 'لا توجد'}
                    {isDemo && <span className="ms-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">مسار تجريبي</span>}
                    {o.snapshot.transferSourcePhone && (
                      <span className="ms-2 font-bold text-slate-700">
                        الرقم المحوّل منه: <bdi>{o.snapshot.transferSourcePhone}</bdi>
                      </span>
                    )}
                  </p>

                  <p className="text-xs text-slate-500">
                    {new Date(o.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })} ·{' '}
                    {o.proof_requested_at ? 'سُجل طلب إرسال الإثبات (ليس تأكيدًا للإرسال أو الدفع)' : 'لا يوجد طلب إثبات'}
                  </p>

                  {o.snapshot.note && <p className="whitespace-pre-wrap text-sm text-slate-700">{o.snapshot.note}</p>}
                  {isServiceRequest && <p className="text-xs text-slate-500">متابعة الطلب لا تؤكد الدفع ولا تفعّل اشتراكًا.</p>}

                  {o.rejection_reason && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">سبب الرفض: {o.rejection_reason}</p>
                  )}
                  {o.admin_note && (
                    <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800">ملاحظة الإدارة: {o.admin_note}</p>
                  )}

                  {canReview && isDemo && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
                      هذا طلب تجريبي؛ لا يمكن اعتماده كدفعة حقيقية. يمكنك طلب معلومات أو رفضه فقط.
                    </p>
                  )}

                  {canReview && needsReleaseBeforeApprove && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
                      تنبيه قبل الاعتماد: لا يوجد إصدار منشور قابل للتسليم في قسم «إصدارات التحميل» أعلاه، لذلك سيرفض الخادم اعتماد الطلب التجاري حتى يُنشر إصدار فعلي.
                    </p>
                  )}

                  {cardError && (
                    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-start gap-1.5">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <span>{cardError.message}</span>
                      </span>
                      <button
                        type="button"
                        disabled={Boolean(busyOrderId)}
                        onClick={() => void submitDecision(o.id, cardError.action, cardError.reason)}
                        className="rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-extrabold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  )}

                  {canReview && (
                    <div className="pt-2 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={Boolean(busyOrderId) || isDemo}
                          onClick={() => openDecision(o.id, 'approve')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Check size={15} />
                          {isThisOrderBusy && busyAction === 'approve'
                            ? 'جارٍ الحفظ…'
                            : isServiceRequest
                              ? 'إنهاء متابعة الطلب'
                              : 'موافقة بعد التحقق'}
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(busyOrderId)}
                          onClick={() => openDecision(o.id, 'request-info')}
                          className="rounded-lg border px-3.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          {isThisOrderBusy && busyAction === 'request-info' ? 'جارٍ الإرسال…' : 'طلب معلومات'}
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(busyOrderId)}
                          onClick={() => openDecision(o.id, 'reject')}
                          className="rounded-lg border border-red-200 px-3.5 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          {isThisOrderBusy && busyAction === 'reject' ? 'جارٍ الرفض…' : 'رفض'}
                        </button>
                      </div>

                      {isPendingThis && pendingDecision && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
                          {pendingDecision.action === 'approve' ? (
                            <p className="text-xs font-bold leading-6 text-slate-700">
                              {isServiceRequest
                                ? 'تأكيد إنهاء متابعة هذا الطلب؟ هذا الإجراء يحدّث حالة المتابعة فقط ولا يؤكد دفعًا أو يفعّل اشتراكًا.'
                                : 'تأكيد اعتماد الطلب بعد مراجعة التحويل يدويًا؟ لن يُفعّل الاستخدام أو ينشأ ترخيص إلا حسب قواعد الإصدار والتفعيل.'}
                            </p>
                          ) : (
                            <label className="block text-xs font-bold text-slate-700">
                              {pendingDecision.action === 'reject' ? 'سبب الرفض (يظهر للعميل — ٤ أحرف على الأقل)' : 'المعلومات المطلوبة من العميل (٤ أحرف على الأقل)'}
                              <textarea
                                rows={2}
                                value={pendingDecision.reason}
                                onChange={e =>
                                  setPendingDecision(prev => (prev ? { ...prev, reason: e.target.value } : null))
                                }
                                placeholder={
                                  pendingDecision.action === 'reject'
                                    ? 'اكتب سبب الرفض بوضوح…'
                                    : 'اكتب المطلوب استكماله من العميل…'
                                }
                                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm font-normal text-slate-900"
                              />
                            </label>
                          )}

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={Boolean(busyOrderId)}
                              onClick={() => void submitDecision(o.id, pendingDecision.action, pendingDecision.reason)}
                              className={`rounded-lg px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50 ${
                                pendingDecision.action === 'reject'
                                  ? 'bg-red-600 hover:bg-red-700'
                                  : pendingDecision.action === 'request-info'
                                    ? 'bg-sky-700 hover:bg-sky-800'
                                    : 'bg-emerald-700 hover:bg-emerald-800'
                              }`}
                            >
                              {isThisOrderBusy
                                ? 'جارٍ التنفيذ…'
                                : pendingDecision.action === 'reject'
                                  ? 'تأكيد الرفض'
                                  : pendingDecision.action === 'request-info'
                                    ? 'إرسال طلب المعلومات'
                                    : 'تأكيد الموافقة الآن'}
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(busyOrderId)}
                              onClick={() => setPendingDecision(null)}
                              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        ) : (
          <p className="mt-4 text-slate-500">لا توجد طلبات مسجلة.</p>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-5 sm:p-7">
        <h2 className="text-xl font-extrabold">طلبات نقل الأجهزة</h2>
        {transfers.length ? (
          transfers.map((x: any) => (
            <article key={x.id} className="mt-4 rounded-xl border p-4">
              <b>
                {x.name} · {x.email}
              </b>
              <p className="mt-2 text-sm">{x.reason}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => decideTransfer(x.id, 'approve')}
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  اعتماد النقل
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => decideTransfer(x.id, 'reject')}
                  className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-50"
                >
                  رفض
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="mt-3 text-sm text-slate-500">لا توجد طلبات معلقة.</p>
        )}
      </section>

      <HubManualSubscriptionManager scope="admin" apiBase={apiBase} />
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck size={15} /> تُسجل الموافقات والرفض وتغييرات الكتالوج والإصدارات في سجل المراجعة الداخلي.
      </p>
    </div>
  )
}
