export interface Statement {
  bind(...values: unknown[]): Statement
  run(): Promise<unknown>
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
}
export interface Database { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<unknown> }
export interface Env {
  ECOSYSTEM_DB?: Database
  ECOSYSTEM_STORE_DB?: Database
  ECOSYSTEM_HUB_DB?: Database
  ECOSYSTEM_CLIENT?: string
  ECOSYSTEM_HUB_ORIGIN?: string
  ECOSYSTEM_STORE_ORIGIN?: string
  ECOSYSTEM_OWNER_LOCAL_ID?: string
  PASSWORD_VAULT_KEY?: string
  DB?: Database
  ADMIN_EMAIL?: string
  ADMIN_PASSWORD_HASH?: string
  VAPID_PUBLIC_KEY?: string
  RESEND_API_KEY?: string
  RESEND_FROM_EMAIL?: string
  RESEND_TO_EMAIL?: string
  HUB_GOOGLE_CLIENT_ID?: string
  HUB_GOOGLE_CLIENT_SECRET?: string
  ECOSYSTEM_GOOGLE_CALLBACK_PATH?: string
  HUB_LICENSE_SIGNING_PRIVATE_JWK?: string
  HUB_LICENSE_VERIFY_PUBLIC_JWK?: string
  CLOUDFLARE_ACCOUNT_ID?: string
  CLOUDFLARE_D1_READ_TOKEN?: string
  D1_PLAN?: string
  HUB_FILES?: { get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string }; size?: number } | null>; put(key: string, value: ReadableStream | ArrayBuffer | string, options?: Record<string, unknown>): Promise<unknown> }
}
export const json = (data: unknown, status = 200, extra: Record<string, string> = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra },
})
export async function hash(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('')
}
export function sameOrigin(request: Request) {
  return request.headers.get('Origin') === new URL(request.url).origin
}
export async function authenticated(request: Request, env: Env) {
  const token = request.headers.get('Cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith('daidar_session='))?.slice(15)
  if (!token || !env.DB || !env.ADMIN_PASSWORD_HASH) return false
  const row = await env.DB.prepare('SELECT token FROM sessions WHERE token = ? AND expires_at > ? AND credential = ?')
    .bind(await hash(token), Date.now(), await hash(env.ADMIN_PASSWORD_HASH)).first()
  return !!row
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.trim().split(':')
  if (!salt || !/^[a-f0-9]{64}$/.test(expected || '')) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256)
  const actual = Array.from(new Uint8Array(bits), n => n.toString(16).padStart(2, '0')).join('')
  let difference = 0
  for (let i = 0; i < 64; i++) difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i)
  return difference === 0
}
