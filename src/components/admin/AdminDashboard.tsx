'use client'
import { useEffect, useState, type FormEvent } from 'react'
import type { Project } from '@/types'
import EmployeesManager from './EmployeesManager'
import ProjectTracker from '@/components/shared/ProjectTracker'
import AdminClock from './AdminClock'
import { LayoutDashboard, FolderKanban, Users, Mail, ArrowUpLeft, LogOut, ExternalLink, ShieldCheck, Sparkles, Blocks, Database } from 'lucide-react'
import './admin.css'
import HubAdminManager from './HubAdminManager'
import D1UsageDashboard from './D1UsageDashboard'
import AdminNotifications from './AdminNotifications'

const sections = [
  { id: 'tracking', label: 'تتبع المشاريع', icon: FolderKanban, detail: 'الجدول الشهري ومتابعة العملاء' },
  { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard, detail: 'متابعة أداء الموقع' },
  { id: 'projects', label: 'المشاريع', icon: FolderKanban, detail: 'إدارة معرض أعمالك' },
  { id: 'employees', label: 'فريق العمل', icon: Users, detail: 'الحضور والإجازات' },
  { id: 'messages', label: 'رسائل العملاء', icon: Mail, detail: 'كل الطلبات في مكان واحد' },
  { id: 'hub', label: 'دعيدر هب', icon: Blocks, detail: 'الطلبات والاشتراكات والإصدارات' },
  { id: 'databases', label: 'قواعد البيانات', icon: Database, detail: 'سعة قواعد D1 والتنبيهات' },
] as const
type Section = typeof sections[number]['id']

type Message = { id: string; name: string; email: string; phone: string; service: string; description: string; created_at: number; status: string }
type Stat = { days: number; visitors: number; emails: number }
const empty = { title: '', titleEn: '', description: '', descriptionEn: '', link: '', image: '', category: 'website', id: '', status: 'published' }
async function api(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`/api/admin/${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' })
  const data = await res.json().catch(() => ({ error: 'تعذر الاتصال بخدمة الإدارة' }))
  if (!res.ok) throw Object.assign(new Error(data.error || 'تعذر تنفيذ الطلب'), { status: res.status })
  return data
}
export default function AdminDashboard() {
  const [session, setSession] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [stats, setStats] = useState<Stat[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [days, setDays] = useState(7)
  const [limited, setLimited] = useState(false)
  const [form, setForm] = useState(empty)
  const [activeSection, setActiveSection] = useState<Section>('overview')
  function navigate(section: Section) { setActiveSection(section); setError(''); setNotice(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const handleError = (e: Error & { status?: number }) => { setError(e.message); if (e.status === 401) setSession(null) }
  useEffect(() => { api('session').then(data => setSession(data.email)).catch(e => { if (e.status !== 401) setError(e.message) }).finally(() => setLoading(false)) }, [])
  useEffect(() => {
    if (!session) return
    let active = true
    Promise.all([api('stats'), api('projects'), api(`messages?days=${days}`)]).then(([s, p, m]) => { if (active) { setStats(s.stats); setProjects(p.projects); setMessages(m.messages); setLimited(m.limited) } }).catch(e => { if (active) handleError(e) })
    return () => { active = false }
  }, [session, days])
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError('')
    const data = new FormData(e.currentTarget)
    try { await api('login', 'POST', { email: data.get('email'), password: data.get('password') }); setSession(String(data.get('email'))) } catch (e) { handleError(e as Error) } finally { setBusy(false) }
  }
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('')
    try { await api('projects', 'POST', form); setProjects((await api('projects')).projects); setForm(empty); setNotice('تم حفظ المشروع ونشره في الموقع') } catch (e) { handleError(e as Error) } finally { setBusy(false) }
  }
  async function upload(file?: File) {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) { setError('اختار صورة PNG أو JPEG أو WebP بحجم حتى ١ ميجابايت'); return }
    const reader = new FileReader()
    reader.onload = () => setForm(f => ({ ...f, image: String(reader.result) }))
    reader.readAsDataURL(file)
  }
  const input = 'w-full rounded-xl border border-slate-300 bg-white text-slate-900 p-3 focus:outline-none focus:ring-2 focus:ring-sky-500'
  const button = 'rounded-xl bg-sky-600 text-white px-5 py-3 font-bold disabled:opacity-50 hover:bg-sky-700'
  if (loading) return <main dir="rtl" className="min-h-screen grid place-items-center">جارٍ تحميل لوحة الإدارة…</main>
  return <main dir="rtl" className="admin-workspace min-h-screen text-slate-900">
    <header className="admin-topbar"><div className="admin-topbar-inner"><a href="/admin" className="admin-brand"><img src="/logo.png" alt="دعيدر" /><span>دعيدر<span className="admin-brand-caption">مساحة الإدارة</span></span></a>{session && <nav aria-label="أقسام لوحة الإدارة" className="admin-nav">{sections.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={activeSection === id ? 'page' : undefined} onClick={() => navigate(id)} className={activeSection === id ? 'active' : ''}><Icon size={17} /><span>{label}</span></button>)}</nav>}<div className="admin-header-actions"><a href="/ar" target="_blank" rel="noreferrer" title="عرض الموقع" aria-label="عرض الموقع"><ExternalLink size={18} /></a>{session && <AdminNotifications onNavigate={navigate} />}{session && <button title="تسجيل الخروج" aria-label="تسجيل الخروج" disabled={busy} onClick={async () => { setBusy(true); try { await api('logout', 'POST'); setSession(null); setActiveSection('overview'); setStats([]); setMessages([]); setProjects([]); setForm(empty) } catch (e) { handleError(e as Error) } finally { setBusy(false) } }}><LogOut size={18} /></button>}</div></div></header>
    <div className="admin-content max-w-6xl mx-auto">
      {error && <p role="alert" className="p-4 rounded-xl bg-red-50 text-red-700 mb-5">{error}</p>}
      {notice && <p role="status" className="p-4 rounded-xl bg-green-50 text-green-700 mb-5">{notice}</p>}
      {!session ? <form onSubmit={login} className="max-w-md mx-auto rounded-2xl bg-white border p-6 space-y-5"><h2 className="text-xl font-bold">تسجيل دخول الإدارة</h2><label className="block">البريد الإلكتروني<input className={input} name="email" type="email" dir="ltr" autoComplete="username" required /></label><label className="block">كلمة المرور<input className={input} name="password" type="password" autoComplete="current-password" required maxLength={256} /></label><button className={`${button} w-full`} disabled={busy}>{busy ? 'جارٍ تسجيل الدخول…' : 'دخول'}</button></form> : <>
        <section className="admin-welcome"><div><span className="admin-eyebrow"><Sparkles size={15} /> مساحة لكل تفاصيل شغلك</span><h1>{activeSection === 'overview' ? 'أهلًا بيك في دعيدر' : sections.find(s => s.id === activeSection)?.label}<span className="text-sky-300">.</span></h1><p>{activeSection === 'overview' ? 'نظرة على أداء موقعك، ومشاريعك، وفريقك. كل حاجة قدامك بوضوح.' : sections.find(s => s.id === activeSection)?.detail}</p><span className="admin-account"><ShieldCheck size={14} /><bdi>{session}</bdi></span></div><AdminClock /></section>
        <div hidden={activeSection !== 'overview'}>
        <div className="admin-section-heading"><div><span className="admin-eyebrow">الموقع بالأرقام</span><h2>إحصائيات الزيارات والبريد</h2></div><span className="admin-timezone">بتوقيت القاهرة</span></div>
        <section aria-label="الإحصائيات" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">{stats.map(s => <div key={s.days} className="bg-white border rounded-2xl p-5"><h2 className="text-slate-500 font-bold">{s.days === 0 ? 'اليوم بتوقيت القاهرة' : `آخر ${s.days} يوم`}</h2><p className="text-3xl font-extrabold text-sky-600 mt-4">{s.visitors.toLocaleString('ar-EG')}</p><p className="text-sm text-slate-500">زائر فريد</p><p className="text-xl font-bold mt-4">{s.emails.toLocaleString('ar-EG')} <span className="text-sm font-normal">إيميل مُرسل</span></p></div>)}</section>
        <p className="text-sm text-slate-500 mb-8">الإحصائيات تبدأ من تفعيل النظام. الزائر الفريد يُحسب لكل متصفح؛ تغيير الجهاز أو حذف بيانات المتصفح قد يحسبه مرة أخرى. الإيميل المُرسل يعني قبول خدمة البريد للإرسال، وليس تأكيد وصوله.</p>
        <div className="admin-section-heading"><h2>ابدأ من هنا</h2><span className="text-sm text-slate-500">اختصارات للشغل اليومي</span></div><div className="admin-shortcuts">{sections.filter(s => s.id !== 'overview').map(({ id, label, icon: Icon, detail }) => <button key={id} onClick={() => navigate(id)}><span className={`admin-shortcut-icon ${id}`}><Icon size={24} /></span><span><strong>{label}</strong><small>{detail}</small></span><ArrowUpLeft size={19} /></button>)}</div>
        <div className="admin-overview-note"><ShieldCheck size={20} /><div><strong>مساحة خاصة لإدارة شغلك</strong><p>حسابات الموظفين منفصلة عن الإدارة، وكل موظف يشوف سجله وطلباته فقط.</p></div><a href="/employee" target="_blank" rel="noreferrer">صفحة الموظفين <ExternalLink size={14} /></a></div>
        </div>
        <div hidden={activeSection !== 'employees'}><div className="admin-local-nav"><a href="#employee-accounts"><Users size={16} /> الحسابات</a><a href="#employee-report"><LayoutDashboard size={16} /> تقرير الحضور</a><a href="#employee-requests"><Mail size={16} /> الإجازات والاستئذان</a></div><EmployeesManager onUnauthorized={() => setSession(null)} /></div>
        <div hidden={activeSection !== 'projects'}>
        <section className="bg-white border rounded-2xl p-5 sm:p-7 mb-8"><h2 className="text-xl font-bold mb-5">{form.id ? 'تعديل المشروع' : 'إضافة مشروع'}</h2><form onSubmit={save} className="grid sm:grid-cols-2 gap-4">{([['title', 'عنوان المشروع', 'text'], ['titleEn', 'العنوان بالإنجليزية (اختياري)', 'text'], ['link', 'رابط المشروع', 'url']] as const).map(([key, label, type]) => <label key={key}>{label}<input className={input} type={type} value={form[key]} maxLength={key === 'link' ? 2000 : 200} required={key === 'title'} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}<label>نوع المشروع<select className={input} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}><option value="website">موقع إلكتروني</option><option value="ecommerce">متجر إلكتروني</option><option value="system">نظام مخصص</option><option value="saas">SaaS</option></select></label><label>حالة المشروع<select className={input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="published">منشور</option><option value="draft">مخفي</option></select></label><label>وصف المشروع<textarea className={input} rows={4} required maxLength={5000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label><label>الوصف بالإنجليزية (اختياري)<textarea className={input} rows={4} maxLength={5000} value={form.descriptionEn} onChange={e => setForm({ ...form, descriptionEn: e.target.value })} /></label><label>صورة المشروع<input type="file" accept="image/png,image/jpeg,image/webp" className={input} onChange={e => upload(e.target.files?.[0])} /><span className="text-xs text-slate-500">حتى ١ ميجابايت، أو أضف رابط صورة HTTPS</span><input aria-label="رابط الصورة" type="url" className={`${input} mt-2`} value={form.image.startsWith('data:') ? '' : form.image} onChange={e => setForm({ ...form, image: e.target.value })} /></label>{form.image && <img src={form.image} alt="معاينة صورة المشروع" className="h-40 w-full object-contain rounded-xl bg-slate-100" />}<div className="sm:col-span-2 flex gap-3"><button className={button} disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ ونشر المشروع'}</button>{form.id && <button type="button" className="px-4" onClick={() => setForm(empty)}>إلغاء التعديل</button>}</div></form>
          <div className="mt-6 space-y-3">{projects.map(p => <div key={p.id} className="flex flex-wrap items-center gap-3 border-t pt-3">{p.image && <img src={p.image} alt="" className="w-16 h-12 object-cover rounded" />}<span className="flex-1 font-bold">{p.titleAr} <span className="text-xs text-slate-500">{p.status === 'draft' ? '(مخفي)' : ''}</span></span><button onClick={() => { setForm({ id: p.id, title: p.titleAr, titleEn: p.titleEn, description: p.descriptionAr, descriptionEn: p.descriptionEn, link: p.link || '', image: p.image || '', category: p.category, status: p.status }); setNotice('') }}>تعديل</button><button disabled={busy} className="text-red-600" onClick={async () => { if (!window.confirm('حذف هذا المشروع من الموقع؟')) return; setBusy(true); try { await api('projects', 'DELETE', { id: p.id }); setProjects(x => x.filter(y => y.id !== p.id)); if (form.id === p.id) setForm(empty) } catch (e) { handleError(e as Error) } finally { setBusy(false) } }}>حذف</button></div>)}{!projects.length && <p className="text-slate-500">المشاريع التي تضيفها هنا ستظهر في الموقع تلقائيًا.</p>}</div>
        </section>
        </div>
        <div hidden={activeSection !== 'messages'}>
        <section className="bg-white border rounded-2xl p-5 sm:p-7"><div className="flex flex-wrap gap-4 justify-between items-center mb-5"><h2 className="text-xl font-bold">طلبات العملاء والإيميلات</h2><label>الفترة<select className={`${input} mt-1`} value={days} onChange={e => setDays(Number(e.target.value))}><option value={1}>آخر ٢٤ ساعة</option><option value={7}>آخر أسبوع</option><option value={30}>آخر شهر (٣٠ يوم)</option><option value={365}>آخر سنة (٣٦٥ يوم)</option></select></label></div>{limited && <p>تُعرض أحدث ٥٠٠ رسالة في هذه الفترة.</p>}{!messages.length && <p className="text-slate-500 py-6">لا توجد رسائل مسجلة في هذه الفترة.</p>}<div className="space-y-4">{messages.map(m => <article key={m.id} className="border rounded-xl p-4"><div className="flex flex-wrap gap-3 justify-between"><h3 className="font-bold">{m.name} — {m.service}</h3><span className="text-sm">{m.status === 'sent' ? 'تم الإرسال' : m.status === 'failed' ? 'فشل الإرسال' : 'قيد الإرسال'} · {new Date(m.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}</span></div><p className="mt-2"><a href={`mailto:${m.email}`}>{m.email}</a> · <span dir="ltr">{m.phone}</span></p><p className="whitespace-pre-wrap break-words text-slate-600 mt-3">{m.description}</p></article>)}</div></section>
        </div>
        <div hidden={activeSection !== 'hub'}><HubAdminManager /></div>
        <div hidden={activeSection !== 'tracking'}><ProjectTracker /></div><div hidden={activeSection !== 'databases'}><D1UsageDashboard /></div>
        <footer className="admin-footer"><span>دعيدر للحلول البرمجية</span><span>لوحة الإدارة · كل التفاصيل في مكان واحد</span></footer>
      </>}
    </div>
  </main>
}
