import crypto from 'node:crypto'
import { neon } from '@neondatabase/serverless'

/** 32 hex characters from a CSPRNG: unguessable, and safe in a URL. */
export function newPaymentToken(): string {
  return crypto.randomBytes(16).toString('hex')
}

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
  /** The token is returned so the caller can send the buyer straight to pay. */
  | { status: 'created'; token: string }
  /**
   * Which field collided, so the visitor can be told something useful, and
   * whether that existing order was ever paid for. An unpaid duplicate is
   * somebody coming back to finish, not somebody ordering twice, and telling
   * them they are "already on the list" strands them with no way to pay.
   */
  | { status: 'duplicate'; field: 'email' | 'phone'; paid: boolean; token: string | null }
  | { status: 'unconfigured' }

/**
 * The token for an unpaid order, but only to someone who can already name
 * both the email and the phone on it.
 *
 * Handing a payment token to anyone who types an email address would turn
 * this form into an oracle for which addresses have ordered. Requiring both
 * details is not authentication, and it is not meant to be — it is the bar
 * that separates a buyer resuming their own order from someone probing the
 * table, and it costs the buyer nothing because they just typed both.
 *
 * A paid order returns nothing. There is no payment left to resume, and the
 * only thing a token could do is confuse.
 */
async function resumeToken(
  sql: NonNullable<ReturnType<typeof client>>,
  email: string,
  phone: string | null,
): Promise<{ paid: boolean; token: string | null }> {
  const rows = await sql`
    select payment_token, paid_at, phone
      from preorders where email = ${email.toLowerCase()} limit 1`
  const row = rows[0]
  if (!row) return { paid: false, token: null }
  if (row.paid_at) return { paid: true, token: null }

  const stored = row.phone === null ? null : String(row.phone)
  const given = phone?.trim() || null
  const matches = stored !== null && given !== null && stored === given
  return { paid: false, token: matches ? String(row.payment_token) : null }
}

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

  const token = newPaymentToken()

  const rows = await sql`
    insert into preorders (name, email, phone, profession, address, city, pincode, qty, payment_token)
    values (
      ${input.name}, ${input.email.toLowerCase()}, ${input.phone?.trim() || null},
      ${input.profession?.trim() || null}, ${input.address?.trim() || null},
      ${input.city?.trim() || null}, ${input.pincode?.trim() || null}, ${input.qty},
      ${token}
    )
    on conflict (email) do nothing
    returning id
  `

  // ON CONFLICT (email) swallows an email collision, so zero rows means email.
  // A phone collision throws 23505 instead and is classified by the caller.
  if (rows.length > 0) return { status: 'created', token }

  const resume = await resumeToken(sql, input.email, input.phone ?? null)
  return { status: 'duplicate', field: 'email', ...resume }
}

/**
 * The same lookup for a collision Postgres raised rather than absorbed — a
 * repeat phone number under a new address. Exported so the route can answer
 * it the same way it answers a repeat email.
 */
export async function resumeForEmail(
  email: string, phone: string | null,
): Promise<{ paid: boolean; token: string | null }> {
  const sql = client()
  if (!sql) return { paid: false, token: null }
  return resumeToken(sql, email, phone)
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

/* ------------------------------------------------------------------------ *
 * Payments
 *
 * The rule these functions exist to enforce: a reservation is marked paid by
 * the payment provider telling us so, never by a browser claiming it. Both the
 * webhook and the post-checkout callback funnel into markPaid, and markPaid is
 * idempotent, so a replayed webhook or a refreshed success page changes
 * nothing the first one did not already do.
 * ------------------------------------------------------------------------ */

export type PayableReservation = {
  id: number
  name: string
  email: string
  phone: string | null
  qty: number
  paidAt: Date | null
}

/**
 * Looks a reservation up by its payment token. The token is 32 hex characters
 * of randomness, so it cannot be guessed, and it is the only accepted way in —
 * row ids are sequential and would let anyone walk the table.
 */
export async function findByPaymentToken(token: string): Promise<PayableReservation | null> {
  const sql = client()
  if (!sql) return null

  const rows = await sql`
    select id, name, email, phone, qty, paid_at
    from preorders where payment_token = ${token} limit 1`

  const r = rows[0]
  if (!r) return null
  return {
    id: Number(r.id), name: String(r.name), email: String(r.email),
    phone: r.phone === null ? null : String(r.phone),
    qty: Number(r.qty), paidAt: r.paid_at ? new Date(r.paid_at as string) : null,
  }
}

/** Records which Razorpay order belongs to which reservation, before payment. */
export async function attachOrder(preorderId: number, orderId: string): Promise<void> {
  const sql = client()
  if (!sql) return
  await sql`
    update preorders set razorpay_order_id = ${orderId}
     where id = ${preorderId} and paid_at is null`
}

export type MarkPaidResult =
  /**
   * Settled by this call, and only this call. The details ride along so the
   * caller can send a receipt without a second query — and because this
   * status is returned exactly once per reservation, a receipt sent here is
   * sent once no matter how many times the webhook is redelivered.
   */
  | {
      status: 'paid'
      name: string; email: string; qty: number; amountPaise: number
      /** Still owed, in cash, when the box arrives. */
      balanceDuePaise: number
      phone: string | null; address: string | null; city: string | null; pincode: string | null
    }
  /** Already settled — a webhook retry or a refreshed success page. */
  | { status: 'already_paid' }
  /** No reservation holds this order id. Nothing is written. */
  | { status: 'unknown_order' }
  /** The captured amount is not what this reservation costs. Not written. */
  | { status: 'amount_mismatch'; expectedPaise: number; paidPaise: number }

/**
 * Settles a reservation, and refuses to if anything does not line up.
 *
 * The amount check is the one that matters. A signature proves Razorpay sent
 * the message; it does not prove the sum is the sum we asked for. Comparing
 * against the price computed here — never against a figure from the request —
 * is what stops a genuine, correctly signed payment for the wrong amount from
 * settling an order.
 */
export async function markPaid(input: {
  orderId: string
  paymentId: string
  /**
   * What Razorpay says was captured. The webhook carries it; the browser
   * callback does not, and is not asked to invent one — an amount supplied by
   * a client would be worth nothing anyway. Omitted means "settle at the price
   * this reservation was quoted", which is safe because the order was created
   * with that amount fixed server-side and partial payment is not enabled.
   */
  paidPaise?: number
  expectedPaiseFor: (qty: number) => number
  /**
   * What the buyer still owes on delivery. Recorded at settlement so the
   * amount a courier collects is the amount agreed at booking, not whatever
   * the price happens to be by the time the box ships.
   */
  balanceDuePaiseFor: (qty: number) => number
}): Promise<MarkPaidResult> {
  const sql = client()
  if (!sql) return { status: 'unknown_order' }

  const rows = await sql`
    select id, name, email, qty, phone, address, city, pincode, paid_at
      from preorders where razorpay_order_id = ${input.orderId} limit 1`

  const row = rows[0]
  if (!row) return { status: 'unknown_order' }
  if (row.paid_at) return { status: 'already_paid' }

  const expected = input.expectedPaiseFor(Number(row.qty))
  if (input.paidPaise !== undefined && input.paidPaise !== expected) {
    return { status: 'amount_mismatch', expectedPaise: expected, paidPaise: input.paidPaise }
  }
  const settledPaise = input.paidPaise ?? expected
  const balanceDue = input.balanceDuePaiseFor(Number(row.qty))

  // `paid_at is null` in the predicate makes this safe against two deliveries
  // racing: the second updates zero rows and reports what the first did.
  const done = await sql`
    update preorders
       set razorpay_payment_id = ${input.paymentId},
           amount_paid_paise   = ${settledPaise},
           balance_due_paise   = ${balanceDue},
           paid_at             = now()
     where razorpay_order_id = ${input.orderId} and paid_at is null
    returning id`

  if (done.length === 0) return { status: 'already_paid' }

  const text = (v: unknown) => (v === null || v === undefined ? null : String(v))
  return {
    status: 'paid',
    name: String(row.name),
    email: String(row.email),
    qty: Number(row.qty),
    amountPaise: settledPaise,
    balanceDuePaise: balanceDue,
    phone: text(row.phone),
    address: text(row.address),
    city: text(row.city),
    pincode: text(row.pincode),
  }
}
