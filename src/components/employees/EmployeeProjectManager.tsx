'use client'
import { useEffect, useState, type FormEvent } from 'react'
import type { Project } from '@/types'
import { action, field } from './shared'

const blank = { title: '', titleEn: '', description: '', descriptionEn: '', link: '', image: '', category: 'website', id: '', status: 'published' }
async function api(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`/api/employee/${path}`, { method, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) })
  const data = await response.json().catch(() => ({ error: 'تعذر الاتصال بالخدمة' }))
  if (!response.ok) throw new Error(data.error || 'تعذر تنفيذ الطلب')
  return data
}

export default function EmployeeProjectManager() {
  const [projects, setProjects] = useState<Project[]>([])
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  async function load() { const data = await api('projects'); setProjects(data.projects) }
  useEffect(() => { load().catch(e => setError(e.message)).finally(() => setLoading(false)) }, [])
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('')
    try { await api('projects', 'POST', form); await load(); setForm(blank); setNotice('تم حفظ المشروع في معرض الأعمال.') }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر حفظ المشروع') }
    finally { setBusy(false) }
  }
  async function upload(file?: File) {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) { setError('اختار صورة PNG أو JPEG أو WebP بحجم حتى ١ ميجابايت.'); return }
    const reader = new FileReader(); reader.onload = () => setForm(current => ({ ...current, image: String(reader.result) })); reader.readAsDataURL(file)
  }
  return <section className="rounded-2xl border bg-white p-5 sm:p-7">
    <h2 className="text-xl font-extrabold">إدارة معرض الأعمال</h2><p className="mt-1 text-sm text-slate-500">إضافة المشاريع أو تعديلها أو إخفاؤها من الموقع.</p>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}{notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-800">{notice}</p>}
    <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2">
      <h3 className="sm:col-span-2 font-bold">{form.id ? 'تعديل مشروع' : 'إضافة مشروع جديد'}</h3>
      {([['title','عنوان المشروع','text'],['titleEn','العنوان بالإنجليزية (اختياري)','text'],['link','رابط المشروع','url']] as const).map(([key,label,type]) => <label key={key}>{label}<input className={field} type={type} value={form[key]} maxLength={key==='link'?2000:200} required={key==='title'} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}
      <label>التصنيف<select className={field} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="website">موقع إلكتروني</option><option value="ecommerce">متجر إلكتروني</option><option value="system">نظام مخصص</option><option value="saas">SaaS</option></select></label>
      <label>حالة المشروع<select className={field} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="published">منشور</option><option value="draft">مخفي</option></select></label>
      <label>الوصف<textarea className={field} rows={4} required maxLength={5000} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
      <label>الوصف بالإنجليزية<textarea className={field} rows={4} maxLength={5000} value={form.descriptionEn} onChange={e=>setForm({...form,descriptionEn:e.target.value})}/></label>
      <label>صورة المشروع<input type="file" accept="image/png,image/jpeg,image/webp" className={field} onChange={e=>upload(e.target.files?.[0])}/><small className="mt-1 block text-slate-500">حتى ١ ميجابايت، أو أضف رابط صورة HTTPS.</small><input aria-label="رابط الصورة" type="url" className={`${field} mt-2`} value={form.image.startsWith('data:')?'':form.image} onChange={e=>setForm({...form,image:e.target.value})}/></label>
      {form.image && <img src={form.image} alt="معاينة صورة المشروع" className="h-40 w-full rounded-xl bg-slate-100 object-contain"/>}
      <div className="sm:col-span-2 flex gap-3"><button disabled={busy} className={action}>{busy?'جارٍ الحفظ…':form.id?'حفظ التعديل':'إضافة المشروع'}</button>{form.id&&<button type="button" className="px-3" onClick={()=>setForm(blank)}>إلغاء</button>}</div>
    </form>
    <div className="mt-7 space-y-3">{loading?<p>جارٍ تحميل المشاريع…</p>:projects.map(project=><article key={project.id} className="flex flex-wrap items-center gap-3 border-t pt-3">{project.image&&<img src={project.image} alt="" className="h-12 w-16 rounded object-cover"/>}<span className="flex-1 font-bold">{project.titleAr} <small className="font-normal text-slate-500">{project.status==='draft'?'· مخفي':''}</small></span><button className="text-sky-700" onClick={()=>setForm({id:project.id,title:project.titleAr,titleEn:project.titleEn,description:project.descriptionAr,descriptionEn:project.descriptionEn,link:project.link||'',image:project.image||'',category:project.category,status:project.status})}>تعديل / إخفاء</button></article>)}{!loading&&!projects.length&&<p className="text-slate-500">لا توجد مشاريع في المعرض.</p>}</div>
  </section>
}
