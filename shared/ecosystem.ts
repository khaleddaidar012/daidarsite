import {subscriptionChange} from './ecosystem-subscriptions';
// Shared server-only identity and subscription registry. No email-based merges.
export interface EcoDB { prepare(sql:string):any; batch(statements:any[]):Promise<any> }
export interface EcoEnv {
  ECOSYSTEM_DB?: EcoDB; ECOSYSTEM_CLIENT?: string; ECOSYSTEM_HUB_ORIGIN?: string; ECOSYSTEM_STORE_ORIGIN?: string;
  ECOSYSTEM_STORE_DB?: EcoDB; ECOSYSTEM_HUB_DB?: EcoDB;
  ECOSYSTEM_OWNER_LOCAL_ID?: string; HUB_GOOGLE_CLIENT_ID?: string; HUB_GOOGLE_CLIENT_SECRET?: string;
}
export type Identity={id:string;email:string;name:string;family:string;platform_admin:boolean};
export type LocalIdentity={id:string;email:string;name:string};
export interface EcoAdapter {
  system:'hub'|'store';
  ensureLocal(user:Identity):Promise<string>;
  sync(user:Identity,localId:string):Promise<void>;
  googleLocal?(subject:string):Promise<LocalIdentity|null>;
  verifyGoogle?(token:string,clientId:string):Promise<Record<string,unknown>>;
}
const SESSION='__Host-daidar_ecosystem';
export const ecoCookie=(name:string,value:string,age=604800)=>`${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`;
export const ecoRead=(r:Request,name=SESSION)=>r.headers.get('Cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)||'';
export const ecoRandom=()=>crypto.randomUUID()+crypto.randomUUID();
export async function ecoHash(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),n=>n.toString(16).padStart(2,'0')).join('')}
export async function ecoChallenge(s:string){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));return btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')}
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
function reject(message:string,status=400):never{throw Object.assign(new Error(message),{status})}
const origin=(value:string|undefined)=>{const u=new URL(value||'https://invalid.invalid');if(u.protocol!=='https:'||u.pathname!=='/'||u.search||u.hash)reject('إعداد نطاق المنظومة غير صحيح',503);return u.origin};
const clients=(e:EcoEnv)=>({hub:origin(e.ECOSYSTEM_HUB_ORIGIN),store:origin(e.ECOSYSTEM_STORE_ORIGIN)});
const homepage=(client:string)=>client==='store'?'/?view=store_owner':'/ar/hub';
const redirect=(location:string,cookies:string[]=[])=>{const h=new Headers({'Location':location,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});cookies.forEach(c=>h.append('Set-Cookie',c));return new Response(null,{status:303,headers:h})};
export async function ecoAudit(e:EcoEnv,actor:string,action:string,entity:string){await e.ECOSYSTEM_DB!.prepare('INSERT INTO ec_audit(id,actor,action,entity,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),actor,action,entity,Date.now()).run()}
export async function ecoUser(request:Request,e:EcoEnv):Promise<Identity|null>{
  if(!e.ECOSYSTEM_DB)return null;
  const value=ecoRead(request);if(!value)return null;
  return e.ECOSYSTEM_DB.prepare(`SELECT u.id,u.email,u.name,f.id AS family,EXISTS(SELECT 1 FROM ec_roles r WHERE r.user_id=u.id AND r.role='platform_admin') AS platform_admin FROM ec_sessions s JOIN ec_families f ON f.id=s.family_id JOIN ec_users u ON u.id=f.user_id WHERE s.token=? AND s.expires_at>? AND f.expires_at>? AND f.revoked=0 AND u.active=1`).bind(await ecoHash(value),Date.now(),Date.now()).first();
}
async function familyCookie(e:EcoEnv,userId:string,family?:string){
  const db=e.ECOSYSTEM_DB!,expires=Date.now()+604800000;
  await db.batch(['ec_sessions','ec_codes','ec_oauth','ec_device_codes','ec_rate_limits'].map(table=>db.prepare(`DELETE FROM ${table} WHERE expires_at<=?`).bind(Date.now())));
  const f=family||crypto.randomUUID();
  if(!family)await db.prepare('INSERT INTO ec_families(id,user_id,expires_at) VALUES(?,?,?)').bind(f,userId,expires).run();
  const value=ecoRandom();await db.prepare('INSERT INTO ec_sessions(token,family_id,expires_at) VALUES(?,?,?)').bind(await ecoHash(value),f,expires).run();
  return ecoCookie(SESSION,value);
}
export async function ecoBind(e:EcoEnv,system:string,local:LocalIdentity,identityId?:string,explicit=false){
  const db=e.ECOSYSTEM_DB!;let link=await db.prepare('SELECT user_id FROM ec_links WHERE system=? AND local_id=?').bind(system,local.id).first();
  if(link&&identityId&&link.user_id!==identityId){
    if(!explicit)reject('الحساب مرتبط بهوية أخرى. استخدم ربط الحساب بعد إثبات الدخول.',409);
    const collision=await db.prepare('SELECT local_id FROM ec_links WHERE system=? AND user_id=?').bind(system,identityId).first();
    if(collision&&collision.local_id!==local.id)reject('لديك حساب آخر مرتبط بهذا النظام. يلزم مراجعة نقل الملكية.',409);
    await db.batch([
      db.prepare('UPDATE ec_families SET revoked=1 WHERE user_id=?').bind(link.user_id),
      db.prepare('UPDATE ec_links SET user_id=? WHERE system=? AND local_id=?').bind(identityId,system,local.id),
      db.prepare('UPDATE ec_roles SET user_id=? WHERE system=? AND local_id=?').bind(identityId,system,local.id),
      db.prepare('UPDATE ec_entitlements SET user_id=? WHERE system=? AND user_id=?').bind(identityId,system,link.user_id)
    ]);await ecoAudit(e,identityId,'link-reassigned-with-local-proof',system+':'+local.id);return identityId;
  }
  if(link)return link.user_id as string;
  const id=identityId||crypto.randomUUID();
  const statements=[];
  if(!identityId)statements.push(db.prepare('INSERT INTO ec_users(id,email,name,created_at) VALUES(?,?,?,?)').bind(id,local.email,local.name,Date.now()));
  statements.push(db.prepare('INSERT INTO ec_links(system,local_id,user_id) VALUES(?,?,?)').bind(system,local.id,id));
  await db.batch(statements);await ecoAudit(e,id,'local-account-linked',system+':'+local.id);return id;
}
export async function ecoLogin(e:EcoEnv,system:string,local:LocalIdentity,request:Request,link=false){
  if(!e.ECOSYSTEM_DB)return null;
  const current=link?await ecoUser(request,e):null;if(link&&!current)reject('سجل الدخول الموحد أولاً',401);
  const id=await ecoBind(e,system,local,current?.id,link);
  if(system==='store'&&local.id===e.ECOSYSTEM_OWNER_LOCAL_ID)await e.ECOSYSTEM_DB.prepare("INSERT INTO ec_roles(system,local_id,user_id,role) VALUES('store',?,?,'platform_admin') ON CONFLICT(system,local_id,role) DO UPDATE SET user_id=excluded.user_id").bind(local.id,id).run();
  return familyCookie(e,id,current?.family);
}
export async function ecoLocalId(e:EcoEnv,system:string,userId:string):Promise<string|null>{const r=await e.ECOSYSTEM_DB!.prepare('SELECT local_id FROM ec_links WHERE system=? AND user_id=?').bind(system,userId).first();return r?.local_id||null}
export async function ecoLogout(request:Request,e:EcoEnv,all=false){const u=await ecoUser(request,e);if(u){await e.ECOSYSTEM_DB!.prepare(all?'UPDATE ec_families SET revoked=1 WHERE user_id=?':'UPDATE ec_families SET revoked=1 WHERE id=?').bind(all?u.id:u.family).run();await ecoAudit(e,u.id,all?'logout-all':'logout-family',u.family)}return ecoCookie(SESSION,'',0)}
export async function ecoRevokeLocal(e:EcoEnv,system:string,localId:string){if(e.ECOSYSTEM_DB)await e.ECOSYSTEM_DB.prepare('UPDATE ec_families SET revoked=1 WHERE user_id IN (SELECT user_id FROM ec_links WHERE system=? AND local_id=?)').bind(system,localId).run()}
export async function ecoPublish(e:EcoEnv,system:string,userId:string,resource:string,status:string,plan:string,start:number|null,end:number|null){
  if(!e.ECOSYSTEM_DB)return;
  await e.ECOSYSTEM_DB.prepare(`INSERT INTO ec_entitlements(system,resource_id,user_id,status,starts_at,expires_at,plan,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(system,resource_id) DO UPDATE SET user_id=excluded.user_id,status=excluded.status,starts_at=excluded.starts_at,expires_at=excluded.expires_at,plan=excluded.plan,updated_at=excluded.updated_at`).bind(system,resource,userId,status,start,end,plan,Date.now()).run();
}
export async function ecoLimit(e:EcoEnv,r:Request,kind:string,max:number,ms:number){const key=await ecoHash(kind+':'+(r.headers.get('CF-Connecting-IP')||'unknown')+':'+Math.floor(Date.now()/ms));const db=e.ECOSYSTEM_DB!;await db.prepare('INSERT INTO ec_rate_limits(key,hits,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1').bind(key,Date.now()+ms).run();const row=await db.prepare('SELECT hits FROM ec_rate_limits WHERE key=?').bind(key).first();if(row.hits>max)reject('محاولات كثيرة، حاول لاحقاً',429)}
async function identityByFamily(e:EcoEnv,family:string):Promise<Identity|null>{return e.ECOSYSTEM_DB!.prepare(`SELECT u.id,u.email,u.name,f.id AS family,EXISTS(SELECT 1 FROM ec_roles WHERE user_id=u.id AND role='platform_admin') AS platform_admin FROM ec_families f JOIN ec_users u ON u.id=f.user_id WHERE f.id=? AND f.revoked=0 AND f.expires_at>? AND u.active=1`).bind(family,Date.now()).first()}
export async function ecosystem(request:Request,e:EcoEnv,adapter:EcoAdapter):Promise<Response>{
  if(!e.ECOSYSTEM_DB)return response({error:'الدخول الموحد غير مهيأ في هذه البيئة'},503);
  const url=new URL(request.url),path=url.pathname.replace(/^\/api\/ecosystem\/?/,'');
  const db=e.ECOSYSTEM_DB,client=adapter.system,allowed=clients(e);
  try{
    if(!['GET','HEAD','OPTIONS'].includes(request.method)){
      if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)reject('طلب غير مسموح',403);
      if(request.headers.get('Sec-Fetch-Site')==='cross-site')reject('طلب غير مسموح',403);
      if(!request.headers.get('Content-Type')?.startsWith('application/json'))reject('يلزم JSON',415);
    }
    const user=await ecoUser(request,e);
    if(path==='config')return response({enabled:true,google:!!(e.HUB_GOOGLE_CLIENT_ID&&e.HUB_GOOGLE_CLIENT_SECRET),google_missing:[!e.HUB_GOOGLE_CLIENT_ID?'client_id':null,!e.HUB_GOOGLE_CLIENT_SECRET?'client_secret':null].filter(Boolean),hub:allowed.hub,store:allowed.store});
    if(path==='session'&&request.method==='GET'){
      if(user){const id=await ecoLocalId(e,client,user.id);if(id)await adapter.sync(user,id)}
      const entitlements=user?(await db.prepare('SELECT system,resource_id,status,plan,starts_at,expires_at FROM ec_entitlements WHERE user_id=?').bind(user.id).all()).results:[];
      return response({user:user?{id:user.id,email:user.email,name:user.name,platform_admin:!!user.platform_admin}:null,entitlements});
    }
    if(path==='logout'&&request.method==='POST'){
      const body=await request.json() as any;return new Response(JSON.stringify({success:true}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':await ecoLogout(request,e,body.all===true)}});
    }
    if(path==='login'&&request.method==='GET'){
      const via=url.searchParams.get('via')==='store'?'store':'hub';
      const state=ecoRandom(),verifier=ecoRandom();const to=new URL('/api/ecosystem/authorize',allowed[via]);
      to.search=new URLSearchParams({client,state,challenge:await ecoChallenge(verifier)}).toString();
      return redirect(to.toString(),[ecoCookie('__Host-eco_state',state,600),ecoCookie('__Host-eco_pkce',verifier,600)]);
    }
    if(path==='authorize'&&request.method==='GET'){
      if(url.origin!==allowed[client])reject('استخدم بوابة الهوية',400);
      const target=url.searchParams.get('client') as 'hub'|'store',state=url.searchParams.get('state')||'',challenge=url.searchParams.get('challenge')||'';
      if(!allowed[target]||!/^[a-f0-9-]{72}$/.test(state)||!/^[-\w]{43}$/.test(challenge))reject('طلب دخول غير صحيح');
      if(!user)return redirect(allowed[client]+(client==='store'?'/?view=merchant_login&ecosystem_resume=1':'/ar/hub?ecosystem_resume=1'),[ecoCookie('__Host-eco_pending',encodeURIComponent(url.search),600)]);
      const code=ecoRandom();await db.prepare('INSERT INTO ec_codes(code,family_id,client,challenge,expires_at) VALUES(?,?,?,?,?)').bind(await ecoHash(code),user.family,target,challenge,Date.now()+60000).run();
      const callback=new URL('/api/ecosystem/callback',allowed[target]);callback.search=new URLSearchParams({code,state}).toString();return redirect(callback.toString(),[ecoCookie('__Host-eco_pending','',0)]);
    }
    if(path==='continue'&&request.method==='GET'){
      const pending=ecoRead(request,'__Host-eco_pending');if(!user||!pending)return redirect(allowed[client]+homepage(client));
      const q=new URLSearchParams(decodeURIComponent(pending));return redirect(allowed[client]+'/api/ecosystem/authorize?'+q);
    }
    if(path==='callback'&&request.method==='GET'){
      const state=url.searchParams.get('state'),code=url.searchParams.get('code')||'',verifier=ecoRead(request,'__Host-eco_pkce');
      if(!state||state!==ecoRead(request,'__Host-eco_state')||!verifier)reject('انتهت محاولة الدخول، ابدأ من جديد',401);
      const row=await db.prepare('UPDATE ec_codes SET used=1 WHERE code=? AND client=? AND challenge=? AND expires_at>? AND used=0 RETURNING family_id').bind(await ecoHash(code),client,await ecoChallenge(verifier),Date.now()).first();
      if(!row)reject('كود الدخول منتهي أو مستخدم',401);
      const identity=await identityByFamily(e,row.family_id);if(!identity)reject('الجلسة غير صالحة',401);
      let id:string;
      try{id=await adapter.ensureLocal(identity)}catch(error:any){if(error.status!==409)throw error;return redirect(allowed[client]+(client==='store'?'/?view=merchant_login&ecosystem_link=1':'/ar/hub?ecosystem_link=1'),[await familyCookie(e,identity.id,identity.family),ecoCookie('__Host-eco_state','',0),ecoCookie('__Host-eco_pkce','',0)])}
      await adapter.sync(identity,id);
      return redirect(allowed[client]+homepage(client),[await familyCookie(e,identity.id,identity.family),ecoCookie('__Host-eco_state','',0),ecoCookie('__Host-eco_pkce','',0)]);
    }
    if(path==='google'&&request.method==='GET'){
      if(url.origin!==allowed.hub)return redirect(allowed.hub+'/api/ecosystem/google');
      if(!e.HUB_GOOGLE_CLIENT_ID||!e.HUB_GOOGLE_CLIENT_SECRET)reject('إعداد Google غير متاح بعد',503);
      await ecoLimit(e,request,'google',20,900000);
      const state=ecoRandom(),nonce=ecoRandom(),verifier=ecoRandom();
      await db.prepare('INSERT INTO ec_oauth(state,nonce,verifier,user_id,expires_at) VALUES(?,?,?,?,?)').bind(await ecoHash(state),nonce,verifier,user?.id||null,Date.now()+600000).run();
      const target=new URL('https://accounts.google.com/o/oauth2/v2/auth');target.search=new URLSearchParams({client_id:e.HUB_GOOGLE_CLIENT_ID,redirect_uri:allowed.hub+'/api/ecosystem/google/callback',response_type:'code',scope:'openid email profile',state,nonce,code_challenge:await ecoChallenge(verifier),code_challenge_method:'S256',prompt:'select_account'}).toString();
      return redirect(target.toString(),[ecoCookie('__Host-eco_google',state,600)]);
    }
    if(path==='google/callback'&&request.method==='GET'){
      const state=url.searchParams.get('state')||'';
      if(!state||state!==ecoRead(request,'__Host-eco_google')||!url.searchParams.get('code')||url.searchParams.get('error'))reject('تعذر إكمال دخول Google',401);
      const pending=await db.prepare('DELETE FROM ec_oauth WHERE state=? AND expires_at>? RETURNING nonce,verifier,user_id').bind(await ecoHash(state),Date.now()).first();if(!pending)reject('انتهت محاولة الدخول',401);
      const tokens=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:e.HUB_GOOGLE_CLIENT_ID!,client_secret:e.HUB_GOOGLE_CLIENT_SECRET!,redirect_uri:allowed.hub+'/api/ecosystem/google/callback',code:url.searchParams.get('code')!,grant_type:'authorization_code',code_verifier:pending.verifier})});
      if(!tokens.ok)reject('تعذر التحقق من Google',401);const data=await tokens.json() as any;
      if(!adapter.verifyGoogle)reject('ارجع إلى بوابة الهوية لإكمال Google',503);
      const payload=await adapter.verifyGoogle(data.id_token,e.HUB_GOOGLE_CLIENT_ID!);
      if(payload.nonce!==pending.nonce||typeof payload.sub!=='string'||typeof payload.email!=='string'||payload.email_verified!==true)reject('تعذر إثبات هوية Google',401);
      let linked=await db.prepare('SELECT user_id FROM ec_google WHERE subject=?').bind(payload.sub).first();
      // Never match identities on email. Linking Google to an existing account requires its current session.
      if(pending.user_id&&(!user||user.id!==pending.user_id))reject('أعد تسجيل الدخول قبل ربط Google',401);
      if(linked&&pending.user_id&&linked.user_id!==pending.user_id)reject('حساب Google مرتبط بهوية أخرى',409);
      let id=linked?.user_id||pending.user_id;
      if(!id){const legacy=await adapter.googleLocal?.(payload.sub);if(legacy)id=await ecoBind(e,client,legacy);else{id=crypto.randomUUID();await db.prepare('INSERT INTO ec_users(id,email,name,created_at) VALUES(?,?,?,?)').bind(id,payload.email,String(payload.name||payload.email).slice(0,120),Date.now()).run()}}
      if(!linked)await db.prepare('INSERT INTO ec_google(subject,user_id) VALUES(?,?)').bind(payload.sub,id).run();
      const profile={id,email:payload.email,name:String(payload.name||payload.email),family:'',platform_admin:false};
      try{await adapter.ensureLocal(profile)}catch(error:any){if(error.status!==409)throw error;return redirect(allowed.hub+'/ar/hub?ecosystem_link=1',[await familyCookie(e,id),ecoCookie('__Host-eco_google','',0)])}
      await ecoAudit(e,id,'google-login',id);
      return redirect(allowed.hub+'/ar/hub?ecosystem_resume=1',[await familyCookie(e,id),ecoCookie('__Host-eco_google','',0)]);
    }
    if(path==='admin'&&request.method==='GET'){
      if(!user?.platform_admin)reject('هذه الصلاحية لإدارة المنظومة فقط',403);
      const users=await db.prepare('SELECT id,email,name,active,created_at FROM ec_users ORDER BY created_at DESC LIMIT 200').all();
      const entitlements=await db.prepare('SELECT * FROM ec_entitlements ORDER BY updated_at DESC LIMIT 500').all();
      const audit=await db.prepare('SELECT actor,action,entity,created_at FROM ec_audit ORDER BY created_at DESC LIMIT 100').all();
      return response({users:users.results,entitlements:entitlements.results,audit:audit.results});
    }
    if(path==='admin/entitlements'&&request.method==='POST'){
      if(!user?.platform_admin)reject('هذه الصلاحية لإدارة المنظومة فقط',403);
      await subscriptionChange(e,user.id,await request.json());return response({success:true});
    }
    if(path==='device/start'&&request.method==='POST'){
      await ecoLimit(e,request,'device',10,600000);const body=await request.json() as any;if(!/^DFD1-[A-F0-9]{64}$/.test(body.device_id||''))reject('معرف الجهاز غير صحيح');
      const secret=ecoRandom(),code=crypto.randomUUID().replace(/-/g,'').slice(0,10).toUpperCase();
      await db.prepare('INSERT INTO ec_device_codes(token,user_code,device_id,expires_at) VALUES(?,?,?,?)').bind(await ecoHash(secret),code,body.device_id,Date.now()+600000).run();
      return response({device_code:secret,user_code:code,verification_uri:allowed.hub+'/ar/hub?flow_code='+code,expires_in:600,interval:5});
    }
    if(path==='device/approve'&&request.method==='POST'){
      if(!user)reject('سجل الدخول أولاً',401);const b=await request.json() as any;
      const row=await db.prepare('UPDATE ec_device_codes SET family_id=? WHERE user_code=? AND family_id IS NULL AND expires_at>? AND used=0 RETURNING device_id').bind(user.family,String(b.user_code||''),Date.now()).first();if(!row)reject('الكود منتهي أو مستخدم',409);
      await ecoAudit(e,user.id,'flow-device-approved',row.device_id);return response({success:true});
    }
    if(path==='device/poll'&&request.method==='POST'){
      const b=await request.json() as any,key=await ecoHash(String(b.device_code||''));
      const row=await db.prepare('SELECT * FROM ec_device_codes WHERE token=? AND expires_at>? AND used=0').bind(key,Date.now()).first();if(!row)reject('انتهى كود الجهاز',410);
      if(Date.now()-row.last_poll<5000)reject('انتظر خمس ثوانٍ',429);await db.prepare('UPDATE ec_device_codes SET last_poll=? WHERE token=?').bind(Date.now(),key).run();
      if(!row.family_id)return response({pending:true},202);
      const identity=await identityByFamily(e,row.family_id);if(!identity)reject('الجلسة ملغاة',401);
      const used=await db.prepare('UPDATE ec_device_codes SET used=1 WHERE token=? AND used=0 RETURNING device_id').bind(key).first();if(!used)reject('الكود مستخدم',409);
      const c=await familyCookie(e,identity.id,identity.family);return response({access_token:c.split(';')[0].split('=')[1],user:{id:identity.id,name:identity.name},expires_in:604800,device_id:used.device_id});
    }
    if(path==='device/session'&&request.method==='GET'){
      const bearer=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9-]{72})$/)?.[1];if(!bearer)reject('سجل دخول الجهاز',401);
      const identity=await ecoUser(new Request(request.url,{headers:{Cookie:SESSION+'='+bearer}}),e);if(!identity)reject('جلسة الجهاز منتهية',401);
      const rows=await db.prepare("SELECT * FROM ec_entitlements WHERE user_id=? AND system='flow'").bind(identity.id).all();return response({user:{id:identity.id,name:identity.name},entitlements:rows.results,offline_license_required:true});
    }
    return response({error:'المسار غير موجود'},404);
  }catch(error:any){const status=error.status||(/^ERR_(JWT|JWS|JOSE)/.test(error.code||'')?401:/UNIQUE constraint/.test(error.message||'')?409:500);if(status===500)console.error('[ecosystem]',error);return response({error:status===500?'تعذر إكمال العملية':status===401?'انتهى الدخول أو تعذر التحقق من الهوية. سجّل الدخول مرة أخرى.':error.message},status)}
}
