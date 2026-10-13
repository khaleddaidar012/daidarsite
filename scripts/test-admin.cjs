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
const DB = {
  prepare(sql) {
    let args = []
    return { bind(...values) { args = values; return this }, async run() { return sqlite.prepare(sql).run(...args) }, async first() { return sqlite.prepare(sql).get(...args) || null }, async all() { return { results: sqlite.prepare(sql).all(...args) } } }
  },
  async batch(statements) { return Promise.all(statements.map(s => s.run())) },
}
const store = load('functions/lib/store.ts')
const admin = load('functions/api/admin/[[path]].ts', { '../../lib/store': store }).onRequest
const visit = load('functions/api/visit.ts', { '../lib/store': store }).onRequestPost
const publicProjects = load('functions/api/projects.ts', { '../lib/store': store }).onRequestGet
const contact = load('functions/api/contact.ts', { '../lib/store': store }).onRequestPost
const salt = 'ab'.repeat(24)
const password = 'test-password-long'
const env = { DB, ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD_HASH: salt + ':' + pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex') }
function request(path, method = 'GET', body, cookie, origin = 'https://test.example') {
  return new Request('https://test.example/api/admin/' + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
}
async function call(path, method, body, cookie, origin) { return admin({ request: request(path, method, body, cookie, origin), env }) }
async function test() {
  for (const path of ['session', 'stats', 'messages', 'projects']) assert.equal((await call(path)).status, 401)
  assert.equal((await call('projects', 'POST', {})).status, 401)
  assert.equal((await call('login', 'POST', { email: env.ADMIN_EMAIL, password }, undefined, 'https://evil.example')).status, 403)
  assert.equal((await call('login', 'POST', { email: env.ADMIN_EMAIL, password: 'wrong' })).status, 401)
  let response = await call('login', 'POST', { email: env.ADMIN_EMAIL, password })
  assert.equal(response.status, 200)
  const cookie = response.headers.get('set-cookie').split(';')[0]
  assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/)
  assert.match(response.headers.get('set-cookie'), /Secure/)
  assert.equal((await call('session', 'GET', undefined, cookie)).status, 200)
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
    global.fetch = async () => new Response(JSON.stringify({ message: 'Rejected' }), { status: 422 })
    assert.equal((await contact({ env, request: contactRequest() })).status, 500)
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM messages WHERE email = 'customer@example.com' AND status = 'failed'").get().n, 1)
  } finally { global.fetch = oldFetch }
  sqlite.close()
  console.log('Passed: authentication, CSRF, session revocation, login throttling, project CRUD, visitor deduplication, email periods, full message recording and provider success/failure.')
}
test().catch(error => { console.error(error); process.exitCode = 1 })
