'use client'
import { useEffect, useState, type FormEvent } from 'react'
import { Copy, Eye, EyeOff, KeyRound, Pencil, Trash2, ShieldCheck, ChevronDown, ExternalLink } from 'lucide-react'

type Account = { id: string; project: string; username: string; is_admin: number }
type Project = { project: string; login_url: string; admin_url: string }
const blank = { id: '', project: '', username: '', password: '', is_admin: false }
const emptyProject = { project: '', login_url: '', admin_url: '' }
const input = 'w-full rounded-xl border border-slate-300 bg-white p-3 mt-1'
const button = 'rounded-xl bg-sky-600 text-white px-5 py-3 font-bold disabled:opacity-50'
export default function PasswordVault({ scope = 'admin' }: { scope?: 'admin' | 'employee' }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [permissions, setPermissions] = useState({ admin: false, add: false, reveal: false })
  const [form, setForm] = useState(blank)
  const [projectForm, setProjectForm] = useState(emptyProject)
  const [visible, setVisible] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  async function api(method = 'GET', body?: unknown) {
    const response = await fetch(`/api/${scope}/password-vault`, { method, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    const data = await response.json()
    if (!response.ok) { if (response.status === 401 || response.status === 403) setVisible({}); throw new Error(data.error || 'تعذر تنفيذ العملية') }
    return data
  }
  async function refresh() {
    const data = await api()
    setAccounts(data.accounts); setProjects(data.projects); setPermissions(data.permissions)
  }
  useEffect(() => { refresh().catch(e => setError(e.message)).finally(() => setLoading(false)) }, [scope]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const hide = () => { if (document.hidden) setVisible({}) }
    document.addEventListener('visibilitychange', hide)
    const timer = window.setInterval(() => setVisible({}), 60000)
    return () => { document.removeEventListener('visibilitychange', hide); window.clearInterval(timer) }
  }, [])
  async function perform(work: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('')
    try { await work() } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تنفيذ العملية') } finally { setBusy(false) }
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    await perform(async () => { await api(form.id ? 'PUT' : 'POST', form); setForm(blank); setVisible({}); await refresh(); setNotice('تم حفظ الحساب') })
  }
  async function copy(value: string) { await navigator.clipboard.writeText(value); setNotice('تم النسخ') }
  const names = Array.from(new Set([...projects.map(p => p.project), ...accounts.map(a => a.project)]))
  const query = search.trim().toLocaleLowerCase()
  const filteredNames = names.filter(name => name.toLocaleLowerCase().includes(query) || accounts.some(a => a.project === name && a.username.toLocaleLowerCase().includes(query)))
  return <section className="rounded-2xl border bg-white p-5 sm:p-7 space-y-6">
    <div className="flex items-center gap-3"><KeyRound className="text-amber-600" /><div><h2 className="text-xl font-bold">كلمات مرور المشاريع</h2><p className="text-sm text-slate-500">افتح المشروع لعرض روابط الدخول والحسابات حسب صلاحياتك</p></div></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 text-red-700 p-3">{error}</p>}
    {notice && <p role="status" className="text-green-700">{notice}</p>}
    {permissions.add && <>
      <form onSubmit={event => { event.preventDefault(); void perform(async () => { await api('POST', { ...projectForm, action: 'project' }); setProjectForm(emptyProject); await refresh(); setNotice('تم حفظ المشروع وروابط الدخول') }) }} className="grid gap-4 sm:grid-cols-2 rounded-xl border p-4">
        <h3 className="font-bold sm:col-span-2">{permissions.admin ? 'إضافة مشروع / تعديل روابط الدخول' : 'إضافة مشروع وروابط الدخول'}</h3>
        <label className="sm:col-span-2">المشروع<input className={input} required maxLength={150} value={projectForm.project} onChange={e => setProjectForm({ ...projectForm, project: e.target.value })} /></label>
        <label>رابط تسجيل الدخول<input className={input} type="url" dir="ltr" maxLength={2048} placeholder="https://…" value={projectForm.login_url} onChange={e => setProjectForm({ ...projectForm, login_url: e.target.value })} /></label>
        <label>رابط تسجيل دخول الأدمن<input className={input} type="url" dir="ltr" maxLength={2048} placeholder="https://…" value={projectForm.admin_url} onChange={e => setProjectForm({ ...projectForm, admin_url: e.target.value })} /></label>
        <button disabled={busy || loading} className={button}>حفظ المشروع والروابط</button>
      </form>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2 rounded-xl bg-slate-50 p-4">
        <h3 className="sm:col-span-2 font-bold">{form.id ? 'تعديل الحساب' : 'إضافة حساب'}</h3>
        <label>المشروع<input className={input} required maxLength={150} list="vault-projects" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} /></label>
        <datalist id="vault-projects">{names.map(project => <option key={project} value={project} />)}</datalist>
        <label>اسم المستخدم<input className={input} required dir="ltr" autoComplete="off" maxLength={254} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></label>
        <label>كلمة المرور{form.id && <small className="block text-slate-500">اتركها فارغة للاحتفاظ بالحالية</small>}<input className={input} type="password" dir="ltr" autoComplete="new-password" required={!form.id} maxLength={4096} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
        <label className="flex items-center gap-2 text-amber-700"><input type="checkbox" checked={form.is_admin} onChange={e => setForm({ ...form, is_admin: e.target.checked })} /><ShieldCheck size={19} />حساب أدمن (ذهبي)</label>
        <div className="sm:col-span-2 flex gap-4"><button disabled={busy || loading} className={button}>{busy ? 'جارٍ التنفيذ…' : 'حفظ الحساب'}</button>{form.id && <button type="button" disabled={busy} onClick={() => setForm(blank)}>إلغاء</button>}</div>
      </form>
    </>}
    <label className="block">بحث بالمشروع أو اسم المستخدم<input className={input} type="search" value={search} onChange={e => { setSearch(e.target.value); setVisible({}) }} /></label>
    {loading ? <p>جارٍ التحميل…</p> : !filteredNames.length && !error && <p className="rounded-xl border border-dashed p-6 text-center text-slate-500">لا توجد مشاريع{search ? ' مطابقة للبحث' : ' محفوظة بعد'}.</p>}
    {filteredNames.map(project => {
      const metadata = projects.find(p => p.project === project)
      const projectAccounts = accounts.filter(a => a.project === project)
      return <article key={project} className="rounded-xl border border-slate-200 overflow-hidden">
        <button type="button" aria-expanded={!!open[project]} aria-controls={`vault-project-${encodeURIComponent(project)}`} className="w-full flex items-center justify-between gap-3 bg-slate-50 p-4 text-right" onClick={() => { setOpen(values => ({ ...values, [project]: !values[project] })); setVisible({}) }}>
          <span className="font-bold text-lg break-words">{project}<small className="block text-xs font-normal text-slate-500">{projectAccounts.length} حساب</small></span><ChevronDown size={20} className={open[project] ? 'rotate-180 shrink-0' : 'shrink-0'} />
        </button>
        {open[project] && <div id={`vault-project-${encodeURIComponent(project)}`} className="p-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            {(['login_url', 'admin_url'] as const).map(key => metadata?.[key] ? <a key={key} href={metadata[key]} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 ${key === 'admin_url' ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-sky-700'}`}><ExternalLink size={16} />{key === 'admin_url' ? 'تسجيل دخول الأدمن' : 'تسجيل الدخول'}</a> : null)}
            {permissions.admin && <button type="button" className="text-sky-700 underline" onClick={() => { setProjectForm(metadata || { ...emptyProject, project }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>تعديل روابط الدخول</button>}
            {permissions.add && <button type="button" className="text-sky-700 underline" onClick={() => { setForm({ ...blank, project }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>إضافة حساب للمشروع</button>}
          </div>
          {!projectAccounts.length && <p className="text-sm text-slate-500">لا توجد حسابات لهذا المشروع بعد.</p>}
          <div className="grid gap-3 md:grid-cols-2">{projectAccounts.map(account => <div key={account.id} className={`rounded-xl border p-4 space-y-3 ${account.is_admin ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
            {account.is_admin === 1 && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800"><ShieldCheck size={16} />أدمن</span>}
            <div><span className="text-xs text-slate-500">اسم المستخدم</span><div className="flex items-center gap-2"><bdi className="flex-1 break-all">{account.username}</bdi><button type="button" disabled={busy} aria-label="نسخ اسم المستخدم" title="نسخ اسم المستخدم" onClick={() => void perform(() => copy(account.username))}><Copy size={18} /></button></div></div>
            <div><span className="text-xs text-slate-500">كلمة المرور</span><div className="flex items-center gap-3"><bdi className="flex-1 break-all font-mono">{visible[account.id] ?? '••••••••••••'}</bdi>
              {permissions.reveal ? <>
                <button type="button" disabled={busy} aria-label={visible[account.id] !== undefined ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} onClick={() => void perform(async () => { if (visible[account.id] !== undefined) setVisible(values => { const next = { ...values }; delete next[account.id]; return next }); else { const data = await api('POST', { id: account.id, action: 'reveal' }); setVisible(values => ({ ...values, [account.id]: data.password })) } })}>{visible[account.id] !== undefined ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                <button type="button" disabled={busy} title="نسخ كلمة المرور" aria-label="نسخ كلمة المرور" onClick={() => void perform(async () => { const data = await api('POST', { id: account.id, action: 'reveal' }); await copy(data.password) })}><Copy size={18} /></button>
              </> : <small className="text-slate-500">بدون صلاحية كشف</small>}
            </div></div>
            {permissions.admin && <div className="flex gap-4 border-t pt-3 text-sm"><button type="button" disabled={busy} className="inline-flex items-center gap-1 text-sky-700" onClick={() => { setForm({ ...account, password: '', is_admin: account.is_admin === 1 }); setVisible({}); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Pencil size={15} />تعديل</button><button type="button" disabled={busy} className="inline-flex items-center gap-1 text-red-700" onClick={() => { if (window.confirm(`حذف حساب ${account.username} من ${account.project}؟`)) void perform(async () => { await api('DELETE', { id: account.id }); setVisible({}); if (form.id === account.id) setForm(blank); await refresh(); setNotice('تم حذف الحساب') }) }}><Trash2 size={15} />حذف</button></div>}
          </div>)}</div>
        </div>}
      </article>
    })}
  </section>
}
