import { authenticated, hash, json, sameOrigin, verifyPassword, type Env } from '../../lib/store'

export async function onRequest({ request, env }: { request: Request; env: Env }) {
  try {
    if (!env.DB || !env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH) return json({ error: 'لوحة الإدارة لم تُجهز بعد. راجع إعدادات Cloudflare.' }, 503)
    const path = new URL(request.url).pathname.replace(/^\/api\/admin\/?/, '').replace(/\/$/, '')
    const now = Date.now()
    if (request.method !== 'GET' && !sameOrigin(request)) return json({ error: 'طلب غير مسموح' }, 403)
    if (path === 'login' && request.method === 'POST') {
      const key = await hash(request.headers.get('CF-Connecting-IP') || 'local')
      const bucket = Math.floor(now / 900000)
      const keys = [key + ':' + bucket, 'global:' + bucket]
      await env.DB.batch(keys.map(k => env.DB!.prepare('INSERT INTO login_attempts(key, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1').bind(k, now + 900000)))
      const attempts = await Promise.all(keys.map(k => env.DB!.prepare('SELECT attempts FROM login_attempts WHERE key = ?').bind(k).first<{ attempts: number }>()))
      if ((attempts[0]?.attempts || 0) > 5 || (attempts[1]?.attempts || 0) > 50) return json({ error: 'محاولات كثيرة. حاول بعد ١٥ دقيقة.' }, 429)
      const raw = await request.text()
      if (raw.length > 4096) return json({ error: 'طلب كبير جدًا' }, 413)
      const body = JSON.parse(raw) as Record<string, unknown>
      if (typeof body.email !== 'string' || typeof body.password !== 'string' || body.password.length > 256) return json({ error: 'بيانات الدخول غير صحيحة' }, 401)
      const valid = await verifyPassword(body.password, env.ADMIN_PASSWORD_HASH)
      if (!valid || body.email.trim().toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) return json({ error: 'بيانات الدخول غير صحيحة' }, 401)
      const token = crypto.randomUUID() + crypto.randomUUID()
      await env.DB.batch([
        env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
        env.DB.prepare('DELETE FROM login_attempts WHERE expires_at <= ?').bind(now),
        env.DB.prepare('INSERT INTO sessions VALUES (?, ?, ?)').bind(await hash(token), now + 28800000, await hash(env.ADMIN_PASSWORD_HASH)),
      ])
      const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
      return json({ success: true }, 200, { 'Set-Cookie': `daidar_session=${token}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=28800${secure}` })
    }
    if (!await authenticated(request, env)) return json({ error: 'سجل دخولك أولاً' }, 401)
    if (path === 'session' && request.method === 'GET') return json({ email: env.ADMIN_EMAIL })
    if (path === 'logout' && request.method === 'POST') {
      const token = request.headers.get('Cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith('daidar_session='))?.slice(15)
      if (token) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(await hash(token)).run()
      return json({ success: true }, 200, { 'Set-Cookie': 'daidar_session=; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=0; Secure' })
    }
    if (path === 'stats' && request.method === 'GET') {
      const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now))
      const stats = await Promise.all([0, 7, 30, 365].map(async days => {
        const since = now - days * 86400000
        const visitors = days === 0
          ? await env.DB!.prepare('SELECT COUNT(DISTINCT visitor) AS count FROM visits WHERE day = ?').bind(day).first<{ count: number }>()
          : await env.DB!.prepare('SELECT COUNT(DISTINCT visitor) AS count FROM visits WHERE seen_at >= ?').bind(since).first<{ count: number }>()
        const emails = await env.DB!.prepare(days === 0
          ? "SELECT COUNT(*) AS count FROM messages WHERE status = 'sent' AND date(created_at / 1000, 'unixepoch', ?) = ?"
          : "SELECT COUNT(*) AS count FROM messages WHERE status = 'sent' AND created_at >= ?")
          .bind(...(days === 0 ? [cairoOffset(now), day] : [since])).first<{ count: number }>()
        return { days, visitors: visitors?.count || 0, emails: emails?.count || 0 }
      }))
      return json({ stats })
    }
    if (path === 'messages' && request.method === 'GET') {
      const days = Number(new URL(request.url).searchParams.get('days') || 7)
      if (![1, 7, 30, 365].includes(days)) return json({ error: 'فترة غير صحيحة' }, 400)
      const rows = await env.DB.prepare("SELECT * FROM messages WHERE created_at >= ? ORDER BY created_at DESC LIMIT 500").bind(now - days * 86400000).all()
      return json({ messages: rows.results, limited: rows.results.length === 500 })
    }
    if (path === 'projects' && request.method === 'GET') {
      const rows = await env.DB.prepare('SELECT data FROM managed_projects ORDER BY created_at DESC').all<{ data: string }>()
      return json({ projects: rows.results.map(x => JSON.parse(x.data)) })
    }
    if (path === 'projects' && request.method === 'POST') {
      if (Number(request.headers.get('Content-Length') || 0) > 1500000) return json({ error: 'الصورة كبيرة جدًا' }, 413)
      const raw = await request.text()
      if (raw.length > 1500000) return json({ error: 'الصورة كبيرة جدًا' }, 413)
      const body = JSON.parse(raw)
      if ((body.titleEn !== undefined && typeof body.titleEn !== 'string') || (body.descriptionEn !== undefined && typeof body.descriptionEn !== 'string')) return json({ error: 'بيانات غير صحيحة' }, 422)
      if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200 || typeof body.description !== 'string' || !body.description.trim() || body.description.length > 5000 || !['website', 'system', 'ecommerce', 'saas'].includes(body.category)) return json({ error: 'راجع عنوان المشروع والوصف والتصنيف' }, 422)
      if (!validUrl(body.link) || !(validUrl(body.image) || (typeof body.image === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(body.image)))) return json({ error: 'أضف رابط HTTPS وصورة PNG أو JPEG أو WebP' }, 422)
      const id = typeof body.id === 'string' && /^[a-f0-9-]{36}$/.test(body.id) ? body.id : crypto.randomUUID()
      const project = { id, slug: id, category: body.category, status: 'published', titleAr: body.title.trim(), titleEn: body.titleEn?.trim().slice(0, 200) || body.title.trim(), descriptionAr: body.description.trim(), descriptionEn: body.descriptionEn?.trim().slice(0, 5000) || body.description.trim(), longDescriptionAr: body.description.trim(), longDescriptionEn: body.description.trim(), technologiesAr: [], technologiesEn: [], featuresAr: [], featuresEn: [], image: body.image, link: body.link, order: -now, managed: true }
      await env.DB.prepare('INSERT INTO managed_projects VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data').bind(id, JSON.stringify(project), now).run()
      return json({ project })
    }
    if (path === 'projects' && request.method === 'DELETE') {
      const { id } = await request.json() as { id: string }
      await env.DB.prepare('DELETE FROM managed_projects WHERE id = ?').bind(id).run()
      return json({ success: true })
    }
    return json({ error: 'غير موجود' }, 404)
  } catch (error) {
    console.error('Admin request failed', error)
    return json({ error: 'تعذر تنفيذ الطلب. راجع إعدادات قاعدة البيانات.' }, 500)
  }
}
function validUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > 2000) return false
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password } catch { return false }
}
function cairoOffset(now: number) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', timeZoneName: 'shortOffset' }).formatToParts(new Date(now))
  const hours = Number(parts.find(x => x.type === 'timeZoneName')?.value.replace('GMT', '') || 2)
  return `${hours >= 0 ? '+' : ''}${hours} hours`
}
