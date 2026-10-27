const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const { DatabaseSync } = require('node:sqlite')
function load(file, dependencies) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(name => { if (!(name in dependencies)) throw new Error(name); return dependencies[name] }, module, module.exports)
  return module.exports
}
const store = load('functions/lib/store.ts', {})
const { passwordVault } = load('functions/lib/password-vault.ts', { './store': store })
const sqlite = new DatabaseSync(':memory:')
sqlite.exec(fs.readFileSync('migrations/0017_password_vault.sql', 'utf8'))
sqlite.exec('CREATE TABLE employees(id TEXT PRIMARY KEY)')
sqlite.exec(fs.readFileSync('migrations/0018_password_vault_projects_permissions.sql', 'utf8'))
const DB = { prepare(sql) { let args = []; return { bind(...values) { args = values; return this }, async run() { return sqlite.prepare(sql).run(...args) }, async first() { return sqlite.prepare(sql).get(...args) || null }, async all() { return { results: sqlite.prepare(sql).all(...args) } } } } }
const env = { DB, PASSWORD_VAULT_KEY: 'ab'.repeat(32), ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD_HASH: 'unused' }
const request = (method, body, origin = 'https://test.example') => new Request('https://test.example/api/admin/password-vault', { method, headers: { Origin: origin }, body: body === undefined ? undefined : JSON.stringify(body) })
async function call(method, body, options = env) { return passwordVault(request(method, body), options) }
async function test() {
  assert.equal((await call('GET', undefined, { DB })).status, 503)
  const account = { project: 'مشروع تجريبي', username: 'admin', password: ' secret with spaces ', is_admin: true }
  assert.equal((await call('POST', account)).status, 200)
  assert.equal((await call('POST', { ...account, username: 'user', is_admin: false })).status, 200)
  const list = await (await call('GET')).json()
  assert.equal(list.accounts.length, 2)
  const id = list.accounts[0].id
  assert.equal(list.accounts[0].is_admin, 1)
  const addOnly = { admin: false, add: true, reveal: false }
  const viewOnly = { admin: false, add: false, reveal: true }
  const employeeCall = (method, body, access = addOnly) => passwordVault(request(method, body), env, access)
  assert.equal((await employeeCall('GET', undefined, { admin: false, add: false, reveal: false })).status, 403)
  assert.equal((await employeeCall('POST', { id, action: 'reveal' })).status, 403)
  assert.equal((await employeeCall('POST', { ...account, username: 'added-by-employee' })).status, 200)
  assert.equal((await employeeCall('PUT', { ...account, id })).status, 403)
  assert.equal((await employeeCall('DELETE', { id })).status, 403)
  assert.equal((await employeeCall('POST', account, viewOnly)).status, 403)
  assert.equal((await employeeCall('POST', { id, action: 'reveal' }, viewOnly)).status, 200)
  const employeeList = await (await employeeCall('GET')).json()
  assert.ok(!JSON.stringify(employeeList).includes(account.password))
  assert.ok(!JSON.stringify(employeeList).includes('secret'))
  assert.equal(employeeList.permissions.reveal, false)
  const project = { action: 'project', project: account.project, login_url: 'https://example.com/login', admin_url: 'https://example.com/admin' }
  assert.equal((await employeeCall('POST', project)).status, 200)
  assert.equal((await employeeCall('POST', project)).status, 403)
  assert.equal((await call('POST', { ...project, login_url: 'javascript:alert(1)' })).status, 422)
  assert.equal((await call('POST', { ...project, admin_url: 'https://user:pass@example.com' })).status, 422)
  assert.equal((await call('POST', { ...project, login_url: 'https://example.com/new-login' })).status, 200)
  assert.equal((await (await call('GET')).json()).projects[0].login_url, 'https://example.com/new-login')
  assert.ok(!JSON.stringify(list).includes(account.password))
  const stored = sqlite.prepare('SELECT * FROM password_vault WHERE id=?').get(id)
  assert.notEqual(stored.secret, account.password)
  assert.equal((await (await call('POST', { id, action: 'reveal' })).json()).password, account.password)
  await call('PUT', { ...account, id, username: 'updated', password: '' })
  assert.equal((await (await call('POST', { id, action: 'reveal' })).json()).password, account.password)
  await call('PUT', { ...account, id, password: 'new password' })
  assert.equal((await (await call('POST', { id, action: 'reveal' })).json()).password, 'new password')
  assert.equal((await call('POST', { ...account, project: '' })).status, 422)
  assert.equal((await call('POST', { ...account, is_admin: 'yes' })).status, 422)
  assert.equal((await call('POST', { id, action: 'reveal' }, { ...env, PASSWORD_VAULT_KEY: 'cd'.repeat(32) })).status, 500)
  const blocked = () => { throw new Error('Unexpected handler') }
  const dependencies = Object.fromEntries(['staff-chat', 'service-subscriptions', 'work-projects', 'employees', 'projects', 'hub-admin', 'd1-usage', 'notifications'].map(name => ['../../lib/' + name, new Proxy({}, { get: () => blocked })]))
  const admin = load('functions/api/admin/[[path]].ts', { ...dependencies, '../../lib/store': { ...store, authenticated: async () => false }, '../../lib/password-vault': { passwordVault: blocked } }).onRequest
  assert.equal((await admin({ request: request('GET'), env })).status, 401)
  assert.equal((await admin({ request: request('POST', account, 'https://other.example'), env })).status, 403)
  await call('DELETE', { id })
  assert.equal((await call('POST', { id, action: 'reveal' })).status, 404)
  console.log('Password vault: encryption, CRUD, metadata-only listing, validation, authentication and origin checks passed.')
}
test().catch(error => { console.error(error); process.exitCode = 1 })
