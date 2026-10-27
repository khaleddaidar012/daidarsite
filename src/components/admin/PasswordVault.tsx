'use client'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Copy, Eye, EyeOff, KeyRound, Pencil, Plus, Trash2, ShieldCheck, ChevronDown, ExternalLink, FolderKey, Search, X, Link2 } from 'lucide-react'
import './password-vault.css'

type Account = { id: string; project: string; username: string; is_admin: number }
type Project = { project: string; login_url: string; admin_url: string }
const blank = { id: '', project: '', username: '', password: '', is_admin: false }
const emptyProject = { project: '', login_url: '', admin_url: '' }
export default function PasswordVault({ scope = 'admin' }: { scope?: 'admin' | 'employee' }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [permissions, setPermissions] = useState({ admin: false, add: false, reveal: false })
  const [form, setForm] = useState(blank)
  const [projectForm, setProjectForm] = useState(emptyProject)
  const [editor, setEditor] = useState<'project' | 'account' | null>(null)
  const [editingProject, setEditingProject] = useState(false)
  const [visible, setVisible] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLButtonElement>(null)
  const visibilityEpoch = useRef(0)
  function hideSecrets() { visibilityEpoch.current++; setVisible({}) }
  async function api(method = 'GET', body?: unknown) {
    const response = await fetch(`/api/${scope}/password-vault`, { method, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
    const data = await response.json().catch(() => ({ error: 'تعذر الاتصال بخدمة كلمات المرور' }))
    if (!response.ok) { if (response.status === 401 || response.status === 403) hideSecrets(); throw new Error(data.error || 'تعذر تنفيذ العملية') }
    return data
  }
  async function refresh() {
    const data = await api()
    setAccounts(data.accounts); setProjects(data.projects); setPermissions(data.permissions)
  }
  useEffect(() => { refresh().catch(e => setError(e.message)).finally(() => setLoading(false)) }, [scope]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const hide = () => { if (document.hidden) hideSecrets() }
    document.addEventListener('visibilitychange', hide)
    const timer = window.setInterval(hideSecrets, 60000)
    return () => { visibilityEpoch.current++; document.removeEventListener('visibilitychange', hide); window.clearInterval(timer) }
  }, [])
  useEffect(() => {
    if (editor) { editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); editorRef.current?.querySelector<HTMLInputElement>('input:not([readonly])')?.focus({ preventScroll: true }) }
  }, [editor])
  async function perform(work: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('')
    try { await work() } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تنفيذ العملية') } finally { setBusy(false) }
  }
  function closeEditor() { setEditor(null); setForm(blank); setProjectForm(emptyProject); toolbarRef.current?.focus() }
  function addProject() { hideSecrets(); setEditingProject(false); setProjectForm(emptyProject); setEditor('project'); setError(''); setNotice('') }
  function editProject(project: string) { hideSecrets(); setEditingProject(true); setProjectForm(projects.find(p => p.project === project) || { ...emptyProject, project }); setEditor('project'); setError(''); setNotice('') }
  function editAccount(project: string, account?: Account) { hideSecrets(); setForm(account ? { ...account, password: '', is_admin: account.is_admin === 1 } : { ...blank, project }); setEditor('account'); setError(''); setNotice('') }
  async function saveAccount(event: FormEvent) {
    event.preventDefault()
    await perform(async () => { await api(form.id ? 'PUT' : 'POST', form); await refresh(); setOpen(values => ({ ...values, [form.project]: true })); closeEditor(); hideSecrets(); setNotice('تم حفظ الحساب داخل المشروع') })
  }
  async function saveProject(event: FormEvent) {
    event.preventDefault()
    await perform(async () => {
      const result = await api('POST', { ...projectForm, action: 'project' })
      await refresh(); const name = result.project || projectForm.project.trim()
      setSearch(''); setOpen(values => ({ ...values, [name]: true })); closeEditor(); setNotice('تم حفظ المشروع وروابط الدخول')
    })
  }
  async function copy(value: string) { await navigator.clipboard.writeText(value); setNotice('تم النسخ') }
  async function togglePassword(id: string) {
    if (visible[id] !== undefined) { setVisible(values => { const next = { ...values }; delete next[id]; return next }); return }
    const epoch = visibilityEpoch.current
    const data = await api('POST', { id, action: 'reveal' })
    if (epoch === visibilityEpoch.current && !document.hidden) setVisible(values => ({ ...values, [id]: data.password }))
  }
  const names = Array.from(new Set([...projects.map(p => p.project), ...accounts.map(a => a.project)]))
  const query = search.trim().toLocaleLowerCase()
  const filteredNames = names.filter(name => name.toLocaleLowerCase().includes(query) || accounts.some(a => a.project === name && a.username.toLocaleLowerCase().includes(query)))
  return <section className="vault" aria-label="كلمات مرور المشاريع">
    <header className="vault-header"><div className="vault-heading"><span className="vault-mark"><KeyRound size={23} /></span><div><h2>كلمات مرور المشاريع</h2><p>روابط الدخول وحساباتك، مرتبة حسب المشروع.</p></div></div>{permissions.add && <button ref={toolbarRef} type="button" className="vault-primary" disabled={busy} onClick={addProject}><Plus size={17} />مشروع جديد</button>}</header>
    <div className="vault-toolbar"><label className="vault-search"><Search size={18} /><span className="sr-only">بحث بالمشروع أو اسم المستخدم</span><input type="search" placeholder="ابحث عن مشروع أو اسم مستخدم…" value={search} onChange={e => { setSearch(e.target.value); hideSecrets() }} /></label><span className="vault-count">{names.length} مشروع <span>·</span> {accounts.length} حساب</span></div>
    {error && <p role="alert" className="vault-message vault-error">{error}</p>}
    {notice && <p role="status" className="vault-message vault-success">{notice}</p>}
    {permissions.add && editor && <div className="vault-editor" ref={editorRef}>
      <div className="vault-editor-heading"><div><h3>{editor === 'project' ? editingProject ? 'روابط دخول المشروع' : 'مشروع جديد' : form.id ? 'تعديل الحساب' : 'حساب جديد'}</h3><p>{editor === 'account' ? form.project : editingProject ? projectForm.project : 'أضف المشروع وروابطه، ثم أضف حساباته من داخله.'}</p></div><button type="button" className="vault-icon" aria-label="إغلاق النموذج" disabled={busy} onClick={closeEditor}><X size={19} /></button></div>
      {editor === 'project' ? <form onSubmit={saveProject} className="vault-form">
        {!editingProject && <label className="vault-wide">اسم المشروع<input required maxLength={150} value={projectForm.project} onChange={e => setProjectForm({ ...projectForm, project: e.target.value })} placeholder="مثال: موقع الشركة" /></label>}
        <label>رابط تسجيل الدخول<input type="text" inputMode="url" dir="ltr" maxLength={2048} placeholder="example.com/login" value={projectForm.login_url} onChange={e => setProjectForm({ ...projectForm, login_url: e.target.value })} /></label>
        <label>رابط تسجيل دخول الأدمن<input type="text" inputMode="url" dir="ltr" maxLength={2048} placeholder="example.com/admin" value={projectForm.admin_url} onChange={e => setProjectForm({ ...projectForm, admin_url: e.target.value })} /></label>
        <div className="vault-form-actions vault-wide"><button disabled={busy} className="vault-primary">{busy ? 'جارٍ الحفظ…' : 'حفظ المشروع والروابط'}</button><button type="button" className="vault-secondary" disabled={busy} onClick={closeEditor}>إلغاء</button></div>
      </form> : <form onSubmit={saveAccount} className="vault-form">
        <label>اسم المستخدم<input required dir="ltr" autoComplete="off" maxLength={254} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></label>
        <label>كلمة المرور<input type="password" dir="ltr" autoComplete="new-password" required={!form.id} maxLength={4096} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />{form.id && <small>اتركها فارغة للاحتفاظ بكلمة المرور الحالية.</small>}</label>
        <label className="vault-admin-check vault-wide"><input type="checkbox" checked={form.is_admin} onChange={e => setForm({ ...form, is_admin: e.target.checked })} /><ShieldCheck size={18} />حساب أدمن <span>يظهر باللون الذهبي</span></label>
        <div className="vault-form-actions vault-wide"><button disabled={busy} className="vault-primary">{busy ? 'جارٍ الحفظ…' : 'حفظ الحساب'}</button><button type="button" disabled={busy} className="vault-secondary" onClick={closeEditor}>إلغاء</button></div>
      </form>}
    </div>}
    {loading ? <div className="vault-empty">جارٍ تحميل المشاريع…</div> : !filteredNames.length && !error && <div className="vault-empty"><FolderKey size={32} /><h3>{search ? 'لا توجد نتائج' : 'ابدأ بمشروعك الأول'}</h3><p>{search ? 'جرّب البحث باسم مشروع أو مستخدم آخر.' : 'كل مشروع يجمع روابط الدخول والحسابات في مكان واحد.'}</p>{permissions.add && !search && <button type="button" className="vault-secondary" onClick={addProject}><Plus size={16} />إضافة مشروع</button>}</div>}
    <div className="vault-projects">{filteredNames.map(project => {
      const metadata = projects.find(p => p.project === project)
      const projectAccounts = accounts.filter(a => a.project === project)
      const expanded = Object.hasOwn(open, project) && open[project]
      return <article key={project} className={`vault-project ${expanded ? 'is-open' : ''}`}>
        <button type="button" aria-expanded={!!expanded} aria-controls={`vault-project-${encodeURIComponent(project)}`} className="vault-project-toggle" onClick={() => { setOpen(values => ({ ...values, [project]: !expanded })); hideSecrets() }}>
          <span className="vault-project-icon"><FolderKey size={22} /></span><span className="vault-project-title"><strong>{project}</strong><small>{projectAccounts.length} حساب</small></span><ChevronDown size={19} className="vault-chevron" />
        </button>
        {expanded && <div id={`vault-project-${encodeURIComponent(project)}`} className="vault-project-body">
          <div className="vault-project-section-heading"><h4><Link2 size={16} />روابط الدخول</h4>{permissions.admin && <button type="button" className="vault-text" disabled={busy} onClick={() => editProject(project)}><Pencil size={14} />تعديل الروابط</button>}</div>
          <div className="vault-links">{(['login_url', 'admin_url'] as const).map(key => {
            const url = metadata?.[key]
            return <div key={key} className={`vault-link ${key === 'admin_url' ? 'vault-link-admin' : ''}`}><span className="vault-link-label">{key === 'admin_url' ? <ShieldCheck size={16} /> : <ExternalLink size={16} />}{key === 'admin_url' ? 'دخول الأدمن' : 'تسجيل الدخول'}</span>{url ? <div className="vault-link-value"><a href={url} target="_blank" rel="noreferrer" dir="ltr" title={url}>{url}<ExternalLink size={14} /></a><button type="button" className="vault-icon" aria-label={key === 'admin_url' ? 'نسخ رابط دخول الأدمن' : 'نسخ رابط تسجيل الدخول'} disabled={busy} onClick={() => void perform(() => copy(url))}><Copy size={16} /></button></div> : <span className="vault-link-empty">لم يُضف رابط بعد</span>}</div>
          })}</div>
          <div className="vault-project-section-heading"><h4>الحسابات <span>{projectAccounts.length}</span></h4>{permissions.add && <button type="button" className="vault-secondary" disabled={busy} onClick={() => editAccount(project)}><Plus size={15} />إضافة حساب</button>}</div>
          {!projectAccounts.length && <p className="vault-no-accounts">أضف أول حساب لهذا المشروع.</p>}
          <div className="vault-accounts">{projectAccounts.map(account => <div key={account.id} className={`vault-account ${account.is_admin ? 'vault-account-admin' : ''}`}>
            <div className="vault-account-heading"><span className={`vault-badge ${account.is_admin ? 'vault-badge-admin' : ''}`}>{account.is_admin === 1 ? <><ShieldCheck size={14} />أدمن</> : 'مستخدم'}</span>{permissions.admin && <div className="vault-account-actions"><button type="button" disabled={busy} className="vault-icon" aria-label={`تعديل حساب ${account.username}`} title="تعديل الحساب" onClick={() => editAccount(project, account)}><Pencil size={15} /></button><button type="button" disabled={busy} className="vault-icon vault-delete" aria-label={`حذف حساب ${account.username}`} title="حذف الحساب" onClick={() => { if (window.confirm(`حذف حساب ${account.username} من ${account.project}؟`)) void perform(async () => { await api('DELETE', { id: account.id }); hideSecrets(); if (form.id === account.id) closeEditor(); await refresh(); setNotice('تم حذف الحساب') }) }}><Trash2 size={15} /></button></div>}</div>
            <div className="vault-credential"><span>اسم المستخدم</span><div><bdi>{account.username}</bdi><button type="button" disabled={busy} className="vault-icon" aria-label="نسخ اسم المستخدم" title="نسخ اسم المستخدم" onClick={() => void perform(() => copy(account.username))}><Copy size={16} /></button></div></div>
            <div className="vault-credential"><span>كلمة المرور</span><div><bdi className="vault-password">{visible[account.id] ?? '••••••••••••'}</bdi>{permissions.reveal ? <><button type="button" disabled={busy} className="vault-icon" title={visible[account.id] !== undefined ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} aria-label={visible[account.id] !== undefined ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} onClick={() => void perform(() => togglePassword(account.id))}>{visible[account.id] !== undefined ? <EyeOff size={17} /> : <Eye size={17} />}</button><button type="button" disabled={busy} className="vault-icon" title="نسخ كلمة المرور" aria-label="نسخ كلمة المرور" onClick={() => void perform(async () => { const data = await api('POST', { id: account.id, action: 'reveal' }); await copy(data.password) })}><Copy size={16} /></button></> : <small>بدون صلاحية كشف</small>}</div></div>
          </div>)}</div>
        </div>}
      </article>
    })}</div>
  </section>
}
