'use client'
import { useEffect, useState, type FormEvent } from 'react'

type Merchant = { store: { id: string; name: string; is_active: number; effective_status?: string }; user: { username: string }; subscription: { status: string; end_date: string; plan_name: string }; productCount: number; customer_payment_tracking_available?: boolean; customer_subscription_request?: { id: string; status: 'pending'|'approved'|'rejected'; created_at: string; has_receipt: boolean }|null }
type RenewalRequest = { id: string; store_id: string; months: number; status: 'pending'|'approved'|'rejected'; created_at: string; reviewed_at?: string|null }
const blank = { store_name: '', activity_type: '', whatsapp_number: '', username: '', password: '' }
const field = 'mt-1 w-full rounded-xl border border-slate-300 bg-white p-3'

export default function EmployeeStoreManager({ createStore, renewSubscriptions }: { createStore: boolean; renewSubscriptions: boolean }) {
  const [form, setForm] = useState(blank)
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [months, setMonths] = useState(12)
  const [renewalRequests, setRenewalRequests] = useState<RenewalRequest[]>([])
  const [renewalFor, setRenewalFor] = useState<Merchant|null>(null)
  const [receiptSource, setReceiptSource] = useState<'customer_receipt'|'device_upload'>('customer_receipt')
  const [proofFile, setProofFile] = useState<File|null>(null)
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string|null>(null)
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
    try { const data = await api('store-admin'); setMerchants(data.merchants || []); setRenewalRequests(data.renewal_requests || []) }
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
  function renew(merchant: Merchant) {
    setError(''); setNotice(''); setRenewalFor(merchant); setReceiptSource(merchant.customer_subscription_request?.status==='pending'&&merchant.customer_subscription_request.has_receipt?'customer_receipt':'device_upload'); setProofFile(null)
  }
  async function downloadCustomerReceipt(merchant: Merchant) {
    setDownloadingReceiptId(merchant.store.id); setError('')
    try {
      const response=await fetch(`/api/employee/store-admin/${encodeURIComponent(merchant.store.id)}/subscription-receipt`,{cache:'no-store'})
      if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'تعذر تحميل إيصال العميل')}
      const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement('a')
      link.href=url;link.download=`إيصال-اشتراك-${merchant.user.username}.${blob.type==='image/jpeg'?'jpg':blob.type.split('/')[1]||'png'}`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url)
    } catch (e) { setError((e as Error).message) }
    finally { setDownloadingReceiptId(null) }
  }
  async function submitRenewal(e: FormEvent) {
    e.preventDefault(); if (!renewalFor) return
    setBusy(true); setError(''); setNotice('')
    try {
      let proof: string|undefined
      if (receiptSource==='device_upload') {
        if (!proofFile) throw new Error('اختار صورة إيصال التحويل من جهازك.')
        if (!['image/png','image/jpeg','image/webp'].includes(proofFile.type)) throw new Error('ارفع صورة بصيغة PNG أو JPG أو WEBP.')
        if (proofFile.size>1024*1024) throw new Error('حجم الإيصال يجب ألا يتجاوز 1 ميجابايت.')
        proof=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('تعذر قراءة الإيصال'));reader.onerror=()=>reject(new Error('تعذر قراءة الإيصال'));reader.readAsDataURL(proofFile)})
      }
      await api(`store-admin/${encodeURIComponent(renewalFor.store.id)}/renew-subscription`, 'POST', { months, receipt_source: receiptSource, proof })
      setRenewalFor(null); setNotice(`تم إرسال طلب تجديد «${renewalFor.store.name}» للإدارة مع إيصال التحويل. الاشتراك لن يتجدد إلا بعد الموافقة.`); await load()
    }
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
      {loading ? <p className="mt-5">جارٍ تحميل المتاجر…</p> : merchants.length ? <div className="mt-5 space-y-3">{merchants.map(merchant => {const state=merchant.store.effective_status||'awaiting_activation';const label=state==='active'||state==='trial'?'نشط':state==='expired'?'منتهي':state==='suspended'?'موقوف':'بانتظار التفعيل';const request=renewalRequests.find(item=>item.store_id===merchant.store.id);const requestLabel=request?.status==='pending'?'طلب التجديد بانتظار موافقة الإدارة':request?.status==='approved'?'تمت الموافقة على آخر طلب تجديد':request?.status==='rejected'?'رُفض آخر طلب تجديد':'';const customerRequest=merchant.customer_subscription_request;const customerStatus=!merchant.customer_payment_tracking_available?'حالة طلب العميل غير متاحة · راجع إعداد قاعدة بيانات المتجر':customerRequest?.status==='pending'?'العميل أرسل طلب اشتراك · بانتظار المراجعة':customerRequest?.status==='approved'?'آخر طلب اشتراك للعميل تمت الموافقة عليه':customerRequest?.status==='rejected'?'آخر طلب اشتراك للعميل مرفوض':'لا يوجد طلب اشتراك من العميل';return <article key={merchant.store.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><div className="min-w-0"><h3 className="font-bold">{merchant.store.name}</h3><p className="text-sm text-slate-500">{merchant.user.username} · {merchant.subscription.plan_name} · حالة الخدمة: {label} · ينتهي {merchant.subscription.end_date}</p><p className={`mt-2 text-xs font-bold ${customerRequest?.status==='pending'?'text-amber-700':customerRequest?.status==='approved'?'text-emerald-700':'text-slate-500'}`}>{customerStatus}{customerRequest&&` · ${customerRequest.has_receipt?'الإيصال مرفق':'لا يوجد إيصال مرفق'}`}</p>{customerRequest?.has_receipt&&<button type="button" disabled={downloadingReceiptId===merchant.store.id} onClick={()=>void downloadCustomerReceipt(merchant)} className="mt-2 rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-bold text-sky-800 disabled:opacity-50">{downloadingReceiptId===merchant.store.id?'جارٍ تحميل الإيصال…':'تحميل إيصال العميل'}</button>}{requestLabel&&<p role="status" className={`mt-1 text-xs font-bold ${request?.status==='pending'?'text-amber-700':request?.status==='approved'?'text-emerald-700':'text-rose-700'}`}>{requestLabel} · {request?.months} شهر</p>}</div><button type="button" disabled={busy||request?.status==='pending'} onClick={() => renew(merchant)} className="rounded-xl border border-sky-200 px-4 py-2 font-bold text-sky-800 disabled:cursor-not-allowed disabled:opacity-50">{request?.status==='pending'?'بانتظار موافقة الأدمن':`طلب تجديد ${months} شهر`}</button></article>})}</div> : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-slate-500">لا توجد متاجر مسجلة.</p>}
      <button type="button" disabled={busy || loading} onClick={() => void load()} className="mt-4 rounded-xl border px-4 py-2 text-sm font-bold">تحديث المتاجر</button>
    </section>}
    {renewalFor&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setRenewalFor(null)}}><form role="dialog" aria-modal="true" aria-labelledby="employee-renew-title" onSubmit={submitRenewal} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-2xl"><div><h2 id="employee-renew-title" className="text-lg font-black">طلب تجديد اشتراك «{renewalFor.store.name}»</h2><p className="mt-1 text-sm text-slate-500">لن يتغير الاشتراك حتى يراجع الأدمن الإيصال ويوافق على الطلب.</p></div>{error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<label className="block text-sm font-bold">مدة التجديد<select className={field} value={months} onChange={e=>setMonths(Number(e.target.value))}>{[1,3,6,12].map(value=><option key={value} value={value}>{value} شهر</option>)}</select></label><fieldset className="space-y-3 rounded-xl border p-4"><legend className="px-1 font-bold">إيصال التحويل</legend><label className="flex items-start gap-3"><input type="radio" name="receipt-source" checked={receiptSource==='customer_receipt'} onChange={()=>setReceiptSource('customer_receipt')} disabled={!(renewalFor.customer_subscription_request?.status==='pending'&&renewalFor.customer_subscription_request.has_receipt)}/><span><b>استخدام الإيصال الذي رفعه العميل</b><small className="block text-slate-500">{renewalFor.customer_subscription_request?.status==='pending'&&renewalFor.customer_subscription_request.has_receipt?'سيتم إرفاق الإيصال المعلّق الظاهر في بيانات المتجر تلقائيًا.':'لا يوجد إيصال عميل معلّق لهذا المتجر؛ ارفع الإيصال من الجهاز.'}</small></span></label><label className="flex items-start gap-3"><input type="radio" name="receipt-source" checked={receiptSource==='device_upload'} onChange={()=>setReceiptSource('device_upload')}/><span><b>رفع الإيصال من الجهاز</b><small className="block text-slate-500">استخدمه إذا لم يوجد إيصال للعميل أو تعذر جلبه.</small></span></label>{receiptSource==='device_upload'&&<input type="file" accept="image/png,image/jpeg,image/webp" required onChange={e=>setProofFile(e.target.files?.[0]||null)} className="block w-full rounded-xl border p-3 text-sm"/>}<p className="text-xs text-slate-500">PNG أو JPG أو WEBP — الحد الأقصى 1 ميجابايت.</p></fieldset><div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={()=>setRenewalFor(null)} className="rounded-xl border px-4 py-2 font-bold">إلغاء</button><button type="submit" disabled={busy} className="rounded-xl bg-sky-700 px-4 py-2 font-bold text-white disabled:opacity-50">{busy?'جارٍ إرسال الطلب…':'إرسال للأدمن للموافقة'}</button></div></form></div>}
  </section>
}
