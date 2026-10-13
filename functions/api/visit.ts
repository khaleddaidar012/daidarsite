import { json, sameOrigin, type Env } from '../lib/store'
export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  if (!sameOrigin(request)) return json({}, 403)
  if (!env.DB) return json({}, 503)
  try {
    const { visitor } = await request.json() as { visitor: string }
    if (typeof visitor !== 'string' || !/^[a-f0-9-]{36}$/.test(visitor)) return json({}, 400)
    const now = Date.now()
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now))
    await env.DB.prepare('INSERT INTO visits VALUES (?, ?, ?) ON CONFLICT(visitor, day) DO UPDATE SET seen_at = excluded.seen_at').bind(visitor, day, now).run()
    return json({ success: true })
  } catch { return json({}, 503) }
}
