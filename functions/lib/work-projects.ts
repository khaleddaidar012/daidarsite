import { missingVisibilityTable, visibleBalanceProjects } from './project-client-visibility'
import { json, type Env } from './store'
const fields = 'id,title,client_name,start_date,end_date,status,public_note,share_token,updated_at'
const validDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v
export async function workProjects(request: Request, env: Env, admin: boolean) {
  if (request.method === 'GET') {
    const rows = await env.DB!.prepare(`SELECT ${fields}${admin ? ',amount_piasters,paid_piasters' : ''} FROM work_projects ORDER BY start_date,end_date`).all()
    const visible = new Set(admin ? await visibleBalanceProjects(env) : [])
    return json({ projects: admin ? rows.results.map(row => ({...row,client_remaining_visible:visible.has(String(row.id))})) : rows.results })
  }
  if (request.method !== 'POST') return json({ error: 'طريقة غير مسموحة' },405)
  const raw = await request.text()
  if (raw.length > 12000) return json({ error: 'طلب كبير جدًا' },413)
  let body: Record<string, unknown>
  try { body = JSON.parse(raw) } catch { return json({ error: 'بيانات غير صحيحة' },400) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'بيانات غير صحيحة' },422)
  if (!admin && ('amount_piasters' in body || 'paid_piasters' in body || 'client_remaining_visible' in body || body.action === 'client-remaining')) return json({ error: 'الحسابات المالية للإدارة فقط' },403)
  if (body.id !== undefined && (typeof body.id !== 'string' || body.id.length > 64)) return json({error:'مشروع غير صحيح'},422)
  const existing = body.id ? await env.DB!.prepare('SELECT id FROM work_projects WHERE id=?').bind(body.id).first() : null
  if (body.id && !existing) return json({error:'المشروع غير موجود'},404)
  if (body.action === 'client-remaining') {
    if (!admin) return json({error:'إظهار المتبقي للعميل للإدارة فقط'},403)
    if (!existing || typeof body.visible !== 'boolean') return json({error:'المشروع أو الاختيار غير صحيح'},422)
    if (body.visible && body.confirmed !== true) return json({error:'أكد موافقتك على إظهار المبلغ المتبقي للعميل أولًا'},422)
    try {
      await env.DB!.prepare('INSERT INTO work_project_client_visibility(project_id,show_remaining,updated_at) VALUES(?,?,?) ON CONFLICT(project_id) DO UPDATE SET show_remaining=excluded.show_remaining,updated_at=excluded.updated_at').bind(body.id,body.visible?1:0,Date.now()).run()
    } catch(error) {
      if (missingVisibilityTable(error)) return json({error:'نفّذ تحديث قاعدة البيانات 0010_project_client_balance.sql أولًا لتفعيل هذا الاختيار'},503)
      throw error
    }
    return json({success:true})
  }
  if (body.rotate_link === true) {
    if (!admin || !existing) return json({error:'غير مسموح'},403)
    await env.DB!.prepare('UPDATE work_projects SET share_token=?,updated_at=? WHERE id=?').bind(crypto.randomUUID()+crypto.randomUUID(),Date.now(),body.id).run()
    return json({success:true})
  }
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 180 || typeof body.client_name !== 'string' || body.client_name.length > 180 || typeof body.public_note !== 'string' || body.public_note.length > 3000 || !validDate(body.start_date) || !validDate(body.end_date) || body.end_date < body.start_date || !['scheduled','started','in_progress','completed'].includes(String(body.status))) return json({error:'راجع اسم المشروع والمواعيد والحالة. التسليم يجب أن يكون بعد البداية أو في نفس اليوم.'},422)
  if (admin && [body.amount_piasters,body.paid_piasters].some(v => !Number.isSafeInteger(v) || (v as number)<0 || (v as number)>10000000000)) return json({error:'المبالغ المالية غير صحيحة'},422)
  const id = body.id || crypto.randomUUID(), now = Date.now()
  if (existing) {
    await env.DB!.prepare(`UPDATE work_projects SET title=?,client_name=?,start_date=?,end_date=?,status=?,public_note=?,updated_at=?${admin ? ',amount_piasters=?,paid_piasters=?' : ''} WHERE id=?`).bind(body.title.trim(),body.client_name.trim(),body.start_date,body.end_date,body.status,body.public_note.trim(),now,...(admin?[body.amount_piasters,body.paid_piasters]:[]),id).run()
  } else {
    await env.DB!.prepare('INSERT INTO work_projects(id,title,client_name,start_date,end_date,status,public_note,share_token,amount_piasters,paid_piasters,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,body.title.trim(),body.client_name.trim(),body.start_date,body.end_date,body.status,body.public_note.trim(),crypto.randomUUID()+crypto.randomUUID(),admin?body.amount_piasters:0,admin?body.paid_piasters:0,now,now).run()
  }
  return json({success:true,id})
}
