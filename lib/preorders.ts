import { neon } from '@neondatabase/serverless'

export type PreorderRecord = {
  name: string
  email: string
  qty: number
  city?: string
}

export type CreateResult =
  | { status: 'created' }
  | { status: 'duplicate' }
  | { status: 'unconfigured' }

/**
 * Lazy client. neon() throws when DATABASE_URL is unset, and Next evaluates
 * module top-level code at build time — initialising eagerly would break
 * `next build` before the database is provisioned.
 */
function client() {
  const url = process.env.DATABASE_URL
  if (!url) return null
  return neon(url)
}

/**
 * Idempotent by construction: the UNIQUE constraint on email means a retry,
 * a double-click, or a replayed request can never create a second row.
 */
export async function createPreorder(input: PreorderRecord): Promise<CreateResult> {
  const sql = client()
  if (!sql) return { status: 'unconfigured' }

  const rows = await sql`
    insert into preorders (name, email, qty, city)
    values (${input.name}, ${input.email.toLowerCase()}, ${input.qty}, ${input.city ?? null})
    on conflict (email) do nothing
    returning id
  `

  return rows.length > 0 ? { status: 'created' } : { status: 'duplicate' }
}
