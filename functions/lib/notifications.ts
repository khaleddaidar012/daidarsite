import { json, type Env } from './store'

export type NotificationTarget = 'overview' | 'projects' | 'employees' | 'messages' | 'hub'
type NotificationInput = { id?: string; actor: string; eventType: string; title: string; detail: string; target: NotificationTarget }

export async function recordAdminNotification(env: Env, item: NotificationInput) {
  try {
    await env.DB!.prepare('INSERT INTO admin_notifications(id,actor,event_type,title,detail,target,created_at) VALUES(?,?,?,?,?,?,?)')
      .bind(item.id || crypto.randomUUID(), item.actor.slice(0, 160), item.eventType.slice(0, 80), item.title.slice(0, 160), item.detail.slice(0, 500), item.target, Date.now()).run()
  } catch (error) {
    // Notifications must never interrupt attendance, project, or subscription work.
    console.error('Could not record admin notification', error)
  }
}

export async function adminNotifications(request: Request, env: Env) {
 try {
  if (request.method === 'GET') {
    const [rows, count, messageRows] = await Promise.all([
      env.DB!.prepare('SELECT id,actor,event_type,title,detail,target,created_at,read_at FROM admin_notifications ORDER BY created_at DESC LIMIT 50').all(),
      env.DB!.prepare('SELECT COUNT(*) AS count FROM admin_notifications WHERE read_at IS NULL').first<{ count: number }>(),
      env.DB!.prepare("SELECT DISTINCT m.id FROM messages m JOIN admin_notifications n ON n.target='messages' AND n.read_at IS NULL AND (n.id=m.id OR (n.actor=m.name AND ABS(n.created_at-m.created_at)<300000))").all<{ id: string }>(),
    ])
    const unreadMessageIds = (messageRows.results || []).map(row => row.id)
    return json({ notifications: rows.results, unread: count?.count || 0, unreadMessages: unreadMessageIds.length, unreadMessageIds })
  }
  if (request.method !== 'POST') return json({ error: 'طريقة الطلب غير مسموحة' }, 405)
  const raw = await request.text()
  if (raw.length > 2048) return json({ error: 'طلب كبير جدًا' }, 413)
  const body = JSON.parse(raw) as { id?: unknown; all?: unknown; target?: unknown; messageId?: unknown }
  const now = Date.now()
  if (typeof body.messageId === 'string' && body.messageId.length <= 64) {
    const result = await env.DB!.prepare("UPDATE admin_notifications SET read_at=? WHERE id=(SELECT n.id FROM admin_notifications n JOIN messages m ON m.id=? AND n.target='messages' AND n.read_at IS NULL AND (n.id=m.id OR (n.actor=m.name AND ABS(n.created_at-m.created_at)<300000)) ORDER BY CASE WHEN n.id=m.id THEN 0 ELSE ABS(n.created_at-m.created_at) END LIMIT 1)").bind(now, body.messageId).run() as { meta?: { changes?: number } }
    if (result.meta?.changes === 0) return json({ success: true, alreadyRead: true })
    return json({ success: true })
  }
  if (body.all === true) {
    await env.DB!.prepare('UPDATE admin_notifications SET read_at=? WHERE read_at IS NULL').bind(now).run()
    return json({ success: true })
  }
  if (typeof body.id !== 'string' || body.id.length > 64) return json({ error: 'إشعار غير صحيح' }, 422)
  const result = await env.DB!.prepare('UPDATE admin_notifications SET read_at=? WHERE id=? AND read_at IS NULL').bind(now, body.id).run() as { meta?: { changes?: number } }
  if (result.meta?.changes === 0) {
    const found = await env.DB!.prepare('SELECT id FROM admin_notifications WHERE id=?').bind(body.id).first()
    if (!found) return json({ error: 'الإشعار غير موجود' }, 404)
  }
  return json({ success: true })
 }catch(error){
   if(error instanceof Error&&/no such table:\s*admin_notifications/i.test(error.message))return json({error:'جدول الإشعارات غير موجود. نفّذ migrations/0006_admin_notifications.sql أو تحديث 0013_checkout_accomplishments.sql على قاعدة DB ثم حدّث الإشعارات.'},503)
   throw error
 }
}
