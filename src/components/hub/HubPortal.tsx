'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowLeft, ArrowRight, BadgeCheck, Blocks, Check, ChevronLeft, ChevronRight, CircleUserRound, Clock3, CreditCard, Globe2, KeyRound, Layers3, LogIn, LogOut, Mail, Monitor, Package, RotateCcw, ShieldCheck, Sparkles, Store, Utensils, Shirt, Refrigerator, Scale, CalendarDays } from 'lucide-react'

type Locale = 'ar' | 'en'
type HubUser = { id: string; email: string; name: string }
type Module = { id: string; nameAr: string; nameEn: string; descriptionAr: string; descriptionEn: string; availableFor: string[]; requires: string[]; conflicts: string[]; essential: boolean; recommendedFor: string[]; monthlyPrice: number | null; yearlyPrice: number | null; priceStatus: 'approved' | 'draft' }
type Catalog = { products: { id: string; nameAr: string; nameEn: string; descriptionAr: string; descriptionEn: string; available: boolean }[]; activities: { id: string; nameAr: string; nameEn: string; descriptionAr: string; descriptionEn: string }[]; modules: Module[]; billing: { monthly: number; yearly: number; currency: string }; commercialEnabled: boolean }
type Order = { id: string; orderNumber: string; snapshot: { product: string; activity: string; addons: { id: string; name: string }[]; period: string; total: number; note?: string; paymentMode?: string }; status: string; createdAt: number; proofAvailableAt: number; updated_at?: number; proof_requested_at?: number; rejection_reason?: string; admin_note?: string }
type Subscription = { id: string; status: string; starts_at: number | null; expires_at: number | null; allowed_devices: number; snapshot: Order['snapshot'] }

const messages = {
  ar: { hub: 'دعيدر هب', systems: 'أنظمة إلكترونية', organize: 'نظّم ودير شغلك باحترافية', login: 'تسجيل الدخول', signup: 'إنشاء حساب', reset: 'استعادة كلمة المرور', name: 'الاسم', email: 'البريد الإلكتروني', password: 'كلمة المرور', passwordHint: '12 حرفًا على الأقل', continue: 'متابعة', back: 'رجوع', logout: 'تسجيل الخروج', account: 'أنظمتي واشتراكاتي', chooseSystem: 'اختر نظامك', systemsLead: 'أنظمة تساعدك تدير شغلك من مكان واحد.', soon: 'قريبًا', choose: 'اختر النظام', activity: 'اختر نشاطك', addons: 'خصص نظامك', devices: 'الأجهزة', summary: 'مراجعة الطلب', core: 'مشمولة وأساسية', suggested: 'مقترحة لنشاطك', draft: 'السعر قيد الاعتماد', monthly: 'شهري', yearly: 'سنوي', oneDevice: 'جهاز واحد', multipleDevices: 'جهازان أو أكثر — قريبًا', total: 'الإجمالي', order: 'إنشاء طلب اشتراك', demo: 'وضع تجربة فقط', demoInfo: 'البرنامج غير متاح للتسليم بعد. هذه رحلة تجريبية؛ لا تحوّل أموالًا ولا ترسل إثبات دفع.', payment: 'الدفع عبر InstaPay', copy: 'نسخ الرقم', copied: 'تم النسخ', wait: 'إتاحة زر المتابعة بعد', minutes: 'دقيقة', seconds: 'ثانية', demoProof: 'محاكاة طلب إرسال الإثبات', waitInfo: 'انتهاء العداد لا يؤكد وصول أي دفعة.', review: 'قيد المراجعة', reviewInfo: 'هذا اختبار لمسار المراجعة فقط. لم يتم إرسال واتساب أو إثبات دفع.', status: 'الحالة', awaiting_transfer: 'بانتظار التحويل (تجريبي)', under_review: 'قيد المراجعة', needs_info: 'مطلوب معلومات إضافية', approved: 'تمت الموافقة', rejected: 'مرفوض', awaiting_activation: 'بانتظار توفر الإصدار والتفعيل', active: 'نشط', expired: 'منتهي', noOrders: 'لا توجد طلبات بعد.', retry: 'حاول مرة أخرى', send: 'إرسال', saving: 'جارٍ الحفظ…', cancel: 'إلغاء', accountHint: 'أنشئ حسابًا أو سجّل الدخول لمتابعة اختيارك.', signupGoogle: 'المتابعة باستخدام Google', googleOff: 'تسجيل Google سيتاح بعد إعداد مفاتيحه في Cloudflare.', resetSent: 'إذا كان البريد مسجلًا، ستصلك رسالة استعادة خلال دقائق.', releaseOff: 'التحميل غير متاح بعد. سنعرض رابطًا هنا بعد نشر إصدار فعلي.', downloads: 'التحميل والإصدارات', devicesLinked: 'الأجهزة المسموحة', renewal: 'التجديد', support: 'الدعم', transfer: 'طلب نقل الجهاز', subscriptions: 'الاشتراكات', orders: 'الطلبات', expires: 'تاريخ الانتهاء', notStarted: 'تبدأ مدة الاستخدام عند أول تفعيل ناجح لإصدار متاح.', pricing: 'التسعير', activityHint: 'اختر النشاط الأقرب لطريقة عملك.', select: 'تحديد', required: 'أساسي', draftPrice: 'إضافات اختيارية تظهر الآن كمسودات بلا سعر منشور.', provider: 'تحقق من اسم المستفيد داخل تطبيق الدفع قبل أي تحويل.', error: 'حدث خطأ. راجع اتصالك وحاول مرة أخرى.', resetLink: 'نسيت كلمة المرور؟', noAccount: 'ليس لديك حساب؟', hasAccount: 'لديك حساب بالفعل؟', continueWithGoogle: 'Google غير مفعّل بعد', closed: 'الشراء التجاري مغلق حاليًا', instapaySteps: 'حوّل المبلغ إلى InstaPay على رقم 01092912431. تأكد بنفسك من اسم المستفيد داخل تطبيق الدفع؛ لا تعتمد على اسم ظاهر هنا.', whatsapp: 'إرسال إثبات التحويل على واتساب', whatsappNote: 'يفتح واتساب بنص جاهز فقط. أرفق صورة التحويل داخل واتساب وأرسلها بنفسك؛ لا يتم إرفاق الصورة تلقائيًا.', realWait: 'تسجيل طلب إرسال الإثبات' },
  en: { hub: 'Daidar Hub', systems: 'Digital systems', organize: 'Organize and run your work professionally', login: 'Log in', signup: 'Create account', reset: 'Reset password', name: 'Name', email: 'Email', password: 'Password', passwordHint: 'At least 12 characters', continue: 'Continue', back: 'Back', logout: 'Log out', account: 'My systems and subscriptions', chooseSystem: 'Choose your system', systemsLead: 'Systems that help you run your work in one place.', soon: 'Coming soon', choose: 'Choose system', activity: 'Choose your business', addons: 'Customize your system', devices: 'Devices', summary: 'Review order', core: 'Included and essential', suggested: 'Recommended for your business', draft: 'Pricing pending approval', monthly: 'Monthly', yearly: 'Yearly', oneDevice: 'One device', multipleDevices: 'Two or more — coming soon', total: 'Total', order: 'Create subscription order', demo: 'Demo mode only', demoInfo: 'The software is not ready for delivery. This is a demo journey; do not transfer money or send payment proof.', payment: 'InstaPay payment', copy: 'Copy number', copied: 'Copied', wait: 'Continue in', minutes: 'min', seconds: 'sec', demoProof: 'Simulate proof request', waitInfo: 'The countdown ending does not confirm receipt of any payment.', review: 'Under review', reviewInfo: 'This tests the review path only. No WhatsApp message or payment proof was sent.', status: 'Status', awaiting_transfer: 'Awaiting transfer (demo)', under_review: 'Under review', needs_info: 'More information requested', approved: 'Approved', rejected: 'Rejected', awaiting_activation: 'Awaiting release and activation', active: 'Active', expired: 'Expired', noOrders: 'No orders yet.', retry: 'Try again', send: 'Submit', saving: 'Saving…', cancel: 'Cancel', accountHint: 'Create an account or log in to continue your saved choices.', signupGoogle: 'Continue with Google', googleOff: 'Google sign-in will be available after Cloudflare credentials are configured.', resetSent: 'If the address is registered, a reset link will arrive shortly.', releaseOff: 'Download is not available yet. A link will appear here when a real release is published.', downloads: 'Downloads and releases', devicesLinked: 'Allowed devices', renewal: 'Renewal', support: 'Support', transfer: 'Request device transfer', subscriptions: 'Subscriptions', orders: 'Orders', expires: 'Expiry date', notStarted: 'Usage starts on first successful activation when a release is available.', pricing: 'Pricing', activityHint: 'Choose the activity closest to how you work.', select: 'Select', required: 'Required', draftPrice: 'Optional add-ons are drafts with no published price yet.', provider: 'Verify the recipient name in your payment app before transferring.', error: 'Something went wrong. Check your connection and try again.', resetLink: 'Forgot password?', noAccount: 'Need an account?', hasAccount: 'Already have an account?', continueWithGoogle: 'Google is not enabled yet', closed: 'Commercial checkout is currently closed', instapaySteps: 'Transfer to InstaPay number 01092912431. Verify the recipient name inside your payment app; no name is displayed here.', whatsapp: 'Send transfer proof on WhatsApp', whatsappNote: 'WhatsApp opens with text only. Attach the transfer screenshot in WhatsApp and send it yourself; images are not attached automatically.', realWait: 'Record proof request' }
}

const activityIcons: Record<string, typeof Store> = { general: Store, supermarket: Package, restaurant: Utensils, clothing: Shirt, electronics: Refrigerator }
const steps = ['system', 'activity', 'addons', 'devices', 'summary'] as const

export default function HubPortal({ locale }: { locale: Locale }) {
  const ar = locale === 'ar'
  const t = messages[locale]
  const [user, setUser] = useState<HubUser | null>(null)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [releases, setReleases] = useState<{id:string;version:string;filename:string}[]>([])
  const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'set-password'>('login')
  const [resetToken, setResetToken] = useState('')
  const [step, setStep] = useState<(typeof steps)[number]>('system')
  const [selectedSystem, setSelectedSystem] = useState('daidar-flow')
  const [renewSubscriptionId, setRenewSubscriptionId] = useState('')
  const [activityId, setActivityId] = useState('')
  const [addons, setAddons] = useState<string[]>([])
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [focusOrder, setFocusOrder] = useState<Order | null>(null)
  const [clock, setClock] = useState(Date.now())
  const [serverOffset, setServerOffset] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showAccount, setShowAccount] = useState(false)

  const api = useCallback(async (path: string, body?: unknown) => {
    const res = await fetch(`/api/hub/${path}`, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || t.error)
    return data
  }, [t.error])

  const loadAccount = useCallback(async () => {
    const data = await api('session')
    setUser(data.user)
    if (!data.user) { setCatalog(null); setOrders([]); setSubscriptions([]); setReleases([]); return }
    const c = await api('catalog')
    setCatalog(c.catalog)
    const account = await api('orders')
    setServerOffset(account.serverNow - Date.now())
    setClock(account.serverNow)
    const mapped = account.orders.map((o: any) => ({ ...o, orderNumber: o.order_number, createdAt: o.created_at, proofAvailableAt: o.proof_available_at }))
    setOrders(mapped)
    setFocusOrder((current: Order | null) => current || mapped.find((o: Order) => ['awaiting_transfer','under_review','needs_info'].includes(o.status)) || null)
    setSubscriptions(account.subscriptions)
    setReleases(account.releases || [])
  }, [api])

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    if (token) { setResetToken(token); setMode('set-password') }
    if (new URLSearchParams(window.location.search).get('oauth') === 'failed') setError(ar ? 'تعذر إكمال تسجيل Google. حاول مرة أخرى أو استخدم البريد.' : 'Google sign-in could not be completed. Try again or use email.')
    try {
      const saved = localStorage.getItem('daidar-hub-choices')
      if (saved) { const x = JSON.parse(saved); if (x.activityId) setActivityId(x.activityId); if (Array.isArray(x.addons)) setAddons(x.addons); if (x.period) setPeriod(x.period) }
      const stepSaved = sessionStorage.getItem('daidar-hub-step')
      if (stepSaved && steps.includes(stepSaved as typeof steps[number])) setStep(stepSaved as typeof steps[number])
    } catch {}
    loadAccount().catch(() => setError(t.error))
  }, [loadAccount, t.error])

  useEffect(() => { const timer = setInterval(() => setClock(Date.now() + serverOffset), 1000); return () => clearInterval(timer) }, [serverOffset])

  useEffect(() => { try { localStorage.setItem('daidar-hub-choices', JSON.stringify({ activityId, addons, period })); sessionStorage.setItem('daidar-hub-step', step) } catch {} }, [activityId, addons, period, step])
  useEffect(() => { if (!catalog || !activityId) return; const essentials=catalog.modules.filter(m=>m.essential&&m.availableFor.includes(activityId)).map(m=>m.id); setAddons(current=>[...new Set([...essentials,...current.filter(id=>{const m=catalog.modules.find(x=>x.id===id);return !!m&&m.availableFor.includes(activityId)&&(m.essential||(m.priceStatus==='approved'&&m.monthlyPrice!==null&&m.yearlyPrice!==null))})])]) }, [catalog,activityId])

  const currentProduct = catalog?.products.find(p => p.id === selectedSystem)
  const currentActivity = catalog?.activities.find(a => a.id === activityId)
  const eligibleModules = catalog?.modules.filter(m => m.availableFor.includes(activityId)) || []
  const totalPrice = useMemo(() => {
    if (!catalog) return 0
    const base = period === 'monthly' ? catalog.billing.monthly : catalog.billing.yearly
    return base + eligibleModules.filter(m => addons.includes(m.id)).reduce((sum, m) => sum + (period === 'monthly' ? m.monthlyPrice || 0 : m.yearlyPrice || 0), 0)
  }, [addons, catalog, eligibleModules, period])

  async function submitAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setNotice(''); setBusy(true)
    const form = new FormData(e.currentTarget)
    try {
      if (mode === 'reset') { const result = await api('password-reset', { email: form.get('email') }); setNotice(result.message || t.resetSent) }
      else if (mode === 'set-password') { await api('reset', { token: resetToken, password: form.get('password') }); setNotice(ar ? 'تم تحديث كلمة المرور. سجل الدخول الآن.' : 'Password updated. You can log in now.'); setMode('login'); setResetToken(''); history.replaceState({}, '', `/${locale}/hub`) }
      else { await api(mode === 'signup' ? 'signup' : 'login', { name: form.get('name'), email: form.get('email'), password: form.get('password') }); await loadAccount(); setShowAccount(false) }
    } catch (e) { setError(e instanceof Error ? e.message : t.error) } finally { setBusy(false) }
  }

  async function createOrder() {
    setError(''); setBusy(true)
    try {
      const data = await api('orders', { productId: selectedSystem, activityId, addons, period, devices: 1, renewSubscriptionId: renewSubscriptionId || undefined })
      setServerOffset(data.serverNow - Date.now()); setClock(data.serverNow); setFocusOrder(data.order); setOrders(prev => [data.order, ...prev]); setShowAccount(true)
    } catch (e) { setError(e instanceof Error ? e.message : t.error) } finally { setBusy(false) }
  }
  async function simulateProof() {
    if (!focusOrder) return
    setError(''); setBusy(true)
    try { await api(`orders/${focusOrder.id}/proof-intent`, {}); setFocusOrder({ ...focusOrder, status: 'under_review' }); await loadAccount(); setNotice(t.reviewInfo) }
    catch (e) { setError(e instanceof Error ? e.message : t.error) } finally { setBusy(false) }
  }
  async function requestProof() {
    if (!focusOrder) return
    setError(''); setBusy(true)
    try {
      await api(`orders/${focusOrder.id}/proof-intent`, {})
      setFocusOrder({ ...focusOrder, status: 'under_review' }); await loadAccount()
      if (focusOrder.snapshot.paymentMode !== 'demo') {
        const addOns = focusOrder.snapshot.addons.map(x => x.name).join('، ') || 'لا توجد'
        const text = `السلام عليكم، أنا اشتركت في دعيدر فلو.\nرقم الطلب: ${focusOrder.orderNumber}\nالنشاط: ${focusOrder.snapshot.activity}\nالإضافات: ${addOns}\nالمدة: ${focusOrder.snapshot.period === 'yearly' ? 'سنوية' : 'شهرية'}\nالمبلغ: ${money(focusOrder.snapshot.total, true)} جنيه.\nودي صورة التحويل.`
        window.location.href = `https://wa.me/201092912431?text=${encodeURIComponent(text)}`
      } else setNotice(t.reviewInfo)
    } catch (e) { setError(e instanceof Error ? e.message : t.error) } finally { setBusy(false) }
  }
  async function logout() { try { await api('logout', {}) } finally { setUser(null); setOrders([]); setSubscriptions([]); setReleases([]); setFocusOrder(null); setShowAccount(false) } }
  function advance(next: typeof steps[number]) { if (!user) { setMode('login'); return }; setError(''); setStep(next) }
  function toggleModule(m: Module) {
    if (m.essential || m.priceStatus !== 'approved' || m.monthlyPrice == null || m.yearlyPrice == null) return
    setAddons(previous => {
      let next = [...previous]
      if (next.includes(m.id)) {
        next = next.filter(id => id !== m.id)
        let changed = true
        while (changed) { changed = false; for (const id of [...next]) { const candidate = catalog?.modules.find(x => x.id === id); if (candidate?.requires.some(required => !next.includes(required))) { next = next.filter(x => x !== id); changed = true } } }
        return next
      }
      const add = (id: string, seen = new Set<string>()): boolean => {
        if (seen.has(id)) return false
        seen.add(id)
        const candidate = catalog?.modules.find(x => x.id === id)
        if (!candidate || !candidate.availableFor.includes(activityId)) return false
        for (const dependency of candidate.requires) if (!next.includes(dependency) && !add(dependency, seen)) return false
        if (!candidate.essential && (candidate.priceStatus !== 'approved' || candidate.monthlyPrice == null || candidate.yearlyPrice == null)) return false
        if (candidate.conflicts.some(conflict => next.includes(conflict)) || next.some(other => catalog?.modules.find(x => x.id === other)?.conflicts.includes(id))) return false
        if (!next.includes(id)) next.push(id)
        return true
      }
      if (!add(m.id)) setError(ar ? 'تعذر اختيار الإضافة. تحقق من اعتماد سعرها ومتطلباتها وتعارضاتها.' : 'This add-on cannot be selected. Check its price, dependencies, and conflicts.')
      else setError('')
      return next
    })
  }
  const DirectionIcon = ar ? ArrowLeft : ArrowRight
  const card = 'rounded-2xl border border-slate-200 bg-white shadow-sm transition dark:border-slate-700 dark:bg-slate-900'

  return <div dir={ar ? 'rtl' : 'ltr'} className="min-h-[85vh] bg-[#f4f9fd] px-4 py-10 text-slate-900 dark:bg-[#081424] dark:text-white sm:px-6 sm:py-14">
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <a href={`/${locale}`} className="flex items-center gap-3 font-extrabold text-[#102d4e] dark:text-white"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-500 text-white"><Blocks /></span><span className="text-xl">{t.hub}<small className="block text-xs font-medium text-slate-500">DAIDAR HUB</small></span></a>
        <div className="flex items-center gap-2">
          {user && <button onClick={() => setShowAccount(v => !v)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"><CircleUserRound className="me-2 inline" size={17} />{showAccount ? t.chooseSystem : t.account}</button>}
          <a href={`/${ar ? 'en' : 'ar'}/hub`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"><Globe2 className="me-2 inline" size={16} />{ar ? 'English' : 'العربية'}</a>
          {user && <button onClick={logout} title={t.logout} className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900"><LogOut size={17} /></button>}
        </div>
      </header>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
        <section className="space-y-5">
          {!user ? <AuthPanel {...{ ar, t, mode, setMode, submitAuth, busy, error, notice, card, locale }} /> : showAccount ? <AccountPanel {...{ ar, t, card, orders, subscriptions, releases, onRenew: (id:string) => { const sub=subscriptions.find((x:Subscription)=>x.id===id); setRenewSubscriptionId(id); if(sub){setActivityId((sub.snapshot as any).activityId||'');setAddons(((sub.snapshot as any).addons||[]).map((x:any)=>x.id))}; setShowAccount(false); setStep('system') } }} /> : <>
            <div className={`${card} overflow-hidden bg-gradient-to-br from-white via-sky-50 to-blue-100 p-6 dark:from-slate-900 dark:via-[#10233b] dark:to-[#0a3157] sm:p-9`}>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-sm font-bold text-sky-700 dark:border-sky-800 dark:bg-slate-900/70 dark:text-sky-300"><Sparkles size={16} />{ar ? 'كل أدوات شغلك في مكان واحد' : 'Your tools in one place'}</div>
              <h1 className="text-3xl font-black leading-tight sm:text-5xl">{t.hub}<span className="text-sky-500">.</span></h1>
              <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">{t.systemsLead}</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 dark:bg-slate-950/40"><Blocks className="text-sky-500" /><span className="font-bold">{t.systems}</span></div>
                <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 dark:bg-slate-950/40"><Activity className="text-sky-500" /><span className="font-bold">{t.organize}</span></div>
              </div>
            </div>
            <nav aria-label="Progress" className="grid grid-cols-5 gap-2">{steps.map((s, i) => <button key={s} onClick={() => i < steps.indexOf(step) && setStep(s)} className={`rounded-xl px-2 py-3 text-xs font-bold sm:text-sm ${step === s ? 'bg-[#0c3156] text-white' : i < steps.indexOf(step) ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200' : 'bg-white text-slate-400 dark:bg-slate-900'}`}>{ar ? ['النظام','النشاط','الإضافات','الأجهزة','الطلب'][i] : ['System','Business','Add-ons','Devices','Order'][i]}</button>)}</nav>
            {error && <Alert kind="error">{error}</Alert>}{notice && <Alert kind="info">{notice}</Alert>}
            {step === 'system' && <section className={`${card} p-6 sm:p-8`}><StepTitle icon={<Layers3 />} title={t.chooseSystem} subtitle={t.systemsLead} />{!catalog ? <p>{t.saving}</p> : <div className="mt-5 grid gap-4 sm:grid-cols-2">{catalog.products.map(product => { const selectable = product.available || !catalog.commercialEnabled; return <article key={product.id} className={`rounded-2xl border p-5 ${selectedSystem === product.id ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-100 dark:bg-sky-950/30 dark:ring-sky-900' : 'border-slate-200 dark:border-slate-700'}`}><div className="flex items-start justify-between gap-3"><div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950"><Package /></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${product.available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{product.available ? t.choose : t.soon}</span></div><h2 className="mt-4 text-xl font-extrabold">{ar ? product.nameAr : product.nameEn}</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{ar ? product.descriptionAr : product.descriptionEn}</p><button disabled={!selectable} onClick={() => setSelectedSystem(product.id)} className="mt-5 w-full rounded-xl bg-[#0789d1] px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700">{product.available ? t.choose : catalog.commercialEnabled ? t.soon : t.demo}</button></article> })}</div>}<div className="mt-6 flex justify-end"><Primary onClick={() => advance('activity')} disabled={!currentProduct || (!!catalog?.commercialEnabled && !currentProduct.available)}>{t.continue}<ChevronLeft className={ar ? '' : 'rotate-180'} size={18} /></Primary></div></section>}
            {step === 'activity' && <section className={`${card} p-6 sm:p-8`}><StepTitle icon={<Store />} title={t.activity} subtitle={t.activityHint} /><div className="mt-5 grid gap-3 sm:grid-cols-2">{catalog?.activities.map(item => { const Icon = activityIcons[item.id] || Store; return <button key={item.id} onClick={() => { setActivityId(item.id); setAddons(catalog.modules.filter(m => m.essential && m.availableFor.includes(item.id)).map(m => m.id)) }} className={`rounded-2xl border p-4 text-start ${activityId === item.id ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30' : 'border-slate-200 dark:border-slate-700'}`}><span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950"><Icon /></span><strong className="mt-3 block">{ar ? item.nameAr : item.nameEn}</strong><span className="mt-1 block text-sm text-slate-500">{ar ? item.descriptionAr : item.descriptionEn}</span></button> })}</div><StepActions {...{ ar, t }} onBack={() => setStep('system')} onNext={() => activityId ? advance('addons') : setError(ar ? 'اختر نشاطًا للمتابعة.' : 'Choose a business activity to continue.')} /></section>}
            {step === 'addons' && <section className={`${card} p-6 sm:p-8`}><StepTitle icon={<Layers3 />} title={t.addons} subtitle={t.draftPrice} /><div className="mt-5 space-y-3">{eligibleModules.map(m => { const selected = addons.includes(m.id); const blocked = !m.essential && (m.priceStatus !== 'approved' || m.monthlyPrice == null || m.yearlyPrice == null); return <label key={m.id} className={`flex gap-3 rounded-2xl border p-4 ${m.essential ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50' : blocked ? 'border-slate-200 opacity-75 dark:border-slate-700' : 'cursor-pointer border-slate-200 dark:border-slate-700'}`}><input type="checkbox" checked={m.essential || selected} disabled={m.essential || blocked} onChange={() => toggleModule(m)} className="mt-1 h-5 w-5 accent-sky-600" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 font-bold">{ar ? m.nameAr : m.nameEn}{m.essential && <Badge text={t.core} />}{m.recommendedFor.includes(activityId) && !m.essential && <Badge text={t.suggested} />}</span><span className="mt-1 block text-sm text-slate-500">{ar ? m.descriptionAr : m.descriptionEn}</span>{m.requires.length>0&&<span className="mt-1 block text-xs text-sky-700">{ar?'يتطلب: ':'Requires: '}{m.requires.map(id=>{const d=catalog?.modules.find(x=>x.id===id);return ar?d?.nameAr:d?.nameEn}).join('، ')}</span>}{m.conflicts.length>0&&<span className="mt-1 block text-xs text-rose-700">{ar?'يتعارض مع: ':'Conflicts with: '}{m.conflicts.map(id=>{const d=catalog?.modules.find(x=>x.id===id);return ar?d?.nameAr:d?.nameEn}).join('، ')}</span>}</span><span className="shrink-0 text-xs font-bold text-slate-500">{m.essential ? t.required : blocked ? t.draft : `${money(m.monthlyPrice!,ar)} ${ar?'شهري':'monthly'} · ${money(m.yearlyPrice!,ar)} ${ar?'سنوي':'yearly'} ${ar?'جنيه':'EGP'}`}</span></label> })}</div><StepActions {...{ ar, t }} onBack={() => setStep('activity')} onNext={() => advance('devices')} /></section>}
            {step === 'devices' && <section className={`${card} p-6 sm:p-8`}><StepTitle icon={<Monitor />} title={t.devices} subtitle={ar ? 'كل اشتراك يسمح بجهاز واحد في الوقت الحالي.' : 'Each subscription currently allows one device.'} /><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border-2 border-sky-500 bg-sky-50 p-5 dark:bg-sky-950/30"><Check className="text-sky-600" /><h3 className="mt-3 font-extrabold">{t.oneDevice}</h3><p className="mt-1 text-sm text-slate-500">{ar ? 'متاح ومحدد لطلبك.' : 'Available and selected.'}</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 opacity-70 dark:border-slate-700 dark:bg-slate-800"><Monitor className="text-slate-400" /><h3 className="mt-3 font-extrabold">{t.multipleDevices}</h3></div></div><div className="mt-6 flex items-center gap-3 rounded-xl bg-sky-50 p-4 text-sm dark:bg-sky-950/40"><CalendarDays className="shrink-0 text-sky-600" />{t.notStarted}</div><StepActions {...{ ar, t }} onBack={() => setStep('addons')} onNext={() => advance('summary')} /></section>}
            {step === 'summary' && <section className={`${card} p-6 sm:p-8`}><StepTitle icon={<CreditCard />} title={t.summary} subtitle={t.pricing} /><div className="mt-5 grid gap-5 md:grid-cols-[1fr_300px]"><div className="space-y-4"><div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60"><dl className="space-y-3 text-sm"><SummaryRow k={ar ? 'النظام' : 'System'} v={currentProduct ? (ar ? currentProduct.nameAr : currentProduct.nameEn) : ''} /><SummaryRow k={ar ? 'النشاط' : 'Business'} v={currentActivity ? (ar ? currentActivity.nameAr : currentActivity.nameEn) : (ar ? 'لم يحدد' : 'Not selected')} /><SummaryRow k={ar ? 'الإضافات' : 'Add-ons'} v={eligibleModules.filter(m => addons.includes(m.id)).map(m => ar ? m.nameAr : m.nameEn).join('، ') || '—'} /><SummaryRow k={t.devices} v={t.oneDevice} /></dl></div><div className="flex gap-2"><button onClick={() => setPeriod('monthly')} className={`flex-1 rounded-xl border p-3 font-bold ${period === 'monthly' ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950' : 'border-slate-200 dark:border-slate-700'}`}>{t.monthly}</button><button onClick={() => setPeriod('yearly')} className={`flex-1 rounded-xl border p-3 font-bold ${period === 'yearly' ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950' : 'border-slate-200 dark:border-slate-700'}`}>{t.yearly}</button></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">{catalog?.commercialEnabled ? (ar ? 'بعد مراجعة الطلب، تبدأ مدة الاشتراك عند أول تفعيل ناجح لإصدار متاح.' : 'After review, your term begins at the first successful activation of an available release.') : <><strong className="block">{t.demo}</strong>{t.demoInfo}</>}</div></div><aside className="rounded-2xl bg-[#0c3156] p-5 text-white"><p className="text-sm text-sky-200">{t.total}</p><p className="mt-1 text-3xl font-black">{money(totalPrice, ar)} <span className="text-sm">{ar ? 'جنيه' : 'EGP'}</span></p><p className="mt-3 text-xs text-sky-100">{t.oneDevice} · {period === 'monthly' ? t.monthly : t.yearly}</p><button onClick={createOrder} disabled={busy || !activityId} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 font-bold disabled:opacity-50">{busy ? t.saving : t.order}<DirectionIcon size={17} /></button></aside></div><StepActions {...{ ar, t }} onBack={() => setStep('devices')} onNext={() => {}} hideNext /></section>}
          </>}
        </section>

        <aside className="space-y-5">
          {user ? <div className={`${card} p-5`}><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950"><CircleUserRound /></span><div className="min-w-0"><strong className="block truncate">{user.name}</strong><span className="block truncate text-sm text-slate-500">{user.email}</span></div></div><button onClick={() => setShowAccount(true)} className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold dark:border-slate-700">{t.account}</button></div> : <div className={`${card} p-5`}><h2 className="font-extrabold">{ar ? 'كل أدوات شغلك في مكان واحد' : 'All your work tools in one place'}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{ar ? 'أنظمة إلكترونية تساعدك تنظّم شغلك وتديره باحترافية.' : 'Digital systems to organize and run your work professionally.'}</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-sky-700"><ShieldCheck size={16}/>{ar ? 'تسجيل آمن وحساب خاص' : 'Secure sign-in and private account'}</span></div>}
          {focusOrder && <div className={`${card} p-5`}><h2 className="flex items-center gap-2 font-extrabold"><Clock3 className="text-sky-600" />{t.payment}</h2><p className="mt-3 text-xs font-bold text-slate-500">{focusOrder.snapshot.paymentMode === 'demo' ? t.demo : 'InstaPay'} · {focusOrder.orderNumber}</p>{focusOrder.snapshot.paymentMode === 'demo' ? <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">{t.demoInfo}</div> : <div className="mt-4 rounded-xl bg-sky-50 p-4 text-sm leading-6 dark:bg-sky-950/40"><p>{t.instapaySteps}</p><div className="mt-3 flex items-center justify-between rounded-lg border border-sky-200 bg-white p-3 dark:border-sky-900 dark:bg-slate-900"><b dir="ltr">01092912431</b><button onClick={() => navigator.clipboard.writeText('01092912431').then(() => setNotice(t.copied))} className="text-xs font-bold text-sky-700">{t.copy}</button></div></div>}<p className="mt-3 text-sm"><b>{t.status}:</b> {t[focusOrder.status as keyof typeof t] || focusOrder.status}</p>{focusOrder.status === 'under_review' && <p className="mt-2 rounded-xl bg-sky-50 p-3 text-sm dark:bg-sky-950/40">{focusOrder.snapshot.paymentMode === 'demo' ? t.reviewInfo : (ar ? 'طلبك قيد المراجعة. يرجى التأكد من إرسال صورة التحويل على واتساب.' : 'Your order is under review. Please make sure you sent the transfer image on WhatsApp.')}</p>}{focusOrder.status === 'awaiting_transfer' && <><div className="my-4 rounded-xl border border-slate-200 p-4 text-center dark:border-slate-700"><span className="text-sm text-slate-500">{t.wait}</span><div className="mt-1 text-3xl font-black tabular-nums text-sky-600">{remaining(focusOrder, clock, t)}</div></div><p className="mb-3 text-xs leading-5 text-slate-500">{t.waitInfo}</p>{focusOrder.snapshot.paymentMode !== 'demo' && <p className="mb-3 text-xs leading-5 text-slate-500">{t.whatsappNote}</p>}<button onClick={focusOrder.snapshot.paymentMode === 'demo' ? simulateProof : requestProof} disabled={busy || clock < focusOrder.proofAvailableAt} className="w-full rounded-xl bg-[#0c3156] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700">{busy ? t.saving : focusOrder.snapshot.paymentMode === 'demo' ? t.demoProof : t.whatsapp}</button></>}</div>}
          <div className={`${card} p-5`}><h2 className="flex items-center gap-2 font-extrabold"><ShieldCheck className="text-sky-600" />{ar ? 'حسابك وبياناتك' : 'Your account and data'}</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{ar ? 'كل طلب واشتراك مرتبط بحسابك ويظهر لك وحدك. صلاحية الحساب تتحقق من الخادم.' : 'Orders and subscriptions belong to your account. Access is checked on the server.'}</p></div>
          <div className={`${card} p-5`}><h2 className="flex items-center gap-2 font-extrabold"><KeyRound className="text-sky-600" />{t.downloads}</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t.releaseOff}</p></div>
        </aside>
      </div>
    </div>
  </div>
}

function AuthPanel({ ar, t, mode, setMode, submitAuth, busy, error, notice, card, locale = 'ar', compact = false }: any) {
  const [tag, setTag] = useState(0)
  useEffect(() => { const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; if (reduce) return; const timer = setInterval(() => setTag(v => (v + 1) % 2), 4200); return () => clearInterval(timer) }, [])
  return <section className={`${card} p-5 sm:p-7`}>
    <div className="mb-5 min-h-12 overflow-hidden rounded-xl bg-sky-50 px-4 py-3 dark:bg-sky-950/40"><div key={tag} className="flex animate-hub-swap items-center gap-3 font-bold text-[#0c3156] dark:text-sky-200"><span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900">{tag ? <Activity size={18} /> : <Blocks size={18} />}</span>{tag ? t.organize : t.systems}</div></div>
    <h2 className="text-2xl font-black">{mode === 'login' ? t.login : mode === 'signup' ? t.signup : mode === 'set-password' ? (ar ? 'اختيار كلمة مرور جديدة' : 'Choose a new password') : t.reset}</h2><p className="mt-1 text-sm text-slate-500">{t.accountHint}</p>
    <a href={`/api/hub/google?locale=${locale}`} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 font-bold dark:border-slate-700"><span className="font-black text-lg">G</span>{t.signupGoogle}</a><p className="mt-2 text-center text-xs text-slate-500">{t.googleOff}</p>
    <form className="mt-5 space-y-3" onSubmit={submitAuth}>{mode === 'signup' && <Field label={t.name} name="name" icon={<CircleUserRound size={17} />} required minLength={2} />}{mode === 'reset' && <p className="text-sm text-slate-500">{t.resetSent}</p>}{mode !== 'set-password' && <Field label={t.email} name="email" type="email" icon={<Mail size={17} />} required />}{mode !== 'reset' && <Field label={mode === 'set-password' ? (ar ? 'كلمة المرور الجديدة' : 'New password') : t.password} name="password" type="password" icon={<KeyRound size={17} />} required minLength={12} autoComplete={mode === 'signup' || mode === 'set-password' ? 'new-password' : 'current-password'} placeholder={t.passwordHint} />}<div className="min-h-5">{error && <span className="text-sm text-red-600">{error}</span>}{notice && <span className="text-sm text-emerald-700">{notice}</span>}</div><button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 font-bold text-white disabled:opacity-60">{busy ? t.saving : mode === 'reset' ? t.send : mode === 'set-password' ? t.continue : t.continue}<LogIn size={17} /></button></form>
    <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">{mode === 'login' && <button onClick={() => { setMode('reset') }} className="text-sky-700 underline dark:text-sky-300">{t.resetLink}</button>}{(mode === 'login' || mode === 'signup') && <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-sky-700 underline dark:text-sky-300">{mode === 'login' ? t.noAccount : t.hasAccount} {mode === 'login' ? t.signup : t.login}</button>}{(mode === 'reset' || mode === 'set-password') && <button onClick={() => setMode('login')} className="text-sky-700 underline dark:text-sky-300">{t.back}</button>}</div>
  </section>
}
function AccountPanel({ ar, t, card, orders, subscriptions, releases, onRenew }: any) {
  const [transferReason, setTransferReason] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  async function requestTransfer(id: string) { setLoading(true); try { const r = await fetch('/api/hub/transfer-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: id, reason: transferReason }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setMessage(ar ? 'تم تسجيل طلب نقل الجهاز.' : 'Device transfer request submitted.') } catch (e) { setMessage(e instanceof Error ? e.message : t.error) } finally { setLoading(false) } }
  return <section className={`${card} p-6 sm:p-8`}><StepTitle icon={<CircleUserRound />} title={t.account} subtitle={t.subscriptions} /><div className="mt-6"><h3 className="font-extrabold">{t.orders}</h3>{orders.length ? <div className="mt-3 space-y-3">{orders.map((o: Order) => <article key={o.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex flex-wrap items-center justify-between gap-2"><b>{o.orderNumber}</b><Badge text={t[o.status as keyof typeof t] || o.status} /></div><p className="mt-2 text-sm text-slate-500">{o.snapshot.product} · {o.snapshot.activity} · {money(o.snapshot.total, ar)} {ar ? 'جنيه' : 'EGP'}</p>{o.rejection_reason && <p className="mt-2 text-sm text-red-600">{o.rejection_reason}</p>}{o.admin_note && <p className="mt-2 text-sm text-sky-700">{o.admin_note}</p>}</article>)}</div> : <p className="mt-2 text-sm text-slate-500">{t.noOrders}</p>}</div><div className="mt-7"><h3 className="font-extrabold">{t.subscriptions}</h3>{subscriptions.length ? <div className="mt-3 space-y-3">{subscriptions.map((s: Subscription) => <article key={s.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex flex-wrap items-center justify-between gap-2"><b>{s.snapshot.product}</b><Badge text={t[s.status as keyof typeof t] || s.status} /></div><p className="mt-2 text-sm text-slate-500">{s.snapshot.activity} · {t.devicesLinked}: {s.allowed_devices}</p><p className="mt-1 text-sm text-slate-500">{t.expires}: {s.expires_at ? new Date(s.expires_at).toLocaleDateString(ar ? 'ar-EG' : 'en-US') : t.notStarted}</p><div className="mt-3 rounded-lg bg-sky-50 p-3 text-sm dark:bg-sky-950/40">{s.status === 'awaiting_activation' ? t.notStarted : t.releaseOff}</div>{releases.map((r:{id:string;version:string;filename:string})=><a key={r.id} href={`/api/hub/download/${r.id}`} className="mt-3 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white">{t.downloads} · {r.version}</a>)}{s.status === 'active' && <a href={`/api/hub/license/${s.id}`} className="mt-2 inline-flex rounded-lg border border-sky-600 px-4 py-2 text-sm font-bold text-sky-700">{ar ? 'تنزيل ملف الرخصة' : 'Download license file'}</a>}<button onClick={() => onRenew(s.id)} className="mt-3 block rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white">{t.renewal}</button><div className="mt-4 flex gap-2"><input value={transferReason} onChange={e => setTransferReason(e.target.value)} placeholder={ar ? 'سبب نقل الجهاز' : 'Reason for transfer'} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700" /><button disabled={loading || transferReason.length < 5} onClick={() => requestTransfer(s.id)} className="rounded-lg border border-slate-200 px-3 text-sm font-bold disabled:opacity-50 dark:border-slate-700">{t.transfer}</button></div></article>)}</div> : <p className="mt-2 text-sm text-slate-500">{t.noOrders}</p>}</div>{message && <p className="mt-4 text-sm text-sky-700">{message}</p>}</section>
}
function Field({ label, name, type = 'text', icon, ...props }: any) { return <label className="block"><span className="mb-1 block text-sm font-bold">{label}</span><span className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 dark:border-slate-700"><span className="text-slate-400">{icon}</span><input name={name} type={type} className="min-w-0 flex-1 bg-transparent py-3 outline-none" {...props} /></span></label> }
function StepTitle({ icon, title, subtitle }: any) { return <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">{icon}</span><span><h2 className="text-xl font-black">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></span></div> }
function Primary({ children, disabled, onClick }: any) { return <button onClick={onClick} disabled={disabled} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-bold text-white disabled:opacity-50">{children}</button> }
function StepActions({ ar, t, onBack, onNext, hideNext }: any) { return <div className="mt-7 flex justify-between"><button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 font-bold dark:border-slate-700"><ChevronRight className={ar ? '' : 'rotate-180'} size={18} />{t.back}</button>{!hideNext && <Primary onClick={onNext}>{t.continue}<ChevronLeft className={ar ? '' : 'rotate-180'} size={18} /></Primary>}</div> }
function SummaryRow({ k, v }: any) { return <div className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="text-end font-bold">{v || '—'}</dd></div> }
function Badge({ text }: { text: string }) { return <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-200">{text}</span> }
function Alert({ children, kind }: { children: React.ReactNode; kind: 'error' | 'info' }) { return <div className={`rounded-xl p-3 text-sm ${kind === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-950' : 'bg-sky-50 text-sky-800 dark:bg-sky-950'}`}>{children}</div> }
function money(cents: number, ar: boolean) { return new Intl.NumberFormat(ar ? 'ar-EG' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(cents / 100) }
function remaining(order: Order, now: number, t: typeof messages.ar) { const left = Math.max(0, order.proofAvailableAt - now); const min = Math.floor(left / 60000); const sec = Math.floor(left % 60000 / 1000); return `${min} ${t.minutes} ${sec} ${t.seconds}` }
