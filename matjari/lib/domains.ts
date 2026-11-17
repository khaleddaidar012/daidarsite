import type { EcoDB } from '../../shared/ecosystem';
import { rateLimit, type Actor } from './auth';

export interface DomainEnv {
 DB: EcoDB; DOMAIN_CF_ACCOUNT_ID?: string; DOMAIN_CF_API_TOKEN?: string;
 DOMAIN_PAGES_PROJECT?: string; DOMAIN_ROUTING_ENABLED?: string;
}
function reject(message:string,status=400):never { throw Object.assign(new Error(message),{status}); }
const json = (data:unknown,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function domainName(value:unknown) {
 if(typeof value!=='string')return reject('اسم الدومين غير صحيح');
 const name=value.trim().toLowerCase();
 if(name.length>253||!name.includes('.')||!name.split('.').every(part=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(part))||!/[a-z]$/.test(name))return reject('اكتب الدومين فقط بالإنجليزية، بدون رابط أو مسار');
 return name;
}
export function pricePiasters(usd:unknown,rate:number,margin:number) {
 if(typeof usd!=='string'||!/^\d+(\.\d{1,2})?$/.test(usd)||Number(usd)<=0||!Number.isFinite(rate)||rate<=0||!Number.isSafeInteger(margin)||margin<0)return reject('تعذر التحقق من السعر',502);
 const value=Math.ceil((Number(usd)*rate+margin)*100-1e-7);
 if(!Number.isSafeInteger(value)||value>100000000)return reject('السعر خارج الحدود المسموحة',502);
 return value;
}
async function cloudflare(env:DomainEnv,path:string,method='GET',body?:unknown,allow404=false) {
 if(!env.DOMAIN_CF_ACCOUNT_ID||!env.DOMAIN_CF_API_TOKEN)reject('ربط Cloudflare للدومينات لم يكتمل بعد',503);
 const res=await fetch('https://api.cloudflare.com/client/v4/'+path,{method,headers:{Authorization:`Bearer ${env.DOMAIN_CF_API_TOKEN}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 if(allow404&&res.status===404)return null;
 const data=await res.json() as any;
 if(!res.ok||!data.success)reject('تعذر إتمام طلب Cloudflare. راجع إعدادات الربط أو حاول لاحقًا',502);
 return data.result;
}
const account=(env:DomainEnv)=>`accounts/${encodeURIComponent(env.DOMAIN_CF_ACCOUNT_ID||'')}`;
async function check(env:DomainEnv,domain:string) {
 const result=await cloudflare(env,`${account(env)}/registrar/domain-check`,'POST',{domains:[domain]});
 const candidate=result?.domains?.find((d:any)=>d.name===domain);
 if(!candidate?.registrable||candidate.pricing?.currency!=='USD')reject('الدومين غير متاح حاليًا أو لا يمكن تسعيره من Cloudflare',409);
 return candidate;
}
const fields='r.id,r.store_id,r.domain,r.registration_usd,r.renewal_usd,r.usd_egp,r.margin_egp,r.total_piasters,r.quote_expires,r.status,r.note,r.created_at,r.updated_at';
export async function domainRoutes(request:Request,env:DomainEnv,actor:Actor|null|undefined,path:string,proofDecoder:(value:unknown)=>{mime:string;base64:string}|null):Promise<Response|null> {
 if(!path.startsWith('domains')&&!path.startsWith('admin/domains'))return null;
 try {
  if(!actor)return json({error:'سجل الدخول أولًا'},401);
  const admin=path.startsWith('admin/');
  if(admin?actor.role!=='super_admin':actor.role!=='merchant'||!actor.store_id)return json({error:'غير مسموح'},403);
  const db=env.DB,method=request.method;
  const settings=async()=>await db.prepare('SELECT * FROM domain_settings WHERE id=1').first();
  if(path==='admin/domains/settings') {
   if(method==='GET')return json({settings:await settings(),connected:!!(env.DOMAIN_CF_ACCOUNT_ID&&env.DOMAIN_CF_API_TOKEN),routing:env.DOMAIN_ROUTING_ENABLED==='1',project:env.DOMAIN_PAGES_PROJECT||''});
   if(method==='PUT') {
    const b=await request.json() as any;
    if(typeof b.usd_egp!=='number'||!Number.isFinite(b.usd_egp)||b.usd_egp<1||b.usd_egp>1000||!Number.isSafeInteger(b.margin_egp)||b.margin_egp<0||b.margin_egp>100000||!/^\d{4}-\d{2}-\d{2}$/.test(b.rate_date))reject('راجع سعر الدولار وهامش الربح وتاريخ السعر');
    await db.prepare(`INSERT INTO domain_settings(id,usd_egp,margin_egp,rate_date,updated_by) VALUES(1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET usd_egp=excluded.usd_egp,margin_egp=excluded.margin_egp,rate_date=excluded.rate_date,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`).bind(b.usd_egp,b.margin_egp,b.rate_date,actor.id).run();
    return json({success:true});
   }
  }
  if((path==='domains/requests'||path==='admin/domains/requests')&&method==='GET') {
   const publicFields='r.id,r.store_id,r.domain,r.total_piasters,r.quote_expires,r.status,r.note,r.created_at,r.updated_at';
   const rows=await db.prepare(`SELECT ${admin?fields:publicFields},s.name AS store_name FROM domain_requests r JOIN stores s ON s.id=r.store_id ${admin?"WHERE r.status<>'quoted'":'WHERE r.store_id=?'} ORDER BY r.created_at DESC,r.rowid DESC LIMIT 200`).bind(...(admin?[]:[actor.store_id])).all();
   return json({requests:rows.results});
  }
  if(path==='domains/search'&&method==='GET') {
   await rateLimit(db,request,'domain-search:'+actor.id,20,60000);
   const q=new URL(request.url).searchParams.get('q')?.trim();
   if(!q||q.length>100||!/^[-a-zA-Z0-9 .]+$/.test(q))reject('اكتب اسمًا بالإنجليزية للبحث');
   const s=await settings();if(!s)reject('التسعير لم يُضبط بعد',503);
   const result=await cloudflare(env,`${account(env)}/registrar/domain-search?q=${encodeURIComponent(q)}&limit=10`);
   const domains=(result?.domains||[]).filter((d:any)=>d.registrable&&d.pricing?.currency==='USD').map((d:any)=>({name:domainName(d.name),total_piasters:pricePiasters(d.pricing.registration_cost,s.usd_egp,s.margin_egp)}));
   return json({domains});
  }
  if(path==='domains/quote'&&method==='POST') {
   await rateLimit(db,request,'domain-quote:'+actor.id,10,60000);
   const name=domainName((await request.json() as any).domain),s=await settings();
   if(!s)reject('التسعير لم يُضبط بعد',503);
   const candidate=await check(env,name),total=pricePiasters(candidate.pricing.registration_cost,s.usd_egp,s.margin_egp);
   if(await db.prepare("SELECT id FROM domain_requests WHERE domain=? AND status IN ('pending','approved','purchased','linking','active')").bind(name).first())reject('يوجد طلب قائم لهذا الدومين',409);
   const id=crypto.randomUUID(),expires=Date.now()+1800000;
   await db.prepare('INSERT INTO domain_requests(id,store_id,user_id,domain,registration_usd,renewal_usd,usd_egp,margin_egp,total_piasters,quote_expires) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,actor.store_id,actor.id,name,candidate.pricing.registration_cost,String(candidate.pricing.renewal_cost||''),s.usd_egp,s.margin_egp,total,expires).run();
   return json({quote:{id,domain:name,total_piasters:total,quote_expires:expires,renewal_estimate_piasters:candidate.pricing.renewal_cost?pricePiasters(candidate.pricing.renewal_cost,s.usd_egp,s.margin_egp):null}});
  }
  const match=path.match(/^(admin\/)?domains\/requests\/([^/]+)(?:\/(proof|review|check|purchased|link|verify))?$/);
  if(match) {
   const row=await db.prepare('SELECT * FROM domain_requests WHERE id=?').bind(match[2]).first();
   if(!row||(!admin&&row.store_id!==actor.store_id))reject('الطلب غير موجود',404);
   const action=match[3];
   if(!admin&&action==='proof'&&method==='POST') {
    if(row.status!=='quoted')return json({success:true,status:row.status});
    const proof=proofDecoder((await request.json() as any).proof);if(!proof)reject('ارفع صورة PNG أو JPG أو WEBP صحيحة، بحد أقصى 1 ميجابايت');
    // Keep late receipts for manual review too; never silently discard a customer's transfer.
    await db.prepare("UPDATE domain_requests SET status='pending',proof_mime=?,proof_base64=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='quoted'").bind(proof.mime,proof.base64,row.id).run();
    return json({success:true});
   }
   if(admin&&action==='proof'&&method==='GET')return json({proof:row.proof_mime?`data:${row.proof_mime};base64,${row.proof_base64}`:null});
   if(admin&&method==='POST') {
    if(action==='check')return json({domain:await check(env,row.domain)});
    if(action==='review') {
     const b=await request.json() as any;
     if(!['approved','rejected'].includes(b.status)||!(row.status==='pending'||(row.status==='approved'&&b.status==='rejected')))reject('حالة الطلب تغيرت؛ حدّث القائمة',409);
     if(b.status==='rejected'&&(!b.note||typeof b.note!=='string'||!b.note.trim()))reject('اكتب سبب الرفض وطريقة متابعة التحويل');
     await db.prepare("UPDATE domain_requests SET status=?,note=?,reviewed_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status=?").bind(b.status,String(b.note||'').slice(0,1000),actor.id,row.id,row.status).run();
     return json({success:true});
    }
    if(action==='purchased') {
     if(row.status!=='approved')reject('اعتمد الإيصال أولًا',409);
     const registration=await cloudflare(env,`${account(env)}/registrar/registrations/${encodeURIComponent(row.domain)}`);
     if(registration?.domain_name!==row.domain||registration.status!=='active')reject('الدومين غير مسجل وفعال في حساب Cloudflare بعد',409);
     await db.prepare("UPDATE domain_requests SET status='purchased',reviewed_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='approved'").bind(actor.id,row.id).run();
     return json({success:true});
    }
    if(action==='link'||action==='verify') {
     if(!['purchased','linking','active'].includes(row.status))reject('أكد شراء الدومين أولًا',409);
     if(!env.DOMAIN_PAGES_PROJECT||env.DOMAIN_ROUTING_ENABLED!=='1')reject('إعداد مشروع Pages وتوجيه الدومينات لم يكتمل',503);
     const base=`${account(env)}/pages/projects/${encodeURIComponent(env.DOMAIN_PAGES_PROJECT)}/domains`;
     if(action==='link') {
      const zones=await cloudflare(env,`zones?name=${encodeURIComponent(row.domain)}&account.id=${encodeURIComponent(env.DOMAIN_CF_ACCOUNT_ID||'')}`);
      const zone=zones?.find((z:any)=>z.name===row.domain&&z.status==='active');if(!zone)reject('فعّل منطقة DNS للدومين داخل حساب Cloudflare أولًا',409);
      const records=await cloudflare(env,`zones/${zone.id}/dns_records?name=${encodeURIComponent(row.domain)}&per_page=100`);
      const target=`${env.DOMAIN_PAGES_PROJECT}.pages.dev`;
      const address=records.filter((r:any)=>['A','AAAA','CNAME'].includes(r.type));
      if(address.some((r:any)=>r.type!=='CNAME'||r.content!==target))reject('يوجد DNS مختلف للدومين؛ راجعه يدويًا قبل الربط',409);
      let attached=await cloudflare(env,`${base}/${encodeURIComponent(row.domain)}`,'GET',undefined,true);
      if(!attached)attached=await cloudflare(env,base,'POST',{name:row.domain});
      if(!address.length)await cloudflare(env,`zones/${zone.id}/dns_records`,'POST',{type:'CNAME',name:row.domain,content:target,proxied:true,ttl:1});
      await db.prepare("UPDATE domain_requests SET status='linking',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='purchased'").bind(row.id).run();
     }
     const linked=await cloudflare(env,`${base}/${encodeURIComponent(row.domain)}`);
     if(linked?.status==='active')await db.prepare("UPDATE domain_requests SET status='active',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status IN ('purchased','linking')").bind(row.id).run();
     return json({success:true,status:linked?.status==='active'?'active':'linking'});
    }
   }
  }
  return json({error:'المسار غير موجود'},404);
 } catch(e:any) {
  if(String(e.message).includes('UNIQUE constraint'))return json({error:'يوجد طلب آخر لهذا الدومين. تواصل مع الإدارة إذا كنت قد حوّلت المبلغ.'},409);
  return json({error:e.status?e.message:'تعذر إتمام العملية. راجع إعداد قاعدة بيانات الدومينات وحاول مرة أخرى.'},e.status||503);
 }
}
