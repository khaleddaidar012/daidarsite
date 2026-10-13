import { json, type Env } from '../lib/store'
export async function onRequestGet({ env }: { env: Env }) {
  if (!env.DB) return json({ projects: [] })
  try {
    const rows = await env.DB.prepare('SELECT data FROM managed_projects ORDER BY created_at DESC').all<{ data: string }>()
    return json({ projects: rows.results.map(x => JSON.parse(x.data)) })
  } catch { return json({ error: 'تعذر تحميل المشاريع' }, 503) }
}
