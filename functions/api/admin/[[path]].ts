import { passwordVault } from '../../lib/password-vault'
import { staffChat } from '../../lib/staff-chat'
import { serviceSubscriptions } from '../../lib/service-subscriptions'
import { workProjects } from '../../lib/work-projects'
import { authenticated, hash, json, sameOrigin, verifyPassword, type Env } from '../../lib/store'
import { adminEmployees } from '../../lib/employees'
import { manageProjects } from '../../lib/projects'
import { adminHub } from '../../lib/hub-admin'
import { d1UsageResponse } from '../../lib/d1-usage'
import { adminNotifications } from '../../lib/notifications'
import { createDatabaseBackup } from '../../lib/database-backup'

export async function onRequest({ request, env }: { request: Request; env: Env }) {
  try {
    if (!env.DB || !env.ADMIN_EMAIL || !env.ADMIN_PASSWORD_HASH) return json({ error: 'لوحة الإدارة لم تُجهز بعد. راجع إعدادات Cloudflare.' }, 503)
    const path = new URL(request.url).pathname.replace(/^\/api\/admin\/?/, '').replace(/\/$/, '')
    const now = Date.now()
    if (request.method !== 'GET' && !sameOrigin(request)) return json({ error: 'طلب غير مسموح' }, 403)
    if (path === 'login' && request.method === 'POST') {
      if (!/^[a-f0-9]{48}:[a-f0-9]{64}$/.test(env.ADMIN_PASSWORD_HASH.trim())) return json({ error: 'إعداد كلمة المرور في Cloudflare غير سليم. حدّث ADMIN_PASSWORD_HASH بالقيمة الناتجة بعد علامة = فقط، ثم أعد النشر.' }, 503)
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
      const emailMatches = body.email.trim().toLowerCase() === env.ADMIN_EMAIL.trim().toLowerCase()
      if (!valid || !emailMatches) {
        console.warn(`[admin-login] Rejected: ${!valid && !emailMatches ? 'email_and_password_mismatch' : !valid ? 'password_mismatch' : 'email_mismatch'}`)
        return json({ error: 'بيانات الدخول غير صحيحة' }, 401)
      }
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
    if (path === 'password-vault') return await passwordVault(request, env)
    if (path === 'database-backup' && request.method === 'POST') return await createDatabaseBackup(env)
    if(path==='chat')return await staffChat(request,env,{key:'admin',name:'الإدارة'})
    if (path === 'service-subscriptions') return await serviceSubscriptions(request, env)
    if (path === 'notifications') return await adminNotifications(request, env)
    if (['employees', 'attendance', 'employee-requests', 'payroll'].includes(path)) return await adminEmployees(request, env, path)
    if (path === 'work-projects') return await workProjects(request, env, true)
    if (path === 'd1-usage' && request.method === 'GET') return await d1UsageResponse(env)
    if (path.startsWith('hub-')) return await adminHub(request, env, path, env.ADMIN_EMAIL.trim())
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
    if (path === 'projects') return await manageProjects(request, env)
    return json({ error: 'غير موجود' }, 404)
  } catch (error) {
    console.error('Admin request failed', error)
    if (error instanceof Error && error.message.startsWith('backup_too_large:')) return json({ error: 'حجم النسخة أكبر من الحد الذي يمكن تنزيله من لوحة الإدارة. استخدم تصدير Wrangler من Cloudflare لتنزيل قاعدة بهذا الحجم.' }, 413)
    if (error instanceof Error && /no such table:\s*attendance_shifts/i.test(error.message)) return json({error:'يلزم تنفيذ تحديث قاعدة البيانات 0011_employee_multiple_shifts.sql لتفعيل الورديات المتعددة'},503)
    return json({ error: 'تعذر تنفيذ الطلب. راجع إعدادات قاعدة البيانات.' }, 500)
  }
}
function cairoOffset(now: number) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', timeZoneName: 'shortOffset' }).formatToParts(new Date(now))
  const hours = Number(parts.find(x => x.type === 'timeZoneName')?.value.replace('GMT', '') || 2)
  return `${hours >= 0 ? '+' : ''}${hours} hours`
}
