'use client'

import SystemManagementService from './SystemManagementService'
import BasicOrderFlow from './BasicOrderFlow'
import EcosystemPanel from '../../../shared/EcosystemPanel'
import {safeHubReturn} from '../../../shared/hub-navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowLeft, ArrowRight, BadgeCheck, Blocks, Check, ChevronLeft, ChevronRight, CircleUserRound, Clock3, CreditCard, Globe2, KeyRound, Layers3, LogIn, LogOut, Mail, Monitor, Package, RotateCcw, ShieldCheck, Sparkles, Store, ShoppingCart, Utensils, Shirt, Refrigerator, Scale, CalendarDays } from 'lucide-react'

type Locale = 'ar' | 'en'
type HubUser = { id: string; email: string; name: string }
type Module = { id: string; nameAr: string; nameEn: string; descriptionAr: string; descriptionEn: string; availableFor: string[]; requires: string[]; conflicts: string[]; essential: boolean; recommendedFor: string[]; monthlyPrice: number | null; yearlyPrice: number | null; priceStatus: 'approved' | 'draft' }
type Catalog = { products: { id: string; nameAr: string; nameEn: string; descriptionAr: string; descriptionEn: string; available: boolean }[]; activities: { id: string; nameAr: string; nameEn: string; descriptionAr: string; descriptionEn: string }[]; modules: Module[]; billing: { monthly: number; yearly: number; currency: string }; commercialEnabled: boolean }
type Order = { id: string; orderNumber: string; snapshot: { product: string; activity: string; addons: { id: string; name: string }[]; period: string; total: number; note?: string; paymentMode?: string; plan?: string; transferSourcePhone?: string; activityId?: string }; status: string; createdAt: number; proofAvailableAt: number; updated_at?: number; proof_requested_at?: number; rejection_reason?: string; admin_note?: string }
type Subscription = { id: string; status: string; starts_at: number | null; expires_at: number | null; allowed_devices: number; snapshot: Order['snapshot'] }

const messages = {
  ar: { hub: 'دعيدر هب', systems: 'أنظمة إلكترونية', organize: 'نظّم ودير شغلك باحترافية', login: 'تسجيل الدخول', signup: 'إنشاء حساب', reset: 'استعادة كلمة المرور', name: 'الاسم', email: 'البريد الإلكتروني', password: 'كلمة المرور', passwordHint: '12 حرفًا على الأقل', continue: 'متابعة', back: 'رجوع', logout: 'تسجيل الخروج', account: 'أنظمتي واشتراكاتي', chooseSystem: 'اختر نظامك', systemsLead: 'أنظمة تساعدك تدير شغلك من مكان واحد.', soon: 'قريبًا', choose: 'اختر النظام', activity: 'اختر نشاطك', addons: 'خصص نظامك', devices: 'الأجهزة', summary: 'مراجعة الطلب', core: 'مشمولة وأساسية', suggested: 'مقترحة لنشاطك', draft: 'السعر قيد الاعتماد', monthly: 'شهري', yearly: 'سنوي', oneDevice: 'جهاز واحد', multipleDevices: 'جهازان أو أكثر — قريبًا', total: 'الإجمالي', order: 'إنشاء طلب اشتراك', demo: 'وضع تجربة فقط', demoInfo: 'البرنامج غير متاح للتسليم بعد. هذه رحلة تجريبية؛ لا تحوّل أموالًا ولا ترسل إثبات دفع.', payment: 'الدفع عبر InstaPay', copy: 'نسخ الرقم', copied: 'تم النسخ', wait: 'إتاحة زر المتابعة بعد', minutes: 'دقيقة', seconds: 'ثانية', demoProof: 'محاكاة طلب إرسال الإثبات', waitInfo: 'انتهاء العداد لا يؤكد وصول أي دفعة.', review: 'قيد المراجعة', reviewInfo: 'هذا اختبار لمسار المراجعة فقط. لم يتم إرسال واتساب أو إثبات دفع.', status: 'الحالة', awaiting_transfer: 'بانتظار التحويل', under_review: 'قيد المراجعة', needs_info: 'مطلوب معلومات إضافية', approved: 'تمت الموافقة', rejected: 'مرفوض', awaiting_activation: 'بانتظار توفر الإصدار والتفعيل', active: 'نشط', expired: 'منتهي', noOrders: 'لا توجد طلبات بعد.', retry: 'حاول مرة أخرى', send: 'إرسال', saving: 'جارٍ الحفظ…', cancel: 'إلغاء', accountHint: 'أنشئ حسابًا أو سجّل الدخول لمتابعة اختيارك.', signupGoogle: 'المتابعة باستخدام Google', googleOff: 'تسجيل Google سيتاح بعد إعداد مفاتيحه في Cloudflare.', resetSent: 'إذا كان البريد مسجلًا، ستصلك رسالة استعادة خلال دقائق.', releaseOff: 'التحميل غير متاح بعد. سنعرض رابطًا هنا بعد نشر إصدار فعلي.', downloads: 'التحميل والإصدارات', devicesLinked: 'الأجهزة المسموحة', renewal: 'التجديد', support: 'الدعم', transfer: 'طلب نقل الجهاز', subscriptions: 'الاشتراكات', orders: 'الطلبات', expires: 'تاريخ الانتهاء', notStarted: 'تبدأ مدة الاستخدام عند أول تفعيل ناجح لإصدار متاح.', pricing: 'التسعير', activityHint: 'اختر النشاط الأقرب لطريقة عملك.', select: 'تحديد', required: 'أساسي', draftPrice: 'إضافات اختيارية تظهر الآن كمسودات بلا سعر منشور.', provider: 'تحقق من اسم المستفيد داخل تطبيق الدفع قبل أي تحويل.', error: 'حدث خطأ. راجع اتصالك وحاول مرة أخرى.', resetLink: 'نسيت كلمة المرور؟', noAccount: 'ليس لديك حساب؟', hasAccount: 'لديك حساب بالفعل؟', continueWithGoogle: 'Google غير مفعّل بعد', closed: 'الشراء التجاري مغلق حاليًا', instapaySteps: 'حوّل المبلغ إلى InstaPay على رقم 01092912431. تأكد بنفسك من اسم المستفيد داخل تطبيق الدفع؛ لا تعتمد على اسم ظاهر هنا.', whatsapp: 'إرسال إثبات التحويل على واتساب', whatsappNote: 'يفتح واتساب بنص جاهز فقط. أرفق صورة التحويل داخل واتساب وأرسلها بنفسك؛ لا يتم إرفاق الصورة تلقائيًا.', realWait: 'تسجيل طلب إرسال الإثبات' },
  en: { hub: 'Daidar Hub', systems: 'Digital systems', organize: 'Organize and run your work professionally', login: 'Log in', signup: 'Create account', reset: 'Reset password', name: 'Name', email: 'Email', password: 'Password', passwordHint: 'At least 12 characters', continue: 'Continue', back: 'Back', logout: 'Log out', account: 'My systems and subscriptions', chooseSystem: 'Choose your system', systemsLead: 'Systems that help you run your work in one place.', soon: 'Coming soon', choose: 'Choose system', activity: 'Choose your business', addons: 'Customize your system', devices: 'Devices', summary: 'Review order', core: 'Included and essential', suggested: 'Recommended for your business', draft: 'Pricing pending approval', monthly: 'Monthly', yearly: 'Yearly', oneDevice: 'One device', multipleDevices: 'Two or more — coming soon', total: 'Total', order: 'Create subscription order', demo: 'Demo mode only', demoInfo: 'The software is not ready for delivery. This is a demo journey; do not transfer money or send payment proof.', payment: 'InstaPay payment', copy: 'Copy number', copied: 'Copied', wait: 'Continue in', minutes: 'min', seconds: 'sec', demoProof: 'Simulate proof request', waitInfo: 'The countdown ending does not confirm receipt of any payment.', review: 'Under review', reviewInfo: 'This tests the review path only. No WhatsApp message or payment proof was sent.', status: 'Status', awaiting_transfer: 'Awaiting transfer', under_review: 'Under review', needs_info: 'More information requested', approved: 'Approved', rejected: 'Rejected', awaiting_activation: 'Awaiting release and activation', active: 'Active', expired: 'Expired', noOrders: 'No orders yet.', retry: 'Try again', send: 'Submit', saving: 'Saving…', cancel: 'Cancel', accountHint: 'Create an account or log in to continue your saved choices.', signupGoogle: 'Continue with Google', googleOff: 'Google sign-in will be available after Cloudflare credentials are configured.', resetSent: 'If the address is registered, a reset link will arrive shortly.', releaseOff: 'Download is not available yet. A link will appear here when a real release is published.', downloads: 'Downloads and releases', devicesLinked: 'Allowed devices', renewal: 'Renewal', support: 'Support', transfer: 'Request device transfer', subscriptions: 'Subscriptions', orders: 'Orders', expires: 'Expiry date', notStarted: 'Usage starts on first successful activation when a release is available.', pricing: 'Pricing', activityHint: 'Choose the activity closest to how you work.', select: 'Select', required: 'Required', draftPrice: 'Optional add-ons are drafts with no published price yet.', provider: 'Verify the recipient name in your payment app before transferring.', error: 'Something went wrong. Check your connection and try again.', resetLink: 'Forgot password?', noAccount: 'Need an account?', hasAccount: 'Already have an account?', continueWithGoogle: 'Google is not enabled yet', closed: 'Commercial checkout is currently closed', instapaySteps: 'Transfer to InstaPay number 01092912431. Verify the recipient name inside your payment app; no name is displayed here.', whatsapp: 'Send transfer proof on WhatsApp', whatsappNote: 'WhatsApp opens with text only. Attach the transfer screenshot in WhatsApp and send it yourself; images are not attached automatically.', realWait: 'Record proof request' }
}

const activityIcons: Record<string, typeof Store> = { general: Store, supermarket: Package, restaurant: Utensils, clothing: Shirt, electronics: Refrigerator }
const steps = ['system', 'activity', 'addons', 'devices', 'summary'] as const

export default function HubPortal({ locale,entry,embedded=false }: { locale: Locale; entry?:'login'|'systems'; embedded?:boolean }) {
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
  const [view, setView] = useState<'home' | 'systems' | 'services'>(entry?'systems':'home')
  const [showAccount, setShowAccount] = useState(false)
  const [needsIdentityLink, setNeedsIdentityLink] = useState(false)
  const [showLegacyLogin, setShowLegacyLogin] = useState(false)

  const api = useCallback(async (path: string, body?: unknown) => {
    const res = await fetch(`/api/hub/${path}`, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || t.error)
    return data
  }, [t.error])

  const loadAccount = useCallback(async () => {
    const data = await api('session')
    setUser(data.user)
    setNeedsIdentityLink(!!data.linkRequired)
    if(data.user&&entry==='login'&&!new URLSearchParams(location.search).has('ecosystem_link')&&!new URLSearchParams(location.search).has('ecosystem_resume')){location.assign(safeHubReturn(new URLSearchParams(location.search).get('return_to'))||`/${locale}/hub/dashboard`);return}
    if(data.user&&new URLSearchParams(window.location.search).has('ecosystem_resume')){window.location.assign('/api/ecosystem/continue');return}
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
  }, [api,entry,locale])

  useEffect(() => {
    if(new URLSearchParams(location.search).get('mode')==='signup')setMode('signup')
    if(new URLSearchParams(window.location.search).has('ecosystem_resume')||new URLSearchParams(window.location.search).has('ecosystem_link')){setView('systems');setShowAccount(true)}
    const token = new URLSearchParams(window.location.search).get('token')
    if (token) { setView('systems'); setResetToken(token); setMode('set-password') }
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
      else { await api(mode === 'signup' ? 'signup' : 'login', { name: form.get('name'), email: form.get('email'), password: form.get('password'), link_identity:form.has('link_identity') }); await loadAccount(); setShowAccount(false) }
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
  if(entry==='login')return <AuthPanel {...{ar,t,mode,setMode,submitAuth,busy,error,notice,card,locale}} />

  return <div dir={ar ? 'rtl' : 'ltr'} className="min-h-screen bg-[#f4f9fd] px-4 py-6 text-slate-900 dark:bg-[#081424] dark:text-white sm:px-6 sm:py-8">
    <div className="mx-auto max-w-6xl">
      {!embedded&&<div className="mb-5"><EcosystemPanel system="hub" ar={ar}/></div>}
      <header hidden={embedded} className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div className="flex items-center gap-3 font-extrabold text-[#102d4e] dark:text-white"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-500 text-white"><Blocks /></span><span className="text-xl">{t.hub}<small className="block text-[10px] tracking-[0.2em] font-medium text-slate-500">DAIDAR HUB</small></span></div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={user && process.env.NEXT_PUBLIC_ECOSYSTEM_ENABLED === '1' ? new URL('/api/ecosystem/login?via=hub', process.env.NEXT_PUBLIC_MATJARI_URL || 'https://daidar-matjari-preview.pages.dev/').toString() : (process.env.NEXT_PUBLIC_MATJARI_URL || 'https://daidar-matjari-preview.pages.dev/')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm hover:from-emerald-700 hover:to-teal-700 transition"
            title={ar ? 'منصة متجري للمتاجر الإلكترونية' : 'Matjari E-commerce Platform'}
          >
            <Store size={17} />
            <span>{ar ? 'متجري' : 'Matjari'}</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white">{ar ? 'شغال الآن' : 'Live'}</span>
          </a>
          <button onClick={() => { setView('systems'); setShowAccount(true) }} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 dark:text-slate-300"><CircleUserRound className="me-2 inline" size={17} />{user ? t.account : t.login}</button>
          <a href={'/' + (ar ? 'en' : 'ar') + '/hub'} aria-label={ar ? 'Switch to English' : 'التبديل للعربية'} className="rounded-xl p-2 text-sm text-slate-500"><Globe2 size={18} /></a>
          <a href={'/' + locale} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"><LogOut size={17} />{ar ? 'العودة لموقع دعيدر' : 'Back to Daidar'}</a>
        </div>
      </header>

      {view === 'home' ? <HubDiscovery ar={ar} user={user} order={focusOrder} onChoose={() => { setFocusOrder(null); setView('systems'); setShowAccount(false); setStep('system') }} onAccount={() => { setView('systems'); setShowAccount(focusOrder?.snapshot.plan !== 'basic') }} onServices={() => setView('services')} /> : view === 'services' ? <SystemManagementService ar={ar} onBack={() => setView('home')} /> : <>
      <button onClick={() => { if(embedded){location.assign(`/${locale}/hub/services`);return}; setView('home'); setShowAccount(false) }} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-sky-700 dark:text-sky-300"><ChevronRight size={18} className={ar ? '' : 'rotate-180'} />{ar ? 'الأنظمة والخدمات' : 'Systems and services'}</button>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
        <section className="space-y-5">
          {!user ? <>{needsIdentityLink&&<section className={card+' p-6'}><h2 className="text-xl font-black">{ar?'تم الدخول — استكمل ربط حسابك القديم':'Signed in — connect your existing account'}</h2><p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{ar?'حساب Google متصل بالفعل. يوجد حساب هب سابق مرتبط بحساب دعيدر آخر، لذلك لن نطلب منك تسجيل Google مرة أخرى. افتح حساب متجري القديم، وحدد «ربط الحساب»، ثم أدخل بياناته مرة واحدة لضم أنظمته إلى حسابك الحالي.':'Your Google account is connected. An existing Hub account belongs to another Daidar identity. Open your existing Store account, select account linking, and verify its credentials once to connect its systems.'}</p><a href={new URL('/api/ecosystem/login?via=hub',process.env.NEXT_PUBLIC_MATJARI_URL||'https://daidar-matjari-preview.pages.dev/').toString()} className="mt-5 inline-flex rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white">{ar?'ربط حساب متجري القديم':'Connect my existing Store account'}</a><button type="button" onClick={()=>setShowLegacyLogin(v=>!v)} className="mt-4 block text-sm text-sky-700 underline">{ar?'لدي حساب هب بكلمة مرور':'I have a Hub account with a password'}</button></section>}{(!needsIdentityLink||showLegacyLogin)&&<AuthPanel {...{ ar, t, mode, setMode, submitAuth, busy, error, notice, card, locale }} />}</> : showAccount ? <AccountPanel {...{ ar, t, card, orders, subscriptions, releases, onOpenOrder: (order:Order) => { setFocusOrder({ ...order, orderNumber:order.orderNumber || (order as any).order_number }); setShowAccount(false) }, onRenew: (id:string) => { const sub=subscriptions.find((x:Subscription)=>x.id===id); setRenewSubscriptionId(id); if(sub){setActivityId((sub.snapshot as any).activityId||'');setAddons(((sub.snapshot as any).addons||[]).map((x:any)=>x.id))}; setShowAccount(false); setStep('system') } }} /> : <>
            <BasicOrderFlow key={focusOrder?.snapshot.plan === 'basic' ? focusOrder.id : 'new-basic'} ar={ar} initialOrder={focusOrder?.snapshot.plan === 'basic' ? focusOrder : null} onOrder={order => { setFocusOrder(order); setOrders(current => [order, ...current.filter(item => item.id !== order.id)]) }} />
          </>}
        </section>

        <aside className="space-y-5">
          {user && <div className={card + ' p-5'}><p className="font-bold">{user.name}</p><p className="mt-1 break-all text-sm text-slate-500">{user.email}</p><button onClick={() => setShowAccount(v => !v)} className="mt-4 text-sm font-bold text-sky-700 dark:text-sky-300">{showAccount ? t.chooseSystem : t.account}</button>{showAccount && <button onClick={logout} className="mt-4 block text-xs text-slate-500 underline">{t.logout}</button>}</div>}
          {showAccount && focusOrder && focusOrder.snapshot.plan !== 'basic' && <div className={`${card} p-5`}><h2 className="flex items-center gap-2 font-extrabold"><Clock3 className="text-sky-600" />{t.payment}</h2><p className="mt-3 text-xs font-bold text-slate-500">{focusOrder.snapshot.paymentMode === 'demo' ? t.demo : 'InstaPay'} · {focusOrder.orderNumber}</p>{focusOrder.snapshot.paymentMode === 'demo' ? <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">{t.demoInfo}</div> : <div className="mt-4 rounded-xl bg-sky-50 p-4 text-sm leading-6 dark:bg-sky-950/40"><p>{t.instapaySteps}</p><div className="mt-3 flex items-center justify-between rounded-lg border border-sky-200 bg-white p-3 dark:border-sky-900 dark:bg-slate-900"><b dir="ltr">01092912431</b><button onClick={() => navigator.clipboard.writeText('01092912431').then(() => setNotice(t.copied))} className="text-xs font-bold text-sky-700">{t.copy}</button></div></div>}<p className="mt-3 text-sm"><b>{t.status}:</b> {t[focusOrder.status as keyof typeof t] || focusOrder.status}</p>{focusOrder.status === 'under_review' && <p className="mt-2 rounded-xl bg-sky-50 p-3 text-sm dark:bg-sky-950/40">{focusOrder.snapshot.paymentMode === 'demo' ? t.reviewInfo : (ar ? 'طلبك قيد المراجعة. يرجى التأكد من إرسال صورة التحويل على واتساب.' : 'Your order is under review. Please make sure you sent the transfer image on WhatsApp.')}</p>}{focusOrder.status === 'awaiting_transfer' && <><div className="my-4 rounded-xl border border-slate-200 p-4 text-center dark:border-slate-700"><span className="text-sm text-slate-500">{t.wait}</span><div className="mt-1 text-3xl font-black tabular-nums text-sky-600">{remaining(focusOrder, clock, t)}</div></div><p className="mb-3 text-xs leading-5 text-slate-500">{t.waitInfo}</p>{focusOrder.snapshot.paymentMode !== 'demo' && <p className="mb-3 text-xs leading-5 text-slate-500">{t.whatsappNote}</p>}<button onClick={focusOrder.snapshot.paymentMode === 'demo' ? simulateProof : requestProof} disabled={busy || clock < focusOrder.proofAvailableAt} className="w-full rounded-xl bg-[#0c3156] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700">{busy ? t.saving : focusOrder.snapshot.paymentMode === 'demo' ? t.demoProof : t.whatsapp}</button></>}</div>}
        </aside>
      </div>
      </>}
      <p className="mt-6 border-t border-slate-200/70 py-5 text-center text-xs text-slate-400 dark:border-slate-800">{ar ? 'دعيدر هب · حلول أبسط، لشغل أفضل.' : 'Daidar Hub · Simple solutions. Better business.'}</p>
    </div>
  </div>
}

function HubDiscovery({ ar, user, order, onChoose, onAccount, onServices }: { ar: boolean; user: HubUser | null; order: Order | null; onChoose: () => void; onAccount: () => void; onServices: () => void }) {
  const Arrow = ar ? ArrowLeft : ArrowRight
  const matjariBase = process.env.NEXT_PUBLIC_MATJARI_URL || 'https://daidar-matjari-preview.pages.dev/'
  const matjariUrl = user && process.env.NEXT_PUBLIC_ECOSYSTEM_ENABLED === '1' ? new URL('/api/ecosystem/login?via=hub',matjariBase).toString() : matjariBase
  return <>
    <p className="mb-6 flex items-center gap-2 text-xs text-slate-500"><span>{ar ? 'الرئيسية' : 'Home'}</span><ChevronLeft size={13} className={ar ? '' : 'rotate-180'} /><span className="font-bold text-sky-700 dark:text-sky-300">{ar ? 'الأنظمة والخدمات' : 'Systems and services'}</span></p>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <main className="min-w-0 space-y-6">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-sky-600">{ar ? 'حلول دعيدر' : 'Daidar solutions'}</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">{ar ? 'اختار النظام المناسب لشغلك' : 'Choose the right system for your business'}</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{ar ? 'اعرف كل نظام بيعمل إيه، واختار اللي يناسب احتياجك.' : 'Explore each system and find what fits your needs.'}</p></div><span className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-950 sm:grid"><Layers3 /></span></div>
        <section className="relative grid overflow-hidden rounded-3xl bg-gradient-to-br from-[#082f52] via-[#0b4f78] to-[#0788c9] text-white sm:grid-cols-[1.1fr_.9fr]">
          <div className="relative z-10 p-6 sm:p-7"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs"><Sparkles size={14} />{ar ? 'اكتشف دعيدر فلو' : 'Discover Daidar Flow'}</span><h2 className="mt-4 text-2xl font-black leading-relaxed">{ar ? 'شغلك ماشي في مكان واحد' : 'Your business in one place'}</h2><p className="mt-2 text-sm leading-7 text-sky-100">{ar ? 'المبيعات والمخزون والكاشير. حل يجمع تفاصيل نشاطك التجاري في تجربة أبسط.' : 'Sales, inventory and point of sale. Bring your daily business together.'}</p><button type="button" onClick={onChoose} className="mt-5 inline-flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-[#0b4f78] hover:bg-sky-50">{ar ? 'استكشف النظام' : 'Explore system'}<Arrow size={17} /></button></div>
          <div className="relative flex items-center justify-center overflow-hidden px-8 pb-8 pt-3 sm:py-8"><div aria-hidden="true" className="absolute h-64 w-64 rounded-full border border-white/10 shadow-[0_0_0_30px_rgba(255,255,255,.03),0_0_0_60px_rgba(255,255,255,.02)]" /><SystemPreviewArtwork ar={ar} /></div>
        </section>
        <section><div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-lg font-extrabold">{ar ? 'استكشف حسب احتياجك' : 'Explore by need'}</h2><p className="mt-1 text-xs text-slate-500">{ar ? 'حلول بنطوّرها خطوة بخطوة لشغلك' : 'Solutions that grow with your business'}</p></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <a href={matjariUrl} target="_blank" rel="noopener noreferrer" className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/70 p-4 text-start transition hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-emerald-800 dark:bg-emerald-950/40 motion-reduce:transform-none"><Store size={22} className="shrink-0 text-emerald-600" /><span className="min-w-0 flex-1"><div className="flex items-center justify-between gap-1"><strong className="block text-sm text-slate-900 dark:text-white">{ar ? 'متجري' : 'Matjari'}</strong><span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{ar ? 'شغال الآن' : 'Live'}</span></div><small className="mt-1 block text-xs text-slate-500">{ar ? 'متاجر إلكترونية وطلبات واتساب' : 'E-commerce & WhatsApp orders'}</small><span className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">{ar ? 'الدخول إلى متجري' : 'Open Matjari'}<Arrow size={14} className="shrink-0" /></span></span></a>
          <button type="button" onClick={onChoose} className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-sky-300 bg-sky-50 p-4 text-start transition hover:-translate-y-0.5 hover:border-sky-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-sky-800 dark:bg-sky-950/40 motion-reduce:transform-none"><Store size={22} className="shrink-0 text-sky-600" /><span className="min-w-0 flex-1"><strong className="block text-sm">{ar ? 'البيع والمخزون' : 'Sales & inventory'}</strong><small className="mt-1 block text-xs text-slate-500">{ar ? 'للمحلات والأنشطة التجارية' : 'For stores and retailers'}</small><span className="mt-3 inline-flex items-center gap-2 text-xs font-extrabold text-sky-700 dark:text-sky-300">{ar ? 'اختيار نشاطك' : 'Choose your business'}<Arrow size={15} className="shrink-0" /></span></span></button>
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><CircleUserRound size={22} className="shrink-0 text-slate-400" /><span><strong className="block text-sm">{ar ? 'العملاء والمبيعات' : 'Customers & sales'}</strong><small className="mt-1 block text-xs text-slate-500">{ar ? 'أنظمة جديدة تُضاف لاحقًا' : 'More systems to come'}</small></span></div>
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><CircleUserRound size={22} className="shrink-0 text-sky-600" /><span><strong className="block text-sm">{ar ? 'إدارة فريقك' : 'Team management'}</strong><small className="mt-1 block text-xs text-slate-500">{ar ? 'نظّم فريقك وعملياتك' : 'Organize your team and operations'}</small><small className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800">{ar ? 'قريبًا' : 'Coming soon'}</small></span></div>
        </div></section>
        <article className="grid overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm dark:border-emerald-800 dark:bg-slate-900 sm:grid-cols-[.8fr_1.2fr]"><div className="flex min-h-48 flex-col items-center justify-center bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-8 text-white"><span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/20 text-white backdrop-blur shadow-inner"><Store size={36} /></span><span className="mt-3 rounded-full bg-white/20 px-3 py-1 text-xs font-black tracking-wide text-white">{ar ? 'منصة متجري السحابية' : 'Matjari Cloud Platform'}</span></div><div className="p-6"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{ar ? 'المتاجر الإلكترونية وطلبات الواتساب' : 'E-Commerce & Cloud Stores'}</span><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />{ar ? 'شغال ومباشر' : 'Live & Active'}</span></div><h2 className="mt-2 text-xl font-black">{ar ? 'متجري · أنشئ متجرك الإلكتروني المستقل' : 'Matjari · Launch Your Independent Online Store'}</h2><p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">{ar ? 'منصة سحابية متكاملة تتيح للتجار إنشاء وإدارة متاجرهم، عرض المنتجات، واستقبال طلبات الزبائن مباشرة على الواتساب مع لوحة تحكم وإحصائيات دقيقة عبر Cloudflare D1.' : 'A complete multi-vendor platform for merchants to manage storefronts, list products, and receive direct WhatsApp customer orders backed by Cloudflare D1 analytics.'}</p><div className="my-4 flex flex-wrap gap-2">{(ar ? ['طلبات واتساب مباشرة', 'لوحة تحكم التاجر', 'إحصائيات Cloudflare D1', 'معاينة فورية'] : ['WhatsApp Orders', 'Merchant Dashboard', 'Cloudflare D1 Analytics', 'Live Preview']).map(label => <span key={label} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">{label}</span>)}</div><div className="flex flex-wrap items-center gap-3"><a href={matjariUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition"><Store size={16} />{ar ? 'فتح موقع متجري' : 'Open Matjari'}<Arrow size={16} /></a><a href={user && process.env.NEXT_PUBLIC_ECOSYSTEM_ENABLED === '1' ? matjariUrl : `${matjariBase}?view=merchant_login`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><CircleUserRound size={16} />{ar ? 'لوحة تحكم التاجر' : 'Merchant Portal'}</a></div></div></article>
        <article className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-[.8fr_1.2fr]"><div className="flex min-h-48 items-center justify-center bg-gradient-to-br from-sky-50 to-cyan-100 p-8 dark:from-slate-800 dark:to-sky-950"><SystemPreviewArtwork ar={ar} /></div><div className="p-6"><span className="text-xs font-bold text-sky-600">{ar ? 'نظام المبيعات والمخزون' : 'Sales and inventory system'}</span><h2 className="mt-2 text-xl font-black">{ar ? 'دعيدر فلو' : 'Daidar Flow'}</h2><p className="mt-2 text-sm leading-7 text-slate-500">{ar ? 'تعرّف على نظام المبيعات والمخزون والكاشير، وحدد نشاطك والإضافات المناسبة لك.' : 'Explore sales, inventory and point of sale, then choose your business type and add-ons.'}</p><div className="my-4 flex flex-wrap gap-2">{(ar ? ['نقطة بيع','مخزون','تقارير'] : ['Point of sale','Inventory','Reports']).map(label => <span key={label} className="rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{label}</span>)}</div><button type="button" onClick={onChoose} className="inline-flex items-center gap-3 rounded-xl border border-sky-300 px-4 py-2.5 text-sm font-bold text-sky-700 dark:text-sky-300">{ar ? 'اعرف تفاصيل النظام' : 'Explore system details'}<Arrow size={16} /></button></div></article>
        <button type="button" onClick={onServices} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-start text-sm dark:border-slate-700 dark:bg-slate-900"><span><strong className="block">{ar ? 'خدمة إدارة السيستم' : 'System management service'}</strong><small className="mt-1 block text-slate-500">{ar ? 'مساعدة عملية في تشغيل بياناتك وأنظمتك' : 'Practical support for your data and systems'}</small></span><Arrow size={18} className="text-sky-600" /></button>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-sky-50 p-4 dark:bg-sky-950/40"><Mail className="text-sky-600" /><div className="flex-1"><b className="text-sm">{ar ? 'مش متأكد تبدأ بإيه؟' : 'Not sure where to start?'}</b><p className="mt-1 text-xs text-slate-500">{ar ? 'فريقنا يساعدك تختار الحل المناسب لطبيعة شغلك.' : 'Our team can help you find the right fit.'}</p></div><a href="https://wa.me/201092912431" target="_blank" rel="noreferrer" className="text-sm font-bold text-sky-700 dark:text-sky-300">{ar ? 'اسألنا ←' : 'Talk to us →'}</a></div>
      </main>
      <aside className="space-y-4"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><span className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950"><CircleUserRound size={21} /></span><h2 className="text-sm font-extrabold">{ar ? 'حسابك' : 'Your account'}</h2>{user ? <><p className="mt-3 text-sm font-bold">{user.name}</p><p className="mt-1 break-all text-xs text-slate-500">{user.email}</p></> : <p className="mt-3 text-sm leading-6 text-slate-500">{ar ? 'سجّل الدخول لحفظ اختياراتك ومتابعة اشتراكاتك.' : 'Sign in to save your choices and manage subscriptions.'}</p>}<button type="button" onClick={onAccount} className="mt-4 text-sm font-bold text-sky-700 dark:text-sky-300">{user ? (ar ? 'أنظمتي واشتراكاتي ←' : 'My subscriptions →') : (ar ? 'تسجيل الدخول ←' : 'Sign in →')}</button></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h2 className="flex items-center gap-2 text-sm font-extrabold"><CreditCard size={20} className="text-sky-600" />{ar ? 'طلب الاشتراك' : 'Subscription order'}</h2>{order ? <><span className="mt-4 inline-block rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-200">{messages[ar ? 'ar' : 'en'][order.status as keyof typeof messages.ar] || order.status}</span><p className="mt-3 text-sm font-bold">{order.snapshot.product}</p><p className="mt-1 text-xs text-slate-500">{order.orderNumber}</p><button type="button" onClick={onAccount} className="mt-4 w-full rounded-xl bg-[#0b3157] px-4 py-3 text-sm font-bold text-white">{ar ? 'متابعة الطلب' : 'Track order'}</button></> : <p className="mt-3 text-sm leading-7 text-slate-500">{ar ? 'هتلاقي طلبك هنا بعد اختيار النظام واستكمال خطواته.' : 'Your order will appear here after you complete the setup.'}</p>}</section><p className="flex gap-2 px-2 text-xs leading-6 text-slate-500"><ShieldCheck size={17} className="mt-1 shrink-0 text-emerald-600" />{ar ? 'التوفر والأسعار وحالة التجربة موضّحة داخل كل نظام قبل تأكيد الطلب.' : 'Availability, pricing and demo status are shown before confirming an order.'}</p></aside>
    </div>
  </>
}

function AuthPanel({ ar, t, mode, setMode, submitAuth, busy, error, notice, card, locale = 'ar', compact = false }: any) {
  const [tag, setTag] = useState(0)
  useEffect(() => { const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; if (reduce) return; const timer = setInterval(() => setTag(v => (v + 1) % 2), 4200); return () => clearInterval(timer) }, [])
  return <section className={`${card} p-5 sm:p-7`}>
    <div className="mb-5 min-h-12 overflow-hidden rounded-xl bg-sky-50 px-4 py-3 dark:bg-sky-950/40"><div key={tag} className="flex animate-hub-swap items-center gap-3 font-bold text-[#0c3156] dark:text-sky-200"><span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900">{tag ? <Activity size={18} /> : <Blocks size={18} />}</span>{tag ? t.organize : t.systems}</div></div>
    <h2 className="text-2xl font-black">{mode === 'login' ? t.login : mode === 'signup' ? t.signup : mode === 'set-password' ? (ar ? 'اختيار كلمة مرور جديدة' : 'Choose a new password') : t.reset}</h2><p className="mt-1 text-sm text-slate-500">{t.accountHint}</p>
    <a href={process.env.NEXT_PUBLIC_ECOSYSTEM_ENABLED==='1'?`/api/ecosystem/google?return_to=${encodeURIComponent(safeHubReturn(typeof window!=='undefined'?new URLSearchParams(location.search).get('return_to'):null)||`/${locale}/hub/dashboard`)}`:`/api/hub/google?locale=${locale}`} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 font-bold dark:border-slate-700"><span className="font-black text-lg">G</span>{t.signupGoogle}</a>
    <form className="mt-5 space-y-3" onSubmit={submitAuth}>{mode === "login" && <label className="flex items-start gap-2 text-xs leading-6 text-slate-500"><input type="checkbox" name="link_identity"/>{ar?"ربط حساب دعيدر القديم وأنظمته بحسابي الحالي بعد إثبات كلمة المرور":"Connect my existing Daidar account and its systems after verifying its password"}</label>}{mode === 'signup' && <Field label={t.name} name="name" icon={<CircleUserRound size={17} />} required minLength={2} />}{mode === 'reset' && <p className="text-sm text-slate-500">{t.resetSent}</p>}{mode !== 'set-password' && <Field label={t.email} name="email" type="email" icon={<Mail size={17} />} required />}{mode !== 'reset' && <Field label={mode === 'set-password' ? (ar ? 'كلمة المرور الجديدة' : 'New password') : t.password} name="password" type="password" icon={<KeyRound size={17} />} required minLength={12} autoComplete={mode === 'signup' || mode === 'set-password' ? 'new-password' : 'current-password'} placeholder={t.passwordHint} />}<div className="min-h-5">{error && <span className="text-sm text-red-600">{error}</span>}{notice && <span className="text-sm text-emerald-700">{notice}</span>}</div><button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 font-bold text-white disabled:opacity-60">{busy ? t.saving : mode === 'reset' ? t.send : mode === 'set-password' ? t.continue : t.continue}<LogIn size={17} /></button></form>
    <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">{mode === 'login' && <button onClick={() => { setMode('reset') }} className="text-sky-700 underline dark:text-sky-300">{t.resetLink}</button>}{(mode === 'login' || mode === 'signup') && <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-sky-700 underline dark:text-sky-300">{mode === 'login' ? t.noAccount : t.hasAccount} {mode === 'login' ? t.signup : t.login}</button>}{(mode === 'reset' || mode === 'set-password') && <button onClick={() => setMode('login')} className="text-sky-700 underline dark:text-sky-300">{t.back}</button>}</div>
  </section>
}
function AccountPanel({ ar, t, card, orders, subscriptions, releases, onRenew, onOpenOrder }: any) {
  const [transferReason, setTransferReason] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  async function requestTransfer(id: string) { setLoading(true); try { const r = await fetch('/api/hub/transfer-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriptionId: id, reason: transferReason }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setMessage(ar ? 'تم تسجيل طلب نقل الجهاز.' : 'Device transfer request submitted.') } catch (e) { setMessage(e instanceof Error ? e.message : t.error) } finally { setLoading(false) } }
  return <section className={`${card} p-6 sm:p-8`}><StepTitle icon={<CircleUserRound />} title={t.account} subtitle={t.subscriptions} /><div className="mt-6"><h3 className="font-extrabold">{t.orders}</h3>{orders.length ? <div className="mt-3 space-y-3">{orders.map((o: Order) => <article key={o.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex flex-wrap items-center justify-between gap-2"><b>{o.orderNumber}</b><Badge text={t[o.status as keyof typeof t] || o.status} /></div><p className="mt-2 text-sm text-slate-500">{o.snapshot.product} · {o.snapshot.activity} · {money(o.snapshot.total, ar)} {ar ? 'جنيه' : 'EGP'}</p>{o.snapshot.plan === 'basic' && <button type="button" onClick={() => onOpenOrder(o)} className="mt-3 rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white">{ar ? 'متابعة الطلب' : 'Continue order'}</button>}{o.rejection_reason && <p className="mt-2 text-sm text-red-600">{o.rejection_reason}</p>}{o.admin_note && <p className="mt-2 text-sm text-sky-700">{o.admin_note}</p>}</article>)}</div> : <p className="mt-2 text-sm text-slate-500">{t.noOrders}</p>}</div><div className="mt-7"><h3 className="font-extrabold">{t.subscriptions}</h3>{subscriptions.length ? <div className="mt-3 space-y-3">{subscriptions.map((s: Subscription) => <article key={s.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex flex-wrap items-center justify-between gap-2"><b>{s.snapshot.product}</b><Badge text={t[s.status as keyof typeof t] || s.status} /></div><p className="mt-2 text-sm text-slate-500">{s.snapshot.activity} · {t.devicesLinked}: {s.allowed_devices}</p><p className="mt-1 text-sm text-slate-500">{t.expires}: {s.expires_at ? new Date(s.expires_at).toLocaleDateString(ar ? 'ar-EG' : 'en-US') : t.notStarted}</p><div className="mt-3 rounded-lg bg-sky-50 p-3 text-sm dark:bg-sky-950/40">{s.status === 'awaiting_activation' ? t.notStarted : t.releaseOff}</div>{releases.map((r:{id:string;version:string;filename:string})=><a key={r.id} href={`/api/hub/download/${r.id}`} className="mt-3 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white">{t.downloads} · {r.version}</a>)}{s.status === 'active' && <a href={`/api/hub/license/${s.id}`} className="mt-2 inline-flex rounded-lg border border-sky-600 px-4 py-2 text-sm font-bold text-sky-700">{ar ? 'تنزيل ملف الرخصة' : 'Download license file'}</a>}<button onClick={() => onRenew(s.id)} className="mt-3 block rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white">{t.renewal}</button><div className="mt-4 flex gap-2"><input value={transferReason} onChange={e => setTransferReason(e.target.value)} placeholder={ar ? 'سبب نقل الجهاز' : 'Reason for transfer'} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-700" /><button disabled={loading || transferReason.length < 5} onClick={() => requestTransfer(s.id)} className="rounded-lg border border-slate-200 px-3 text-sm font-bold disabled:opacity-50 dark:border-slate-700">{t.transfer}</button></div></article>)}</div> : <p className="mt-2 text-sm text-slate-500">{t.noOrders}</p>}</div>{message && <p className="mt-4 text-sm text-sky-700">{message}</p>}</section>
}
function Field({ label, name, type = 'text', icon, ...props }: any) { return <label className="block"><span className="mb-1 block text-sm font-bold">{label}</span><span className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 dark:border-slate-700"><span className="text-slate-400">{icon}</span><input name={name} type={type} className="min-w-0 flex-1 bg-transparent py-3 outline-none" {...props} /></span></label> }
function StepTitle({ icon, title, subtitle }: any) { return <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">{icon}</span><span><h2 className="text-xl font-black">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></span></div> }
function Primary({ children, disabled, onClick }: any) { return <button onClick={onClick} disabled={disabled} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-bold text-white disabled:opacity-50">{children}</button> }
function StepActions({ ar, t, onBack, onNext, hideNext }: any) { return <div className="mt-7 flex justify-between"><button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 font-bold dark:border-slate-700"><ChevronRight className={ar ? '' : 'rotate-180'} size={18} />{t.back}</button>{!hideNext && <Primary onClick={onNext}>{t.continue}<ChevronLeft className={ar ? '' : 'rotate-180'} size={18} /></Primary>}</div> }
function SummaryRow({ k, v }: any) { return <div className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="text-end font-bold">{v || '—'}</dd></div> }
function Badge({ text }: { text: string }) { return <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-200">{text}</span> }
function Alert({ children, kind }: { children: React.ReactNode; kind: 'error' | 'info' }) { return <div className={`rounded-xl p-3 text-sm ${kind === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-950' : 'bg-sky-50 text-sky-800 dark:bg-sky-950'}`}>{children}</div> }
function SystemPreviewArtwork({ ar }: { ar: boolean }) {
  return <div aria-label={ar ? 'معاينة توضيحية لنظام المبيعات والمخزون' : 'Illustration of a sales and inventory system'} role="img" className="relative w-full max-w-[290px] -rotate-2 rounded-xl border border-white/70 bg-slate-50 p-3 text-slate-800 shadow-2xl shadow-slate-950/30 sm:max-w-[320px]">
    <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2"><span className="h-2 w-2 rounded-full bg-rose-300" /><span className="h-2 w-2 rounded-full bg-amber-300" /><span className="h-2 w-2 rounded-full bg-emerald-300" /><span className="ms-auto text-[9px] font-bold text-slate-600">{ar ? 'معاينة توضيحية · ملخص المبيعات' : 'Illustration · Sales overview'}</span></div>
    <div className="mt-2 flex items-end justify-between gap-2"><div><span className="block text-[9px] text-slate-500">{ar ? 'حركة المبيعات' : 'Sales activity'}</span><strong className="mt-0.5 block text-sm font-extrabold text-[#103453]">{ar ? 'متابعة من مكان واحد' : 'One clear overview'}</strong></div><span className="rounded-md bg-sky-50 px-1.5 py-1 text-[8px] font-bold text-sky-700">{ar ? 'مبيعات' : 'Sales'}</span></div>
    <div className="mt-2 flex h-12 items-end gap-1 border-b border-slate-200 px-1">{[34, 56, 42, 71, 49, 88, 64, 76, 52, 92, 69, 82].map((height, index) => <span key={index} className="flex-1 rounded-t-sm bg-sky-500/80" style={{ height: `${height}%`, opacity: .48 + index * .04 }} />)}</div>
    <div className="mt-2 flex justify-between gap-1 text-[8px] text-slate-500"><span className="flex items-center gap-1"><Store size={11} />{ar ? 'نقطة البيع' : 'Point of sale'}</span><span className="flex items-center gap-1"><Package size={11} />{ar ? 'المخزون' : 'Inventory'}</span><span className="flex items-center gap-1"><ShoppingCart size={11} />{ar ? 'الفواتير' : 'Orders'}</span></div>
    <span className="absolute -bottom-3 -end-3 grid h-9 w-9 place-items-center rounded-xl bg-white text-sky-700 shadow-lg"><Package size={18} /></span>
  </div>
}
function money(cents: number, ar: boolean) { return new Intl.NumberFormat(ar ? 'ar-EG' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(cents / 100) }
function remaining(order: Order, now: number, t: typeof messages.ar) { const left = Math.max(0, order.proofAvailableAt - now); const min = Math.floor(left / 60000); const sec = Math.floor(left % 60000 / 1000); return `${min} ${t.minutes} ${sec} ${t.seconds}` }
