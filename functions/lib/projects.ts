import { projects as originals } from '../../src/data/projects'
import type { Env } from './store'
import { json } from './store'
import type { Project } from '../../src/types'
export { originals }
export async function allProjects(env: Env) {
  const rows = await env.DB!.prepare('SELECT data FROM managed_projects ORDER BY created_at DESC').all<{ data: string }>()
  const overrides = rows.results.map(row => JSON.parse(row.data) as Project)
  return [...overrides, ...originals.filter(p => !overrides.some(o => o.id === p.id))]
}

export async function manageProjects(request: Request, env: Env) {
  const method = request.method
  if (method === 'GET') return json({ projects: await allProjects(env) })
  if (method === 'POST') {
    if (Number(request.headers.get('Content-Length') || 0) > 1500000) return json({ error: 'الصورة كبيرة جدًا' }, 413)
    const raw = await request.text()
    if (raw.length > 1500000) return json({ error: 'الصورة كبيرة جدًا' }, 413)
    let body: Record<string, unknown>
    try { body = JSON.parse(raw) as Record<string, unknown> } catch { return json({ error: 'بيانات المشروع غير صالحة' }, 400) }
    if ((body.titleEn !== undefined && typeof body.titleEn !== 'string') || (body.descriptionEn !== undefined && typeof body.descriptionEn !== 'string')) return json({ error: 'بيانات غير صحيحة' }, 422)
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200 || typeof body.description !== 'string' || !body.description.trim() || body.description.length > 5000 || !['website', 'system', 'ecommerce', 'saas'].includes(String(body.category))) return json({ error: 'راجع عنوان المشروع والوصف والتصنيف' }, 422)
    if ((body.link && !validUrl(body.link)) || (body.image && !(validUrl(body.image) || (typeof body.image === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(body.image))))) return json({ error: 'استخدم روابط HTTPS وصورة PNG أو JPEG أو WebP' }, 422)
    const existing = body.id ? (await allProjects(env)).find(project => project.id === body.id) : undefined
    if (body.id && !existing) return json({ error: 'المشروع غير موجود' }, 404)
    if (body.status !== undefined && !['published', 'draft'].includes(String(body.status))) return json({ error: 'حالة غير صحيحة' }, 422)
    const id = existing?.id || crypto.randomUUID()
    const original = originals.find(project => project.id === id)
    const now = Date.now()
    const project: Project = { ...existing, id, slug: existing?.slug || id, category: body.category as Project['category'], status: (body.status as Project['status']) || 'published', titleAr: body.title.trim(), titleEn: (body.titleEn as string | undefined)?.trim().slice(0, 200) || body.title.trim(), descriptionAr: body.description.trim(), descriptionEn: (body.descriptionEn as string | undefined)?.trim().slice(0, 5000) || body.description.trim(), longDescriptionAr: body.description.trim(), longDescriptionEn: (body.descriptionEn as string | undefined)?.trim().slice(0, 5000) || body.description.trim(), technologiesAr: existing?.technologiesAr || [], technologiesEn: existing?.technologiesEn || [], featuresAr: existing?.featuresAr || [], featuresEn: existing?.featuresEn || [], image: (body.image as string | undefined) || null, link: (body.link as string | undefined) || null, order: existing?.order ?? -now, managed: !original }
    await env.DB!.prepare('INSERT INTO managed_projects VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data').bind(id, JSON.stringify(project), now).run()
    return json({ project })
  }
  if (method === 'DELETE') {
    let body: { id?: unknown }
    try { body = await request.json() as { id?: unknown } } catch { return json({ error: 'بيانات المشروع غير صالحة' }, 400) }
    if (typeof body.id !== 'string' || !body.id) return json({ error: 'حدد المشروع المطلوب حذفه' }, 422)
    if (originals.some(project => project.id === body.id)) return json({ error: 'لإخفاء مشروع أصلي، غيّر حالته إلى مخفي من التعديل' }, 409)
    await env.DB!.prepare('DELETE FROM managed_projects WHERE id = ?').bind(body.id).run()
    return json({ success: true })
  }
  return json({ error: 'طريقة الطلب غير مسموحة' }, 405)
}

function validUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > 2000) return false
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password } catch { return false }
}
