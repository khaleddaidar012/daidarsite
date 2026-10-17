const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const { DatabaseSync } = require('node:sqlite')
const { pbkdf2Sync } = require('node:crypto')
function load(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(name => dependencies[name] || require(name), module, module.exports)
  return module.exports
}
const sqlite = new DatabaseSync(':memory:')
sqlite.exec(fs.readFileSync('migrations/0001_admin.sql', 'utf8'))
sqlite.exec(fs.readFileSync('migrations/0006_admin_notifications.sql', 'utf8'))
const DB = {
  prepare(sql) {
    let args = []
    return { bind(...values) { args = values; return this }, async run() { return sqlite.prepare(sql).run(...args) }, async first() { return sqlite.prepare(sql).get(...args) || null }, async all() { return { results: sqlite.prepare(sql).all(...args) } } }
  },
  async batch(statements) { return Promise.all(statements.map(s => s.run())) },
}
const store = load('functions/lib/store.ts')
const d1Usage = load('functions/lib/d1-usage.ts', { './store': store })
const notifications = load('functions/lib/notifications.ts', { './store': store })
const employeeLib = load('functions/lib/employees.ts', { './store': store })
const originalProjects = load('src/data/projects.ts')
const projectLib = load('functions/lib/projects.ts', { './store': store, '../../src/data/projects': originalProjects })
const hubApi = load('functions/api/hub/[[path]].ts', { '../../lib/store': store })
const hubAdmin = load('functions/lib/hub-admin.ts', { './store': store, '../api/hub/[[path]]': hubApi })
const admin = load('functions/api/admin/[[path]].ts', { '../../lib/store': store, '../../lib/employees': employeeLib, '../../lib/projects': projectLib, '../../lib/hub-admin': hubAdmin, '../../lib/d1-usage': d1Usage, '../../lib/notifications': notifications }).onRequest
const employeeApi = load('functions/api/employee/[[path]].ts', { '../../lib/store': store, '../../lib/employees': employeeLib, '../../lib/projects': projectLib, '../../lib/hub-admin': hubAdmin, '../../lib/d1-usage': d1Usage, '../../lib/notifications': notifications }).onRequest
const visit = load('functions/api/visit.ts', { '../lib/store': store }).onRequestPost
const publicProjects = load('functions/api/projects.ts', { '../lib/store': store }).onRequestGet
const contact = load('functions/api/contact.ts', { '../lib/store': store, '../lib/notifications': notifications }).onRequestPost
const salt = 'ab'.repeat(24)
const password = 'test-password-long'
const env = { DB, ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD_HASH: salt + ':' + pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex') }
function request(path, method = 'GET', body, cookie, origin = 'https://test.example') {
  return new Request('https://test.example/api/admin/' + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
}
async function call(path, method, body, cookie, origin) { return admin({ request: request(path, method, body, cookie, origin), env }) }
async function test() {
  for (const path of ['session', 'stats', 'messages', 'projects', 'd1-usage']) assert.equal((await call(path)).status, 401)
  assert.equal((await call('projects', 'POST', {})).status, 401)
  assert.equal((await call('login', 'POST', { email: env.ADMIN_EMAIL, password }, undefined, 'https://evil.example')).status, 403)
  assert.equal((await call('login', 'POST', { email: env.ADMIN_EMAIL, password: 'wrong' })).status, 401)
  let response = await call('login', 'POST', { email: env.ADMIN_EMAIL, password })
  assert.equal(response.status, 200)
  const cookie = response.headers.get('set-cookie').split(';')[0]
  assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/)
  assert.match(response.headers.get('set-cookie'), /Secure/)
  assert.equal((await call('session', 'GET', undefined, cookie)).status, 200)
  assert.equal((await call('notifications', 'GET', undefined, cookie)).status, 200)
  assert.equal(await store.verifyPassword(password, `\n ${env.ADMIN_PASSWORD_HASH} \r\n`), true)
  const normalizedLogin = await admin({ request: request('login', 'POST', { email: env.ADMIN_EMAIL, password }), env: { ...env, ADMIN_EMAIL: ` ${env.ADMIN_EMAIL} `, ADMIN_PASSWORD_HASH: `\n${env.ADMIN_PASSWORD_HASH}\n` } })
  assert.equal(normalizedLogin.status, 200)
  const malformedLogin = await admin({ request: request('login', 'POST', { email: env.ADMIN_EMAIL, password }), env: { ...env, ADMIN_PASSWORD_HASH: `ADMIN_PASSWORD_HASH=${env.ADMIN_PASSWORD_HASH}` } })
  assert.equal(malformedLogin.status, 503)
  assert.equal((await call('session', 'GET', undefined, 'daidar_session=forged')).status, 401)
  const project = { title: 'مشروع', description: 'تفاصيل المشروع', image: 'https://example.com/image.png', link: 'https://example.com', category: 'website' }
  assert.equal((await call('projects', 'POST', { ...project, link: 'javascript:alert(1)' }, cookie)).status, 422)
  response = await call('projects', 'POST', project, cookie)
  assert.equal(response.status, 200)
  const saved = (await response.json()).project
  assert.equal((await (await publicProjects({ env })).json()).projects.length, 1)
  await call('projects', 'POST', { ...project, id: saved.id, title: 'تعديل' }, cookie)
  assert.equal((await (await call('projects', 'GET', undefined, cookie)).json()).projects[0].titleAr, 'تعديل')
  const original = originalProjects.projects[0]
  response = await call('projects', 'POST', { id: original.id, title: 'عنوان المشروع الأصلي الجديد', description: 'وصف محدث', category: original.category, status: 'draft', image: '', link: '' }, cookie)
  assert.equal(response.status, 200)
  const updatedOriginal = (await response.json()).project
  assert.equal(updatedOriginal.slug, original.slug)
  assert.equal(updatedOriginal.managed, false)
  assert.deepEqual(updatedOriginal.featuresAr, original.featuresAr)
  assert.equal(updatedOriginal.status, 'draft')
  assert.equal((await (await call('projects', 'GET', undefined, cookie)).json()).projects.length, 4)
  await DB.prepare('DELETE FROM managed_projects WHERE id = ?').bind(original.id).run()
  const visitor = crypto.randomUUID()
  const visitorRequest = () => new Request('https://test.example/api/visit', { method: 'POST', headers: { Origin: 'https://test.example' }, body: JSON.stringify({ visitor }) })
  assert.equal((await visit({ env, request: visitorRequest() })).status, 200)
  await visit({ env, request: visitorRequest() })
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM visits').get().n, 1)
  const now = Date.now()
  for (const [id, status, time] of [['sent', 'sent', now], ['failed', 'failed', now], ['old', 'sent', now - 40 * 86400000]]) sqlite.prepare('INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, 'Name', 'email@example.com', '01234567890', 'website', 'Full message', time, status)
  const stats = (await (await call('stats', 'GET', undefined, cookie)).json()).stats
  assert.equal(stats[0].visitors, 1)
  assert.equal(stats[1].emails, 1)
  assert.equal(stats[2].emails, 1)
  assert.equal(stats[3].emails, 2)
  assert.equal((await (await call('messages?days=7', 'GET', undefined, cookie)).json()).messages.length, 2)
  await call('projects', 'DELETE', { id: saved.id }, cookie)
  assert.equal((await (await publicProjects({ env })).json()).projects.length, 0)
  sqlite.exec(fs.readFileSync('migrations/0002_employees.sql', 'utf8'))
  sqlite.exec(fs.readFileSync('migrations/0003_hub.sql', 'utf8'))
  sqlite.exec(fs.readFileSync('migrations/0004_employee_work_permissions.sql', 'utf8'))
  sqlite.exec(fs.readFileSync('migrations/0005_d1_usage_permission.sql', 'utf8'))
  for (const path of ['employees', 'attendance', 'employee-requests']) assert.equal((await call(path)).status, 401)
  const employeePassword = 'employee-test-password'
  assert.equal(employeeLib.cairoDay(Date.parse('2026-10-12T21:30:00Z')), '2026-10-13')
  const employeeForm = { name: 'خالد', job_title: 'مطور', email: 'khaled@example.com', password: employeePassword, active: 1, manage_projects: 0, manage_hub_subscriptions: 0, view_d1_usage: 0 }
  assert.equal((await call('employees', 'POST', employeeForm, cookie)).status, 200)
  assert.equal((await call('employees', 'POST', employeeForm, cookie)).status, 409)
  await call('employees', 'POST', { ...employeeForm, name: 'أحمد', email: 'ahmed@example.com' }, cookie)
  const employeeList = (await (await call('employees', 'GET', undefined, cookie)).json()).employees
  assert.equal(employeeList.length, 2)
  assert.equal(employeeList[0].password_hash, undefined)
  const employeeCall = (path, method = 'GET', body, employeeCookie, origin) => employeeApi({ env, request: new Request(request(path, method, body, employeeCookie, origin).url.replace('/api/admin/', '/api/employee/'), request(path, method, body, employeeCookie, origin)) })
  assert.equal((await employeeCall('check-in', 'POST')).status, 401)
  assert.equal((await employeeCall('login', 'POST', { email: employeeForm.email, password: 'wrong' })).status, 401)
  response = await employeeCall('login', 'POST', { email: employeeForm.email, password: employeePassword })
  assert.equal(response.status, 200)
  const employeeCookie = response.headers.get('set-cookie').split(';')[0]
  assert.equal((await response.json()).employee.manage_projects, 0)
  assert.equal((await call('employees', 'GET', undefined, employeeCookie)).status, 401)
  assert.equal((await employeeCall('projects', 'GET', undefined, employeeCookie)).status, 403)
  assert.equal((await employeeCall('hub-customers', 'GET', undefined, employeeCookie)).status, 403)
  assert.equal((await employeeCall('d1-usage', 'GET', undefined, employeeCookie)).status, 403)
  assert.equal((await call('employees', 'POST', { ...employeeForm, id: employeeList[0].id, password: '', manage_projects: 1, manage_hub_subscriptions: 1, view_d1_usage: 1 }, cookie)).status, 200)
  assert.equal((await employeeCall('d1-usage', 'GET', undefined, employeeCookie)).status, 503)
  const originalUsageFetch = global.fetch
  env.CLOUDFLARE_ACCOUNT_ID = 'test-account'
  env.CLOUDFLARE_D1_READ_TOKEN = 'test-token'
  env.D1_PLAN = 'free'
  global.fetch = async url => {
    if (String(url).endsWith('/d1/database?page=1&per_page=1000')) return new Response(JSON.stringify({ success: true, result: [{ uuid: 'db-usage-test', name: 'مشروع' }] }), { status: 200 })
    if (String(url).includes('/d1/database/db-usage-test?fields=')) return new Response(JSON.stringify({ success: true, result: { uuid: 'db-usage-test', name: 'مشروع', file_size: 300000000 } }), { status: 200 })
    throw new Error('Unexpected Cloudflare API URL: ' + url)
  }
  try {
    const usageResponse = await employeeCall('d1-usage', 'GET', undefined, employeeCookie)
    assert.equal(usageResponse.status, 200)
    const usage = await usageResponse.json()
    assert.equal(usage.databases[0].usedPercent, 60)
    assert.equal(usage.databases[0].freeBytes, 200000000)
    assert.equal(usage.databases[0].status, 'healthy')
  } finally { global.fetch = originalUsageFetch }
  assert.equal((await employeeCall('projects', 'GET', undefined, employeeCookie)).status, 200)
  const staffProject = { title: 'مشروع الموظف', description: 'وصف تجريبي لمشروع أضافه الموظف.', category: 'website', status: 'draft' }
  assert.equal((await employeeCall('projects', 'POST', staffProject, employeeCookie)).status, 200)
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM admin_notifications WHERE event_type='project_added'").get().n, 1)
  const projectRows = (await (await employeeCall('projects', 'GET', undefined, employeeCookie)).json()).projects
  const savedStaffProject = projectRows.find(p => p.titleAr === staffProject.title)
  assert.ok(savedStaffProject)
  assert.equal(savedStaffProject.status, 'draft')
  assert.equal((await employeeCall('projects', 'DELETE', { id: savedStaffProject.id }, employeeCookie)).status, 403)
  sqlite.prepare('INSERT INTO hub_users(id,email,name,created_at) VALUES(?,?,?,?)').run('customer-a', 'customer@example.com', 'عميل تجربة', Date.now())
  const hubCustomers = await employeeCall('hub-customers?q=customer', 'GET', undefined, employeeCookie)
  assert.equal(hubCustomers.status, 200)
  assert.equal((await hubCustomers.json()).customers[0].email, 'customer@example.com')
  assert.equal((await employeeCall('hub-catalog', 'GET', undefined, employeeCookie)).status, 200)
  const manualPayload = { userId: 'customer-a', productId: 'daidar-flow', activityId: 'general', period: 'monthly', addons: [], renewalSubscriptionId: null }
  const operationKey = 'b32b38f3-2168-46ec-966b-bc2a690b482c'
  assert.equal((await employeeCall('hub-manual-subscriptions', 'POST', { ...manualPayload, operationKey, amountReceived: 34999 }, employeeCookie)).status, 409)
  const grant = await employeeCall('hub-manual-subscriptions', 'POST', { ...manualPayload, operationKey, amountReceived: 35000 }, employeeCookie)
  assert.equal(grant.status, 200)
  const grantData = await grant.json()
  assert.equal(sqlite.prepare('SELECT status FROM hub_orders WHERE id=?').get(grantData.orderId).status, 'approved')
  const manualSub = sqlite.prepare('SELECT * FROM hub_subscriptions WHERE id=?').get(grantData.subscriptionId)
  assert.equal(manualSub.status, 'awaiting_activation')
  assert.equal(JSON.parse(manualSub.snapshot).paymentMode, 'manual')
  assert.equal(sqlite.prepare("SELECT actor FROM hub_audit WHERE action='manual_subscription' AND entity_id=?").get(grantData.orderId).actor, 'khaled@example.com')
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM admin_notifications WHERE event_type='hub_subscription_created'").get().n, 1)
  const grantAgain = await employeeCall('hub-manual-subscriptions', 'POST', { ...manualPayload, operationKey, amountReceived: 35000 }, employeeCookie)
  assert.equal(grantAgain.status, 200)
  assert.equal((await grantAgain.json()).subscriptionId, grantData.subscriptionId)
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM admin_notifications WHERE event_type='hub_subscription_created'").get().n, 1)
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM hub_subscriptions WHERE user_id=?').get('customer-a').n, 1)
  sqlite.prepare("UPDATE hub_subscriptions SET status='active',starts_at=?,expires_at=? WHERE id=?").run(Date.now()-30*86400000, Date.now()+10*86400000, grantData.subscriptionId)
  const beforeRenewal = sqlite.prepare('SELECT expires_at FROM hub_subscriptions WHERE id=?').get(grantData.subscriptionId).expires_at
  const renewalPayload = { ...manualPayload, period: 'yearly', renewalSubscriptionId: grantData.subscriptionId }
  const renewalKey = '934f39fc-a9cd-4321-8b47-16b2463ef5b0'
  const renewalGrant = await employeeCall('hub-manual-subscriptions', 'POST', { ...renewalPayload, operationKey: renewalKey, amountReceived: 350000 }, employeeCookie)
  assert.equal(renewalGrant.status, 200)
  assert.equal((await renewalGrant.json()).subscriptionId, grantData.subscriptionId)
  assert.ok(sqlite.prepare('SELECT expires_at FROM hub_subscriptions WHERE id=?').get(grantData.subscriptionId).expires_at > beforeRenewal)
  assert.equal((await call('employees', 'POST', { ...employeeForm, id: employeeList[0].id, password: '', manage_projects: 0, manage_hub_subscriptions: 0, view_d1_usage: 0 }, cookie)).status, 200)
  assert.equal((await employeeCall('projects', 'GET', undefined, employeeCookie)).status, 403)
  assert.equal((await employeeCall('hub-customers', 'GET', undefined, employeeCookie)).status, 403)
  assert.equal((await employeeCall('d1-usage', 'GET', undefined, employeeCookie)).status, 403)
  assert.equal((await employeeCall('check-in', 'POST', {}, employeeCookie, 'https://evil.example')).status, 403)
  assert.equal((await employeeCall('check-out', 'POST', {}, employeeCookie)).status, 409)
  const punch = () => employeeCall('check-in', 'POST', { employee_id: employeeList[1].id, check_in: 0 }, employeeCookie)
  await Promise.all([punch(), punch()])
  const attendance = sqlite.prepare('SELECT * FROM attendance').all()
  assert.equal(attendance.length, 1)
  assert.equal(attendance[0].employee_id, employeeList[0].id)
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM admin_notifications WHERE event_type='attendance_checkin'").get().n, 1)
  assert.ok(attendance[0].check_in > now - 10000)
  assert.equal(attendance[0].day, employeeLib.cairoDay())
  sqlite.prepare('UPDATE attendance SET check_in = ? WHERE id = ?').run(Date.now() - 4.5 * 3600000, attendance[0].id)
  assert.equal((await employeeCall('check-out', 'POST', {}, employeeCookie)).status, 200)
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM admin_notifications WHERE event_type='attendance_checkout'").get().n, 1)
  const month = employeeLib.cairoDay().slice(0, 7)
  const report = (await (await employeeCall('attendance?month=' + month, 'GET', undefined, employeeCookie)).json()).records
  assert.equal(report.length, 1)
  assert.ok(Math.abs(report[0].hours - 4.5) < 0.01)
  assert.equal((await punch()).status, 409)
  sqlite.prepare('INSERT INTO attendance VALUES (?, ?, ?, ?, ?)').run('other', employeeList[1].id, employeeLib.cairoDay(), Date.now() - 3600000, Date.now())
  assert.equal((await (await employeeCall('attendance?month=' + month, 'GET', undefined, employeeCookie)).json()).records.length, 1)
  assert.equal((await (await call('attendance?month=' + month, 'GET', undefined, cookie)).json()).records.length, 2)
  assert.equal((await employeeCall('attendance?month=invalid', 'GET', undefined, employeeCookie)).status, 400)
  const leave = { day: employeeLib.cairoDay(), type: 'leave', reason: 'ظرف شخصي', employee_id: employeeList[1].id, status: 'approved' }
  assert.equal((await employeeCall('requests', 'POST', leave, employeeCookie)).status, 200)
  assert.equal((await employeeCall('requests', 'POST', leave, employeeCookie)).status, 409)
  const leaveRow = sqlite.prepare('SELECT * FROM employee_requests').get()
  assert.equal(leaveRow.employee_id, employeeList[0].id)
  assert.equal(leaveRow.status, 'pending')
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM admin_notifications WHERE event_type='employee_request'").get().n, 1)
  assert.equal((await employeeCall('requests', 'POST', { ...leave, type: 'early', requested_time: '99:99' }, employeeCookie)).status, 422)
  assert.equal((await employeeCall('requests', 'POST', { ...leave, type: 'early', requested_time: '15:30' }, employeeCookie)).status, 200)
  assert.equal((await call('employee-requests', 'POST', { id: leaveRow.id, status: 'approved', admin_note: 'موافق' }, employeeCookie)).status, 401)
  assert.equal((await call('employee-requests', 'POST', { id: leaveRow.id, status: 'approved', admin_note: 'موافق' }, cookie)).status, 200)
  let notificationList = await (await call('notifications', 'GET', undefined, cookie)).json()
  assert.ok(notificationList.unread >= 4)
  const notificationId = notificationList.notifications[0].id
  assert.equal((await call('notifications', 'POST', { id: notificationId }, cookie)).status, 200)
  assert.equal((await call('notifications', 'POST', { all: true }, cookie)).status, 200)
  notificationList = await (await call('notifications', 'GET', undefined, cookie)).json()
  assert.equal(notificationList.unread, 0)
  const employeeRequests = (await (await employeeCall('requests?month=' + month, 'GET', undefined, employeeCookie)).json()).requests
  assert.equal(employeeRequests.find(r => r.id === leaveRow.id).status, 'approved')
  assert.equal(employeeRequests.find(r => r.id === leaveRow.id).admin_note, 'موافق')
  assert.equal((await employeeCall('requests', 'POST', { ...leave, day: '2020-02-30' }, employeeCookie)).status, 422)
  assert.equal((await call('employees', 'POST', { ...employeeForm, id: employeeList[0].id, password: '', active: 0 }, cookie)).status, 200)
  assert.equal((await employeeCall('session', 'GET', undefined, employeeCookie)).status, 401)
  assert.equal((await employeeCall('login', 'POST', { email: employeeForm.email, password: employeePassword })).status, 401)
  await call('employees', 'POST', { ...employeeForm, id: employeeList[0].id, password: '', active: 1 }, cookie)
  response = await employeeCall('login', 'POST', { email: employeeForm.email, password: employeePassword })
  const resetCookie = response.headers.get('set-cookie').split(';')[0]
  await call('employees', 'POST', { ...employeeForm, id: employeeList[0].id, password: 'changed-test-password' }, cookie)
  assert.equal((await employeeCall('session', 'GET', undefined, resetCookie)).status, 401)
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM attendance').get().n, 2)
  sqlite.prepare('INSERT INTO attendance VALUES (?, ?, ?, ?, NULL)').run('overnight', employeeList[1].id, '2026-09-30', Date.parse('2026-09-30T20:00:00Z'))
  const oldNow = Date.now
  Date.now = () => Date.parse('2026-10-01T04:00:00Z')
  try {
    const overnightToken = 'overnight-test-token'
    const secondEmployee = sqlite.prepare('SELECT * FROM employees WHERE id = ?').get(employeeList[1].id)
    sqlite.prepare('INSERT INTO employee_sessions VALUES (?, ?, ?, ?)').run(await store.hash(overnightToken), secondEmployee.id, Date.now() + 100000, secondEmployee.password_hash)
    await employeeCall('check-out', 'POST', {}, 'daidar_employee=' + overnightToken)
    const previousMonth = await employeeLib.monthlyAttendance(env, '2026-09', secondEmployee.id)
    assert.equal(previousMonth.find(r => r.id === 'overnight').hours, 8)
    assert.equal((await employeeLib.monthlyAttendance(env, '2026-10', secondEmployee.id)).some(r => r.id === 'overnight'), false)
  } finally { Date.now = oldNow }
  await call('logout', 'POST', undefined, cookie)
  assert.equal((await call('session', 'GET', undefined, cookie)).status, 401)
  for (let i = 0; i < 5; i++) response = await call('login', 'POST', { email: env.ADMIN_EMAIL, password: 'wrong' })
  assert.equal(response.status, 429)
  const oldFetch = global.fetch
  env.RESEND_API_KEY = 'test-key'
  const message = { name: 'Test customer', email: 'customer@example.com', phone: '01234567890', service: 'website', description: 'A full project description for a website request.' }
  const contactRequest = () => new Request('https://test.example/api/contact', { method: 'POST', headers: { Origin: 'https://test.example' }, body: JSON.stringify(message) })
  try {
    global.fetch = async () => new Response(JSON.stringify({ id: 'provider-id' }), { status: 200 })
    assert.equal((await contact({ env, request: contactRequest() })).status, 200)
    const recorded = sqlite.prepare("SELECT * FROM messages WHERE email = 'customer@example.com'").get()
    assert.equal(recorded.description, message.description)
    assert.equal(recorded.status, 'sent')
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM admin_notifications WHERE event_type='customer_message'").get().n, 1)
    global.fetch = async () => new Response(JSON.stringify({ message: 'Rejected' }), { status: 422 })
    assert.equal((await contact({ env, request: contactRequest() })).status, 500)
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM messages WHERE email = 'customer@example.com' AND status = 'failed'").get().n, 1)
  } finally { global.fetch = oldFetch }
  sqlite.close()
  console.log('Passed: admin security, original project editing, employee accounts and isolation, attendance deduplication and hours, leave/early requests and approval, account suspension and password reset, contact and analytics.')
}
test().catch(error => { console.error(error); process.exitCode = 1 })
