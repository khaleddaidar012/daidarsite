'use client'
import { useEffect, useState, type FormEvent } from 'react'
import { Clock3, FolderKanban, CreditCard, Database, CalendarDays, WalletCards, MessageCircle } from 'lucide-react'
import { action, field, callApi, currentMonth, AttendanceTable, time, statusLabel, type Employee, type RecordRow, type EmployeeRequest } from './shared'
import StaffChat from '@/components/shared/StaffChat'
import ProjectTracker from '@/components/shared/ProjectTracker'
import CheckoutDialog from './CheckoutDialog'
import EmployeeProjectManager from './EmployeeProjectManager'
import HubManualSubscriptionManager from '@/components/shared/HubManualSubscriptionManager'
import D1UsageDashboard from '@/components/admin/D1UsageDashboard'
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
  const [open, setOpen] = useState<RecordRow | null>(null)
  const [today, setToday] = useState<RecordRow | null>(null)
  const [serverDay, setServerDay] = useState('')
  const [revision, setRevision] = useState(0)
  const [presencePrompt, setPresencePrompt] = useState<{shift_id:string;stage:number;deadline:number}|null>(null)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [checkoutShift, setCheckoutShift] = useState<RecordRow | null>(null)
  const [requestType, setRequestType] = useState('leave')
  const [reportLoading, setReportLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'tracking' | 'attendance' | 'projects' | 'hub' | 'databases'>('attendance')
  function fail(e: Error & { status?: number }) { setError(e.message); if (e.status === 401) setEmployee(null) }
  useEffect(() => { callApi('employee', 'session').then(data => setEmployee(data.employee)).catch(e => { if (e.status !== 401) setError(e.message) }).finally(() => setLoading(false)) }, [])
  useEffect(() => {
    if (!employee || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.getRegistration('/').then(registration => registration?.pushManager.getSubscription()).then(subscription => setPushEnabled(!!subscription)).catch(() => {})
  }, [employee])
  useEffect(() => {
    if (!employee) return
    let active = true; setReportLoading(true)
    Promise.all([callApi('employee', `attendance?month=${month}`), callApi('employee', `requests?month=${month}`)]).then(([a, r]) => { if (active) { setRows(a.records); setOpen(a.open); setToday(a.today); setServerDay(a.serverDay); setPayroll(a.payroll); setRequests(r.requests) } }).catch(e => { if (active) fail(e) }).finally(() => { if (active) setReportLoading(false) })
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
          setPresencePrompt(data.prompt)
          if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) navigator.serviceWorker.ready.then(registration => registration.showNotification(`تأكيد الحضور · التنبيه ${data.prompt.stage}`, { body: 'هل ما زلت تعمل؟ اضغط «موجود · كمل» أو «انصراف» من الإشعار.', icon: '/logo.png', tag: `attendance-${data.prompt.shift_id}`, requireInteraction: true, actions: [{ action: 'here', title: 'موجود · كمل' }, { action: 'away', title: 'انصراف' }], data: { shift_id: data.prompt.shift_id, stage: data.prompt.stage, url: '/employee' } } as NotificationOptions)).catch(() => {})
        } else if (data.closed) {
          setPresencePrompt(null); setRevision(n => n + 1); setNotice('أُغلقت الوردية عند آخر تأكيد حضور لعدم الرد على التنبيهات.')
        } else if (presencePrompt && Date.now() >= presencePrompt.deadline) {
          setPresencePrompt(null)
        }
      } catch { /* Attendance screen can still be used if this optional prompt endpoint is unavailable. */ }
    }
    void check()
    const timer = window.setInterval(() => void check(), 30000)
    return () => { live = false; window.clearInterval(timer) }
  }, [employee, open?.id, revision, presencePrompt?.deadline])
  async function answerPresence(response: 'here'|'away') {
    if (!presencePrompt) return
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
      const key = Uint8Array.from(atob(config.publicKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
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
      setNotice('بدأ اختبار التنبيه. سيصلك إشعار خلال دقيقة أو دقيقتين؛ اختر «موجود · كمل» لاختبار الرد من الإشعار.')
      setPresencePrompt(null)
      setRevision(n => n + 1)
    } catch (e) { fail(e as Error) } finally { setBusy(false) }
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
    try { await callApi('employee', 'requests', 'POST', Object.fromEntries(data)); target.reset(); setRequestType('leave'); setRevision(n => n + 1); setNotice('تم إرسال طلبك للإدارة. تابع حالته في شهر تاريخ الطلب.') } catch (e) { fail(e as Error) } finally { setBusy(false) }
  }
  if (loading) return <main className="p-10 text-center">جارٍ التحميل…</main>
  const tabs = [
    { id: 'chat' as const, label: 'شات الفريق', description: 'رسائل الإدارة والمجموعات', icon: MessageCircle },
    { id: 'attendance' as const, label: 'الحضور والانصراف', description: 'سجل يومك وتقاريرك', icon: Clock3 },
    ...(employee?.track_projects === 1 ? [{ id: 'tracking' as const, label: 'تتبع المشاريع', description: 'الجدول الشهري وحالة التنفيذ', icon: CalendarDays }] : []),
    ...(employee?.manage_projects === 1 ? [{ id: 'projects' as const, label: 'إدارة المشاريع', description: 'معرض أعمال دعيدر', icon: FolderKanban }] : []),
    ...(employee?.manage_hub_subscriptions === 1 ? [{ id: 'hub' as const, label: 'اشتراكات هب', description: 'تسجيل دفعة أو تجديد', icon: CreditCard }] : []),
    ...(employee?.view_d1_usage === 1 ? [{ id: 'databases' as const, label: 'سعة قواعد البيانات', description: 'المساحة المستخدمة والمتاحة', icon: Database }] : []),
  ]
  return <main dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8"><div className="max-w-5xl mx-auto"><header className="flex flex-wrap justify-between items-center gap-4 mb-8"><div><p className="text-sky-600 font-bold">دعيدر للحلول البرمجية</p><h1 className="text-3xl font-bold mt-2">{employee ? `أهلًا ${employee.name}` : 'دخول الموظفين'}</h1>{employee && <p className="text-slate-500 mt-2">{employee.job_title}</p>}</div>{employee && <button className={action} disabled={busy} onClick={() => void logoutEmployee()}>تسجيل الخروج</button>}</header>{error && <p role="alert" className="bg-red-50 text-red-700 p-4 rounded-xl mb-5">{error}</p>}{notice && <p role="status" className="text-green-700 p-4 mb-5">{notice}</p>}
    {!employee ? <form onSubmit={login} className="max-w-md mx-auto bg-white border rounded-2xl p-6 space-y-4"><label className="block">البريد الإلكتروني<input className={field} name="email" type="email" autoComplete="username" required /></label><label className="block">كلمة المرور<input className={field} name="password" type="password" autoComplete="current-password" maxLength={256} required /></label><button className={`${action} w-full`} disabled={busy}>دخول</button><p className="text-sm text-slate-500">حسابك يتم إنشاؤه بواسطة الإدارة.</p></form> : <>
    <nav aria-label="أقسام الموظف" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tabs.map(tab => { const Icon = tab.icon; const selected = activeTab === tab.id; return <button key={tab.id} type="button" aria-pressed={selected} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 rounded-2xl border p-4 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${selected ? 'border-sky-600 bg-sky-600 text-white shadow-md shadow-sky-900/10' : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50'}`}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${selected ? 'bg-white/15' : 'bg-sky-50 text-sky-700'}`}><Icon size={21} /></span><span><strong className="block">{tab.label}</strong><small className={selected ? 'text-sky-100' : 'text-slate-500'}>{tab.description}</small></span></button> })}
    </nav>
    {activeTab === 'attendance' && <div className="space-y-6">
    <section className="grid gap-3 sm:grid-cols-3"><article className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">حدك اليومي</p><p className="mt-1 text-2xl font-bold">{payroll?.max_daily_hours ?? employee.max_daily_hours ?? 4} ساعة</p></article><article className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">ساعاتك هذا الشهر</p><p className="mt-1 text-2xl font-bold">{(payroll?.actual_hours ?? 0).toLocaleString('ar-EG',{maximumFractionDigits:2})} <span className="text-base font-normal text-slate-500">/ {payroll?.max_monthly_hours ?? employee.max_monthly_hours ?? 104} ساعة</span></p></article>{employee.view_due === 1 && <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-sm text-emerald-800">المستحق المحسوب حتى الآن</p><p className="mt-1 text-2xl font-bold text-emerald-900">{Math.round((payroll?.due_piasters || 0)/100).toLocaleString('ar-EG')} جنيه</p></article>}</section>
    <section className="bg-white border rounded-2xl p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold mb-3">حضور وانصراف اليوم</h2><p className="mb-4">{open ? `حضور مفتوح منذ ${open.day} — ${time(open.check_in)}` : today?.check_out ? `آخر انصراف ${time(today.check_out)} — يمكنك بدء وردية جديدة` : 'لم تسجل حضورًا اليوم'}</p><p className="text-sm text-slate-500">التوقيت من الخادم بتوقيت القاهرة. يمكنك تسجيل أكثر من وردية في اليوم بعد إغلاق الوردية السابقة.</p></div><div className="flex flex-wrap gap-3"><button className={action} disabled={busy || reportLoading || !!open} onClick={() => punch('check-in')}>تسجيل حضور</button><button className="rounded-xl bg-slate-800 text-white px-5 py-3 font-bold disabled:opacity-50" disabled={busy || reportLoading || !open} onClick={() => { if(open)setCheckoutShift(open) }}>تسجيل انصراف</button><button disabled={busy || reportLoading} className="rounded-xl border px-4 py-3 font-bold text-sky-700 disabled:opacity-50" onClick={() => setRevision(n => n + 1)}>تحديث</button>{pushEnabled ? <><button type="button" className="rounded-xl border px-4 py-3 text-sm text-slate-600" disabled={busy} onClick={() => void disablePush()}>إيقاف إشعارات هذا الجهاز</button><button type="button" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 disabled:opacity-50" disabled={busy || !open} onClick={() => void testPresenceNotification()}>اختبار الإشعار · خلال دقيقتين</button></> : <button type="button" className="rounded-xl border px-4 py-3 text-sm" disabled={busy} onClick={() => void enablePush()}>تفعيل إشعارات النظام</button>}</div></div><p className="mt-3 text-xs text-slate-500">اسمح بالإشعارات مرة واحدة. بعدها يظهر تنبيه النظام عند تصغير المتصفح، وتقدر تضغط «موجود» أو «انصراف» من الإشعار.</p>{pushEnabled && <p className="mt-2 text-xs text-amber-800">للتجربة: سجّل حضورًا ثم اضغط «اختبار الإشعار». التذكير العادي يظل بعد ساعة؛ الاختبار يسرّع تذكير ورديتك الحالية فقط.</p>}</section>
    {presencePrompt && <div role="alertdialog" aria-modal="true" aria-labelledby="presence-heading" className="fixed bottom-5 right-5 z-50 w-[min(24rem,calc(100vw-2.5rem))] rounded-2xl border border-sky-200 bg-white p-5 shadow-2xl"><h2 id="presence-heading" className="text-lg font-extrabold">لسه موجود؟</h2><p className="mt-2 text-sm text-slate-600">أكد وجودك خلال دقيقتين لمواصلة احتساب الوقت. لو لم يصل رد، سنعيد التنبيه ثم نغلق الوردية عند آخر تأكيد.</p><div className="mt-4 flex gap-2"><button className={`${action} flex-1`} disabled={busy} onClick={()=>void answerPresence('here')}>أيوه، مكمل</button><button className="rounded-xl border px-4 py-2" disabled={busy} onClick={()=>void answerPresence('away')}>انصراف</button></div><p className="mt-2 text-xs text-slate-500">التنبيه رقم {presencePrompt.stage}</p></div>}
    <section className="bg-white border rounded-2xl p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold mb-3">حضور وانصراف اليوم</h2><p className="mb-4">{open ? `حضور مفتوح منذ ${open.day} — ${time(open.check_in)}` : today?.check_out ? `آخر انصراف ${time(today.check_out)} — يمكنك بدء وردية جديدة` : 'لم تسجل حضورًا اليوم'}</p><p className="text-sm text-slate-500">التوقيت من الخادم بتوقيت القاهرة. يمكنك تسجيل أكثر من وردية في اليوم بعد إغلاق الوردية السابقة.</p></div><div className="flex flex-wrap gap-3"><button className={action} disabled={busy || reportLoading || !!open} onClick={() => punch('check-in')}>تسجيل حضور</button><button className="rounded-xl bg-slate-800 text-white px-5 py-3 font-bold disabled:opacity-50" disabled={busy || reportLoading || !open} onClick={() => { if(open)setCheckoutShift(open) }}>تسجيل انصراف</button><button disabled={busy || reportLoading} className="rounded-xl border px-4 py-3 font-bold text-sky-700 disabled:opacity-50" onClick={() => setRevision(n => n + 1)}>تحديث</button></div></div></section>
    <section className="bg-white border rounded-2xl p-6"><h2 className="text-xl font-bold mb-4">طلب إجازة أو استئذان</h2><form onSubmit={submit} className="grid sm:grid-cols-2 gap-4"><label>نوع الطلب<select className={field} name="type" value={requestType} onChange={e => setRequestType(e.target.value)}><option value="leave">إجازة يوم</option><option value="early">استئذان انصراف مبكر</option></select></label><label>التاريخ<input className={field} type="date" name="day" min={serverDay} required /></label>{requestType === 'early' && <label>وقت الانصراف المطلوب (القاهرة)<input className={field} type="time" name="requested_time" required /></label>}<label className="sm:col-span-2">السبب<textarea className={field} name="reason" required maxLength={1000} rows={3} /></label><button className={action} disabled={busy}>إرسال الطلب للإدارة</button></form></section>
    <section className="bg-white border rounded-2xl p-6"><div className="flex flex-wrap justify-between items-center gap-4"><h2 className="text-xl font-bold">السجل الشهري</h2><label>الشهر<input className={`${field} mt-1 min-w-44`} type="month" value={month} onChange={e => { if (e.target.value) setMonth(e.target.value) }} /></label></div>{reportLoading ? <p className="py-6">جارٍ تحميل الشهر…</p> : <><AttendanceTable month={month} records={rows} requests={requests} daysOff={employee.weekly_days_off || [5]} />{employee.view_absences === 1 && payroll && <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700"><CalendarDays size={20} /></span><div><h3 className="font-bold">أيام الغياب المحتسبة</h3><p className="text-sm text-amber-800">{(payroll.absent_days || 0).toLocaleString('ar-EG')} {payroll.absent_days === 1 ? 'يوم' : 'أيام'} غياب هذا الشهر</p></div></div>{payroll.absent_dates?.length ? <ul className="mt-4 grid gap-2 sm:grid-cols-2">{payroll.absent_dates.map(day => <li key={day} className="rounded-lg bg-white px-3 py-2 text-sm">{new Date(day + 'T12:00:00Z').toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long' })}</li>)}</ul> : <p className="mt-3 text-sm text-emerald-700">لا توجد أيام غياب محتسبة حتى الآن.</p>}<p className="mt-3 text-xs text-slate-500">أيام الراحة الأسبوعية والإجازات الموافق عليها لا تُحسب غيابًا.</p></section>}{employee.view_due === 1 && payroll && typeof payroll.due_piasters === 'number' && <section className="mt-4 flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><WalletCards size={21} /></span><div><h3 className="font-bold">المستحق لهذا الشهر</h3><p className="mt-1 text-2xl font-extrabold text-emerald-800">{Math.round(payroll.due_piasters / 100).toLocaleString('ar-EG')} جنيه</p></div></section>}<h3 className="font-bold mt-6 mb-3">طلبات الشهر</h3>{requests.map(r => <article key={r.id} className="border rounded-xl p-4 mb-3"><h4 className="font-bold">{r.type === 'leave' ? 'إجازة' : 'انصراف مبكر'} — {r.day} {r.requested_time || ''} · {statusLabel[r.status]}</h4><p className="whitespace-pre-wrap break-words mt-2">{r.reason}</p>{r.admin_note && <p className="text-slate-500 mt-2">ملاحظة الإدارة: {r.admin_note}</p>}</article>)}{!requests.length && <p className="text-slate-500">لا توجد طلبات في هذا الشهر.</p>}</>}</section>
    </div>}
    {checkoutShift && <CheckoutDialog day={checkoutShift.day} busy={busy} onCancel={()=>setCheckoutShift(null)} onConfirm={confirmCheckout}/>}
    {activeTab === 'chat' && <StaffChat scope="employee"/>}
    {activeTab === 'tracking' && employee.track_projects === 1 && <ProjectTracker scope="employee" />}
    {activeTab === 'projects' && employee.manage_projects === 1 && <EmployeeProjectManager />}
    {activeTab === 'hub' && employee.manage_hub_subscriptions === 1 && <HubManualSubscriptionManager scope="employee" />}
    {activeTab === 'databases' && employee.view_d1_usage === 1 && <D1UsageDashboard scope="employee" />}
    </>}
  </div></main>
}
