import type { Database, Env } from './store'

const MAX_BACKUP_BYTES = 48 * 1024 * 1024
const PAGE_SIZE = 100

type SchemaObject = { type: string; name: string; tbl_name: string; sql: string | null }
type ExportedDatabase = { binding: string; schema: SchemaObject[]; tables: Array<{ name: string; rows: Record<string, unknown>[]; rowCount: number }> }

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function jsonValue(value: unknown): unknown {
  if (value instanceof ArrayBuffer) return jsonValue(new Uint8Array(value))
  if (ArrayBuffer.isView(value)) {
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
    return { $type: 'base64', data: btoa(binary) }
  }
  if (Array.isArray(value)) return value.map(jsonValue)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonValue(item)]))
  return value
}

async function exportDatabase(binding: string, database: Database): Promise<ExportedDatabase> {
  const sessionDb = (database as Database & { withSession?: (constraint?: string) => Database }).withSession?.('first-primary') || database
  const schemaResult = await sessionDb.prepare("SELECT type, name, tbl_name, sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' AND type IN ('table', 'index', 'view', 'trigger') ORDER BY type, name").all<SchemaObject>()
  const schema = schemaResult.results || []
  const tableNames = schema.filter(item => item.type === 'table').map(item => item.name)
  const tables: ExportedDatabase['tables'] = []
  let payloadBytes = 0

  for (const name of tableNames) {
    const rows: Record<string, unknown>[] = []
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const page = await sessionDb.prepare(`SELECT * FROM ${quoteIdentifier(name)} LIMIT ? OFFSET ?`).bind(PAGE_SIZE, offset).all<Record<string, unknown>>()
      const values = page.results || []
      for (const row of values) {
        const normalized = jsonValue(row) as Record<string, unknown>
        payloadBytes += new TextEncoder().encode(JSON.stringify(normalized)).byteLength
        if (payloadBytes > MAX_BACKUP_BYTES) throw new Error(`backup_too_large:${binding}`)
        rows.push(normalized)
      }
      if (values.length < PAGE_SIZE) break
    }
    tables.push({ name, rows, rowCount: rows.length })
  }

  return { binding, schema, tables }
}

export async function createDatabaseBackup(env: Env) {
  const available: Array<[string, Database | undefined]> = [
    ['DB', env.DB],
    ['ECOSYSTEM_DB', env.ECOSYSTEM_DB],
    ['ECOSYSTEM_HUB_DB', env.ECOSYSTEM_HUB_DB],
    ['ECOSYSTEM_STORE_DB', env.ECOSYSTEM_STORE_DB],
  ]
  const exported: ExportedDatabase[] = []
  for (const [binding, database] of available) {
    if (database) exported.push(await exportDatabase(binding, database))
  }
  const generatedAt = new Date().toISOString()
  const document = {
    format: 'daidar-d1-json-backup',
    version: 1,
    generatedAt,
    warning: 'يتضمن هذا الملف بيانات قواعد البيانات. احفظه في مكان آمن ولا تشاركه.',
    databases: exported,
    unavailableBindings: available.filter(([, database]) => !database).map(([binding]) => binding),
  }
  const body = JSON.stringify(document)
  if (new TextEncoder().encode(body).byteLength > MAX_BACKUP_BYTES) throw new Error('backup_too_large:archive')
  const stamp = generatedAt.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="daidar-d1-backup-${stamp}.json"`,
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
