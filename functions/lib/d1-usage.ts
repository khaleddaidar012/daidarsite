import { json, type Env } from './store'

type CloudflareResult<T> = { success: boolean; result: T; result_info?: { page?: number; per_page?: number; total_count?: number }; errors?: { message?: string }[] }
type Database = { uuid: string; name: string; created_at?: string; jurisdiction?: string }
type DatabaseDetails = Database & { file_size?: number }
const MB = 1_000_000
const GB = 1_000_000_000
const WARNING_PERCENT = 80
const CRITICAL_PERCENT = 95

async function cloudflare<T>(env: Env, path: string): Promise<T> {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: { Authorization: `Bearer ${env.CLOUDFLARE_D1_READ_TOKEN}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  })
  const data = await response.json() as CloudflareResult<T>
  if (!response.ok || !data.success) throw new Error('Cloudflare D1 usage request failed')
  return data.result
}

async function listDatabases(env: Env): Promise<Database[]> {
  const databases: Database[] = []
  const perPage = 1000
  for (let page = 1; page <= 100; page++) {
    const result = await cloudflare<Database[]>(env, `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database?page=${page}&per_page=${perPage}`)
    databases.push(...result)
    if (result.length < perPage) break
  }
  return databases
}

export async function d1UsageResponse(env: Env): Promise<Response> {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_D1_READ_TOKEN) {
    return json({ error: 'مراقبة D1 غير مهيأة. أضف CLOUDFLARE_ACCOUNT_ID وCLOUDFLARE_D1_READ_TOKEN في إعدادات Pages.' }, 503)
  }
  const plan = env.D1_PLAN?.trim().toLowerCase()
  if (plan !== 'free' && plan !== 'paid') return json({ error: 'حدد D1_PLAN في إعدادات Pages إلى free أو paid حسب خطة Workers.' }, 503)

  try {
    const databases = await listDatabases(env)
    const databaseLimit = plan === 'paid' ? 10 * GB : 500 * MB
    const accountLimit = plan === 'paid' ? 1000 * GB : 5 * GB
    const sized: DatabaseDetails[] = []
    for (let offset = 0; offset < databases.length; offset += 8) {
      const group = databases.slice(offset, offset + 8)
      const details = await Promise.all(group.map(database => cloudflare<DatabaseDetails>(env,
        `/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${encodeURIComponent(database.uuid)}?fields=uuid,name,created_at,jurisdiction,file_size`)))
      sized.push(...details)
    }

    const items = sized.map(database => {
      const usedBytes = Math.max(0, Math.floor(database.file_size || 0))
      const usedPercent = Math.min(100, Math.round(usedBytes / databaseLimit * 1000) / 10)
      return {
        id: database.uuid,
        name: database.name,
        createdAt: database.created_at || null,
        jurisdiction: database.jurisdiction || null,
        usedBytes,
        limitBytes: databaseLimit,
        freeBytes: Math.max(0, databaseLimit - usedBytes),
        usedPercent,
        status: usedPercent >= CRITICAL_PERCENT ? 'critical' : usedPercent >= WARNING_PERCENT ? 'warning' : 'healthy',
      }
    }).sort((a, b) => b.usedBytes - a.usedBytes)
    const accountUsedBytes = items.reduce((sum, database) => sum + database.usedBytes, 0)
    const accountUsedPercent = Math.min(100, Math.round(accountUsedBytes / accountLimit * 1000) / 10)
    return json({
      plan,
      warningPercent: WARNING_PERCENT,
      criticalPercent: CRITICAL_PERCENT,
      databases: items,
      account: {
        usedBytes: accountUsedBytes,
        limitBytes: accountLimit,
        freeBytes: Math.max(0, accountLimit - accountUsedBytes),
        usedPercent: accountUsedPercent,
        status: accountUsedPercent >= CRITICAL_PERCENT ? 'critical' : accountUsedPercent >= WARNING_PERCENT ? 'warning' : 'healthy',
      },
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Could not read Cloudflare D1 storage', error)
    return json({ error: 'تعذر قراءة قواعد D1. تأكد من صحة Account ID ومن أن Cloudflare API Token يملك صلاحية D1 Read.' }, 502)
  }
}
