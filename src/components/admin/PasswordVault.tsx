'use client'
import { useEffect, useState, type FormEvent } from 'react'
import { Copy, Eye, EyeOff, KeyRound, Pencil, Trash2, ShieldCheck } from 'lucide-react'

type Account = { id: string; project: string; username: string; is_admin: number }
const blank = { id: '', project: '', username: '', password: '', is_admin: false }
const input = 'w-full rounded-xl border border-slate-300 bg-white p-3 mt-1'
async function api(method = 'GET', body?: unknown) {
  const response = await fetch('/api/admin/password-vault', { method, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'تعذر تنفيذ العملية')
  return data
}
export default function PasswordVault() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [form, setForm] = useState(blank)
  const [visible, setVisible] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  async function refresh() { const data = await api(); setAccounts(data.accounts) }
  useEffect(() => { refresh().catch(e => setError(e.message)).finally(() => setLoading(false)) }, [])
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
  const filtered = accounts.filter(a => `${a.project} ${a.username}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
  const projects = Array.from(new Set(filtered.map(a => a.project)))
  return <section className="rounded-2xl border bg-white p-5 sm:p-7 space-y-6">
    <div className="flex items-center gap-3"><KeyRound className="text-amber-600" /><div><h2 className="text-xl font-bold">كلمات مرور المشاريع</h2><p className="text-sm text-slate-500">أكتر من حساب لكل مشروع · متاحة للإدارة فقط</p></div></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 text-red-700 p-3">{error}</p>}
    {notice && <p role="status" className="text-green-700">{notice}</p>}
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2 rounded-xl bg-slate-50 p-4">
      <h3 className="sm:col-span-2 font-bold">{form.id ? 'تعديل الحساب' : 'إضافة حساب'}</h3>
      <label>المشروع<input className={input} required maxLength={150} list="vault-projects" value={form.project} onChange={e => setForm({ ...form, project: e.target.value })} /></label>
      <datalist id="vault-projects">{Array.from(new Set(accounts.map(a => a.project))).map(project => <option key={project} value={project} />)}</datalist>
      <label>اسم المستخدم<input className={input} required dir="ltr" autoComplete="off" maxLength={254} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></label>
      <label>كلمة المرور{form.id && <small className="block text-slate-500">اتركها فارغة للاحتفاظ بالحالية</small>}<input className={input} type="password" dir="ltr" autoComplete="new-password" required={!form.id} maxLength={4096} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
      <label className="flex items-center gap-2 text-amber-700"><input type="checkbox" checked={form.is_admin} onChange={e => setForm({ ...form, is_admin: e.target.checked })} /><ShieldCheck size={19} />حساب أدمن (ذهبي)</label>
      <div className="sm:col-span-2 flex gap-4"><button disabled={busy || loading} className="rounded-xl bg-sky-600 text-white px-5 py-3 font-bold disabled:opacity-50">{busy ? 'جارٍ التنفيذ…' : 'حفظ الحساب'}</button>{form.id && <button type="button" disabled={busy} onClick={() => setForm(blank)}>إلغاء</button>}</div>
    </form>
    <label className="block">بحث بالمشروع أو اسم المستخدم<input className={input} type="search" value={search} onChange={e => setSearch(e.target.value)} /></label>
    {loading ? <p>جارٍ التحميل…</p> : !projects.length && !error && <p className="rounded-xl border border-dashed p-6 text-center text-slate-500">لا توجد حسابات{search ? ' مطابقة للبحث' : ' محفوظة بعد'}.</p>}
    {projects.map(project => <article key={project} className="space-y-3"><h3 className="font-bold text-lg break-words">{project}</h3><div className="grid gap-3 md:grid-cols-2">{filtered.filter(a => a.project === project).map(account => <div key={account.id} className={`rounded-xl border p-4 space-y-3 ${account.is_admin ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
      {account.is_admin === 1 && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800"><ShieldCheck size={16} />أدمن</span>}
      <div><span className="text-xs text-slate-500">اسم المستخدم</span><div className="flex items-center gap-2"><bdi className="flex-1 break-all">{account.username}</bdi><button type="button" disabled={busy} aria-label="نسخ اسم المستخدم" title="نسخ اسم المستخدم" onClick={() => void perform(() => copy(account.username))}><Copy size={18} /></button></div></div>
      <div><span className="text-xs text-slate-500">كلمة المرور</span><div className="flex items-center gap-3"><bdi className="flex-1 break-all font-mono">{visible[account.id] ?? '••••••••••••'}</bdi><button type="button" disabled={busy} aria-label={visible[account.id] !== undefined ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} onClick={() => void perform(async () => { if (visible[account.id] !== undefined) setVisible(values => { const next = { ...values }; delete next[account.id]; return next }); else { const data = await api('POST', { id: account.id, action: 'reveal' }); setVisible(values => ({ ...values, [account.id]: data.password })) } })}>{visible[account.id] !== undefined ? <EyeOff size={18} /> : <Eye size={18} />}</button><button type="button" disabled={busy} title="نسخ كلمة المرور" aria-label="نسخ كلمة المرور" onClick={() => void perform(async () => { const data = await api('POST', { id: account.id, action: 'reveal' }); await copy(data.password) })}><Copy size={18} /></button></div></div>
      <div className="flex gap-4 border-t pt-3 text-sm"><button type="button" disabled={busy} className="inline-flex items-center gap-1 text-sky-700" onClick={() => { setForm({ ...account, password: '', is_admin: account.is_admin === 1 }); setVisible({}); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Pencil size={15} />تعديل</button><button type="button" disabled={busy} className="inline-flex items-center gap-1 text-red-700" onClick={() => { if (window.confirm(`حذف حساب ${account.username} من ${account.project}؟`)) void perform(async () => { await api('DELETE', { id: account.id }); setVisible({}); if (form.id === account.id) setForm(blank); await refresh(); setNotice('تم حذف الحساب') }) }}><Trash2 size={15} />حذف</button></div>
    </div>)}</div></article>)}
  </section>
}
