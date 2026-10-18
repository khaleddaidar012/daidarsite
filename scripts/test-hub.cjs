const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const { DatabaseSync } = require('node:sqlite')

function load(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => dependencies[name] || require(name), module, module.exports)
  return module.exports
}
const sqlite = new DatabaseSync(':memory:')
sqlite.exec('PRAGMA foreign_keys=ON')
for (const file of ['migrations/0001_admin.sql', 'migrations/0002_employees.sql', 'migrations/0003_hub.sql', 'migrations/0004_employee_work_permissions.sql', 'migrations/0005_d1_usage_permission.sql', 'migrations/0006_admin_notifications.sql', 'migrations/0007_employee_payroll.sql', 'migrations/0008_employee_payroll_visibility.sql', 'migrations/0009_project_tracking.sql']) sqlite.exec(fs.readFileSync(file, 'utf8'))
const DB = {
  prepare(sql) {
    let args = []
    return { bind(...values) { args = values; return this }, async run() { return sqlite.prepare(sql).run(...args) }, async first() { return sqlite.prepare(sql).get(...args) || null }, async all() { return { results: sqlite.prepare(sql).all(...args) } } }
  },
  async batch(statements) { const out=[]; for (const statement of statements) out.push(await statement.run()); return out },
}
const store = load('functions/lib/store.ts')
const d1Usage = load('functions/lib/d1-usage.ts', { './store': store })
const hub = load('functions/api/hub/[[path]].ts', { '../../lib/store': store })
const hubAdmin = load('functions/lib/hub-admin.ts', { './store': store, '../api/hub/[[path]]': hub })
const notifications = load('functions/lib/notifications.ts', { './store': store })
const projects = load('functions/lib/projects.ts', { './store': store, '../../src/data/projects': load('src/data/projects.ts') })
const employees = load('functions/lib/employees.ts', { './store': store })
const workProjects = load('functions/lib/work-projects.ts', { './store': store })
const admin = load('functions/api/admin/[[path]].ts', { '../../lib/work-projects': workProjects, '../../lib/store': store, '../../lib/employees': employees, '../../lib/projects': projects, '../../lib/hub-admin': hubAdmin, '../../lib/d1-usage': d1Usage, '../../lib/notifications': notifications }).onRequest
const env = { DB, ADMIN_EMAIL: 'owner@example.com', ADMIN_PASSWORD_HASH: 'ab'.repeat(24) + ':' + 'cd'.repeat(32) }
function req(base, path, method='GET', body, cookie, origin='https://hub.example') {
  return new Request(`${origin}/api/${base}/${path}`, { method, headers: { Origin: origin, ...(body instanceof FormData ? {} : {'Content-Type':'application/json'}), ...(cookie?{Cookie:cookie}:{}) }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) })
}
async function hubCall(path, method='GET', body, cookie) { return hub.onRequest({ request:req('hub',path,method,body,cookie), env }) }
async function adminCall(path, method='GET', body, cookie) { return admin({ request:req('admin',path,method,body,cookie), env }) }
function readCookie(response) { return response.headers.get('set-cookie').split(';')[0] }
async function signup(email, name) {
  const r=await hubCall('signup','POST',{email,name,password:'correct-hub-password-2026'})
  assert.equal(r.status,200)
  return readCookie(r)
}
async function test() {
  const adminLogin=await adminCall('login','POST',{email:env.ADMIN_EMAIL,password:'irrelevant'})
  assert.equal(adminLogin.status,401)
  assert.equal((await adminCall('hub-orders')).status,401)
  const adminPassSalt='ab'.repeat(24)
  const {pbkdf2Sync}=require('node:crypto')
  env.ADMIN_PASSWORD_HASH=`${adminPassSalt}:${pbkdf2Sync('admin-password',adminPassSalt,100000,32,'sha256').toString('hex')}`
  const login=await adminCall('login','POST',{email:env.ADMIN_EMAIL,password:'admin-password'})
  assert.equal(login.status,200)
  const adminCookie=readCookie(login)

  const userA=await signup('a@example.com','Customer A')
  const userB=await signup('b@example.com','Customer B')
  env.HUB_FILES={async get(){return {body:new Blob(['private installer bytes']).stream()}}}
  assert.match(userA,/HttpOnly|daidar_hub_session/)
  assert.equal((await hubCall('session','GET',undefined,userA)).status,200)
  assert.equal((await hubCall('session','GET',undefined)).status,200)
  assert.equal((await hubCall('signup','POST',{email:'a@example.com',name:'Duplicate',password:'correct-hub-password-2026'})).status,409)
  assert.equal((await adminCall('hub-orders','GET',undefined,adminCookie)).status,200)

  const catalog=(await (await hubCall('catalog','GET',undefined,userA)).json()).catalog
  assert.equal(catalog.billing.monthly,35000)
  assert.equal(catalog.modules.find(m=>m.id==='weight').monthlyPrice,null)
  const demo=await hubCall('orders','POST',{productId:'daidar-flow',activityId:'general',period:'monthly',devices:1,addons:[],price:1},userA)
  assert.equal(demo.status,201)
  const demoOrder=(await demo.json()).order
  assert.equal(demoOrder.snapshot.total,35000)
  assert.equal(demoOrder.snapshot.paymentMode,'demo')
  const draftAddon=await hubCall('orders','POST',{productId:'daidar-flow',activityId:'supermarket',period:'monthly',devices:1,addons:['weight']},userA)
  assert.equal(draftAddon.status,409)
  const addonConfig=(await (await adminCall('hub-catalog','GET',undefined,adminCookie)).json()).catalog
  const weight=addonConfig.modules.find(m=>m.id==='weight')
  weight.monthlyPrice=1000; weight.yearlyPrice=10000; weight.priceStatus='approved'; weight.requires=['core-inventory']
  assert.equal((await adminCall('hub-catalog','POST',{catalog:addonConfig},adminCookie)).status,200)
  const pricedAddon=await hubCall('orders','POST',{productId:'daidar-flow',activityId:'supermarket',period:'monthly',devices:1,addons:['weight'],price:1},userA)
  assert.equal(pricedAddon.status,201)
  const addonOrder=(await pricedAddon.json()).order
  assert.equal(addonOrder.snapshot.total,36000)
  assert.ok(addonOrder.snapshot.addons.some(m=>m.id==='core-inventory'))
  const cyclic={...addonConfig,modules:addonConfig.modules.map(m=>m.id==='core-inventory'?{...m,requires:['weight']}:m)}
  assert.equal((await adminCall('hub-catalog','POST',{catalog:cyclic},adminCookie)).status,422)
  assert.equal((await (await hubCall('orders','GET',undefined,userB)).json()).orders.length,0)
  assert.equal((await hubCall(`download/${crypto.randomUUID()}`,'GET',undefined,userB)).status,403)
  assert.equal((await hubCall(`orders/${demoOrder.id}/proof-intent`,'POST',{},userA)).status,425)
  sqlite.prepare('UPDATE hub_orders SET created_at=? WHERE id=?').run(Date.now()-121000,demoOrder.id)
  const refreshedOrders=(await (await hubCall('orders','GET',undefined,userA)).json()).orders
  assert.equal(refreshedOrders.find(o=>o.id===demoOrder.id).proof_available_at,refreshedOrders.find(o=>o.id===demoOrder.id).created_at+120000)
  const intent=await hubCall(`orders/${demoOrder.id}/proof-intent`,'POST',{},userA)
  assert.equal(intent.status,200)
  assert.equal((await intent.json()).demo,true)
  assert.equal(sqlite.prepare('SELECT proof_requested_at FROM hub_orders WHERE id=?').get(demoOrder.id).proof_requested_at>0,true)
  assert.equal((await adminCall('hub-orders','POST',{id:demoOrder.id,action:'approve'},adminCookie)).status,409)

  const releaseId=crypto.randomUUID()
  sqlite.prepare('INSERT INTO hub_releases(id,version,object_key,filename,published,created_at) VALUES(?,?,?,?,1,?)').run(releaseId,'1.0.0','release/file.bin','file.bin',Date.now())
  const settings=(await (await adminCall('hub-catalog','GET',undefined,adminCookie)).json()).catalog
  settings.products.find(p=>p.id==='daidar-flow').available=true
  settings.commercialEnabled=true
  assert.equal((await adminCall('hub-catalog','POST',{catalog:settings},adminCookie)).status,200)
  const priced=await hubCall('orders','POST',{productId:'daidar-flow',activityId:'general',period:'monthly',devices:1,addons:[],price:1},userA)
  assert.equal(priced.status,201)
  const commercialOrder=(await priced.json()).order
  assert.equal(commercialOrder.snapshot.total,35000)
  assert.equal(commercialOrder.snapshot.paymentMode,'instapay')
  sqlite.prepare('UPDATE hub_orders SET created_at=? WHERE id=?').run(Date.now()-121000,commercialOrder.id)
  assert.equal((await hubCall(`orders/${commercialOrder.id}/proof-intent`,'POST',{},userA)).status,200)
  const approved=await adminCall('hub-orders','POST',{id:commercialOrder.id,action:'approve'},adminCookie)
  assert.equal(approved.status,200)
  const subscription=(await approved.json()).subscriptionId
  const savedSub=sqlite.prepare('SELECT * FROM hub_subscriptions WHERE id=?').get(subscription)
  assert.equal(savedSub.status,'awaiting_activation')
  assert.equal(savedSub.expires_at,null)
  assert.equal((await adminCall('hub-orders','POST',{id:commercialOrder.id,action:'approve'},adminCookie)).status,409)

  const pair=await crypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify'])
  env.HUB_LICENSE_SIGNING_PRIVATE_JWK=JSON.stringify(await crypto.subtle.exportKey('jwk',pair.privateKey))
  env.HUB_LICENSE_VERIFY_PUBLIC_JWK=JSON.stringify(await crypto.subtle.exportKey('jwk',pair.publicKey))
  env.HUB_FILES={async get(){return {body:new Blob(['private installer bytes']).stream()}}}
  const noAccess=await hubCall(`download/${releaseId}`,'GET',undefined,userB)
  assert.equal(noAccess.status,403)
  const file=await hubCall(`download/${releaseId}`,'GET',undefined,userA)
  assert.equal(file.status,200)
  assert.equal(await file.text(),'private installer bytes')
  const device='a1'.repeat(32)
  const activation=await hubCall('license/activate','POST',{subscriptionId:subscription,deviceHash:device},userA)
  assert.equal(activation.status,200)
  const license=(await activation.json()).license
  const activationDate=new Date(license.payload.activatedAt),expiryDate=new Date(license.payload.expiresAt)
  assert.equal(expiryDate.getUTCMonth(),(activationDate.getUTCMonth()+1)%12)
  assert.equal(expiryDate.getUTCDate(),activationDate.getUTCDate())
  const pub=await crypto.subtle.importKey('jwk',license.publicKey,{name:'Ed25519'},false,['verify'])
  const verifyBytes=new TextEncoder().encode(canonical(license.payload))
  const signature=Uint8Array.from(atob(license.signature),c=>c.charCodeAt(0))
  assert.equal(await crypto.subtle.verify('Ed25519',pub,signature,verifyBytes),true)
  assert.equal(await crypto.subtle.verify('Ed25519',pub,signature,new TextEncoder().encode(canonical({...license.payload,expiresAt:license.payload.expiresAt+1}))),false)
  assert.equal((await hubCall('license/activate','POST',{subscriptionId:subscription,deviceHash:'b2'.repeat(32)},userA)).status,409)
  const sameDevice=await hubCall('license/activate','POST',{subscriptionId:subscription,deviceHash:device},userA)
  assert.equal(sameDevice.status,200)
  assert.equal((await sameDevice.json()).license.version,license.version)

  const previousExpiry=sqlite.prepare('SELECT expires_at FROM hub_subscriptions WHERE id=?').get(subscription).expires_at
  const renewalResponse=await hubCall('orders','POST',{productId:'daidar-flow',activityId:'general',period:'monthly',devices:1,addons:[],renewSubscriptionId:subscription},userA)
  assert.equal(renewalResponse.status,201)
  const renewalOrder=(await renewalResponse.json()).order
  sqlite.prepare('UPDATE hub_orders SET created_at=? WHERE id=?').run(Date.now()-121000,renewalOrder.id)
  assert.equal((await hubCall(`orders/${renewalOrder.id}/proof-intent`,'POST',{},userA)).status,200)
  const renewalApproval=await adminCall('hub-orders','POST',{id:renewalOrder.id,action:'approve'},adminCookie)
  assert.equal(renewalApproval.status,200)
  const renewed=sqlite.prepare('SELECT * FROM hub_subscriptions WHERE id=?').get(subscription)
  assert.ok(renewed.expires_at>previousExpiry)
  const afterRenewalExpiry=renewed.expires_at
  assert.equal((await adminCall('hub-orders','POST',{id:renewalOrder.id,action:'approve'},adminCookie)).status,409)
  assert.equal(sqlite.prepare('SELECT expires_at FROM hub_subscriptions WHERE id=?').get(subscription).expires_at,afterRenewalExpiry)
  const synced=await hubCall('license/activate','POST',{subscriptionId:subscription,deviceHash:device},userA)
  assert.equal(synced.status,200)
  const renewedLicense=(await synced.json()).license
  assert.equal(renewedLicense.payload.expiresAt,renewed.expires_at)
  assert.equal(renewedLicense.version,license.version+1)

  assert.equal((await hubCall('transfer-requests','POST',{subscriptionId:subscription,reason:'تغيير الجهاز بسبب العطل'},userA)).status,201)
  const transferList=(await (await adminCall('hub-transfers','GET',undefined,adminCookie)).json()).requests
  assert.equal(transferList.length,1)
  assert.equal((await adminCall('hub-transfers','POST',{id:transferList[0].id,action:'approve'},adminCookie)).status,200)
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM hub_devices WHERE subscription_id=?").get(subscription).n,0)

  console.log('Hub tests passed: account isolation, server prices, draft add-ons, demo proof, real review gate, idempotent approval, private release access, Ed25519 tamper check, device lock and admin transfer.')
  sqlite.close()
}
function canonical(value) { if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;if(value&&typeof value==='object')return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;return JSON.stringify(value) }
test().catch(error=>{console.error(error);sqlite.close();process.exitCode=1})
