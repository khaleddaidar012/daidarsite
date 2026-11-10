import {ecoUser,ecoAudit,ecoPublish} from '../../shared/ecosystem';
import {handleStoreRequest} from '../../matjari/functions/api/[[route]]';
import {adminHub} from './hub-admin';
import {serviceSubscriptions} from './service-subscriptions';
import {json,sameOrigin,type Env} from './store';
import {customerOverview} from '../../shared/ecosystem-customer';

export async function ecosystemAdministration(request:Request,env:Env):Promise<Response|null>{
  const path=new URL(request.url).pathname.replace(/^\/api\/ecosystem\/admin\/?/,'');
  const user=await ecoUser(request,env);
  if(!user)return json({error:'سجل الدخول أولاً'},401);
  if(!user.platform_admin)return json({error:'هذه الصفحة لإدارة المنظومة فقط'},403);
  if(!['GET','HEAD'].includes(request.method)&&(!sameOrigin(request)||request.headers.get('Sec-Fetch-Site')==='cross-site'))return json({error:'طلب غير مسموح'},403);
  try{
    if(path==='service-links'&&request.method==='GET'){
      if(!env.ECOSYSTEM_HUB_DB)return json({error:'مصدر الخدمات غير مربوط'},503);
      const rows=await env.ECOSYSTEM_HUB_DB.prepare('SELECT id,customer_name,phone,hours,start_date,end_date,cancelled FROM system_management_subscriptions ORDER BY created_at DESC LIMIT 100').all();
      return json({services:rows.results});
    }
    if(path==='service-links'&&request.method==='POST'){
      if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'يلزم JSON'},415);
      const b=await request.json() as any;
      if(typeof b.customer_id!=='string'||typeof b.resource_id!=='string'||!env.ECOSYSTEM_HUB_DB)return json({error:'اختر العميل والخدمة'},422);
      const customer=await env.ECOSYSTEM_DB!.prepare('SELECT id FROM ec_users WHERE id=? AND active=1').bind(b.customer_id).first();
      const service=await env.ECOSYSTEM_HUB_DB.prepare('SELECT id,hours,start_date,end_date,cancelled FROM system_management_subscriptions WHERE id=?').bind(b.resource_id).first();
      if(!customer||!service)return json({error:'العميل أو الخدمة غير موجود'},404);
      const existing=await env.ECOSYSTEM_DB!.prepare("SELECT user_id FROM ec_entitlements WHERE system='service-management' AND resource_id=?").bind(service.id).first();
      if(existing&&existing.user_id!==customer.id)return json({error:'الخدمة مرتبطة بعميل آخر وتحتاج مراجعة الملكية'},409);
      const start=Date.parse(service.start_date+'T00:00:00Z'),end=Date.parse(service.end_date+'T23:59:59.999Z');
      // Never infer ownership from a matching name, phone number or email.
      await env.ECOSYSTEM_DB!.prepare("INSERT INTO ec_entitlements(system,resource_id,user_id,status,starts_at,expires_at,plan,updated_at) VALUES('service-management',?,?,?,?,?,?,?) ON CONFLICT(system,resource_id) DO NOTHING").bind(service.id,customer.id,service.cancelled?'cancelled':'active',start,end,'إدارة السيستم',Date.now()).run();
      const assigned=await env.ECOSYSTEM_DB!.prepare("SELECT user_id FROM ec_entitlements WHERE system='service-management' AND resource_id=?").bind(service.id).first();
      if(assigned?.user_id!==customer.id)return json({error:'تم ربط الخدمة بعميل آخر. حدّث البيانات'},409);
      await ecoAudit(env,user.id,'service-ownership-linked',String(service.id));
      return json({success:true});
    }
    if(path==='customer'&&request.method==='GET'){
      const id=new URL(request.url).searchParams.get('id')||'';
      const row=await env.ECOSYSTEM_DB!.prepare('SELECT id,email,name FROM ec_users WHERE id=?').bind(id).first<{id:string;email:string;name:string}>();
      if(!row)return json({error:'العميل غير موجود'},404);
      return json(await customerOverview(env,{...row,family:'',platform_admin:false}));
    }
    if(path==='customer'&&request.method==='DELETE'){
      if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'يلزم JSON'},415);
      const id=new URL(request.url).searchParams.get('id')||'';
      const target=await env.ECOSYSTEM_DB!.prepare("SELECT u.id,u.active,EXISTS(SELECT 1 FROM ec_roles r WHERE r.user_id=u.id AND r.role='platform_admin') AS platform_admin FROM ec_users u WHERE u.id=?").bind(id).first<{id:string;active:number;platform_admin:number}>();
      if(!target||target.active!==1)return json({error:'العميل غير موجود أو محذوف بالفعل'},404);
      if(target.id===user.id||target.platform_admin)return json({error:'لا يمكن حذف حسابك أو حساب مدير المنظومة من هذه القائمة'},409);
      const result=await env.ECOSYSTEM_DB!.prepare('UPDATE ec_users SET active=0 WHERE id=? AND active=1').bind(id).run() as {meta?:{changes?:number};changes?:number};
      if((result.meta?.changes??result.changes??0)!==1)return json({error:'تغيرت حالة العميل. حدّث القائمة وحاول مرة أخرى.'},409);
      await ecoAudit(env,user.id,'customer-deactivated',id);
      return json({success:true,retained:true});
    }
    if(path==='workspace'&&request.method==='GET'){
      const store=env.ECOSYSTEM_STORE_DB,hub=env.ECOSYSTEM_HUB_DB;
      if(!store||!hub)return json({error:'لم يكتمل ربط مصادر الإدارة في هذه البيئة'},503);
      const take=50, page=Math.max(1,Math.min(10000,Number(new URL(request.url).searchParams.get('page'))||1)),offset=(page-1)*take;
      const rows=await Promise.all([
        env.ECOSYSTEM_DB!.prepare('SELECT COUNT(*) AS count FROM ec_users WHERE active=1').first(),
        store.prepare('SELECT COUNT(*) AS count FROM stores').first(),
        hub.prepare('SELECT COUNT(*) AS count FROM hub_subscriptions').first(),
        env.ECOSYSTEM_DB!.prepare('SELECT id,name,email,active FROM ec_users WHERE active=1 ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(take,offset).all(),
        store.prepare('SELECT u.id,u.username,u.email,u.role,u.is_active,u.store_id,s.name AS store_name FROM users u LEFT JOIN stores s ON s.id=u.store_id ORDER BY u.created_at DESC LIMIT ? OFFSET ?').bind(take,offset).all(),
        hub.prepare('SELECT id,name,email,active FROM hub_users ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(take,offset).all(),
        store.prepare('SELECT s.id,s.name,s.is_active,b.plan_name,b.status,b.end_date FROM stores s LEFT JOIN subscriptions b ON b.id=(SELECT x.id FROM subscriptions x WHERE x.store_id=s.id ORDER BY x.created_at DESC LIMIT 1) ORDER BY s.created_at DESC LIMIT ? OFFSET ?').bind(take,offset).all(),
        hub.prepare('SELECT o.id,o.order_number,o.status,o.created_at,u.name,u.email,o.snapshot FROM hub_orders o JOIN hub_users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT ? OFFSET ?').bind(take,offset).all(),
        env.ECOSYSTEM_DB!.prepare('SELECT actor,action,entity,created_at FROM ec_audit ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(take,offset).all(),
        hub.prepare("SELECT COUNT(*) AS count FROM hub_orders WHERE status IN ('under_review','needs_info')").first(),
        store.prepare("SELECT COUNT(*) AS count FROM stores s JOIN subscriptions b ON b.id=(SELECT x.id FROM subscriptions x WHERE x.store_id=s.id ORDER BY x.created_at DESC LIMIT 1) WHERE s.is_active=1 AND b.status IN ('active','trial') AND b.start_date<=date('now') AND b.end_date>=date('now') AND EXISTS(SELECT 1 FROM users u WHERE u.store_id=s.id AND u.is_active=1)").first(),
        hub.prepare("SELECT COUNT(*) AS count FROM hub_subscriptions WHERE status='active' AND (starts_at IS NULL OR starts_at<=?) AND (expires_at IS NULL OR expires_at>?)").bind(Date.now(),Date.now()).first(),
        store.prepare("SELECT COUNT(*) AS count FROM stores s JOIN subscriptions b ON b.id=(SELECT x.id FROM subscriptions x WHERE x.store_id=s.id ORDER BY x.created_at DESC LIMIT 1) WHERE b.status='expired' OR b.end_date<date('now')").first(),
        hub.prepare("SELECT COUNT(*) AS count FROM hub_subscriptions WHERE status='expired' OR expires_at<=?").bind(Date.now()).first(),
        env.ECOSYSTEM_DB!.prepare('SELECT system,local_id,user_id FROM ec_links').all(),
        store.prepare("SELECT COUNT(*) AS count FROM stores s JOIN subscriptions b ON b.id=(SELECT x.id FROM subscriptions x WHERE x.store_id=s.id ORDER BY x.created_at DESC LIMIT 1) WHERE b.status IN ('pending','awaiting_activation') OR (s.is_active=0 AND EXISTS(SELECT 1 FROM users u WHERE u.store_id=s.id AND u.is_active=1))").first(),
        store.prepare("SELECT b.id,s.name,b.status,b.created_at FROM subscriptions b JOIN stores s ON s.id=b.store_id WHERE b.id=(SELECT x.id FROM subscriptions x WHERE x.store_id=s.id ORDER BY x.created_at DESC LIMIT 1) AND (b.status IN ('pending','awaiting_activation') OR (s.is_active=0 AND EXISTS(SELECT 1 FROM users u WHERE u.store_id=s.id AND u.is_active=1))) ORDER BY b.created_at DESC LIMIT ? OFFSET ?").bind(take,offset).all()
      ]) as any[];
      return json({page,page_size:take,counts:{customers:rows[0].count,stores:rows[1].count,systems:rows[2].count,pending:rows[9].count+rows[15].count,active:rows[10].count+rows[11].count,expired:rows[12].count+rows[13].count},customers:rows[3].results,store_customers:rows[4].results,hub_customers:rows[5].results,stores:rows[6].results,requests:rows[7].results.map((r:any)=>({...r,snapshot:JSON.parse(r.snapshot)})),audit:rows[8].results,links:rows[14].results,store_requests:rows[16].results});
    }
    if(path.startsWith('store/')){
      if(!env.ECOSYSTEM_STORE_DB)return json({error:'مصدر المتاجر غير مربوط'},503);
      const localPath=path.slice(6);
      if(!/^admin\/(?:merchants(?:\/[a-zA-Z0-9-]+\/(?:toggle-status|renew-subscription))?|subscription-requests(?:\/[a-zA-Z0-9-]+\/(?:proof|review))?|employee-renewal-requests(?:\/[a-zA-Z0-9-]+\/(?:proof|review))?)$/.test(localPath)&&!['admin/analytics','d1-status'].includes(localPath))return json({error:'عملية غير متاحة من هذه الواجهة'},404);
      if(request.method==='DELETE')return json({error:'الحذف الدائم غير متاح في لوحة المنظومة؛ استخدم الإيقاف للحفاظ على البيانات'},405);
      const target=new URL('/api/'+localPath,request.url);target.search=new URL(request.url).search;
      const result=await handleStoreRequest(new Request(target,request),{...env,DB:env.ECOSYSTEM_STORE_DB,READ_ONLY_PREVIEW:'false'},{id:user.id,username:user.name,email:user.email,role:'super_admin',store_id:null,is_active:1,password:''});
      if(result.ok&&request.method!=='GET')await ecoAudit(env,user.id,'store-admin-'+request.method,localPath);
      return result;
    }
    if(path.startsWith('hub/')){
      if(!env.ECOSYSTEM_HUB_DB)return json({error:'مصدر الأنظمة غير مربوط'},503);
      const localPath=path.slice(4);
      if(!/^hub-[a-z-]+$/.test(localPath)&&localPath!=='service-subscriptions')return json({error:'المسار غير متاح'},404);
      const localEnv={...env,DB:env.ECOSYSTEM_HUB_DB,ADMIN_EMAIL:user.email};
      const result=localPath==='service-subscriptions'?await serviceSubscriptions(request,localEnv):await adminHub(request,localEnv,localPath,user.id);
      if(result?.ok&&request.method!=='GET')await ecoAudit(env,user.id,'hub-admin-'+request.method,localPath);
      return result||json({error:'العملية غير موجودة'},404);
    }
    return null;
  }catch(error){console.error('[ecosystem-admin]',error);return json({error:'تعذر تحميل بيانات الإدارة أو حفظ التغيير. حاول مرة أخرى.'},500)}
}
