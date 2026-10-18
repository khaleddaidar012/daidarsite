import { json, type Env } from './store'
import { cairoDay } from './employees'
import { systemManagementPlans, serviceEndDate } from '../../src/lib/system-management'
export async function serviceSubscriptions(request: Request, env: Env) {
 try {
  if(request.method==='GET') {
   const rows=await env.DB!.prepare('SELECT * FROM system_management_subscriptions ORDER BY created_at DESC LIMIT 500').all<{cancelled:number;start_date:string;end_date:string}>()
   const today=cairoDay()
   return json({subscriptions:rows.results.map(row=>({...row,status:row.cancelled?'cancelled':row.start_date>today?'scheduled':row.end_date<=today?'expired':'active'})),limited:rows.results.length===500})
  }
  if(request.method!=='POST') return json({error:'طريقة غير مسموحة'},405)
  const raw=await request.text()
  if(raw.length>8000) return json({error:'طلب كبير جدًا'},413)
  let b:Record<string,unknown>
  try{b=JSON.parse(raw)}catch{return json({error:'بيانات غير صحيحة'},400)}
  if(!b||typeof b!=='object'||Array.isArray(b))return json({error:'بيانات غير صحيحة'},422)
  if(b.action==='cancel') {
   if(typeof b.id!=='string'||b.id.length>64)return json({error:'اشتراك غير صحيح'},422)
   const exists=await env.DB!.prepare('SELECT id FROM system_management_subscriptions WHERE id=?').bind(b.id).first()
   if(!exists)return json({error:'الاشتراك غير موجود'},404)
   await env.DB!.prepare('UPDATE system_management_subscriptions SET cancelled=1 WHERE id=?').bind(b.id).run()
   return json({success:true})
  }
  const plan=systemManagementPlans.find(p=>p.hours===b.hours)
  if(typeof b.operation_key!=='string'||!/^[a-f0-9-]{36}$/i.test(b.operation_key)||typeof b.customer_name!=='string'||!b.customer_name.trim()||b.customer_name.length>150||typeof b.phone!=='string'||!/^\+?[0-9]{10,15}$/.test(b.phone)||!plan||!Number.isInteger(b.start_hour)||(b.start_hour as number)<18||(b.start_hour as number)+plan.hours>24||!Number.isInteger(b.months)||(b.months as number)<1||(b.months as number)>12||typeof b.start_date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.start_date)||isNaN(Date.parse(b.start_date))||new Date(b.start_date).toISOString().slice(0,10)!==b.start_date||!['instapay','vodafone'].includes(String(b.payment_method))||typeof b.note!=='string'||b.note.length>2000) return json({error:'راجع بيانات العميل والباقة والموعد وتاريخ البداية والمدة'},422)
  const amount=plan.price*100*(b.months as number)
  if(b.payment_received!==true||b.amount_received_piasters!==amount)return json({error:'أكد مراجعة استلام المبلغ المطابق للباقة والمدة'},422)
  const end=serviceEndDate(b.start_date,b.months as number)
  const id=crypto.randomUUID()
  await env.DB!.prepare('INSERT INTO system_management_subscriptions(id,operation_key,customer_name,phone,hours,start_hour,start_date,end_date,months,monthly_price_piasters,amount_received_piasters,payment_method,note,cancelled,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?) ON CONFLICT(operation_key) DO NOTHING').bind(id,b.operation_key,b.customer_name.trim(),b.phone,plan.hours,b.start_hour,b.start_date,end,b.months,plan.price*100,amount,b.payment_method,b.note.trim(),env.ADMIN_EMAIL?.trim()||'admin',Date.now()).run()
  const saved=await env.DB!.prepare('SELECT id,customer_name,phone,hours,start_hour,start_date,months,payment_method,note FROM system_management_subscriptions WHERE operation_key=?').bind(b.operation_key).first<Record<string,unknown>>()
  if(!saved||saved.customer_name!==b.customer_name.trim()||saved.phone!==b.phone||saved.hours!==plan.hours||saved.start_hour!==b.start_hour||saved.start_date!==b.start_date||saved.months!==b.months||saved.payment_method!==b.payment_method||saved.note!==b.note.trim())return json({error:'تغيّرت بيانات عملية محفوظة. ابدأ عملية جديدة'},409)
  return json({success:true,id:saved.id})
 }catch(error){
  if(error instanceof Error&&/no such table:\s*system_management_subscriptions/i.test(error.message))return json({error:'نفّذ تحديث 0012_system_management_subscriptions.sql على قاعدة البيانات أولًا'},503)
  throw error
 }
}
