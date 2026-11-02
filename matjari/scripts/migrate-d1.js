import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const dbPath = path.join(rootDir, '.d1_local.sqlite');
const migrationPath = path.join(rootDir, 'migrations', '0001_initial_schema.sql');

console.log('[Cloudflare D1 Migration Tool]');
console.log(`Target SQLite D1 Database: ${dbPath}`);
console.log(`Reading migration: ${migrationPath}`);

if (!fs.existsSync(migrationPath)) {
  console.error(`Migration file not found at ${migrationPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(migrationPath, 'utf8');
const db = new DatabaseSync(dbPath);

try {
  db.exec(sql);
  console.log('✅ Cloudflare D1 Migration applied successfully!');
  
  // Inspect tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';").all();
  console.log('Tables initialized in D1:', tables.map((t) => t.name).join(', '));
} catch (err) {
  console.error('❌ Failed to run migration:', err);
  process.exit(1);
}
