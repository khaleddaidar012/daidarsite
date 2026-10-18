import { json, type Env } from '../lib/store'
export async function onRequest({request,env}:{request:Request;env:Env}) {
 if(request.method!=='GET') return json({error:'غير مسموح'},405)
 const token=new URL(request.url).searchParams.get('token') || ''
 if(!/^[a-f0-9-]{72}$/.test(token)) return json({error:'رابط المتابعة غير صالح أو تم تغييره'},404)
 if(!env.DB) return json({error:'الخدمة غير جاهزة'},503)
 try {
 const project=await env.DB.prepare('SELECT title,start_date,end_date,status,public_note,updated_at FROM work_projects WHERE share_token=?').bind(token).first()
 return project?json({project},200,{'Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'}):json({error:'رابط المتابعة غير صالح أو تم تغييره'},404)
 } catch { return json({error:'تعذر تحميل المشروع'},500) }
}
