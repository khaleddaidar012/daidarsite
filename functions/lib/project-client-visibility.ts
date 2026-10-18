import type { Env } from './store'
export function missingVisibilityTable(error: unknown) {
  return error instanceof Error && /no such table:\s*(?:main\.)?work_project_client_visibility/i.test(error.message)
}
export async function visibleBalanceProjects(env: Env) {
  try {
    return (await env.DB!.prepare('SELECT project_id FROM work_project_client_visibility WHERE show_remaining=1').all<{project_id:string}>()).results.map(row => row.project_id)
  } catch (error) {
    if (missingVisibilityTable(error)) return [] // Older deployments stay private until the migration is applied.
    throw error
  }
}
