import { neon } from '@neondatabase/serverless'

export type PreorderRecord = {
  name: string
  email: string
  phone: string
  profession: string
  address: string
  city: string
  pincode: string
  qty: number
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
 * a double-click, or a replayed request can never create a second row. Phone is
 * unique too, so a duplicate on either one surfaces as 'duplicate' rather than
 * a 500.
 */
export async function createPreorder(input: PreorderRecord): Promise<CreateResult> {
  const sql = client()
  if (!sql) return { status: 'unconfigured' }

  const rows = await sql`
    insert into preorders (name, email, phone, profession, address, city, pincode, qty)
    values (
      ${input.name}, ${input.email.toLowerCase()}, ${input.phone},
      ${input.profession}, ${input.address}, ${input.city}, ${input.pincode}, ${input.qty}
    )
    on conflict (email) do nothing
    returning id
  `

  return rows.length > 0 ? { status: 'created' } : { status: 'duplicate' }
}

/** Postgres unique-violation, raised when the phone is already on the list. */
export function isDuplicateError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'code' in e &&
    (e as { code?: string }).code === '23505'
}
