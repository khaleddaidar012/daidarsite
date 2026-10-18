import { json,type Env } from './store'
type Actor={key:string;name:string;employeeId?:string}
type Thread={id:string;kind:string;title:string;direct_employee_id:string|null}
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)
export async function staffChat(request:Request,env:Env,actor:Actor){
 const db=env.DB!,admin=!actor.employeeId
 const access=admin?'1=1':'EXISTS(SELECT 1 FROM chat_members allowed WHERE allowed.thread_id=t.id AND allowed.employee_id=?)'
 const accessArgs=admin?[]:[actor.employeeId]
 try{
  const url=new URL(request.url)
  if(request.method==='GET'&&!url.searchParams.has('thread')){
   const threads=await db.prepare(`SELECT t.*,(SELECT body FROM chat_messages WHERE thread_id=t.id ORDER BY id DESC LIMIT 1) AS last_body,(SELECT MAX(id) FROM chat_messages WHERE thread_id=t.id) AS last_id,(SELECT COUNT(*) FROM chat_messages m WHERE m.thread_id=t.id AND m.sender_key!=? AND m.id>COALESCE((SELECT last_message_id FROM chat_reads WHERE thread_id=t.id AND reader_key=?),0)) AS unread FROM chat_threads t WHERE ${access} ORDER BY t.updated_at DESC,t.id LIMIT 500`).bind(actor.key,actor.key,...accessArgs).all<Record<string,unknown>>()
   const members=await db.prepare(`SELECT cm.thread_id,e.id,e.name,e.active FROM chat_members cm JOIN employees e ON e.id=cm.employee_id JOIN chat_threads t ON t.id=cm.thread_id WHERE ${access}`).bind(...accessArgs).all<{thread_id:string;id:string;name:string;active:number}>()
   const employees=admin?(await db.prepare('SELECT id,name,job_title FROM employees WHERE active=1 ORDER BY name').all()).results:undefined
   return json({threads:threads.results.map(t=>({...t,members:members.results.filter(m=>m.thread_id===t.id)})),employees,actor_key:actor.key,limited:threads.results.length===500})
  }
  let b:Record<string,unknown>={}
  if(request.method==='POST'){
   const raw=await request.text();if(raw.length>20000)return json({error:'طلب كبير جدًا'},413)
   try{b=JSON.parse(raw)}catch{return json({error:'بيانات غير صحيحة'},400)}
   if(!b||typeof b!=='object'||Array.isArray(b))return json({error:'بيانات غير صحيحة'},422)
  }else if(request.method!=='GET')return json({error:'طريقة غير مسموحة'},405)
  if(b.action==='create'){
   if(!admin)return json({error:'إنشاء المحادثات والمجموعات للإدارة فقط'},403)
   const ids=Array.isArray(b.member_ids)?b.member_ids:[]
   if(!uuid(b.id)||(typeof b.kind!=='string'||!['direct','group'].includes(b.kind))||!ids.length||ids.length>50||new Set(ids).size!==ids.length||ids.some(id=>!uuid(id))||b.kind==='direct'&&ids.length!==1||b.kind==='group'&&(typeof b.title!=='string'||!b.title.trim()||b.title.length>120))return json({error:'اختر الموظفين واسم المجموعة بشكل صحيح'},422)
   const selected=await db.prepare(`SELECT id,name FROM employees WHERE active=1 AND id IN (${ids.map(()=>'?').join(',')})`).bind(...ids).all<{id:string;name:string}>()
   if(selected.results.length!==ids.length)return json({error:'بعض الحسابات موقوفة أو غير موجودة'},422)
   const old=b.kind==='direct'?await db.prepare('SELECT id FROM chat_threads WHERE direct_employee_id=?').bind(ids[0]).first<{id:string}>():null
   if(old)return json({success:true,id:old.id})
   const title=b.kind==='direct'?selected.results[0].name:(b.title as string).trim(),now=Date.now()
   const existing=await db.prepare('SELECT id FROM chat_threads WHERE id=?').bind(b.id).first()
   if(existing){
    const oldThread=await db.prepare('SELECT kind,title FROM chat_threads WHERE id=?').bind(b.id).first<{kind:string;title:string}>()
    const oldMembers=await db.prepare('SELECT employee_id FROM chat_members WHERE thread_id=?').bind(b.id).all<{employee_id:string}>()
    if(oldThread&&oldThread.kind===b.kind&&oldThread.title===title&&oldMembers.results.length===ids.length&&oldMembers.results.every(m=>ids.includes(m.employee_id)))return json({success:true,id:b.id})
    return json({error:'تغيّرت بيانات محادثة محفوظة. ابدأ محادثة جديدة'},409)
   }
   try{await db.batch([
    db.prepare('INSERT INTO chat_threads(id,kind,title,direct_employee_id,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(b.id,b.kind,title,b.kind==='direct'?ids[0]:null,now,now),
    ...ids.map(id=>db.prepare('INSERT INTO chat_members(thread_id,employee_id) VALUES(?,?)').bind(b.id,id)),
   ])}catch(error){
    if(b.kind==='direct'){
     const concurrent=await db.prepare('SELECT id FROM chat_threads WHERE direct_employee_id=?').bind(ids[0]).first<{id:string}>()
     if(concurrent)return json({success:true,id:concurrent.id})
    }
    throw error
   }
   return json({success:true,id:b.id})
  }
  const threadId=request.method==='GET'?url.searchParams.get('thread'):b.thread_id
  if(!uuid(threadId))return json({error:'محادثة غير صحيحة'},422)
  const thread=await db.prepare(`SELECT t.* FROM chat_threads t WHERE t.id=? AND ${access}`).bind(threadId,...accessArgs).first<Thread>()
  if(!thread)return json({error:'المحادثة غير متاحة لحسابك'},403)
  if(request.method==='GET'){
   const before=url.searchParams.get('before')
   if(before!==null&&(!/^\d+$/.test(before)||!Number.isSafeInteger(Number(before))||Number(before)<1))return json({error:'رقم صفحة غير صحيح'},422)
   const rows=await db.prepare(`SELECT m.id,m.sender_key,m.sender_name,m.body,m.created_at FROM chat_messages m JOIN chat_threads t ON t.id=m.thread_id WHERE t.id=? AND ${access}${before?' AND m.id<?':''} ORDER BY m.id DESC LIMIT 51`).bind(threadId,...accessArgs,...(before?[Number(before)]:[])).all()
   return json({messages:rows.results.slice(0,50).reverse(),has_older:rows.results.length>50,actor_key:actor.key})
  }
  if(b.action==='members'){
   if(!admin||thread.kind!=='group')return json({error:'تعديل أعضاء المجموعة للإدارة فقط'},403)
   const ids=Array.isArray(b.member_ids)?b.member_ids:[]
   if(!ids.length||ids.length>50||new Set(ids).size!==ids.length||ids.some(id=>!uuid(id)))return json({error:'اختر أعضاء المجموعة'},422)
   const employees=await db.prepare(`SELECT id FROM employees WHERE active=1 AND id IN (${ids.map(()=>'?').join(',')})`).bind(...ids).all()
   if(employees.results.length!==ids.length)return json({error:'اختر حسابات موظفين نشطة'},422)
   await db.batch([db.prepare('DELETE FROM chat_members WHERE thread_id=?').bind(threadId),...ids.map(id=>db.prepare('INSERT INTO chat_members(thread_id,employee_id) VALUES(?,?)').bind(threadId,id)),db.prepare('UPDATE chat_threads SET updated_at=? WHERE id=?').bind(Date.now(),threadId)])
   return json({success:true})
  }
  if(b.action==='read'){
   if(!Number.isSafeInteger(b.last_id)||(b.last_id as number)<0)return json({error:'رسالة غير صحيحة'},422)
   const max=await db.prepare('SELECT MAX(id) AS id FROM chat_messages WHERE thread_id=?').bind(threadId).first<{id:number|null}>()
   await db.prepare('INSERT INTO chat_reads(thread_id,reader_key,last_message_id) VALUES(?,?,?) ON CONFLICT(thread_id,reader_key) DO UPDATE SET last_message_id=MAX(chat_reads.last_message_id,excluded.last_message_id)').bind(threadId,actor.key,Math.min(b.last_id as number,max?.id||0)).run()
   return json({success:true})
  }
  if(b.action!=='send')return json({error:'عملية غير صحيحة'},422)
  if(!uuid(b.client_key)||typeof b.body!=='string'||!b.body.trim()||b.body.length>4000)return json({error:'اكتب رسالة من حرف إلى ٤٠٠٠ حرف'},422)
  const now=Date.now()
  await db.prepare(`INSERT INTO chat_messages(thread_id,sender_key,sender_name,client_key,body,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM chat_threads t WHERE t.id=? AND ${access}) ON CONFLICT(sender_key,client_key) DO NOTHING`).bind(threadId,actor.key,actor.name,b.client_key,b.body.trim(),now,threadId,...accessArgs).run()
  const saved=await db.prepare('SELECT id,thread_id,body FROM chat_messages WHERE sender_key=? AND client_key=?').bind(actor.key,b.client_key).first<{id:number;thread_id:string;body:string}>()
  if(!saved)return json({error:'لم تعد عضوًا في المحادثة'},403)
  if(saved.thread_id!==threadId||saved.body!==b.body.trim())return json({error:'تغيرت رسالة محفوظة. ابدأ رسالة جديدة'},409)
  await db.prepare('UPDATE chat_threads SET updated_at=MAX(updated_at,?) WHERE id=?').bind(now,threadId).run()
  return json({success:true,id:saved.id})
 }catch(error){
  if(error instanceof Error&&/no such table:\s*chat_\w+/i.test(error.message))return json({error:'نفّذ تحديث 0014_staff_chat.sql على قاعدة DB لتفعيل شات الموظفين'},503)
  throw error
 }
}
