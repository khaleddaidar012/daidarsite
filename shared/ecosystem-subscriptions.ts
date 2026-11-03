import type {EcoDB,EcoEnv} from './ecosystem';
function addMonths(value:number,months:number){const d=new Date(value),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);d.setUTCDate(Math.min(day,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()));return d.getTime()}
export async function subscriptionChange(env:EcoEnv,actor:string,body:any){
 const db=env.ECOSYSTEM_DB!;
 if(!/^[a-f0-9-]{36}$/.test(body.operation_id||'')||!['store','flow','hub'].includes(body.system)||typeof body.resource_id!=='string'||!['renew','suspend'].includes(body.action)||body.action==='renew'&&(!Number.isInteger(body.months)||body.months<1||body.months>24))throw Object.assign(new Error('راجع بيانات الاشتراك'),{status:400});
 const payload=JSON.stringify({actor,system:body.system,resource:body.resource_id,action:body.action,months:body.months||0});
 let op=await db.prepare('SELECT * FROM ec_operations WHERE id=?').bind(body.operation_id).first();
 if(op&&op.payload!==payload)throw Object.assign(new Error('رقم العملية مستخدم لطلب آخر'),{status:409});
 if(op?.complete)return;
 const entitlement=await db.prepare('SELECT * FROM ec_entitlements WHERE system=? AND resource_id=?').bind(body.system,body.resource_id).first();
 if(!entitlement)throw Object.assign(new Error('الاشتراك غير مربوط بالمنظومة'),{status:404});
 const source:EcoDB|undefined=body.system==='store'?env.ECOSYSTEM_STORE_DB:env.ECOSYSTEM_HUB_DB;
 if(!source)throw Object.assign(new Error('قاعدة النظام غير مربوطة بهذه البيئة'),{status:503});
 const row=body.system==='store'?await source.prepare('SELECT * FROM subscriptions WHERE store_id=? ORDER BY created_at DESC LIMIT 1').bind(body.resource_id).first():await source.prepare('SELECT * FROM hub_subscriptions WHERE id=?').bind(body.resource_id).first();
 if(!row)throw Object.assign(new Error('الاشتراك الأصلي غير موجود'),{status:404});
 if(!op){const previous=body.system==='store'?Date.parse(row.end_date+'T23:59:59.999Z'):row.expires_at||Date.now();const target={end:body.action==='renew'?addMonths(Math.max(Date.now(),previous),body.months):previous,status:body.action==='renew'?'active':'suspended',id:row.id,beforeEnd:body.system==='store'?row.end_date:row.expires_at,beforeStatus:row.status};await db.prepare('INSERT INTO ec_operations(id,payload,target) VALUES(?,?,?) ON CONFLICT(id) DO NOTHING').bind(body.operation_id,payload,JSON.stringify(target)).run();op=await db.prepare('SELECT * FROM ec_operations WHERE id=?').bind(body.operation_id).first();if(op.payload!==payload)throw Object.assign(new Error('تعارض رقم العملية'),{status:409})}
 const target=JSON.parse(op.target);
 // Persist an absolute target before touching the source: retries never extend twice.
 const desiredEnd=body.system==='store'?new Date(target.end).toISOString().slice(0,10):target.end;
 const applied=(body.system==='store'?row.end_date:row.expires_at)===desiredEnd&&row.status===target.status;
 if(!applied){const changed=body.system==='store'?await source.prepare('UPDATE subscriptions SET end_date=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND end_date IS ? AND status=? RETURNING id').bind(desiredEnd,target.status,target.id,target.beforeEnd,target.beforeStatus).first():await source.prepare('UPDATE hub_subscriptions SET expires_at=?,status=? WHERE id=? AND expires_at IS ? AND status=? RETURNING id').bind(desiredEnd,target.status,target.id,target.beforeEnd,target.beforeStatus).first();if(!changed)throw Object.assign(new Error('تم تعديل الاشتراك بعملية أخرى. حدّث البيانات أولاً.'),{status:409})}
 if(body.system==='store')await source.batch([
   source.prepare('UPDATE stores SET is_active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(target.status==='active'?1:0,body.resource_id),
   source.prepare('UPDATE users SET is_active=?,updated_at=CURRENT_TIMESTAMP WHERE store_id=?').bind(target.status==='active'?1:0,body.resource_id)
 ]);
 await db.batch([
   db.prepare('UPDATE ec_entitlements SET status=?,expires_at=?,updated_at=? WHERE system=? AND resource_id=?').bind(target.status,target.end,Date.now(),body.system,body.resource_id),
   db.prepare('UPDATE ec_operations SET complete=1 WHERE id=?').bind(body.operation_id),
   db.prepare('INSERT INTO ec_audit(id,actor,action,entity,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),actor,'subscription-'+body.action,body.system+':'+body.resource_id,Date.now())
 ]);
}
