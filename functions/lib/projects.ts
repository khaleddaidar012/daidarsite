import { projects as originals } from '../../src/data/projects'
import type { Env } from './store'
import type { Project } from '../../src/types'
export { originals }
export async function allProjects(env: Env) {
  const rows = await env.DB!.prepare('SELECT data FROM managed_projects ORDER BY created_at DESC').all<{ data: string }>()
  const overrides = rows.results.map(row => JSON.parse(row.data) as Project)
  return [...overrides, ...originals.filter(p => !overrides.some(o => o.id === p.id))]
}
