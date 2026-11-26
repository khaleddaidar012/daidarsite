'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Bold,
  CheckCircle2,
  ExternalLink,
  Eye,
  FilePenLine,
  Heading2,
  Heading3,
  ImagePlus,
  Link2,
  List,
  ListOrdered,
  Plus,
  Quote,
  RefreshCw,
  Tag,
  Trash2,
} from 'lucide-react'
import { action, field } from '@/components/employees/shared'
import { ArticleBody } from '@/components/articles/ArticleBody'
import { hasUnsafeArticleMarkup, isSafeHttpsUrl } from '@/lib/article-content'

interface CategoryItem {
  id: string
  slug: string
  name_ar: string
  name_en: string
  article_count?: number
}

interface ManagedArticle {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  category_id: string
  category_slug: string
  category_name_ar: string
  category_name_en: string
  cover_url: string
  cover_alt: string
  status: 'published' | 'draft'
  author_type?: 'admin' | 'employee'
  author_label?: string
  published_at: number | null
  created_at: number
  updated_at: number
}

interface FormState {
  id: string
  title: string
  category_id: string
  cover_image: string
  cover_preview: string
  cover_alt: string
  excerpt: string
  content: string
  status: 'published' | 'draft'
}

const emptyForm: FormState = {
  id: '',
  title: '',
  category_id: '',
  cover_image: '',
  cover_preview: '',
  cover_alt: '',
  excerpt: '',
  content: '',
  status: 'published',
}

function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `art-${crypto.randomUUID()}`
  }
  return `art-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function apiRequest(scope: 'admin' | 'employee', path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`/api/${scope}/${path}`, {
    method,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({ error: 'تعذر الاتصال بالخدمة' }))
  if (!response.ok) {
    throw Object.assign(new Error(data.error || 'تعذر تنفيذ الطلب'), { status: response.status })
  }
  return data
}

export default function ArticleEditorManager({
  scope,
  onUnauthorized,
}: {
  scope: 'admin' | 'employee'
  onUnauthorized?: () => void
}) {
  const isAdmin = scope === 'admin'
  const [articles, setArticles] = useState<ManagedArticle[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [idempotencyKey, setIdempotencyKey] = useState<string>(createIdempotencyKey)
  const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [savedSlug, setSavedSlug] = useState('')
  const [newCatAr, setNewCatAr] = useState('')
  const [newCatEn, setNewCatEn] = useState('')
  const [catBusy, setCatBusy] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFailure = useCallback(
    (err: unknown) => {
      const e = err as Error & { status?: number }
      setError(e.message || 'تعذر تنفيذ الطلب')
      if (e.status === 401 && onUnauthorized) onUnauthorized()
    },
    [onUnauthorized]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest(scope, 'articles')
      setArticles(data.articles || [])
      const nextCategories: CategoryItem[] = data.categories || []
      setCategories(nextCategories)
      setForm((current) =>
        current.category_id || !nextCategories.length
          ? current
          : { ...current, category_id: nextCategories[0].id }
      )
    } catch (err) {
      handleFailure(err)
    } finally {
      setLoading(false)
    }
  }, [scope, handleFailure])

  useEffect(() => {
    void load()
  }, [load])

  function resetForm(keepNotice = false) {
    setForm({
      ...emptyForm,
      category_id: categories[0]?.id || '',
    })
    setIdempotencyKey(createIdempotencyKey())
    setEditorMode('write')
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!keepNotice) {
      setNotice('')
      setSavedSlug('')
    }
  }

  function startEdit(article: ManagedArticle) {
    setForm({
      id: article.id,
      title: article.title,
      category_id: article.category_id,
      cover_image: '',
      cover_preview: article.cover_url,
      cover_alt: article.cover_alt || article.title,
      excerpt: article.excerpt || '',
      content: article.content,
      status: article.status,
    })
    setIdempotencyKey(createIdempotencyKey())
    setEditorMode('write')
    setError('')
    setNotice('')
    setSavedSlug('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCoverSelect(file?: File) {
    if (!file) return
    setError('')
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('صيغة الصورة غير مدعومة. اختر صورة PNG أو JPG أو WebP فقط.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (file.size > 1024 * 1024) {
      setError('حجم الصورة يتجاوز الحد الأقصى (١ ميجابايت). ضغّط الصورة وحاول مرة أخرى.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || '')
      setForm((current) => ({
        ...current,
        cover_image: dataUrl,
        cover_preview: dataUrl,
        cover_alt: current.cover_alt || current.title,
      }))
    }
    reader.onerror = () => setError('تعذر قراءة ملف الصورة. حاول مرة أخرى.')
    reader.readAsDataURL(file)
  }

  function insertFormatting(prefix: string, suffix = '', placeholder = '') {
    const el = textareaRef.current
    if (!el) {
      setForm((c) => ({ ...c, content: `${c.content}${prefix}${placeholder}${suffix}` }))
      return
    }
    const start = el.selectionStart ?? form.content.length
    const end = el.selectionEnd ?? form.content.length
    const selected = form.content.slice(start, end) || placeholder
    const next = `${form.content.slice(0, start)}${prefix}${selected}${suffix}${form.content.slice(end)}`
    setForm((c) => ({ ...c, content: next }))
    window.requestAnimationFrame(() => {
      el.focus()
      const cursor = start + prefix.length + selected.length + suffix.length
      el.setSelectionRange(cursor, cursor)
    })
  }

  function insertLink() {
    const rawUrl = window.prompt('أدخل رابطًا آمنًا يبدأ بـ https://', 'https://')
    if (!rawUrl) return
    if (!isSafeHttpsUrl(rawUrl)) {
      setError('الرابط يجب أن يبدأ بـ https:// فقط بدون بيانات دخول.')
      return
    }
    const label = window.prompt('النص الذي سيظهر للرابط', 'اضغط هنا') || 'رابط'
    insertFormatting(`[${label.trim()}](${rawUrl.trim()})`)
  }

  async function submitArticle(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setError('')
    setNotice('')
    setSavedSlug('')

    const title = form.title.trim()
    const content = form.content.trim()

    if (title.length < 3 || title.length > 200) {
      setError('عنوان المقال مطلوب ويجب أن يكون بين ٣ و٢٠٠ حرف.')
      return
    }
    if (!form.category_id) {
      setError('يرجى اختيار تصنيف للمقال.')
      return
    }
    if (!form.id && !form.cover_image) {
      setError('صورة غلاف المقال مطلوبة (PNG أو JPG أو WebP بحد أقصى ١ ميجابايت).')
      return
    }
    if (content.length < 40) {
      setError('اكتب نص مقال واضح لا يقل عن ٤٠ حرفًا.')
      return
    }
    if (hasUnsafeArticleMarkup(title) || hasUnsafeArticleMarkup(content) || hasUnsafeArticleMarkup(form.excerpt)) {
      setError('المحتوى يحتوي على وسوم أو أكواد غير مسموحة. استخدم أدوات التنسيق الآمنة فقط.')
      return
    }

    setBusy(true)
    try {
      const payload = {
        ...(form.id ? { id: form.id } : { idempotency_key: idempotencyKey }),
        title,
        category_id: form.category_id,
        ...(form.cover_image ? { cover_image: form.cover_image } : {}),
        cover_alt: (form.cover_alt || title).trim(),
        excerpt: form.excerpt.trim(),
        content,
        status: form.status,
      }
      const result = await apiRequest(scope, 'articles', 'POST', payload)
      const saved: ManagedArticle = result.article
      await load()
      resetForm(true)
      setSavedSlug(saved.status === 'published' ? saved.slug : '')
      setNotice(
        form.id
          ? 'تم حفظ تعديلات المقال بنجاح.'
          : saved.status === 'published'
            ? 'تم نشر المقال بنجاح وأصبح متاحًا للزوار في قسم المقالات.'
            : 'تم حفظ المقال كمسودة (غير ظاهر للزوار).'
      )
    } catch (err) {
      // Never clear the employee's form on failure!
      handleFailure(err)
    } finally {
      setBusy(false)
    }
  }

  async function toggleStatus(article: ManagedArticle) {
    if (!isAdmin || busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const nextStatus = article.status === 'published' ? 'draft' : 'published'
      await apiRequest('admin', 'articles', 'POST', {
        id: article.id,
        title: article.title,
        category_id: article.category_id,
        cover_alt: article.cover_alt,
        excerpt: article.excerpt,
        content: article.content,
        status: nextStatus,
      })
      await load()
      setNotice(nextStatus === 'published' ? 'تم نشر المقال.' : 'تم إخفاء المقال وتحويله لمسودة.')
    } catch (err) {
      handleFailure(err)
    } finally {
      setBusy(false)
    }
  }

  async function deleteArticle(article: ManagedArticle) {
    if (!isAdmin || busy) return
    if (!window.confirm(`هل تريد حذف المقال «${article.title}» نهائيًا؟`)) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await apiRequest('admin', 'articles', 'DELETE', { id: article.id })
      if (form.id === article.id) resetForm(true)
      await load()
      setNotice('تم حذف المقال بنجاح.')
    } catch (err) {
      handleFailure(err)
    } finally {
      setBusy(false)
    }
  }

  async function addCategory(e: FormEvent) {
    e.preventDefault()
    if (!isAdmin || catBusy) return
    setCatBusy(true)
    setError('')
    setNotice('')
    try {
      await apiRequest('admin', 'article-categories', 'POST', {
        name_ar: newCatAr.trim(),
        name_en: newCatEn.trim(),
      })
      setNewCatAr('')
      setNewCatEn('')
      await load()
      setNotice('تمت إضافة التصنيف الجديد.')
    } catch (err) {
      handleFailure(err)
    } finally {
      setCatBusy(false)
    }
  }

  async function deleteCategory(cat: CategoryItem) {
    if (!isAdmin || catBusy) return
    if (!window.confirm(`حذف التصنيف «${cat.name_ar}»؟`)) return
    setCatBusy(true)
    setError('')
    setNotice('')
    try {
      await apiRequest('admin', 'article-categories', 'DELETE', { id: cat.id })
      await load()
      setNotice('تم حذف التصنيف.')
    } catch (err) {
      handleFailure(err)
    } finally {
      setCatBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <FilePenLine size={21} className="text-sky-600" />
              {form.id ? 'تعديل مقال' : 'إضافة مقال جديد'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isAdmin
                ? 'أضف مقالات جديدة أو عدّل وانشر المقالات التي كتبها الفريق.'
                : 'اكتب مقالًا احترافيًا منظمًا بالفقرات والعناوين. يمكنك تعديل مقالاتك الخاصة فقط، والنشر يظهر مباشرة في قسم المقالات.'}
            </p>
          </div>
          <a
            href="/ar/articles"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-sky-300 hover:text-sky-700"
          >
            <span>عرض صفحة المقالات</span>
            <ExternalLink size={14} />
          </a>
        </div>

        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0" />
              {notice}
            </span>
            {savedSlug && (
              <a
                href={`/ar/articles/${savedSlug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
              >
                فتح المقال
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        )}

        <form onSubmit={submitArticle} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Title */}
            <label className="block sm:col-span-2">
              <span className="mb-1.5 flex items-center justify-between text-sm font-bold text-slate-800">
                <span>عنوان المقال *</span>
                <span className="text-xs font-normal text-slate-400">{form.title.length} / 200</span>
              </span>
              <input
                type="text"
                required
                minLength={3}
                maxLength={200}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="مثال: كيف تختار النظام الإلكتروني المناسب لإدارة نشاطك التجاري"
                className={field}
              />
            </label>

            {/* Category */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-slate-800">التصنيف *</span>
              <select
                required
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className={field}
              >
                {!categories.length && <option value="">لا توجد تصنيفات متاحة</option>}
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name_ar}
                  </option>
                ))}
              </select>
            </label>

            {/* Publish status */}
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-slate-800">حالة النشر</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as 'published' | 'draft' })}
                className={field}
              >
                <option value="published">منشور (يظهر فورًا للزوار)</option>
                <option value="draft">مسودة (مخفي عن الزوار)</option>
              </select>
            </label>
          </div>

          {/* Cover Image Upload + Alt */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <ImagePlus size={16} className="text-sky-600" />
                صورة غلاف المقال {form.id ? '(اختياري عند التعديل)' : '*'}
              </span>
              <span className="text-xs text-slate-500">
                الصيغ المقبولة: PNG أو JPG أو WebP · الحد الأقصى ١ ميجابايت · يُفضّل أبعاد أفقية 16:10
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 items-start">
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleCoverSelect(e.target.files?.[0])}
                  className={field}
                />
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-slate-600">
                    وصف الصورة (النص البديل Alt — اختياري)
                  </span>
                  <input
                    type="text"
                    maxLength={200}
                    value={form.cover_alt}
                    onChange={(e) => setForm({ ...form, cover_alt: e.target.value })}
                    placeholder="وصف مختصر لما يظهر في الصورة"
                    className={field}
                  />
                </label>
              </div>

              {form.cover_preview ? (
                <div className="aspect-[16/10] w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <img
                    src={form.cover_preview}
                    alt={form.cover_alt || form.title || 'معاينة صورة المقال'}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-[16/10] w-full rounded-xl border-2 border-dashed border-slate-300 bg-white/80 flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5 p-4 text-center">
                  <ImagePlus size={26} />
                  <span>معاينة صورة الغلاف ستظهر هنا</span>
                </div>
              )}
            </div>
          </div>

          {/* Optional Excerpt */}
          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-sm font-bold text-slate-800">
              <span>مقتطف مختصر للبطاقة (اختياري — يُستخرج تلقائيًا من النص إن تُرك فارغًا)</span>
              <span className="text-xs font-normal text-slate-400">{form.excerpt.length} / 320</span>
            </span>
            <input
              type="text"
              maxLength={320}
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="ملخص قصير يظهر على بطاقة المقال في الشبكة"
              className={field}
            />
          </label>

          {/* Content Editor with Safe Formatting Toolbar + Live Preview */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  title="عنوان رئيسي"
                  onClick={() => insertFormatting('\n## ', '\n', 'عنوان فرعي')}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-white hover:text-sky-700"
                >
                  <Heading2 size={15} />
                  <span>عنوان</span>
                </button>
                <button
                  type="button"
                  title="عنوان فرعي"
                  onClick={() => insertFormatting('\n### ', '\n', 'نقطة فرعية')}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-white hover:text-sky-700"
                >
                  <Heading3 size={15} />
                </button>
                <button
                  type="button"
                  title="نص عريض"
                  onClick={() => insertFormatting('**', '**', 'نص مهم')}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-white hover:text-sky-700"
                >
                  <Bold size={15} />
                </button>
                <button
                  type="button"
                  title="قائمة نقطية"
                  onClick={() => insertFormatting('\n- ', '', 'عنصر في القائمة')}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-white hover:text-sky-700"
                >
                  <List size={15} />
                </button>
                <button
                  type="button"
                  title="قائمة مرقمة"
                  onClick={() => insertFormatting('\n1. ', '', 'الخطوة الأولى')}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-white hover:text-sky-700"
                >
                  <ListOrdered size={15} />
                </button>
                <button
                  type="button"
                  title="اقتباس"
                  onClick={() => insertFormatting('\n> ', '\n', 'ملاحظة أو اقتباس مهم')}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-white hover:text-sky-700"
                >
                  <Quote size={15} />
                </button>
                <button
                  type="button"
                  title="إدراج رابط آمن HTTPS"
                  onClick={insertLink}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-white hover:text-sky-700"
                >
                  <Link2 size={15} />
                  <span>رابط</span>
                </button>
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setEditorMode('write')}
                  className={`rounded-md px-3 py-1 ${editorMode === 'write' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600'}`}
                >
                  كتابة
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('preview')}
                  className={`inline-flex items-center gap-1 rounded-md px-3 py-1 ${editorMode === 'preview' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600'}`}
                >
                  <Eye size={13} />
                  معاينة
                </button>
              </div>
            </div>

            {editorMode === 'write' ? (
              <textarea
                ref={textareaRef}
                required
                minLength={40}
                maxLength={50000}
                rows={12}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder={`اكتب نص المقال هنا...\n\n## مثال لعنوان رئيسي\nاشرح الفكرة بوضوح في فقرات منظمة.\n\n- نقطة أولى\n- نقطة ثانية`}
                className="w-full p-4 text-sm leading-7 text-slate-900 focus:outline-none resize-y"
              />
            ) : (
              <div className="min-h-[280px] p-5 bg-white">
                {form.content.trim() ? (
                  <ArticleBody content={form.content} />
                ) : (
                  <p className="text-sm text-slate-400">اكتب نص المقال لتظهر المعاينة هنا.</p>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-xs text-slate-500">
              <span>يدعم العناوين والفقرات والقوائم والاقتباسات وروابط HTTPS الآمنة فقط.</span>
              <span>{form.content.length.toLocaleString('ar-EG')} / ٥٠٬٠٠٠ حرف</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy || !categories.length} className={action}>
              {busy
                ? 'جارٍ الحفظ…'
                : form.id
                  ? 'حفظ التعديلات'
                  : form.status === 'published'
                    ? 'نشر المقال الآن'
                    : 'حفظ كمسودة'}
            </button>
            {form.id && (
              <button
                type="button"
                disabled={busy}
                onClick={() => resetForm()}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                إلغاء التعديل
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Admin-only Categories Manager */}
      {isAdmin && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 mb-4">
            <Tag size={18} className="text-sky-600" />
            تصنيفات المقالات
          </h3>
          <form onSubmit={addCategory} className="grid gap-3 sm:grid-cols-3 mb-5">
            <input
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={newCatAr}
              onChange={(e) => setNewCatAr(e.target.value)}
              placeholder="اسم التصنيف بالعربية"
              className={field}
            />
            <input
              type="text"
              maxLength={80}
              dir="ltr"
              value={newCatEn}
              onChange={(e) => setNewCatEn(e.target.value)}
              placeholder="Category name in English (optional)"
              className={field}
            />
            <button
              type="submit"
              disabled={catBusy}
              className={`${action} inline-flex items-center justify-center gap-1.5`}
            >
              <Plus size={16} />
              <span>{catBusy ? 'جارٍ الإضافة…' : 'إضافة تصنيف'}</span>
            </button>
          </form>

          <div className="flex flex-wrap gap-2.5">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm"
              >
                <span className="font-bold text-slate-800">{cat.name_ar}</span>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">
                  {(cat.article_count || 0).toLocaleString('ar-EG')}
                </span>
                {(cat.article_count || 0) === 0 && (
                  <button
                    type="button"
                    disabled={catBusy}
                    onClick={() => void deleteCategory(cat)}
                    title="حذف التصنيف"
                    className="text-red-600 hover:text-red-800 disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Articles List */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              {isAdmin ? 'كل المقالات' : 'مقالاتك المضافة'} ({articles.length.toLocaleString('ar-EG')})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin
                ? 'يمكنك تعديل أي مقال أو إخفاؤه أو حذفه نهائيًا.'
                : 'تظهر هنا المقالات التي كتبتها أنت فقط.'}
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            تحديث
          </button>
        </div>

        {loading ? (
          <p className="py-6 text-sm text-slate-500">جارٍ تحميل المقالات…</p>
        ) : !articles.length ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            لا توجد مقالات مضافة بعد. اكتب أول مقال من النموذج أعلاه.
          </p>
        ) : (
          <div className="space-y-3">
            {articles.map((article) => (
              <article
                key={article.id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-slate-200 p-3.5 hover:border-sky-200 transition-colors"
              >
                <div className="w-full sm:w-28 aspect-[16/10] shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                  <img
                    src={article.cover_url}
                    alt={article.cover_alt || article.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700 border border-sky-100">
                      {article.category_name_ar}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                        article.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {article.status === 'published' ? 'منشور' : 'مسودة'}
                    </span>
                    {isAdmin && article.author_label && (
                      <span className="text-xs text-slate-500">بواسطة: {article.author_label}</span>
                    )}
                    <span className="text-xs text-slate-400">
                      {new Date(article.published_at || article.created_at).toLocaleDateString('ar-EG', {
                        timeZone: 'Africa/Cairo',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 truncate">{article.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{article.excerpt}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {article.status === 'published' && (
                    <a
                      href={`/ar/articles/${article.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-sky-300 hover:text-sky-700"
                    >
                      قراءة
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => startEdit(article)}
                    className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100"
                  >
                    تعديل
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void toggleStatus(article)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        {article.status === 'published' ? 'إخفاء' : 'نشر'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void deleteArticle(article)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
                      >
                        <Trash2 size={13} />
                        حذف
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
