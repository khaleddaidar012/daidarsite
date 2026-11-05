'use client'
import { useEffect, useState, type FormEvent } from 'react'
import { Clock3, FolderKanban, CreditCard, Database, CalendarDays, WalletCards, MessageCircle, Store, BarChart3 } from 'lucide-react'
import { action, field, callApi, currentMonth, AttendanceTable, time, statusLabel, type Employee, type RecordRow, type EmployeeRequest } from './shared'
import StaffChat from '@/components/shared/StaffChat'
import ChatUnreadBadge from '@/components/shared/ChatUnreadBadge'
import ProjectTracker from '@/components/shared/ProjectTracker'
import CheckoutDialog from './CheckoutDialog'
import EmployeeProjectManager from './EmployeeProjectManager'
import HubManualSubscriptionManager from '@/components/shared/HubManualSubscriptionManager'
import PasswordVault from '@/components/admin/PasswordVault'
import D1UsageDashboard from '@/components/admin/D1UsageDashboard'
import EmployeeStoreManager from './EmployeeStoreManager'
import EmployeeEcosystemStats from './EmployeeEcosystemStats'
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }> }
function decodeVapidKey(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(normalized + '='.repeat((4 - normalized.length % 4) % 4)), char => char.charCodeAt(0))
}
function subscriptionUsesKey(subscription: PushSubscription, key: Uint8Array) {
  const stored = subscription.options.applicationServerKey
  if (!stored) return false
  const bytes = new Uint8Array(stored)
  return bytes.length === key.length && bytes.every((byte, index) => byte === key[index])
}
export default function EmployeeDashboard() {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [month, setMonth] = useState(currentMonth)
  const [rows, setRows] = useState<RecordRow[]>([])
  const [payroll, setPayroll] = useState<{ absent_days?: number; absent_dates?: string[]; due_piasters?: number; actual_hours?: number; paid_hours?: number; max_daily_hours?: number; max_monthly_hours?: number; hourly_rate_piasters?: number } | null>(null)
  const [requests, setRequests] = useState<EmployeeRequest[]>([])
  const [shiftChangeRequestsUsed, setShiftChangeRequestsUsed] = useState(0)
  const [open, setOpen] = useState<RecordRow | null>(null)
  const [today, setToday] = useState<RecordRow | null>(null)
  const [serverDay, setServerDay] = useState('')
  const [checkInWindow, setCheckInWindow] = useState<{ allowed: boolean; windows: Array<{ start: string; end: string }> } | null>(null)
  const [revision, setRevision] = useState(0)
  const [presencePrompt, setPresencePrompt] = useState<{shift_id:string;stage:number;deadline:number;test?:boolean}|null>(null)
  const [presenceCountdown, setPresenceCountdown] = useState(60)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [showInPagePrompts, setShowInPagePrompts] = useState(true)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [checkoutShift, setCheckoutShift] = useState<RecordRow | null>(null)
  const [pendingCheckoutShiftId, setPendingCheckoutShiftId] = useState('')
  const [requestType, setRequestType] = useState<'leave' | 'early' | 'shift_change'>('leave')
  const [reportLoading, setReportLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'tracking' | 'attendance' | 'projects' | 'hub' | 'databases' | 'passwords' | 'stores' | 'ecosystem-stats'>('attendance')
  function fail(e: Error & { status?: number }) { setError(e.message); if (e.status === 401) setEmployee(null) }
  useEffect(() => { callApi('employee', 'session').then(data => setEmployee(data.employee)).catch(e => { if (e.status !== 401) setError(e.message) }).finally(() => setLoading(false)) }, [])
  useEffect(() => { setShowInPagePrompts(localStorage.getItem('daidar_employee_in_page_prompts') !== 'off') }, [])
  useEffect(() => {
    if (!employee || !('serviceWorker' in navigator)) return
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'employee-checkout-request' && typeof event.data.shift_id === 'string') {
        setPendingCheckoutShiftId(event.data.shift_id)
        setReportLoading(true)
        setRevision(n => n + 1)
        setNotice('اكتب إنجازات ورديتك لإتمام الانصراف.')
        return
      }
      if (event.data?.type !== 'employee-notification-test-response') return
      setPresencePrompt(null)
      const stage = Math.min(3, Math.max(1, Number(event.data.stage) || 1))
      const response = event.data.response === 'here' ? 'موجود · كمل' : event.data.response === 'away' ? 'انصراف' : 'فتح الإشعار'
      setNotice(`تم تسجيل «${response}» في اختبار التنبيه ${stage}. لم يتغير سجل الحضور أو المرتب.`)
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    const params = new URLSearchParams(window.location.search)
    const checkoutRequest = params.get('checkoutRequest')
    if (checkoutRequest && checkoutRequest.length <= 80) {
      setPendingCheckoutShiftId(checkoutRequest)
      setReportLoading(true)
      setRevision(n => n + 1)
      setNotice('اكتب إنجازات ورديتك لإتمام الانصراف.')
      window.history.replaceState({}, '', window.location.pathname)
    }
    const testStage = Number(params.get('notificationTest'))
    const testResponse = params.get('response')
    if (testStage >= 1 && testStage <= 3 && ['here', 'away', 'opened'].includes(testResponse || '')) {
      const response = testResponse === 'here' ? 'موجود · كمل' : testResponse === 'away' ? 'انصراف' : 'فتح الإشعار'
      setNotice(`تم تسجيل «${response}» في اختبار التنبيه ${testStage}. لم يتغير سجل الحضور أو المرتب.`)
      window.history.replaceState({}, '', window.location.pathname)
    }
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [employee])
  useEffect(() => {
    if (!employee || !pendingCheckoutShiftId || reportLoading) return
    if (open?.id === pendingCheckoutShiftId) {
      setCheckoutShift(open)
      setPendingCheckoutShiftId('')
    } else {
      setNotice('لم نتمكن من العثور على وردية مفتوحة. حدّث الصفحة وتحقق من سجل الحضور.')
      setPendingCheckoutShiftId('')
    }
  }, [employee, pendingCheckoutShiftId, open?.id, reportLoading])
  useEffect(() => {
    const installed = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & {standalone?:boolean}).standalone)
    setIsInstalled(installed)
    const onInstallPrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent) }
    const onInstalled = () => { setIsInstalled(true); setInstallPrompt(null); setNotice('تم تثبيت تطبيق الموظفين على جهازك.') }
    window.addEventListener('beforeinstallprompt', onInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => { window.removeEventListener('beforeinstallprompt', onInstallPrompt); window.removeEventListener('appinstalled', onInstalled) }
  }, [])
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/employee-sw.js', { scope: '/' }).then(async registration => {
      if (!employee) return
      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) { setPushEnabled(false); return }
      const config = await callApi('employee', 'push-config')
      const key = decodeVapidKey(config.publicKey)
      if (subscriptionUsesKey(subscription, key)) {
        await callApi('employee', 'push-subscription', 'POST', subscription.toJSON())
        setPushEnabled(true)
        return
      }
      await callApi('employee', 'push-subscription', 'DELETE', { endpoint: subscription.endpoint })
      await subscription.unsubscribe()
      setPushEnabled(false)
      if ('Notification' in window && Notification.permission === 'granted') {
        const refreshed = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
        await callApi('employee', 'push-subscription', 'POST', refreshed.toJSON())
        setPushEnabled(true)
        setNotice('تم تحديث اشتراك إشعارات النظام لهذا الجهاز.')
      }
    }).catch(() => {
      setPushEnabled(false)
      if (employee) setNotice('تعذر تهيئة إشعارات الخلفية. اضغط «تفعيل إشعارات النظام» لإعادة ربط هذا الجهاز.')
    })
  }, [employee])
  useEffect(() => {
    if (!employee) return
    let active = true; setReportLoading(true)
    Promise.all([callApi('employee', `attendance?month=${month}`), callApi('employee', `requests?month=${month}`)]).then(([a, r]) => { if (active) { setRows(a.records); setOpen(a.open); setToday(a.today); setServerDay(a.serverDay); setCheckInWindow(a.checkIn || null); setPayroll(a.payroll); setRequests(r.requests); setShiftChangeRequestsUsed(r.shift_change_requests_used || 0) } }).catch(e => { if (active) fail(e) }).finally(() => { if (active) setReportLoading(false) })
    return () => { active = false }
  }, [employee, month, revision])
  useEffect(() => {
    if (!employee || !open) { setPresencePrompt(null); return }
    let live = true
    const check = async () => {
      try {
        const data = await callApi('employee', 'presence-check')
        if (!live) return
        if (data.prompt) {
          if (showInPagePrompts || !pushEnabled || data.prompt.delivery_failed) setPresencePrompt(data.prompt)
          else setPresencePrompt(null)
        } else if (data.closed) {
          setPresencePrompt(null); setRevision(n => n + 1); setNotice('انتهت الوردية وتم تحديث سجل الحضور.')
        }
      } catch { /* Attendance screen can still be used if this optional prompt endpoint is unavailable. */ }
    }
    void check()
    const timer = window.setInterval(() => void check(), 30000)
    return () => { live = false; window.clearInterval(timer) }
  }, [employee, open?.id, revision, presencePrompt?.deadline, showInPagePrompts, pushEnabled])
  useEffect(() => {
    if (!presencePrompt) { setPresenceCountdown(60); return }
    let expired = false
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((presencePrompt.deadline - Date.now()) / 1000))
      setPresenceCountdown(seconds)
      if (seconds === 0 && !expired) {
        expired = true
        setPresencePrompt(null)
        if (presencePrompt.test) setNotice(`انتهت دقيقة اختبار التنبيه ${presencePrompt.stage}، ولم يتغير سجل الحضور أو المرتب.`)
        setRevision(n => n + 1)
      }
    }
    tick()
    const timer = window.setInterval(tick, 250)
    return () => window.clearInterval(timer)
  }, [presencePrompt?.deadline])
  async function answerPresence(response: 'here'|'away') {
    if (!presencePrompt) return
    if (presencePrompt.test) {
      const stage = presencePrompt.stage
      if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(registration => registration.getNotifications({ tag: `attendance-test-${stage}` }).then(notifications => notifications.forEach(notification => notification.close()))).catch(() => {})
      setPresencePrompt(null)
      setNotice(`تم تسجيل «${response === 'here' ? 'موجود · كمل' : 'انصراف'}» في اختبار التنبيه ${stage}. لم يتغير سجل الحضور أو المرتب.`)
      return
    }
    if (response === 'away') {
      const shift = open?.id === presencePrompt.shift_id ? open : null
      if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(registration => registration.getNotifications({ tag: `attendance-${presencePrompt.shift_id}` }).then(notifications => notifications.forEach(notification => notification.close()))).catch(() => {})
      setPresencePrompt(null)
      if (shift) setCheckoutShift(shift)
      else { setPendingCheckoutShiftId(presencePrompt.shift_id); setRevision(n => n + 1) }
      setNotice('اكتب إنجازات ورديتك في النافذة لإتمام الانصراف.')
      return
    }
    setBusy(true)
    try { await callApi('employee', 'presence-response', 'POST', { shift_id: presencePrompt.shift_id, response }); if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(registration => registration.getNotifications({ tag: `attendance-${presencePrompt.shift_id}` }).then(notifications => notifications.forEach(notification => notification.close()))).catch(() => {}); setPresencePrompt(null); setRevision(n => n + 1); setNotice(response === 'here' ? 'تم تأكيد وجودك. سيظهر التنبيه التالي بعد ساعة.' : 'تم تسجيل انصرافك.') }
    catch (e) { fail(e as Error) } finally { setBusy(false) }
  }
  async function enablePush() {
    setBusy(true); setError('')
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw new Error('متصفحك لا يدعم إشعارات الخلفية. جرّب Chrome أو Edge على الكمبيوتر.')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') throw new Error('اسمح بإشعارات دعيدر من إعدادات المتصفح ثم حاول مرة أخرى.')
      const config = await callApi('employee', 'push-config')
      const registration = await navigator.serviceWorker.register('/employee-sw.js', { scope: '/' })
      await navigator.serviceWorker.ready
      const key = decodeVapidKey(config.publicKey)
      let subscription = await registration.pushManager.getSubscription()
      if (subscription && !subscriptionUsesKey(subscription, key)) {
        await callApi('employee', 'push-subscription', 'DELETE', { endpoint: subscription.endpoint })
        await subscription.unsubscribe()
        subscription = null
      }
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
      await callApi('employee', 'push-subscription', 'POST', subscription.toJSON())
      setPushEnabled(true); setNotice('اتفعّلت إشعارات النظام. تقدر ترد من زر الإشعار دون فتح الصفحة.')
    } catch (e) { fail(e as Error) } finally { setBusy(false) }
  }
  async function disablePush() {
    setBusy(true)
    try {
      const registration = await navigator.serviceWorker.getRegistration('/')
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) { await callApi('employee', 'push-subscription', 'DELETE', { endpoint: subscription.endpoint }); await subscription.unsubscribe() }
      setPushEnabled(false); setNotice('أوقفنا إشعارات هذا الجهاز.')
    } catch (e) { fail(e as Error) } finally { setBusy(false) }
  }
  async function testPresenceNotification() {
    setBusy(true); setError(''); setNotice('')
    try {
      const data = await callApi('employee', 'presence-test', 'POST')
      setNotice('بدأ اختبار وصول الإشعار الحقيقي؛ قد يصل خلال دقيقة أو دقيقتين. هذا الاختبار يقدّم موعد تنبيه ورديتك الحالية.')
      setPresencePrompt(null)
      setRevision(n => n + 1)
    } catch (e) { fail(e as Error) } finally { setBusy(false) }
  }
  async function testPresenceStage(stage: number) {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') throw new Error('اسمح بإشعارات ويندوز أولًا من زر «تفعيل إشعارات النظام».')
      await navigator.serviceWorker.register('/employee-sw.js', { scope: '/' })
      const registration = await navigator.serviceWorker.ready
      if (!registration.active) throw new Error('تطبيق الموظفين غير جاهز بعد. حدّث الصفحة وحاول مرة أخرى.')
      const channel = new MessageChannel()
      const acknowledged = new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('لم يستجب عامل الإشعارات. أعد تحميل صفحة الموظف وحاول مرة أخرى.')), 8000)
        channel.port1.onmessage = event => {
          window.clearTimeout(timeout)
          channel.port1.close()
          if (event.data?.success) resolve()
          else reject(new Error('تعذر عرض إشعار ويندوز. تحقق من إعداد إشعارات Chrome في Windows.'))
        }
      })
      registration.active.postMessage({ type: 'show-attendance-test', stage }, [channel.port2])
      await acknowledged
      const deadline = Date.now() + 60000
      setPresencePrompt({ shift_id: `test-${stage}`, stage, deadline, test: true })
      setNotice(`ظهر اختبار التنبيه ${stage}. اختر أي رد خلال دقيقة؛ الاختبار لا يسجل حضورًا أو انصرافًا فعليًا.`)
    } catch (e) { fail(e as Error) }
  }
  async function installEmployeeApp() {
    if (!installPrompt) {
      setNotice('التطبيق غير جاهز للتثبيت في هذا المتصفح حاليًا. حدّث الصفحة بعد تسجيل الدخول ثم جرّب الزر مرة أخرى.')
      return
    }
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    setInstallPrompt(null)
    if (choice.outcome === 'accepted') setNotice('بدأ تثبيت تطبيق الموظفين على جهازك.')
  }
  async function testWindowsNotification() {
    setError('')
    try {
      if (!('Notification' in window)) throw new Error('متصفحك لا يدعم إشعارات النظام.')
      if (Notification.permission !== 'granted') throw new Error('اسمح بإشعارات ويندوز أولًا من زر «تفعيل إشعارات النظام».')
      await navigator.serviceWorker.register('/employee-sw.js', { scope: '/' })
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification('اختبار إشعارات دعيدر', {
        body: 'إذا ظهر هذا التنبيه خارج نافذة التطبيق، فإشعارات ويندوز تعمل.',
        icon: '/employee-icon-192.png',
        badge: '/employee-icon-192.png',
        tag: 'daidar-desktop-notification-test',
        requireInteraction: true,
        data: { url: '/employee' },
      })
      setNotice('أُرسل طلب إشعار الاختبار إلى ويندوز. إذا لم يظهر خارج التطبيق، فتحقق من إعداد إشعارات Chrome في ويندوز.')
    } catch (e) { fail(e as Error) }
  }
  async function logoutEmployee() {
    setBusy(true)
    try {
      try {
        const registration = await navigator.serviceWorker.getRegistration('/')
        const subscription = await registration?.pushManager.getSubscription()
        if (subscription) { await callApi('employee', 'push-subscription', 'DELETE', { endpoint: subscription.endpoint }); await subscription.unsubscribe() }
      } catch { /* A push cleanup error should not prevent signing out. */ }
      await callApi('employee', 'logout', 'POST'); setEmployee(null); setRows([]); setRequests([]); setNotice(''); setPushEnabled(false)
    } catch (e) { fail(e as Error) } finally { setBusy(false) }
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(''); const form = new FormData(e.currentTarget)
    try { setEmployee((await callApi('employee', 'login', 'POST', { email: form.get('email'), password: form.get('password') })).employee) } catch (e) { fail(e as Error) } finally { setBusy(false) }
  }
  async function punch(path: string) {
    setBusy(true); setError(''); setNotice('')
    try { await callApi('employee', path, 'POST'); setRevision(n => n + 1); setNotice(path === 'check-in' ? 'تم تسجيل حضورك' : 'تم تسجيل انصرافك') } catch (e) { fail(e as Error) } finally { setBusy(false) }
  }
  async function confirmCheckout(accomplishments:string){
    if(!checkoutShift)return
    setBusy(true);setError('');setNotice('')
    try{await callApi('employee','check-out','POST',{shift_id:checkoutShift.id,accomplishments});setCheckoutShift(null);setRevision(n=>n+1);setNotice('تم حفظ إنجازاتك وتسجيل انصرافك')}
    catch(e){if((e as Error & {status?:number}).status===401)fail(e as Error);throw e}
    finally{setBusy(false)}
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const target = e.currentTarget; const data = new FormData(target); setBusy(true); setError(''); setNotice('')
    try { await callApi('employee', 'requests', 'POST', Object.fromEntries(data)); target.reset(); setRequestType('leave'); setRevision(n => n + 1); setNotice(requestType === 'shift_change' ? 'تم إرسال طلب تغيير الشفت. لن يتاح لك الحضور في الموعد الجديد إلا بعد موافقة الإدارة.' : 'تم إرسال طلبك للإدارة. تابع حالته في شهر تاريخ الطلب.') } catch (e) { fail(e as Error) } finally { setBusy(false) }
  }
  if (loading) return <main className="p-10 text-center">جارٍ التحميل…</main>
  const tabs = [
    { id: 'chat' as const, label: 'شات الفريق', description: 'رسائل الإدارة والمجموعات', icon: MessageCircle },
    { id: 'attendance' as const, label: 'الحضور والانصراف', description: 'سجل يومك وتقاريرك', icon: Clock3 },
    ...(employee?.track_projects === 1 ? [{ id: 'tracking' as const, label: 'تتبع المشاريع', description: 'الجدول الشهري وحالة التنفيذ', icon: CalendarDays }] : []),
    ...(employee?.manage_projects === 1 ? [{ id: 'projects' as const, label: 'إدارة المشاريع', description: 'معرض أعمال دعيدر', icon: FolderKanban }] : []),
    ...(employee?.manage_hub_subscriptions === 1 ? [{ id: 'hub' as const, label: 'اشتراكات هب', description: 'تسجيل دفعة أو تجديد', icon: CreditCard }] : []),
    ...(employee?.create_store === 1 || employee?.manage_store_subscriptions === 1 ? [{ id: 'stores' as const, label: 'إدارة المتاجر', description: 'إنشاء متجر أو تجديد اشتراكه حسب الصلاحية', icon: Store }] : []),
    ...(employee?.view_ecosystem_stats === 1 ? [{ id: 'ecosystem-stats' as const, label: 'إحصائيات المنظومة', description: 'أعداد الحسابات والمتاجر والاشتراكات', icon: BarChart3 }] : []),
    ...((employee?.add_passwords === 1 || employee?.view_passwords === 1) ? [{ id: 'passwords' as const, label: 'كلمات مرور', description: 'حسابات وروابط دخول المشاريع', icon: WalletCards }] : []),
    ...(employee?.view_d1_usage === 1 ? [{ id: 'databases' as const, label: 'سعة قواعد البيانات', description: 'المساحة المستخدمة والمتاحة', icon: Database }] : []),
  ]
  return <main dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8"><div className="max-w-5xl mx-auto"><header className="flex flex-wrap justify-between items-center gap-4 mb-8"><div><p className="text-sky-600 font-bold">دعيدر للحلول البرمجية</p><h1 className="text-3xl font-bold mt-2">{employee ? `أهلًا ${employee.name}` : 'دخول الموظفين'}</h1>{employee && <p className="text-slate-500 mt-2">{employee.job_title}</p>}</div><div className="flex flex-wrap gap-2">{employee && !isInstalled && <button type="button" className="rounded-xl border border-sky-300 bg-white px-4 py-2 font-bold text-sky-800" onClick={() => void installEmployeeApp()}>تنزيل تطبيق الموظفين</button>}{employee && isInstalled && <span className="self-center rounded-xl bg-sky-50 px-4 py-2 text-sm font-bold text-sky-800">تطبيق الموظفين مثبت</span>}{employee && <button className={action} disabled={busy} onClick={() => void logoutEmployee()}>تسجيل الخروج</button>}</div></header>{error && <p role="alert" className="bg-red-50 text-red-700 p-4 rounded-xl mb-5">{error}</p>}{notice && <p role="status" className="text-green-700 p-4 mb-5">{notice}</p>}
    {!employee ? <form onSubmit={login} className="max-w-md mx-auto bg-white border rounded-2xl p-6 space-y-4"><label className="block">البريد الإلكتروني<input className={field} name="email" type="email" autoComplete="username" required /></label><label className="block">كلمة المرور<input className={field} name="password" type="password" autoComplete="current-password" maxLength={256} required /></label><button className={`${action} w-full`} disabled={busy}>دخول</button><p className="text-sm text-slate-500">حسابك يتم إنشاؤه بواسطة الإدارة.</p></form> : <>
    <nav aria-label="أقسام الموظف" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tabs.map(tab => { const Icon = tab.icon; const selected = activeTab === tab.id; return <button key={tab.id} type="button" aria-pressed={selected} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 rounded-2xl border p-4 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${selected ? 'border-sky-600 bg-sky-600 text-white shadow-md shadow-sky-900/10' : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50'}`}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${selected ? 'bg-white/15' : 'bg-sky-50 text-sky-700'}`}><Icon size={21} /></span><span><strong className="block">{tab.label} {tab.id === 'chat' && <ChatUnreadBadge scope="employee"/>}</strong><small className={selected ? 'text-sky-100' : 'text-slate-500'}>{tab.description}</small></span></button> })}
    </nav>
    {activeTab === 'attendance' && <div className="space-y-6">
    <section className="grid gap-3 sm:grid-cols-3"><article className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">حدك اليومي</p><p className="mt-1 text-2xl font-bold">{payroll?.max_daily_hours ?? employee.max_daily_hours ?? 4} ساعة</p></article><article className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">ساعاتك هذا الشهر</p><p className="mt-1 text-2xl font-bold">{(payroll?.actual_hours ?? 0).toLocaleString('ar-EG',{maximumFractionDigits:2})} <span className="text-base font-normal text-slate-500">/ {payroll?.max_monthly_hours ?? employee.max_monthly_hours ?? 104} ساعة</span></p></article>{employee.view_due === 1 && <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-sm text-emerald-800">المستحق المحسوب حتى الآن</p><p className="mt-1 text-2xl font-bold text-emerald-900">{Math.round((payroll?.due_piasters || 0)/100).toLocaleString('ar-EG')} جنيه</p></article>}</section>
    <section className="bg-white border rounded-2xl p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold mb-3">حضور وانصراف اليوم</h2><p className="mb-4">{open ? `حضور مفتوح منذ ${open.day} — ${time(open.check_in)}` : today?.check_out ? `آخر انصراف ${time(today.check_out)} — يمكنك بدء وردية جديدة` : 'لم تسجل حضورًا اليوم'}</p><p className="text-sm text-slate-500">التوقيت من الخادم بتوقيت القاهرة. يمكنك تسجيل أكثر من وردية في اليوم بعد إغلاق الوردية السابقة.</p></div><div className="flex flex-wrap gap-3"><button className={action} disabled={busy || reportLoading || !!open} onClick={() => punch('check-in')}>تسجيل حضور</button><button className="rounded-xl bg-slate-800 text-white px-5 py-3 font-bold disabled:opacity-50" disabled={busy || reportLoading || !open} onClick={() => { if(open)setCheckoutShift(open) }}>تسجيل انصراف</button><button disabled={busy || reportLoading} className="rounded-xl border px-4 py-3 font-bold text-sky-700 disabled:opacity-50" onClick={() => setRevision(n => n + 1)}>تحديث</button>{pushEnabled ? <><button type="button" className="rounded-xl border px-4 py-3 text-sm text-slate-600" disabled={busy} onClick={() => void disablePush()}>إيقاف إشعارات النظام</button><button type="button" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 disabled:opacity-50" disabled={busy || !open} onClick={() => void testPresenceNotification()}>اختبار التنبيه الحقيقي · خلال دقيقتين</button></> : <button type="button" className="rounded-xl border px-4 py-3 text-sm" disabled={busy} onClick={() => void enablePush()}>تفعيل إشعارات النظام</button>}<button type="button" className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-900 disabled:opacity-50" onClick={() => void testWindowsNotification()}>اختبار إشعار ويندوز الآن</button><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm"><input type="checkbox" checked={showInPagePrompts} onChange={event => { const enabled = event.target.checked; setShowInPagePrompts(enabled); localStorage.setItem('daidar_employee_in_page_prompts', enabled ? 'on' : 'off'); if (!enabled) setPresencePrompt(null) }} /><span>إظهار التنبيه داخل الموقع</span></label></div></div><p className="mt-3 text-xs text-slate-500">إشعارات النظام تظهر خارج الصفحة. يمكنك إيقافها من هنا، كما يمكنك إخفاء النافذة داخل الموقع بشكل مستقل.</p>{!showInPagePrompts && <p className="mt-2 text-xs text-amber-800">نافذة التنبيه داخل الموقع مخفية على هذا الجهاز؛ تأكد من تشغيل إشعارات النظام حتى لا يفوتك التنبيه.</p>}<><p className="mt-2 text-xs text-amber-800">«اختبار إشعار ويندوز الآن» يختبر الإشعار المحلي. {pushEnabled ? '«اختبار التنبيه الحقيقي» يقدّم موعد التنبيه الجاري في ورديتك.' : 'فعّل إشعارات النظام لتجربة وصول التنبيه الحقيقي من الخادم.'}</p><div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-4"><h3 className="font-bold text-slate-900">جرّب كل حالات التنبيه بأمان</h3><p className="mt-1 text-sm text-slate-600">اختبر المراحل الثلاث من إشعار ويندوز أو نافذة الموقع، ثم اختر «موجود» أو «انصراف». هذه محاكاة لا تغيّر سجل الحضور أو المستحق.</p><div className="mt-3 flex flex-wrap gap-2">{[1, 2, 3].map(stage => <button key={stage} type="button" className="rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-bold text-sky-800 hover:bg-sky-100" onClick={() => void testPresenceStage(stage)}>اختبار التنبيه {stage === 1 ? 'الأول' : stage === 2 ? 'الثاني' : 'الثالث'}</button>)}</div></div></></section>
    <section className="bg-white border rounded-2xl p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold mb-3">حضور وانصراف اليوم</h2><p className="mb-4">{open ? `حضور مفتوح منذ ${open.day} — ${time(open.check_in)}` : today?.check_out ? `آخر انصراف ${time(today.check_out)} — يمكنك بدء وردية جديدة` : 'لم تسجل حضورًا اليوم'}</p><p className="text-sm text-slate-500">التوقيت من الخادم بتوقيت القاهرة. يمكنك تسجيل أكثر من وردية في اليوم بعد إغلاق الوردية السابقة.</p>{employee?.work_schedule_locked && <p className="mt-2 rounded-lg bg-sky-50 p-3 text-sm text-sky-900">{checkInWindow?.windows.length ? `أوقات الحضور اليوم: ${checkInWindow.windows.map(window => `${window.start}–${window.end}`).join(' · ')}${checkInWindow.allowed ? ' — يمكنك تسجيل الحضور الآن.' : ' — الحضور متاح داخل هذه الفترات فقط.'}` : 'لا توجد فترة حضور مثبتة اليوم.'}</p>}</div><div className="flex flex-wrap gap-3"><button className={action} disabled={busy || reportLoading || !!open || (employee?.work_schedule_locked === true && checkInWindow?.allowed !== true)} onClick={() => punch('check-in')}>تسجيل حضور</button><button className="rounded-xl bg-slate-800 text-white px-5 py-3 font-bold disabled:opacity-50" disabled={busy || reportLoading || !open} onClick={() => { if(open)setCheckoutShift(open) }}>تسجيل انصراف</button><button disabled={busy || reportLoading} className="rounded-xl border px-4 py-3 font-bold text-sky-700 disabled:opacity-50" onClick={() => setRevision(n => n + 1)}>تحديث</button></div></div></section>
    <section id="shift-request-form" className="bg-white border rounded-2xl p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">طلبات الإجازة وتغيير الشفت</h2><button type="button" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 disabled:opacity-50" disabled={shiftChangeRequestsUsed >= 3} onClick={() => { setRequestType('shift_change'); document.getElementById('shift-request-form')?.scrollIntoView({ behavior: 'smooth' }) }}>طلب إذن لتغيير الشفت</button></div><form onSubmit={submit} className="mt-4 grid sm:grid-cols-2 gap-4"><label>نوع الطلب<select className={field} name="type" value={requestType} onChange={e => setRequestType(e.target.value as 'leave' | 'early' | 'shift_change')}><option value="leave">إجازة يوم</option><option value="early">استئذان انصراف مبكر</option><option value="shift_change" disabled={shiftChangeRequestsUsed >= 3}>إذن تغيير شفت · {shiftChangeRequestsUsed}/3 هذا الشهر</option></select></label><label>التاريخ<input className={field} type="date" name="day" min={serverDay} required /></label>{requestType === 'early' && <label>وقت الانصراف المطلوب (القاهرة)<input className={field} type="time" name="requested_time" required /></label>}{requestType === 'shift_change' && <><label>بداية الشفت المطلوب (القاهرة)<input className={field} type="time" name="start_time" required /></label><label>نهاية الشفت المطلوب (القاهرة)<input className={field} type="time" name="end_time" required /></label><p className="sm:col-span-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">استخدم حتى ٣ طلبات في الشهر. لا يمكنك تسجيل الحضور في الموعد البديل قبل موافقة الإدارة.</p></>}<label className="sm:col-span-2">السبب<textarea className={field} name="reason" required maxLength={1000} rows={3} /></label><button className={action} disabled={busy || (requestType === 'shift_change' && shiftChangeRequestsUsed >= 3)}>إرسال الطلب للإدارة</button></form></section>
    <section className="bg-white border rounded-2xl p-6"><div className="flex flex-wrap justify-between items-center gap-4"><h2 className="text-xl font-bold">السجل الشهري</h2><label>الشهر<input className={`${field} mt-1 min-w-44`} type="month" value={month} onChange={e => { if (e.target.value) setMonth(e.target.value) }} /></label></div>{reportLoading ? <p className="py-6">جارٍ تحميل الشهر…</p> : <><AttendanceTable month={month} records={rows} requests={requests} daysOff={employee.weekly_days_off || [5]} />{employee.view_absences === 1 && payroll && <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700"><CalendarDays size={20} /></span><div><h3 className="font-bold">أيام الغياب المحتسبة</h3><p className="text-sm text-amber-800">{(payroll.absent_days || 0).toLocaleString('ar-EG')} {payroll.absent_days === 1 ? 'يوم' : 'أيام'} غياب هذا الشهر</p></div></div>{payroll.absent_dates?.length ? <ul className="mt-4 grid gap-2 sm:grid-cols-2">{payroll.absent_dates.map(day => <li key={day} className="rounded-lg bg-white px-3 py-2 text-sm">{new Date(day + 'T12:00:00Z').toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long' })}</li>)}</ul> : <p className="mt-3 text-sm text-emerald-700">لا توجد أيام غياب محتسبة حتى الآن.</p>}<p className="mt-3 text-xs text-slate-500">أيام الراحة الأسبوعية والإجازات الموافق عليها لا تُحسب غيابًا.</p></section>}{employee.view_due === 1 && payroll && typeof payroll.due_piasters === 'number' && <section className="mt-4 flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><WalletCards size={21} /></span><div><h3 className="font-bold">المستحق لهذا الشهر</h3><p className="mt-1 text-2xl font-extrabold text-emerald-800">{Math.round(payroll.due_piasters / 100).toLocaleString('ar-EG')} جنيه</p></div></section>}<h3 className="font-bold mt-6 mb-3">طلبات الشهر</h3>{requests.map(r => <article key={r.id} className="border rounded-xl p-4 mb-3"><h4 className="font-bold">{r.type === 'shift_change' ? 'تغيير شفت' : r.type === 'leave' ? 'إجازة' : 'انصراف مبكر'} — {r.day} {r.requested_time || ''}{r.type === 'shift_change' && r.requested_end ? `–${r.requested_end}` : ''} · {statusLabel[r.status]}</h4><p className="whitespace-pre-wrap break-words mt-2">{r.reason}</p>{r.admin_note && <p className="text-slate-500 mt-2">ملاحظة الإدارة: {r.admin_note}</p>}</article>)}{!requests.length && <p className="text-slate-500">لا توجد طلبات في هذا الشهر.</p>}</>}</section>
    </div>}
    {presencePrompt && <div role="alertdialog" aria-modal="true" aria-labelledby="presence-heading" className="fixed bottom-5 right-5 z-50 w-[min(24rem,calc(100vw-2.5rem))] rounded-2xl border border-sky-200 bg-white p-5 shadow-2xl"><div className="flex items-center justify-between gap-3"><h2 id="presence-heading" className="text-lg font-extrabold">{presencePrompt.test ? `اختبار التنبيه ${presencePrompt.stage}` : 'لسه موجود؟'}</h2><svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0" role="img" aria-label={`باقي ${presenceCountdown} ثانية للرد`}><circle cx="24" cy="24" r="19" fill="none" stroke="#e2e8f0" strokeWidth="4"/><circle cx="24" cy="24" r="19" fill="none" stroke="#0284c7" strokeWidth="4" strokeLinecap="round" strokeDasharray="119.38" strokeDashoffset={119.38 * (1 - presenceCountdown / 60)} transform="rotate(-90 24 24)"/><text x="24" y="29" textAnchor="middle" className="fill-slate-800 text-[13px] font-bold">{presenceCountdown}</text></svg></div><p className="mt-2 text-sm text-slate-600">{presencePrompt.test ? 'اختبار فقط: الرد لن يغيّر الحضور أو الانصراف أو المستحق.' : 'أكد خلال دقيقة. التنبيه التالي بعد 5 دقائق من الأول، ثم بعد 15 دقيقة من الأول. إذا لم تؤكد أي تنبيه، تُغلق الوردية على وقت أول تنبيه لم تؤكده.'}</p><div className="mt-4 flex gap-2"><button className={`${action} flex-1`} disabled={busy} onClick={()=>void answerPresence('here')}>{presencePrompt.test ? 'اختبر: موجود' : 'أيوه، مكمل'}</button><button className="rounded-xl border px-4 py-2" disabled={busy} onClick={()=>void answerPresence('away')}>{presencePrompt.test ? 'اختبر: انصراف' : 'انصراف'}</button></div>{!presencePrompt.test && <p className="mt-2 text-xs text-slate-500">التنبيه رقم {presencePrompt.stage}</p>}</div>}
    {checkoutShift && <CheckoutDialog day={checkoutShift.day} busy={busy} onCancel={()=>setCheckoutShift(null)} onConfirm={confirmCheckout}/>}
    {activeTab === 'chat' && <StaffChat scope="employee"/>}
    {activeTab === 'tracking' && employee.track_projects === 1 && <ProjectTracker scope="employee" />}
    {activeTab === 'projects' && employee.manage_projects === 1 && <EmployeeProjectManager />}
    {activeTab === 'hub' && employee.manage_hub_subscriptions === 1 && <HubManualSubscriptionManager scope="employee" />}
    {activeTab === 'stores' && (employee.create_store === 1 || employee.manage_store_subscriptions === 1) && <EmployeeStoreManager createStore={employee.create_store === 1} renewSubscriptions={employee.manage_store_subscriptions === 1} />}
    {activeTab === 'ecosystem-stats' && employee.view_ecosystem_stats === 1 && <EmployeeEcosystemStats />}
    {activeTab === 'passwords' && (employee.add_passwords === 1 || employee.view_passwords === 1) && <PasswordVault scope="employee" />}
    {activeTab === 'databases' && employee.view_d1_usage === 1 && <D1UsageDashboard scope="employee" />}
    </>}
  </div></main>
}
