import { json, type Env } from './store'
import { recordAdminNotification } from './notifications'
import {
  extractArticleExcerpt,
  hasUnsafeArticleMarkup,
  validateMarkdownLinks,
} from '../../src/lib/article-content'

export interface ArticleCategoryRow {
  id: string
  slug: string
  name_ar: string
  name_en: string
  sort_order: number
  created_at: number
  article_count?: number
}

interface ArticleDbRow {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  category_id: string
  category_slug?: string
  category_name_ar?: string
  category_name_en?: string
  cover_mime: string
  cover_base64?: string
  static_cover_url?: string
  cover_alt: string
  status: 'published' | 'draft'
  author_type: 'admin' | 'employee'
  author_employee_id: string | null
  author_employee_name?: string | null
  idempotency_key: string | null
  published_at: number | null
  created_at: number
  updated_at: number
}

export type ArticleActor =
  | { role: 'admin' }
  | { role: 'employee'; employeeId: string; employeeName: string }

const MAX_IMAGE_BYTES = 1024 * 1024 // 1 MB
const MAX_PAYLOAD_BYTES = 1_650_000
const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp'])

function hasValidImageMagicBytes(mime: string, bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false
  if (mime === 'image/png') {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    )
  }
  if (mime === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  if (mime === 'image/webp') {
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    )
  }
  return false
}

function parseCoverDataUrl(value: unknown): { ok: true; mime: string; base64: string } | { ok: false; status: number; error: string } {
  if (typeof value !== 'string' || !value.trim()) {
    return { ok: false, status: 422, error: 'صورة غلاف المقال مطلوبة (PNG أو JPG أو WebP).' }
  }
  const match = value.trim().match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/)
  if (!match || !ALLOWED_MIMES.has(match[1])) {
    return { ok: false, status: 422, error: 'صيغة الصورة غير مدعومة. استخدم PNG أو JPEG أو WebP فقط.' }
  }
  const mime = match[1]
  const base64 = match[2]
  let decoded: string
  try {
    decoded = atob(base64)
  } catch {
    return { ok: false, status: 422, error: 'تعذر قراءة بيانات الصورة المرفوعة.' }
  }
  if (decoded.length === 0 || decoded.length > MAX_IMAGE_BYTES) {
    return { ok: false, status: 413, error: 'حجم صورة المقال يجب ألا يتجاوز ١ ميجابايت.' }
  }
  const bytes = new Uint8Array(decoded.length)
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i)
  if (!hasValidImageMagicBytes(mime, bytes)) {
    return { ok: false, status: 422, error: 'محتوى الملف لا يطابق صورة PNG أو JPEG أو WebP صالحة.' }
  }
  return { ok: true, mime, base64 }
}

function toAsciiSlug(input: string, prefix = 'article'): string {
  const ascii = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
  return ascii && ascii !== 'read' ? `${ascii}-${suffix}` : `${prefix}-${suffix}`
}

function toCategorySlug(input: string): string {
  const ascii = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return ascii || `cat-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`
}

function resolveCoverUrl(row: ArticleDbRow, scope?: 'admin' | 'employee') {
  const staticPath = row.static_cover_url || (row.cover_mime === 'static' ? row.cover_base64 : '')
  if (row.cover_mime === 'static' && typeof staticPath === 'string' && /^\/images\/articles\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp)$/i.test(staticPath)) {
    return staticPath
  }
  return scope
    ? `/api/${scope}/articles/image?id=${encodeURIComponent(row.id)}&v=${row.updated_at}`
    : `/api/articles/image?id=${encodeURIComponent(row.id)}&v=${row.updated_at}`
}

function publicArticleDto(row: ArticleDbRow, includeContent: boolean) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    ...(includeContent ? { content: row.content } : {}),
    category_id: row.category_id,
    category_slug: row.category_slug || '',
    category_name_ar: row.category_name_ar || '',
    category_name_en: row.category_name_en || '',
    cover_url: resolveCoverUrl(row),
    cover_alt: row.cover_alt || row.title,
    published_at: row.published_at || row.created_at,
    updated_at: row.updated_at,
  }
}

function managedArticleDto(row: ArticleDbRow, scope: 'admin' | 'employee') {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    category_id: row.category_id,
    category_slug: row.category_slug || '',
    category_name_ar: row.category_name_ar || '',
    category_name_en: row.category_name_en || '',
    cover_url: resolveCoverUrl(row, scope),
    cover_alt: row.cover_alt || row.title,
    status: row.status,
    ...(scope === 'admin'
      ? {
          author_type: row.author_type,
          author_label: row.author_type === 'admin' ? 'الإدارة' : row.author_employee_name || 'موظف',
        }
      : {}),
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function binaryImageResponse(mime: string, base64: string, isPublic: boolean) {
  if (!ALLOWED_MIMES.has(mime)) return json({ error: 'صيغة الصورة غير مدعومة' }, 422)
  let bytes: Uint8Array
  try {
    const raw = atob(base64)
    bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  } catch {
    return json({ error: 'تعذر قراءة الصورة' }, 500)
  }
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Cache-Control': isPublic ? 'public, max-age=3600, stale-while-revalidate=86400' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  })
}

function migrationMissingError(error: unknown): boolean {
  return error instanceof Error && /no such (table|column):\s*(articles|article_categories|manage_articles)/i.test(error.message)
}

export async function publicArticles(request: Request, env: Env, subPath = '') {
  if (!env.DB) return json({ error: 'الخدمة غير جاهزة' }, 503)
  if (request.method !== 'GET') return json({ error: 'طريقة الطلب غير مسموحة' }, 405)

  try {
    const url = new URL(request.url)

    if (subPath === 'image') {
      const id = (url.searchParams.get('id') || '').trim()
      if (!id || id.length > 80) return json({ error: 'الصورة غير موجودة' }, 404)
      const row = await env.DB.prepare(
        "SELECT cover_mime, cover_base64 FROM articles WHERE id = ? AND status = 'published'"
      )
        .bind(id)
        .first<{ cover_mime: string; cover_base64: string }>()
      if (!row?.cover_base64) return json({ error: 'الصورة غير موجودة' }, 404)
      return binaryImageResponse(row.cover_mime, row.cover_base64, true)
    }

    if (subPath !== '') return json({ error: 'غير موجود' }, 404)

    const slug = (url.searchParams.get('slug') || '').trim().toLowerCase()
    if (slug) {
      if (slug.length > 120 || !/^[a-z0-9-]+$/.test(slug)) {
        return json({ error: 'المقال غير موجود' }, 404)
      }
      const row = await env.DB.prepare(
        `SELECT a.id, a.slug, a.title, a.excerpt, a.content, a.category_id, a.cover_mime, a.cover_alt,
                CASE WHEN a.cover_mime = 'static' THEN a.cover_base64 ELSE '' END AS static_cover_url,
                a.status, a.published_at, a.created_at, a.updated_at,
                c.slug AS category_slug, c.name_ar AS category_name_ar, c.name_en AS category_name_en
         FROM articles a
         JOIN article_categories c ON c.id = a.category_id
         WHERE a.slug = ? AND a.status = 'published'`
      )
        .bind(slug)
        .first<ArticleDbRow>()
      if (!row) return json({ error: 'المقال غير موجود' }, 404)
      return json(
        { article: publicArticleDto(row, true) },
        200,
        { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }
      )
    }

    const categorySlug = (url.searchParams.get('category') || '').trim().toLowerCase()
    const rawLimit = Number(url.searchParams.get('limit') || 60)
    const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.floor(rawLimit))) : 60

    const categoriesQuery = env.DB.prepare(
      `SELECT c.id, c.slug, c.name_ar, c.name_en, c.sort_order, c.created_at,
              (SELECT COUNT(*) FROM articles a WHERE a.category_id = c.id AND a.status = 'published') AS article_count
       FROM article_categories c
       ORDER BY c.sort_order ASC, c.created_at ASC`
    ).all<ArticleCategoryRow>()

    const articlesQuery = categorySlug
      ? env.DB.prepare(
          `SELECT a.id, a.slug, a.title, a.excerpt, a.category_id, a.cover_mime, a.cover_alt,
                  CASE WHEN a.cover_mime = 'static' THEN a.cover_base64 ELSE '' END AS static_cover_url,
                  a.status, a.published_at, a.created_at, a.updated_at,
                  c.slug AS category_slug, c.name_ar AS category_name_ar, c.name_en AS category_name_en
           FROM articles a
           JOIN article_categories c ON c.id = a.category_id
           WHERE a.status = 'published' AND c.slug = ?
           ORDER BY COALESCE(a.published_at, a.created_at) DESC, a.created_at DESC
           LIMIT ?`
        )
          .bind(categorySlug, limit)
          .all<ArticleDbRow>()
      : env.DB.prepare(
          `SELECT a.id, a.slug, a.title, a.excerpt, a.category_id, a.cover_mime, a.cover_alt,
                  CASE WHEN a.cover_mime = 'static' THEN a.cover_base64 ELSE '' END AS static_cover_url,
                  a.status, a.published_at, a.created_at, a.updated_at,
                  c.slug AS category_slug, c.name_ar AS category_name_ar, c.name_en AS category_name_en
           FROM articles a
           JOIN article_categories c ON c.id = a.category_id
           WHERE a.status = 'published'
           ORDER BY COALESCE(a.published_at, a.created_at) DESC, a.created_at DESC
           LIMIT ?`
        )
          .bind(limit)
          .all<ArticleDbRow>()

    const [categories, articles] = await Promise.all([categoriesQuery, articlesQuery])
    return json(
      {
        articles: articles.results.map((row) => publicArticleDto(row, false)),
        categories: categories.results,
      },
      200,
      { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }
    )
  } catch (error) {
    if (migrationMissingError(error)) {
      return json({ articles: [], categories: [] }, 200)
    }
    throw error
  }
}

export async function manageArticles(request: Request, env: Env, actor: ArticleActor, subPath = '') {
  if (!env.DB) return json({ error: 'الخدمة غير جاهزة' }, 503)
  const scope = actor.role === 'admin' ? 'admin' : 'employee'

  try {
    if (subPath === 'image') {
      if (request.method !== 'GET') return json({ error: 'طريقة الطلب غير مسموحة' }, 405)
      const id = (new URL(request.url).searchParams.get('id') || '').trim()
      if (!id || id.length > 80) return json({ error: 'الصورة غير موجودة' }, 404)
      const row =
        actor.role === 'admin'
          ? await env.DB.prepare('SELECT cover_mime, cover_base64 FROM articles WHERE id = ?')
              .bind(id)
              .first<{ cover_mime: string; cover_base64: string }>()
          : await env.DB.prepare(
              'SELECT cover_mime, cover_base64 FROM articles WHERE id = ? AND author_employee_id = ?'
            )
              .bind(id, actor.employeeId)
              .first<{ cover_mime: string; cover_base64: string }>()
      if (!row?.cover_base64) return json({ error: 'الصورة غير موجودة' }, 404)
      return binaryImageResponse(row.cover_mime, row.cover_base64, false)
    }

    if (request.method === 'GET') {
      const [categories, articles] = await Promise.all([
        env.DB.prepare(
          `SELECT c.id, c.slug, c.name_ar, c.name_en, c.sort_order, c.created_at,
                  (SELECT COUNT(*) FROM articles a WHERE a.category_id = c.id) AS article_count
           FROM article_categories c
           ORDER BY c.sort_order ASC, c.created_at ASC`
        ).all<ArticleCategoryRow>(),
        actor.role === 'admin'
          ? env.DB.prepare(
              `SELECT a.id, a.slug, a.title, a.excerpt, a.content, a.category_id, a.cover_mime, a.cover_alt,
                      CASE WHEN a.cover_mime = 'static' THEN a.cover_base64 ELSE '' END AS static_cover_url,
                      a.status, a.author_type, a.author_employee_id, a.published_at, a.created_at, a.updated_at,
                      c.slug AS category_slug, c.name_ar AS category_name_ar, c.name_en AS category_name_en,
                      e.name AS author_employee_name
               FROM articles a
               JOIN article_categories c ON c.id = a.category_id
               LEFT JOIN employees e ON e.id = a.author_employee_id
               ORDER BY a.created_at DESC LIMIT 200`
            ).all<ArticleDbRow>()
          : env.DB.prepare(
              `SELECT a.id, a.slug, a.title, a.excerpt, a.content, a.category_id, a.cover_mime, a.cover_alt,
                      CASE WHEN a.cover_mime = 'static' THEN a.cover_base64 ELSE '' END AS static_cover_url,
                      a.status, a.author_type, a.author_employee_id, a.published_at, a.created_at, a.updated_at,
                      c.slug AS category_slug, c.name_ar AS category_name_ar, c.name_en AS category_name_en
               FROM articles a
               JOIN article_categories c ON c.id = a.category_id
               WHERE a.author_employee_id = ?
               ORDER BY a.created_at DESC LIMIT 200`
            )
              .bind(actor.employeeId)
              .all<ArticleDbRow>(),
      ])
      return json({
        articles: articles.results.map((row) => managedArticleDto(row, scope)),
        categories: categories.results,
      })
    }

    if (request.method === 'DELETE') {
      if (actor.role !== 'admin') {
        return json({ error: 'حذف المقالات متاح للإدارة فقط.' }, 403)
      }
      const raw = await request.text()
      if (raw.length > 1024) return json({ error: 'طلب كبير جدًا' }, 413)
      let body: { id?: unknown }
      try {
        body = JSON.parse(raw) as { id?: unknown }
      } catch {
        return json({ error: 'بيانات غير صالحة' }, 400)
      }
      if (typeof body.id !== 'string' || !body.id.trim() || body.id.length > 80) {
        return json({ error: 'حدد المقال المطلوب حذفه.' }, 422)
      }
      const existing = await env.DB.prepare('SELECT id FROM articles WHERE id = ?').bind(body.id.trim()).first()
      if (!existing) return json({ error: 'المقال غير موجود.' }, 404)
      await env.DB.prepare('DELETE FROM articles WHERE id = ?').bind(body.id.trim()).run()
      return json({ success: true })
    }

    if (request.method === 'POST') {
      if (Number(request.headers.get('Content-Length') || 0) > MAX_PAYLOAD_BYTES) {
        return json({ error: 'حجم البيانات أو الصورة كبير جدًا. الحد الأقصى للصورة ١ ميجابايت.' }, 413)
      }
      const raw = await request.text()
      if (raw.length > MAX_PAYLOAD_BYTES) {
        return json({ error: 'حجم البيانات أو الصورة كبير جدًا. الحد الأقصى للصورة ١ ميجابايت.' }, 413)
      }
      let body: Record<string, unknown>
      try {
        body = JSON.parse(raw) as Record<string, unknown>
      } catch {
        return json({ error: 'بيانات المقال غير صالحة.' }, 400)
      }

      const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : ''
      if (id.length > 80) return json({ error: 'معرف المقال غير صحيح.' }, 422)

      const idempotencyKey =
        typeof body.idempotency_key === 'string' && body.idempotency_key.trim()
          ? body.idempotency_key.trim().slice(0, 80)
          : null

      if (!id && idempotencyKey) {
        const duplicate = await env.DB.prepare(
          `SELECT a.id, a.slug, a.title, a.excerpt, a.content, a.category_id, a.cover_mime, a.cover_alt,
                  a.status, a.author_type, a.author_employee_id, a.published_at, a.created_at, a.updated_at,
                  c.slug AS category_slug, c.name_ar AS category_name_ar, c.name_en AS category_name_en,
                  e.name AS author_employee_name
           FROM articles a
           JOIN article_categories c ON c.id = a.category_id
           LEFT JOIN employees e ON e.id = a.author_employee_id
           WHERE a.idempotency_key = ?`
        )
          .bind(idempotencyKey)
          .first<ArticleDbRow>()
        if (duplicate) {
          if (actor.role === 'employee' && duplicate.author_employee_id !== actor.employeeId) {
            return json({ error: 'مفتاح الإرسال مستخدم بالفعل.' }, 409)
          }
          return json({ article: managedArticleDto(duplicate, scope), idempotent: true })
        }
      }

      const title = typeof body.title === 'string' ? body.title.trim() : ''
      if (title.length < 3 || title.length > 200) {
        return json({ error: 'عنوان المقال مطلوب ويجب أن يكون بين ٣ و٢٠٠ حرف.' }, 422)
      }
      if (hasUnsafeArticleMarkup(title)) {
        return json({ error: 'عنوان المقال يحتوي على وسوم أو أكواد غير مسموحة.' }, 422)
      }

      const categoryId = typeof body.category_id === 'string' ? body.category_id.trim() : ''
      if (!categoryId || categoryId.length > 80) {
        return json({ error: 'اختر تصنيف المقال.' }, 422)
      }
      const category = await env.DB.prepare(
        'SELECT id, slug, name_ar, name_en FROM article_categories WHERE id = ?'
      )
        .bind(categoryId)
        .first<{ id: string; slug: string; name_ar: string; name_en: string }>()
      if (!category) {
        return json({ error: 'التصنيف المحدد غير موجود.' }, 422)
      }

      const content = typeof body.content === 'string' ? body.content.replace(/\r\n/g, '\n').trim() : ''
      if (content.length < 40 || content.length > 50000) {
        return json({ error: 'نص المقال مطلوب ويجب أن يكون بين ٤٠ و٥٠٠٠٠ حرف.' }, 422)
      }
      if (hasUnsafeArticleMarkup(content)) {
        return json({ error: 'محتوى المقال يحتوي على وسوم أو أكواد غير آمنة (مثل script أو javascript:).' }, 422)
      }
      const linkCheck = validateMarkdownLinks(content)
      if (!linkCheck.ok) {
        return json({ error: linkCheck.reason }, 422)
      }

      const rawExcerpt = typeof body.excerpt === 'string' ? body.excerpt.trim() : ''
      if (rawExcerpt.length > 320) {
        return json({ error: 'المقتطف يجب ألا يتجاوز ٣٢٠ حرفًا.' }, 422)
      }
      if (rawExcerpt && hasUnsafeArticleMarkup(rawExcerpt)) {
        return json({ error: 'المقتطف يحتوي على أكواد غير مسموحة.' }, 422)
      }
      const excerpt = rawExcerpt || extractArticleExcerpt(content, 190)

      const rawCoverAlt = typeof body.cover_alt === 'string' ? body.cover_alt.trim() : ''
      if (rawCoverAlt.length > 200 || (rawCoverAlt && hasUnsafeArticleMarkup(rawCoverAlt))) {
        return json({ error: 'النص البديل للصورة غير صالح (حد أقصى ٢٠٠ حرف).' }, 422)
      }
      const coverAlt = rawCoverAlt || title

      const status = body.status === undefined ? 'published' : String(body.status)
      if (status !== 'published' && status !== 'draft') {
        return json({ error: 'حالة المقال يجب أن تكون منشور أو مسودة.' }, 422)
      }

      const now = Date.now()

      if (id) {
        const existing = await env.DB.prepare('SELECT * FROM articles WHERE id = ?')
          .bind(id)
          .first<ArticleDbRow>()
        if (!existing) return json({ error: 'المقال غير موجود.' }, 404)
        if (actor.role === 'employee' && existing.author_employee_id !== actor.employeeId) {
          return json({ error: 'يمكنك تعديل المقالات التي أضفتها فقط.' }, 403)
        }

        let coverMime = existing.cover_mime
        let coverBase64 = existing.cover_base64 || ''
        if (typeof body.cover_image === 'string' && body.cover_image.trim()) {
          const parsed = parseCoverDataUrl(body.cover_image)
          if (!parsed.ok) return json({ error: parsed.error }, parsed.status)
          coverMime = parsed.mime
          coverBase64 = parsed.base64
        }

        const publishedAt =
          status === 'published' ? existing.published_at || now : existing.published_at

        await env.DB.prepare(
          `UPDATE articles
           SET title = ?, excerpt = ?, content = ?, category_id = ?, cover_mime = ?, cover_base64 = ?,
               cover_alt = ?, status = ?, published_at = ?, updated_at = ?
           WHERE id = ?`
        )
          .bind(title, excerpt, content, category.id, coverMime, coverBase64, coverAlt, status, publishedAt, now, id)
          .run()

        if (actor.role === 'employee') {
          try {
            await recordAdminNotification(env, {
              actor: actor.employeeName,
              eventType: 'article_updated',
              title: 'تعديل مقال',
              detail: `${actor.employeeName} عدّل المقال: «${title.slice(0, 120)}»`,
              target: 'overview',
            })
          } catch (error) {
            console.error('[article-update-notification]', error)
          }
        }

        const updated: ArticleDbRow = {
          ...existing,
          title,
          excerpt,
          content,
          category_id: category.id,
          category_slug: category.slug,
          category_name_ar: category.name_ar,
          category_name_en: category.name_en,
          cover_mime: coverMime,
          cover_alt: coverAlt,
          status,
          published_at: publishedAt,
          updated_at: now,
        }
        return json({ article: managedArticleDto(updated, scope) })
      }

      // New article: cover image is required
      const parsedCover = parseCoverDataUrl(body.cover_image)
      if (!parsedCover.ok) return json({ error: parsedCover.error }, parsedCover.status)

      const newId = crypto.randomUUID()
      let slug = toAsciiSlug(title, 'article')
      for (let attempt = 0; attempt < 5; attempt++) {
        const collision = await env.DB.prepare('SELECT id FROM articles WHERE slug = ?').bind(slug).first()
        if (!collision) break
        slug = toAsciiSlug(title, 'article')
      }

      const publishedAt = status === 'published' ? now : null
      const authorType = actor.role === 'admin' ? 'admin' : 'employee'
      const authorEmployeeId = actor.role === 'employee' ? actor.employeeId : null

      await env.DB.prepare(
        `INSERT INTO articles(
          id, slug, title, excerpt, content, category_id, cover_mime, cover_base64, cover_alt,
          status, author_type, author_employee_id, idempotency_key, published_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          newId,
          slug,
          title,
          excerpt,
          content,
          category.id,
          parsedCover.mime,
          parsedCover.base64,
          coverAlt,
          status,
          authorType,
          authorEmployeeId,
          idempotencyKey,
          publishedAt,
          now,
          now
        )
        .run()

      if (actor.role === 'employee') {
        try {
          await recordAdminNotification(env, {
            actor: actor.employeeName,
            eventType: 'article_created',
            title: 'مقال جديد',
            detail: `${actor.employeeName} أضاف مقالًا جديدًا: «${title.slice(0, 120)}»`,
            target: 'overview',
          })
        } catch (error) {
          console.error('[article-create-notification]', error)
        }
      }

      const created: ArticleDbRow = {
        id: newId,
        slug,
        title,
        excerpt,
        content,
        category_id: category.id,
        category_slug: category.slug,
        category_name_ar: category.name_ar,
        category_name_en: category.name_en,
        cover_mime: parsedCover.mime,
        cover_alt: coverAlt,
        status,
        author_type: authorType,
        author_employee_id: authorEmployeeId,
        author_employee_name: actor.role === 'employee' ? actor.employeeName : null,
        idempotency_key: idempotencyKey,
        published_at: publishedAt,
        created_at: now,
        updated_at: now,
      }
      return json({ article: managedArticleDto(created, scope) }, 201)
    }

    return json({ error: 'طريقة الطلب غير مسموحة' }, 405)
  } catch (error) {
    if (migrationMissingError(error)) {
      return json(
        { error: 'ميزة المقالات تحتاج تطبيق تحديث قاعدة البيانات 0024_articles_and_permissions.sql أولًا.' },
        503
      )
    }
    throw error
  }
}

export async function manageArticleCategories(request: Request, env: Env) {
  if (!env.DB) return json({ error: 'الخدمة غير جاهزة' }, 503)
  try {
    if (request.method === 'GET') {
      const rows = await env.DB.prepare(
        `SELECT c.id, c.slug, c.name_ar, c.name_en, c.sort_order, c.created_at,
                (SELECT COUNT(*) FROM articles a WHERE a.category_id = c.id) AS article_count
         FROM article_categories c
         ORDER BY c.sort_order ASC, c.created_at ASC`
      ).all<ArticleCategoryRow>()
      return json({ categories: rows.results })
    }

    if (request.method === 'POST') {
      const raw = await request.text()
      if (raw.length > 2048) return json({ error: 'طلب كبير جدًا' }, 413)
      let body: Record<string, unknown>
      try {
        body = JSON.parse(raw) as Record<string, unknown>
      } catch {
        return json({ error: 'بيانات غير صالحة' }, 400)
      }
      const nameAr = typeof body.name_ar === 'string' ? body.name_ar.trim() : ''
      const nameEn = typeof body.name_en === 'string' && body.name_en.trim() ? body.name_en.trim() : nameAr
      if (nameAr.length < 2 || nameAr.length > 80 || nameEn.length > 80) {
        return json({ error: 'اسم التصنيف يجب أن يكون بين حرفين و٨٠ حرفًا.' }, 422)
      }
      if (hasUnsafeArticleMarkup(nameAr) || hasUnsafeArticleMarkup(nameEn)) {
        return json({ error: 'اسم التصنيف يحتوي على رموز غير مسموحة.' }, 422)
      }
      const duplicate = await env.DB.prepare(
        'SELECT id FROM article_categories WHERE lower(name_ar) = lower(?) OR lower(name_en) = lower(?)'
      )
        .bind(nameAr, nameEn)
        .first()
      if (duplicate) return json({ error: 'هذا التصنيف موجود بالفعل.' }, 409)

      const id = `cat-${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`
      let slug = toCategorySlug(nameEn)
      const slugExists = await env.DB.prepare('SELECT id FROM article_categories WHERE slug = ?').bind(slug).first()
      if (slugExists) slug = `${slug}-${crypto.randomUUID().slice(0, 4)}`
      const maxOrder = await env.DB.prepare('SELECT MAX(sort_order) AS m FROM article_categories').first<{ m: number | null }>()
      const sortOrder = (maxOrder?.m || 0) + 1
      const now = Date.now()
      await env.DB.prepare(
        'INSERT INTO article_categories(id, slug, name_ar, name_en, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(id, slug, nameAr, nameEn, sortOrder, now)
        .run()
      return json({ category: { id, slug, name_ar: nameAr, name_en: nameEn, sort_order: sortOrder, created_at: now, article_count: 0 } }, 201)
    }

    if (request.method === 'DELETE') {
      const raw = await request.text()
      if (raw.length > 1024) return json({ error: 'طلب كبير جدًا' }, 413)
      let body: { id?: unknown }
      try {
        body = JSON.parse(raw) as { id?: unknown }
      } catch {
        return json({ error: 'بيانات غير صالحة' }, 400)
      }
      if (typeof body.id !== 'string' || !body.id.trim()) {
        return json({ error: 'حدد التصنيف المطلوب حذفه.' }, 422)
      }
      const inUse = await env.DB.prepare('SELECT COUNT(*) AS count FROM articles WHERE category_id = ?')
        .bind(body.id.trim())
        .first<{ count: number }>()
      if ((inUse?.count || 0) > 0) {
        return json({ error: 'لا يمكن حذف تصنيف مرتبط بمقالات حالية.' }, 409)
      }
      await env.DB.prepare('DELETE FROM article_categories WHERE id = ?').bind(body.id.trim()).run()
      return json({ success: true })
    }

    return json({ error: 'طريقة الطلب غير مسموحة' }, 405)
  } catch (error) {
    if (migrationMissingError(error)) {
      return json(
        { error: 'ميزة التصنيفات تحتاج تطبيق تحديث قاعدة البيانات 0024_articles_and_permissions.sql أولًا.' },
        503
      )
    }
    throw error
  }
}
