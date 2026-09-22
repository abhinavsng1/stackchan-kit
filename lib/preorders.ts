import { neon } from '@neondatabase/serverless'

export type PreorderRecord = {
  name: string
  email: string
  phone?: string
  profession?: string
  address?: string
  city?: string
  pincode?: string
  qty: number
}

export type CreateResult =
  | { status: 'created' }
  /** Which field collided, so the visitor can be told something useful. */
  | { status: 'duplicate'; field: 'email' | 'phone' }
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
 * a double-click, or a replayed request can never create a second row. Supplied
 * phones are unique too. SQL NULL leaves an omitted phone free of collisions.
 */
export async function createPreorder(input: PreorderRecord): Promise<CreateResult> {
  const sql = client()
  if (!sql) return { status: 'unconfigured' }

  const rows = await sql`
    insert into preorders (name, email, phone, profession, address, city, pincode, qty)
    values (
      ${input.name}, ${input.email.toLowerCase()}, ${input.phone?.trim() || null},
      ${input.profession?.trim() || null}, ${input.address?.trim() || null},
      ${input.city?.trim() || null}, ${input.pincode?.trim() || null}, ${input.qty}
    )
    on conflict (email) do nothing
    returning id
  `

  // ON CONFLICT (email) swallows an email collision, so zero rows means email.
  // A phone collision throws 23505 instead and is classified by the caller.
  return rows.length > 0 ? { status: 'created' } : { status: 'duplicate', field: 'email' }
}

/**
 * Postgres unique-violation. Only the phone index can raise it — an email
 * collision is absorbed by ON CONFLICT — but the constraint name is checked
 * rather than assumed, so a future index cannot be silently mislabelled.
 */
export function duplicateField(e: unknown): 'email' | 'phone' | null {
  if (typeof e !== 'object' || e === null || !('code' in e)) return null
  const err = e as { code?: string; constraint?: string; message?: string }
  if (err.code !== '23505') return null
  const where = `${err.constraint ?? ''} ${err.message ?? ''}`
  if (where.includes('phone')) return 'phone'
  if (where.includes('email')) return 'email'
  return 'phone'
}
