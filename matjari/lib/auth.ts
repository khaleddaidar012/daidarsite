type DB = { prepare(sql: string): any; batch(statements: any[]): Promise<unknown> };
export type Actor = { id: string; username: string; email: string; role: string; store_id: string | null; is_active: number; password: string };
export const cookieName = '__Host-matjari_session';
const hex = (bytes: Uint8Array) => Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
export async function digest(value: string) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
}
export async function passwordHash(password: string, salt = hex(crypto.getRandomValues(new Uint8Array(16)))) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bytes = Uint8Array.from(salt.match(/../g) || [], s => parseInt(s, 16));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: bytes, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return `pbkdf2$${salt}$${hex(new Uint8Array(bits))}`;
}
export async function passwordMatches(password: string, stored: string) {
  if (!/^pbkdf2\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(stored)) return false;
  const actual = await passwordHash(password, stored.split('$')[1]);
  let different = actual.length ^ stored.length;
  for (let i = 0; i < actual.length; i++) different |= actual.charCodeAt(i) ^ stored.charCodeAt(i);
  return different === 0;
}
export function cookie(value: string, age = 604800) {
  return `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
}
export function token(request: Request) {
  return request.headers.get('Cookie')?.split(';').map(p => p.trim()).find(p => p.startsWith(cookieName + '='))?.slice(cookieName.length + 1) || '';
}
export function publicUser(user: Actor) {
  const { id, username, email, role, store_id, is_active } = user;
  return { id, username, email, role, store_id, is_active };
}
export async function currentActor(db: DB, request: Request): Promise<Actor | null> {
  const value = token(request);
  if (!/^[a-f0-9-]{72}$/.test(value)) return null;
  return db.prepare(`SELECT u.* FROM users u JOIN auth_sessions s ON s.user_id=u.id
    WHERE s.token_hash=? AND s.expires_at>? AND s.credential=u.password AND u.is_active=1`)
    .bind(await digest(value), Date.now()).first();
}
export async function newSession(db: DB, user: Actor) {
  const value = crypto.randomUUID() + crypto.randomUUID();
  await db.prepare('DELETE FROM auth_sessions WHERE expires_at<=?').bind(Date.now()).run();
  await db.prepare('INSERT INTO auth_sessions(token_hash,user_id,credential,expires_at) VALUES(?,?,?,?)')
    .bind(await digest(value), user.id, user.password, Date.now() + 604800000).run();
  return cookie(value);
}
export async function rateLimit(db: DB, request: Request, kind: string, limit: number, windowMs: number) {
  const now = Date.now();
  const key = await digest(kind + ':' + (request.headers.get('CF-Connecting-IP') || 'unknown'));
  await db.prepare(`INSERT INTO auth_rate_limits(key,hits,reset_at) VALUES(?,1,?)
    ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN reset_at<=? THEN 1 ELSE hits+1 END,
    reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END`)
    .bind(key, now + windowMs, now, now).run();
  const row = await db.prepare('SELECT hits FROM auth_rate_limits WHERE key=?').bind(key).first();
  if (row.hits > limit) throw Object.assign(new Error('محاولات كثيرة. حاول مرة أخرى لاحقاً.'), { status: 429 });
}
