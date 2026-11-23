import type {EcoDB} from '../../shared/ecosystem';
import type {Actor} from './auth';
export async function shortLinkRoutes(request:Request,db:EcoDB,actor:Actor|null|undefined,path:string){
 if(!['short-link','admin/domains/short-link'].includes(path))return null;
 const url=new URL(request.url),admin=path.startsWith('admin/');
 const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 if(admin&&actor?.role!=='super_admin')return json({error:'غير مسموح'},403);
 if(request.method==='GET'){
  const slug=url.searchParams.get('slug'),id=url.searchParams.get('store_id');
  if(slug&&/^shop-\d+$/.test(slug))return json({error:'المتجر غير موجود'},404);
  let row=slug?await db.prepare('SELECT store_id,slug FROM store_short_links WHERE slug=?').bind(slug).first():id?await db.prepare('SELECT store_id,slug FROM store_short_links WHERE store_id=? AND is_primary=1').bind(id).first():null;
  if(!row&&id){const store=await db.prepare('SELECT id FROM stores WHERE id=?').bind(id).first();if(store)row={store_id:id,slug:id}}
  if(!row)return json({error:'المتجر غير موجود'},404);
  const domain=await db.prepare("SELECT domain FROM store_domain_links WHERE store_id=? AND status='active' UNION ALL SELECT domain FROM domain_requests WHERE store_id=? AND status='active' LIMIT 1").bind(row.store_id,row.store_id).first();
  return json({...row,domain:domain?.domain||null});
 }
 if(admin&&request.method==='PUT'){
  const b=await request.json() as any;
  if(typeof b.slug!=='string'||!/^([a-z0-9][a-z0-9-]{1,46}[a-z0-9])$/.test(b.slug)||typeof b.store_id!=='string')return json({error:'اكتب اسم رابط من 3 إلى 48 حرفًا إنجليزيًا صغيرًا أو رقمًا أو شرطة'},400);
  if(!await db.prepare('SELECT id FROM stores WHERE id=?').bind(b.store_id).first())return json({error:'المتجر غير موجود'},404);
  const existing=await db.prepare('SELECT store_id FROM store_short_links WHERE slug=?').bind(b.slug).first();
  if(/^shop-\d+$/.test(b.slug))return json({error:'استخدم اسم متجر أو رمزًا غير ترتيبي للرابط'},400);
  if(existing&&existing.store_id!==b.store_id)return json({error:'اسم الرابط مستخدم لمتجر آخر'},409);
  try{await db.batch([
   db.prepare('UPDATE store_short_links SET is_primary=0 WHERE store_id=?').bind(b.store_id),
   db.prepare('INSERT INTO store_short_links(slug,store_id,is_primary) VALUES(?,?,1) ON CONFLICT(slug) DO UPDATE SET is_primary=1 WHERE store_id=excluded.store_id').bind(b.slug,b.store_id)
  ])}catch{return json({error:'تعذر حفظ الرابط؛ قد يكون الاسم مستخدمًا'},409)}
  return json({success:true,slug:b.slug});
 }
 return json({error:'غير مسموح'},405);
}
