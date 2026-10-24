type Statement = { bind(...values: unknown[]): Statement; run(): Promise<unknown>; first<T>(): Promise<T | null>; all<T>(): Promise<{ results: T[] }> }
type D1 = { prepare(sql: string): Statement; batch(items: Statement[]): Promise<unknown> }
type WorkerEnv = { DB: D1; VAPID_PUBLIC_KEY: string; VAPID_PRIVATE_JWK: string; VAPID_SUBJECT: string }
type CheckRow = { shift_id: string; employee_id: string; state: 'waiting' | 'prompted' | 'retry_wait'; prompt_stage: number; last_confirmed_at: number; prompt_sent_at: number | null; next_check_at: number; name: string }
type SubscriptionRow = { endpoint: string; p256dh: string; auth: string }
type EmployeeRow = { monthly_salary_piasters: number; max_daily_hours: number; max_monthly_hours: number; view_due: number; weekly_days_off: string }
const enc = new TextEncoder()
const b64u = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
const fromB64u = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)), c => c.charCodeAt(0))
const concat = (...parts: Uint8Array[]) => { const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0)); let offset = 0; for (const part of parts) { out.set(part, offset); offset += part.length } return out }
async function hmac(key: Uint8Array, data: Uint8Array) {
  const imported = await crypto.subtle.importKey('raw', new Uint8Array(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', imported, new Uint8Array(data)))
}
async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number) {
  let previous = new Uint8Array(), output = new Uint8Array(), counter = 1
  while (output.length < length) { previous = await hmac(prk, concat(previous, info, Uint8Array.of(counter++))); output = concat(output, previous) }
  return output.slice(0, length)
}
export async function encryptPushPayload(subscription: SubscriptionRow, payload: string) {
  const receiverPublic = fromB64u(subscription.p256dh)
  const authSecret = fromB64u(subscription.auth)
  const receiverKey = await crypto.subtle.importKey('raw', new Uint8Array(receiverPublic), { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const sender = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const senderPublic = new Uint8Array(await crypto.subtle.exportKey('raw', sender.publicKey))
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverKey }, sender.privateKey, 256))
  const authPrk = await hmac(authSecret, sharedSecret)
  const keyInfo = concat(enc.encode('WebPush: info\0'), receiverPublic, senderPublic)
  const inputKey = await hkdfExpand(authPrk, keyInfo, 32)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const contentPrk = await hmac(salt, inputKey)
  const cek = await hkdfExpand(contentPrk, concat(enc.encode('Content-Encoding: aes128gcm'), Uint8Array.of(0)), 16)
  const nonce = await hkdfExpand(contentPrk, concat(enc.encode('Content-Encoding: nonce'), Uint8Array.of(0)), 12)
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const plaintext = concat(enc.encode(payload), Uint8Array.of(2))
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, key, plaintext))
  const header = new Uint8Array(21 + senderPublic.length)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, 4096, false)
  header[20] = senderPublic.length
  header.set(senderPublic, 21)
  return concat(header, encrypted)
}
async function vapidAuthorization(endpoint: string, env: WorkerEnv) {
  const key = JSON.parse(env.VAPID_PRIVATE_JWK) as JsonWebKey
  const imported = await crypto.subtle.importKey('jwk', key, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const audience = new URL(endpoint).origin
  const header = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = b64u(enc.encode(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: env.VAPID_SUBJECT })))
  const unsigned = `${header}.${claims}`
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, imported, enc.encode(unsigned)))
  return `vapid t=${unsigned}.${b64u(signature)}, k=${env.VAPID_PUBLIC_KEY}`
}
async function sendPush(subscription: SubscriptionRow, payload: unknown, env: WorkerEnv) {
  const body = await encryptPushPayload(subscription, JSON.stringify(payload))
  const response = await fetch(subscription.endpoint, { method: 'POST', headers: { Authorization: await vapidAuthorization(subscription.endpoint, env), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '120', Urgency: 'high' }, body })
  if (response.status === 404 || response.status === 410) await env.DB.prepare('DELETE FROM employee_push_subscriptions WHERE endpoint=?').bind(subscription.endpoint).run()
  else if (!response.ok) throw new Error(`Push service returned ${response.status}`)
}
async function accrued(employeeId: string, shiftId: string, env: WorkerEnv, now: number) {
  const employee = await env.DB.prepare('SELECT monthly_salary_piasters,max_daily_hours,max_monthly_hours,view_due,weekly_days_off FROM employees WHERE id=?').bind(employeeId).first<EmployeeRow>()
  if (!employee) return { hours: 0, max: 104, due: null }
  const maxDaily = employee.max_daily_hours || 4, maxMonthly = employee.max_monthly_hours || 104
  const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit' }).format(new Date(now))
  const firstDay = `${month}-01`
  const lastDay = `${month}-31`
  const rows = await env.DB.prepare('SELECT day,check_in,check_out FROM attendance_shifts WHERE employee_id=? AND day>=? AND day<=?').bind(employeeId, firstDay, lastDay).all<{ day: string; check_in: number; check_out: number | null }>()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date(now))
  const byDay = new Map<string, number>()
  for (const row of rows.results) {
    const end = row.check_out ?? (row.day === today ? now : row.check_in)
    byDay.set(row.day, (byDay.get(row.day) || 0) + Math.max(0, (end - row.check_in) / 3600000))
  }
  const actualHours = Array.from(byDay.values()).reduce((total, value) => total + Math.min(maxDaily, value), 0)
  let daysOff = [5]
  try { const saved = JSON.parse(employee.weekly_days_off || '[5]'); if (Array.isArray(saved)) daysOff = saved } catch {}
  const leaves = await env.DB.prepare("SELECT day FROM employee_requests WHERE employee_id=? AND type='leave' AND status='approved' AND day>=? AND day<=?").bind(employeeId, firstDay, lastDay).all<{day:string}>()
  const leaveHours = leaves.results.filter(leave => !daysOff.includes(new Date(`${leave.day}T00:00:00Z`).getUTCDay())).length * maxDaily
  const hours = Math.min(maxMonthly, actualHours + leaveHours)
  const due = employee.view_due ? Math.round(Math.min(employee.monthly_salary_piasters, employee.monthly_salary_piasters / maxMonthly * hours) / 100) : null
  return { hours: Number(hours.toFixed(2)), max: maxMonthly, due }
}
async function notify(check: CheckRow, stage: number, env: WorkerEnv, now: number) {
  const subscriptions = await env.DB.prepare('SELECT endpoint,p256dh,auth FROM employee_push_subscriptions WHERE employee_id=?').bind(check.employee_id).all<SubscriptionRow>()
  if (!subscriptions.results.length) return
  const summary = await accrued(check.employee_id, check.shift_id, env, now)
  const body = `${check.name}، لسه موجود؟ ساعات الشهر ${summary.hours} / ${summary.max}${summary.due === null ? '' : ` · المستحق ${summary.due.toLocaleString('ar-EG')} جنيه`}`
  await Promise.all(subscriptions.results.map(subscription => sendPush(subscription, { title: `تأكيد الحضور · التنبيه ${stage}`, body, shift_id: check.shift_id, stage }, env).catch(error => console.error('Push delivery failed', error))))
}
async function processChecks(env: WorkerEnv) {
  const now = Date.now()
  const due = await env.DB.prepare("SELECT p.shift_id,p.employee_id,p.state,p.prompt_stage,p.last_confirmed_at,p.prompt_sent_at,p.next_check_at,e.name FROM employee_presence_checks p JOIN attendance_shifts a ON a.id=p.shift_id JOIN employees e ON e.id=p.employee_id WHERE e.active=1 AND p.state!='closed' AND p.next_check_at<=? AND a.check_out IS NULL ORDER BY p.next_check_at LIMIT 100").bind(now).all<CheckRow>()
  for (const check of due.results) {
    if (check.state === 'waiting') {
      const deadline = now + 60000
      const result = await env.DB.prepare("UPDATE employee_presence_checks SET state='prompted',prompt_stage=1,prompt_sent_at=?,next_check_at=?,updated_at=? WHERE shift_id=? AND state='waiting' AND next_check_at<=?").bind(now, deadline, now, check.shift_id, now).run() as { meta?: { changes?: number } }
      if ((result.meta?.changes || 0) > 0) await notify(check, 1, env, now)
    } else if (check.state === 'retry_wait') {
      const stage = check.prompt_stage + 1, deadline = now + 60000
      const result = await env.DB.prepare("UPDATE employee_presence_checks SET state='prompted',prompt_stage=?,next_check_at=?,updated_at=? WHERE shift_id=? AND state='retry_wait' AND next_check_at<=?").bind(stage, deadline, now, check.shift_id, now).run() as { meta?: { changes?: number } }
      if ((result.meta?.changes || 0) > 0) await notify(check, stage, env, now)
    } else if (check.prompt_stage >= 3) {
      await env.DB.batch([
        env.DB.prepare('UPDATE attendance_shifts SET check_out=? WHERE id=? AND check_out IS NULL').bind(check.last_confirmed_at, check.shift_id),
        env.DB.prepare("UPDATE employee_presence_checks SET state='closed',updated_at=? WHERE shift_id=? AND state='prompted' AND next_check_at<=?").bind(now, check.shift_id, now),
      ])
    } else {
      const delayFromFirstAlert = check.prompt_stage === 1 ? 5 : 15
      const firstAlertAt = check.prompt_sent_at || now
      await env.DB.prepare("UPDATE employee_presence_checks SET state='retry_wait',next_check_at=?,updated_at=? WHERE shift_id=? AND state='prompted' AND next_check_at<=?").bind(firstAlertAt + delayFromFirstAlert * 60000, now, check.shift_id, now).run()
    }
  }
}
export default {
  async scheduled(_event: { cron: string }, env: WorkerEnv, ctx: { waitUntil(promise: Promise<unknown>): void }) {
    ctx.waitUntil(processChecks(env))
  },
}
