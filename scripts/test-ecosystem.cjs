const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),{DatabaseSync}=require('node:sqlite');
const cache=new Map();let joseOverride;
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const m={exports:{}};cache.set(file,m.exports);new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>n==='jose'&&joseOverride?joseOverride:n.startsWith('.')?load(path.resolve(path.dirname(file),n)+'.ts'):require(n),m,m.exports);cache.set(file,m.exports);return m.exports}
function db(files){const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const file of files)sqlite.exec(fs.readFileSync(file,'utf8'));return{sqlite,prepare(sql){let args=[];return{bind(...v){args=v;return this},async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return{results:sqlite.prepare(sql).all(...args)}},async run(){return sqlite.prepare(sql).run(...args)}}},async batch(items){sqlite.exec('BEGIN');try{const out=[];for(const i of items)out.push(await i.run());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}}}
const center=db(['ecosystem/migrations/0001_identity.sql']),hubDB=db(['migrations/0001_admin.sql','migrations/0003_hub.sql']),storeDB=db(['matjari/migrations/0001_initial_schema.sql','matjari/migrations/0002_auth_sessions.sql']);
const common={ECOSYSTEM_DB:center,ECOSYSTEM_STORE_DB:storeDB,ECOSYSTEM_HUB_DB:hubDB,ECOSYSTEM_HUB_ORIGIN:'https://hub.example',ECOSYSTEM_STORE_ORIGIN:'https://store.example',HUB_GOOGLE_CLIENT_ID:'google-test',HUB_GOOGLE_CLIENT_SECRET:'unused-test-secret'};
const hubEnv={...common,DB:hubDB},storeEnv={...common,DB:storeDB,ECOSYSTEM_OWNER_LOCAL_ID:'owner'};
const eco=load('shared/ecosystem.ts'),auth=load('matjari/lib/auth.ts'),hub=load('functions/api/hub/[[path]].ts'),store=load('matjari/functions/api/[[route]].ts'),hubAdapter=load('functions/lib/ecosystem.ts').hubAdapter(hubEnv),storeAdapter=load('matjari/lib/ecosystem.ts').storeAdapter(storeEnv);
const request=(host,p,method='GET',body,cookie='')=>new Request('https://'+host+'.example'+p,{method,headers:{Cookie:cookie,Origin:'https://'+host+'.example','Content-Type':'application/json','CF-Connecting-IP':'203.0.113.4'},body:body===undefined?undefined:JSON.stringify(body)});
const ec=(host,p,cookie='',method='GET',body)=>eco.ecosystem(request(host,'/api/ecosystem/'+p,method,body,cookie),host==='hub'?hubEnv:storeEnv,host==='hub'?hubAdapter:storeAdapter);
const cookie=(r)=>r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
const data=async r=>{assert.equal(r.status,200,await r.clone().text());return r.json()};
async function test(){
 const pass=await auth.passwordHash('owner password 123');storeDB.sqlite.prepare("INSERT INTO users(id,username,email,password,role) VALUES('owner','owner','owner@example.test',?,'super_admin')").run(pass);
 let owner=await store.onRequest({request:request('store','/api/auth/login','POST',{username:'owner',password:'owner password 123'}),env:storeEnv});await data(owner);let ownerCookie=cookie(owner);
 const ownerIdentity=(await data(await ec('store','session',ownerCookie))).user;assert.equal(ownerIdentity.platform_admin,true);
 assert.equal((await ec('store','admin')).status,403);
 assert.equal((await ec('store','admin',ownerCookie)).status,200);
 const start=await ec('hub','login?via=store');assert.equal(start.status,303);let callbackCookies=cookie(start);
 const authz=await ec('store',new URL(start.headers.get('location')).search?'authorize'+new URL(start.headers.get('location')).search:'',ownerCookie);assert.equal(authz.status,303);
 const callbackUrl=new URL(authz.headers.get('location'));const callback=await ec('hub','callback'+callbackUrl.search,callbackCookies);assert.equal(callback.status,303);
 const hubCookie=cookie(callback);assert.equal((await data(await ec('hub','session',hubCookie))).user.id,ownerIdentity.id);
 assert.equal((await ec('hub','callback'+callbackUrl.search,callbackCookies)).status,401);
 const localHub=await data(await hub.onRequest({request:request('hub','/api/hub/session','GET',undefined,hubCookie),env:hubEnv}));assert(localHub.user.id);assert.notEqual(localHub.user.id,ownerIdentity.id);
 assert.equal((await ec('hub','authorize?client=evil&state='+eco.ecoRandom()+'&challenge='+'x'.repeat(43),hubCookie)).status,400);
 const sharedEmail='shared@example.test';
 const hs=await hub.onRequest({request:request('hub','/api/hub/signup','POST',{name:'Existing Hub',email:sharedEmail,password:'hub password 12345'}),env:hubEnv});await data(hs);const hCookie=cookie(hs),hubId=(await data(await ec('hub','session',hCookie))).user.id;
 const sr=await store.onRequest({request:request('store','/api/auth/register','POST',{store_name:'مؤسسة الاختبار',activity_type:'عام',whatsapp_number:'01000000000',email:sharedEmail,username:'merchant',password:'store password 123',role:'super_admin'}),env:storeEnv});const merchant=await data(sr),sCookie=cookie(sr),storeIdentity=(await data(await ec('store','session',sCookie))).user;
 assert.notEqual(storeIdentity.id,hubId);assert.equal(storeIdentity.platform_admin,false);assert.equal(merchant.user.role,'merchant');
 assert.equal((await ec('store','admin',sCookie)).status,403);
 // Explicit linking requires both a unified session and the old account's password.
 assert.equal((await hub.onRequest({request:request('hub','/api/hub/login','POST',{email:sharedEmail,password:'bad',link_identity:true},sCookie),env:hubEnv})).status,401);
 const linked=await hub.onRequest({request:request('hub','/api/hub/login','POST',{email:sharedEmail,password:'hub password 12345',link_identity:true},sCookie),env:hubEnv});await data(linked);const linkedCookie=cookie(linked);
 assert.equal((await data(await ec('hub','session',linkedCookie))).user.id,storeIdentity.id);assert.equal((await ec('hub','session',hCookie)).status,200);assert.equal((await data(await ec('hub','session',hCookie))).user,null);
 assert.equal((await hub.onRequest({request:request('hub','/api/hub/session','GET',undefined,linkedCookie),env:hubEnv})).status,200);
 const status=(await data(await ec('store','session',sCookie))).entitlements[0];assert.equal(status.resource_id,merchant.store.id);assert.equal(status.status,'awaiting_activation');
 const renew={operation_id:crypto.randomUUID(),system:'store',resource_id:merchant.store.id,action:'renew',months:1};
 assert.equal((await ec('store','admin/entitlements',sCookie,'POST',renew)).status,403);
 await data(await ec('store','admin/entitlements',ownerCookie,'POST',renew));
 const end=storeDB.sqlite.prepare('SELECT end_date FROM subscriptions WHERE store_id=?').get(merchant.store.id).end_date;
 await data(await ec('store','admin/entitlements',ownerCookie,'POST',renew));assert.equal(storeDB.sqlite.prepare('SELECT end_date FROM subscriptions WHERE store_id=?').get(merchant.store.id).end_date,end);
 assert.equal((await ec('store','admin/entitlements',ownerCookie,'POST',{...renew,months:2})).status,409);
 assert.equal(storeDB.sqlite.prepare('SELECT is_active FROM stores WHERE id=?').get(merchant.store.id).is_active,1);
 await data(await hub.onRequest({request:request('hub','/api/hub/logout','POST',{},linkedCookie),env:hubEnv}));assert.equal((await store.onRequest({request:request('store','/api/auth/session','GET',undefined,sCookie),env:storeEnv})).status,401);
 // PKCE mismatch leaves the legitimate code usable, but never authenticates the attacker.
 const next=await ec('hub','login?via=store');const z=await ec('store','authorize'+new URL(next.headers.get('location')).search,ownerCookie);const cb=new URL(z.headers.get('location')).search;
 assert.equal((await ec('hub','callback'+cb,cookie(next).replace(/__Host-eco_pkce=[^;]+/,'__Host-eco_pkce=wrong'))).status,401);
 assert.equal((await ec('hub','callback'+cb,cookie(next))).status,303);
 const d=await data(await ec('hub','device/start','','POST',{device_id:'DFD1-'+'A'.repeat(64)}));assert.equal((await ec('hub','device/poll','','POST',{device_code:d.device_code})).status,202);
 assert.equal((await ec('hub','device/approve','','POST',{user_code:d.user_code})).status,401);
 await data(await ec('hub','device/approve',hubCookie,'POST',{user_code:d.user_code}));center.sqlite.prepare('UPDATE ec_device_codes SET last_poll=0').run();
 const grant=await data(await ec('hub','device/poll','','POST',{device_code:d.device_code}));assert(grant.access_token);assert.equal((await ec('hub','device/poll','','POST',{device_code:d.device_code})).status,410);
 const ds=await eco.ecosystem(new Request('https://hub.example/api/ecosystem/device/session',{headers:{Authorization:'Bearer '+grant.access_token}}),hubEnv,hubAdapter);assert.equal((await data(ds)).offline_license_required,true);
 // Google tests verify actual RS256 signatures through jose with an isolated key set.
 const jose=require('jose'),{privateKey,publicKey}=await jose.generateKeyPair('RS256',{extractable:true}),jwk=await jose.exportJWK(publicKey);jwk.kid='test-key';
 joseOverride={...jose,createRemoteJWKSet:()=>jose.createLocalJWKSet({keys:[jwk]})};
 const originalFetch=global.fetch;let claims={},jwt;
 global.fetch=async()=>new Response(JSON.stringify({id_token:jwt}),{headers:{'Content-Type':'application/json'}});
 try{
  const google=await ec('hub','google');assert.equal(google.status,303);const gUrl=new URL(google.headers.get('location'));assert.equal(gUrl.searchParams.get('code_challenge_method'),'S256');const state=gUrl.searchParams.get('state');
  jwt=await new jose.SignJWT({nonce:gUrl.searchParams.get('nonce'),email:'google@example.test',email_verified:true}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer('https://accounts.google.com').setAudience('google-test').setSubject('verified-google-sub').setIssuedAt().setExpirationTime('5m').sign(privateKey);
  const gc=await ec('hub','google/callback?code=test&state='+state,cookie(google));assert.equal(gc.status,303);const gu=(await data(await ec('hub','session',cookie(gc)))).user;assert(gu);assert.equal(gu.platform_admin,false);
  assert.equal((await ec('hub','google/callback?code=test&state='+state,cookie(google))).status,401);
  const bad=await ec('hub','google'),badUrl=new URL(bad.headers.get('location'));jwt=await new jose.SignJWT({nonce:'wrong',email:'owner@example.test',email_verified:true}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer('https://accounts.google.com').setAudience('google-test').setSubject('attacker').setIssuedAt().setExpirationTime('5m').sign(privateKey);
  assert.equal((await ec('hub','google/callback?code=test&state='+badUrl.searchParams.get('state'),cookie(bad))).status,401);
 }finally{global.fetch=originalFetch}
 // Family logout immediately invalidates Flow tokens as well as web sessions.
 await data(await ec('store','logout',ownerCookie,'POST',{}));
 const revoked=await eco.ecosystem(new Request('https://hub.example/api/ecosystem/device/session',{headers:{Authorization:'Bearer '+grant.access_token}}),hubEnv,hubAdapter);assert.equal(revoked.status,401);
 for(const d of [center,hubDB,storeDB])d.sqlite.close();
 console.log('Ecosystem passed: bidirectional-origin PKCE SSO, single-use codes, independent identity IDs, no email merges, explicit password-proof linking, tenant permissions, shared logout, subscription registry, device approval/replay protection, and signed Google OIDC nonce/replay checks.');
}
test().catch(e=>{console.error(e);process.exitCode=1});
