import type {EcoEnv,Identity} from './ecosystem';
export type ServiceState='active'|'trial'|'pending'|'expired'|'cancelled'|'suspended';
export function serviceState(status:string,start:number|null,end:number|null,now=Date.now()):ServiceState {
  if(start!==null&&!Number.isFinite(start)||end!==null&&!Number.isFinite(end))return 'pending';
  if(['cancelled','suspended'].includes(status))return status as ServiceState;
  if(status==='expired'||end!==null&&end<=now)return 'expired';
  if(start!==null&&start>now)return 'pending';
  if(status==='trial')return 'trial';
  return status==='active'?'active':'pending';
}
export async function customerOverview(env:EcoEnv,user:Identity){
  const links=(await env.ECOSYSTEM_DB!.prepare('SELECT system,local_id FROM ec_links WHERE user_id=?').bind(user.id).all()).results;
  const services:any[]=[],orders:any[]=[],unavailable:string[]=[];
  const storeOrigin=new URL(env.ECOSYSTEM_STORE_ORIGIN!).origin;
  for(const link of links){
    if(link.system==='store'){
      if(!env.ECOSYSTEM_STORE_DB){unavailable.push('store');continue}
      const row=await env.ECOSYSTEM_STORE_DB.prepare('SELECT s.id,s.name,s.is_active,u.is_active AS user_active FROM users u JOIN stores s ON s.id=u.store_id WHERE u.id=?').bind(link.local_id).first();
      if(!row)continue;
      const sub=await env.ECOSYSTEM_STORE_DB.prepare('SELECT id,plan_name,status,start_date,end_date FROM subscriptions WHERE store_id=? ORDER BY created_at DESC LIMIT 1').bind(row.id).first();
      const start=sub?Date.parse(sub.start_date+'T00:00:00Z'):null,end=sub?Date.parse(sub.end_date+'T23:59:59.999Z'):null;
      const state=serviceState(!row.user_active?'suspended':!row.is_active?'pending':sub?.status||'pending',start,end);
      const preview=new URL('/',storeOrigin);preview.search=new URLSearchParams({view:'storefront',store_id:row.id}).toString();
      services.push({id:row.id,system:'store',title:row.name,plan:sub?.plan_name||'',status:state,start,end,can_access:['active','trial'].includes(state),preview_url:row.is_active?preview.toString():null});
    }
    if(link.system==='hub'){
      if(!env.ECOSYSTEM_HUB_DB){unavailable.push('hub');continue}
      const subs=(await env.ECOSYSTEM_HUB_DB.prepare('SELECT id,product_id,status,snapshot,starts_at,expires_at FROM hub_subscriptions WHERE user_id=? ORDER BY created_at DESC').bind(link.local_id).all()).results;
      for(const sub of subs){let snapshot:any={};try{snapshot=JSON.parse(sub.snapshot)}catch{}
        services.push({id:sub.id,system:sub.product_id==='daidar-flow'?'flow':'hub',title:snapshot.product||sub.product_id,activity:snapshot.activity||'',plan:snapshot.period||'',status:serviceState(sub.status,sub.starts_at,sub.expires_at),start:sub.starts_at,end:sub.expires_at,can_access:false,offline:sub.product_id==='daidar-flow'});
      }
      const rows=(await env.ECOSYSTEM_HUB_DB.prepare('SELECT id,order_number,status,snapshot,created_at FROM hub_orders WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(link.local_id).all()).results;
      for(const row of rows){let snapshot:any={};try{snapshot=JSON.parse(row.snapshot)}catch{}orders.push({id:row.id,number:row.order_number,status:row.status,service:snapshot.product||'',created_at:row.created_at})}
    }
  }
  const management=(await env.ECOSYSTEM_DB!.prepare("SELECT resource_id FROM ec_entitlements WHERE user_id=? AND system='service-management'").bind(user.id).all()).results;
  if(management.length&&!env.ECOSYSTEM_HUB_DB)unavailable.push('service-management');
  for(const entitlement of management){
    if(!env.ECOSYSTEM_HUB_DB)break;
    const row=await env.ECOSYSTEM_HUB_DB.prepare('SELECT id,hours,start_hour,start_date,end_date,cancelled,monthly_price_piasters,amount_received_piasters FROM system_management_subscriptions WHERE id=?').bind(entitlement.resource_id).first();
    if(!row)continue;
    const start=Date.parse(row.start_date+'T00:00:00Z'),end=Date.parse(row.end_date+'T23:59:59.999Z');
    services.push({id:row.id,system:'service-management',title:'إدارة السيستم',plan:row.hours+' ساعة يومياً',status:serviceState(row.cancelled?'cancelled':'active',start,end),start,end,can_access:false,payment_status:'confirmed'});
  }
  return {user:{id:user.id,name:user.name,email:user.email,platform_admin:!!user.platform_admin},services,orders,unavailable};
}
