/**
 * Applies db/schema.sql to the Neon database.
 *
 *   node db/migrate.mjs
 *
 * Reads DATABASE_URL from .env.local (written by `vercel env pull`) so it works
 * without psql installed. Every statement is idempotent, so re-running is safe.
 */
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const url = process.env.DATABASE_URL ?? env.match(/^DATABASE_URL="?([^"\n]+)"?/m)?.[1]
if (!url) {
  console.error('No DATABASE_URL. Run: vercel env pull .env.local --yes')
  process.exit(1)
}

const sql = neon(url)
const statements = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
  .split(';')
  .map((s) => s.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').trim())
  .filter(Boolean)

let failed = 0
for (const stmt of statements) {
  const label = stmt.replace(/\s+/g, ' ').slice(0, 64)
  try {
    await sql.query(stmt)
    console.log('  ok   ', label)
  } catch (e) {
    failed++
    console.error('  FAIL ', label, '\n         ', e.message)
  }
}

const cols = await sql`
  select column_name from information_schema.columns
  where table_name = 'preorders' order by ordinal_position`
console.log('\npreorders:', cols.map((c) => c.column_name).join(', '))
process.exit(failed ? 1 : 0)
