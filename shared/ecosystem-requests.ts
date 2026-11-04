import type {EcoEnv,Identity} from './ecosystem';
export async function createServiceRequest(env:EcoEnv,user:Identity,body:any){
 const db=env.ECOSYSTEM_HUB_DB;
 if(!db)throw Object.assign(new Error('الخدمات غير متاحة الآن'),{status:503});
 if(!/^[a-f0-9-]{36}$/i.test(body.operation_id||'')||!['consultation','system-management'].includes(body.kind)||typeof(body.note??'')!=='string'||String(body.note||'').length>2000)throw Object.assign(new Error('راجع تفاصيل الطلب'),{status:422});
 const link=await env.ECOSYSTEM_DB!.prepare("SELECT local_id FROM ec_links WHERE system='hub' AND user_id=?").bind(user.id).first();
 const local=link?.local_id;
 if(!local||!await db.prepare('SELECT id FROM hub_users WHERE id=? AND active=1').bind(local).first())throw Object.assign(new Error('اربط حساب هب القديم من حسابك أولاً'),{status:409});
 const management=body.kind==='system-management',prices:Record<number,number>={1:80000,2:120000,3:160000};
 if(management&&(!Number.isInteger(body.hours)||!prices[body.hours]||!Number.isInteger(body.start)||body.start<18||body.start+body.hours>24||!['instapay','vodafone'].includes(body.method)))throw Object.assign(new Error('راجع الباقة والموعد وطريقة الدفع'),{status:422});
 const snapshot={kind:body.kind,productId:body.kind,product:management?'إدارة السيستم':'استشارة تقنية',activity:'',addons:[],devices:1,period:management?'monthly':'',total:management?prices[body.hours]:0,paymentMode:'manual',note:String(body.note||'').trim(),...(management?{hours:body.hours,start:body.start,method:body.method}:{} )};
 const number='DS-'+crypto.randomUUID().slice(0,8).toUpperCase(),now=Date.now(),serialized=JSON.stringify(snapshot);
 await db.prepare("INSERT INTO hub_orders(id,order_number,user_id,snapshot,status,created_at,updated_at) VALUES(?,?,?,?,'under_review',?,?) ON CONFLICT(id) DO NOTHING").bind(body.operation_id,number,local,serialized,now,now).run();
 const saved=await db.prepare('SELECT user_id,snapshot,order_number FROM hub_orders WHERE id=?').bind(body.operation_id).first();
 if(!saved||saved.user_id!==local||saved.snapshot!==serialized)throw Object.assign(new Error('رقم العملية مستخدم لطلب مختلف'),{status:409});
 return {success:true,id:body.operation_id,number:saved.order_number};
}
