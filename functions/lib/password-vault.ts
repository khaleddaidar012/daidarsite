import { json, type Env } from './store'

export async function passwordVault(request: Request, env: Env, access = { admin: true, add: true, reveal: true }) {
  if (!access.admin && !access.add && !access.reveal) return json({ error: 'حسابك لا يملك صلاحية كلمات المرور' }, 403)
  if (!access.admin && request.method !== 'GET' && request.method !== 'POST') return json({ error: 'التعديل والحذف للإدارة فقط' }, 403)
  if (!env.PASSWORD_VAULT_KEY || !/^[a-f0-9]{64}$/i.test(env.PASSWORD_VAULT_KEY)) return json({ error: 'يلزم إعداد السر PASSWORD_VAULT_KEY في Cloudflare (مفتاح عشوائي من 64 خانة hex).' }, 503)
  const bytes = Uint8Array.from(env.PASSWORD_VAULT_KEY.match(/../g)!, part => parseInt(part, 16))
  const key = await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
  const db = env.DB!
  const resolveProject = async (name: string) => (await db.prepare('SELECT project FROM password_vault_projects WHERE project = ? COLLATE NOCASE UNION ALL SELECT project FROM password_vault WHERE project = ? COLLATE NOCASE LIMIT 1').bind(name, name).first<{ project: string }>())?.project || name
  try {
    if (request.method === 'GET') {
      const rows = await db.prepare('SELECT id, project, username, is_admin FROM password_vault ORDER BY project, is_admin DESC, username').all()
      const projects = await db.prepare('SELECT project, login_url, admin_url FROM password_vault_projects ORDER BY project').all()
      return json({ accounts: rows.results, projects: projects.results, permissions: access })
    }
    if (!['POST', 'PUT', 'DELETE'].includes(request.method)) return json({ error: 'طريقة غير مسموحة' }, 405)
    const raw = await request.text()
    if (raw.length > 16000) return json({ error: 'البيانات أكبر من المسموح' }, 413)
    let body: Record<string, unknown>
    try { body = JSON.parse(raw) } catch { return json({ error: 'بيانات غير صحيحة' }, 422) }
    if (!body || typeof body !== 'object') return json({ error: 'بيانات غير صحيحة' }, 422)
    if (body.action === 'reveal' && !access.reveal) return json({ error: 'حسابك لا يملك صلاحية كشف أو نسخ كلمات المرور' }, 403)
    if (body.action !== 'reveal' && !access.add) return json({ error: 'حسابك لا يملك صلاحية إضافة البيانات' }, 403)
    if (body.action === 'project') {
      let project = typeof body.project === 'string' ? body.project.trim() : ''
      const normalizeUrl = (value: unknown) => {
        if (typeof value !== 'string') return null
        const trimmed = value.trim()
        if (!trimmed) return ''
        if (trimmed.length > 2048 || /\s/.test(trimmed)) return null
        const withScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
        try { const url = new URL(withScheme); return ['https:', 'http:'].includes(url.protocol) && url.hostname && !url.username && !url.password && url.href.length <= 2048 ? url.href : null } catch { return null }
      }
      const loginUrl = normalizeUrl(body.login_url), adminUrl = normalizeUrl(body.admin_url)
      if (!project || project.length > 150 || loginUrl === null || adminUrl === null) return json({ error: 'راجع اسم المشروع وروابط الدخول (http أو https)' }, 422)
      project = await resolveProject(project)
      if (!access.admin && await db.prepare('SELECT project FROM password_vault_projects WHERE project=?').bind(project).first()) return json({ error: 'المشروع موجود؛ تعديل روابطه للإدارة فقط' }, 403)
      await db.prepare('INSERT INTO password_vault_projects(project,login_url,admin_url) VALUES(?,?,?)' + (access.admin ? ' ON CONFLICT(project) DO UPDATE SET login_url=excluded.login_url,admin_url=excluded.admin_url' : '')).bind(project, loginUrl, adminUrl).run()
      return json({ success: true, project })
    }
    const id = typeof body.id === 'string' ? body.id : ''
    if (request.method !== 'POST' || body.action === 'reveal') {
      if (!/^[a-f0-9-]{36}$/i.test(id)) return json({ error: 'الحساب غير صحيح' }, 422)
      const row = await db.prepare('SELECT * FROM password_vault WHERE id=?').bind(id).first<{ id: string; secret: string; iv: string }>()
      if (!row) return json({ error: 'الحساب غير موجود' }, 404)
      if (request.method === 'DELETE') {
        await db.prepare('DELETE FROM password_vault WHERE id=?').bind(id).run()
        return json({ success: true })
      }
      if (body.action === 'reveal' && request.method === 'POST') {
        const decode = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0))
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(row.iv), additionalData: new TextEncoder().encode(id) }, key, decode(row.secret))
        return json({ password: new TextDecoder().decode(plain) })
      }
    }
    let project = typeof body.project === 'string' ? body.project.trim() : ''
    const username = typeof body.username === 'string' ? body.username.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!project || project.length > 150 || !username || username.length > 254 || password.length > 4096 || (request.method === 'POST' && !password) || typeof body.is_admin !== 'boolean') return json({ error: 'راجع اسم المشروع واليوزر وكلمة المرور.' }, 422)
    project = await resolveProject(project)
    const accountId = request.method === 'POST' ? crypto.randomUUID() : id
    if (password) {
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const secret = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(accountId) }, key, new TextEncoder().encode(password)))
      const encode = (value: Uint8Array) => btoa(String.fromCharCode(...value))
      if (request.method === 'POST') await db.prepare('INSERT INTO password_vault (id,project,username,is_admin,secret,iv) VALUES (?,?,?,?,?,?)').bind(accountId, project, username, body.is_admin ? 1 : 0, encode(secret), encode(iv)).run()
      else await db.prepare('UPDATE password_vault SET project=?,username=?,is_admin=?,secret=?,iv=? WHERE id=?').bind(project, username, body.is_admin ? 1 : 0, encode(secret), encode(iv), id).run()
    } else await db.prepare('UPDATE password_vault SET project=?,username=?,is_admin=? WHERE id=?').bind(project, username, body.is_admin ? 1 : 0, id).run()
    return json({ success: true })
  } catch (error) {
    if (error instanceof Error && /no such table/.test(error.message)) return json({ error: 'نفّذ تحديثات قاعدة البيانات 0017 و0018 لكلمات المرور أولًا.' }, 503)
    return json({ error: 'تعذر تنفيذ عملية كلمات المرور. راجع إعدادات الخزنة.' }, 500)
  }
}
