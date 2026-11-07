import { ecoBind, ecoLocalId, ecoPublish, type EcoEnv, type Identity, type EcoAdapter } from '../../shared/ecosystem';
import { displayStorePlan, effectiveStoreStatus } from './store-status';
export type StoreEcoEnv=EcoEnv & {DB:any};
export const storeAdapter=(env:StoreEcoEnv):EcoAdapter=>({
 system:'store',
 async ensureLocal(user:Identity){
  const linked=await ecoLocalId(env,'store',user.id);if(linked)return linked;
  if(await env.DB.prepare("SELECT id FROM users WHERE email=? AND email!=''").bind(user.email).first())throw Object.assign(new Error('لديك حساب متجر بهذا البريد. ادخل ببياناته ثم اختر ربط الحساب.'),{status:409});
  const id=crypto.randomUUID();await env.DB.prepare("INSERT INTO users(id,username,email,password,role,is_active) VALUES(?,?,?,?,'merchant',1)").bind(id,'ecosystem-'+user.id,user.email,crypto.randomUUID()).run();
  await ecoBind(env,'store',{id,email:user.email,name:user.name},user.id);return id;
 },
 async sync(user,localId){
  const row=await env.DB.prepare('SELECT u.store_id,u.is_active AS user_active,s.is_active FROM users u LEFT JOIN stores s ON s.id=u.store_id WHERE u.id=?').bind(localId).first();if(!row?.store_id)return;
  const sub=await env.DB.prepare('SELECT * FROM subscriptions WHERE store_id=? ORDER BY created_at DESC LIMIT 1').bind(row.store_id).first();
  const start=sub?.start_date?Date.parse(sub.start_date+'T00:00:00Z'):null,end=sub?.end_date?Date.parse(sub.end_date+'T23:59:59.999Z'):null;
  const status=effectiveStoreStatus(row.user_active,row.is_active,sub);
  await ecoPublish(env,'store',user.id,row.store_id,status,displayStorePlan(sub),start,end);
 }
});
export async function syncStoreResource(env:StoreEcoEnv,storeId:string){
 if(!env.ECOSYSTEM_DB)return;
 const local=await env.DB.prepare('SELECT id FROM users WHERE store_id=?').bind(storeId).first();if(!local)return;
 const link=await env.ECOSYSTEM_DB.prepare('SELECT user_id FROM ec_links WHERE system=? AND local_id=?').bind('store',local.id).first();if(!link)return;
 await storeAdapter(env).sync({id:link.user_id,email:'',name:'',family:'',platform_admin:false},local.id);
}
