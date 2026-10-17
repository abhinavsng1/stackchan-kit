import crypto from 'node:crypto'
import { neon } from '@neondatabase/serverless'
import { isEdition, type Edition } from '@/lib/kit'
import { planOf, quote, type Plan } from '@/lib/plans'
import { recordRedemption } from '@/lib/coupons'

/** A stored edition, read defensively: anything unrecognised was a kit order. */
const editionOf = (v: unknown): Edition => (isEdition(v) ? v : 'kit')

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
  /** Omitted only by callers that predate the robot; stored as the kit. */
  edition?: Edition
  /** The X ad click id the buyer arrived with, if any. */
  twclid?: string
  /** Global Privacy Control was on when they ordered: report nothing to ad platforms. */
  adOptOut?: boolean
  /** The colourway chosen, or the default the schema filled in. */
  shell?: string
  /** Which price arm this buyer saw, on the pages that run the experiment. */
  variant?: string
  /** How they chose to pay. Omitted means the deposit booking. */
  plan?: Plan
  /** A validated coupon, already checked against the coupons table. */
  couponCode?: string
  /** What that coupon is worth on this order, computed on the server. */
  discountPaise?: number
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
 *
 * A buyer who resumes may have changed their mind about the edition since —
 * someone who started a kit order before the robot was on sale, say. The
 * choice they just made is the one they are about to pay for, so the unpaid
 * row is brought up to date before its token is handed back. The price is the
 * same either way, so this cannot change what anyone is charged.
 */
async function resumeToken(
  sql: NonNullable<ReturnType<typeof client>>,
  email: string,
  phone: string | null,
  edition?: Edition,
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
  if (!matches) return { paid: false, token: null }

  if (edition) {
    await sql`
      update preorders set edition = ${edition}
       where email = ${email.toLowerCase()} and paid_at is null`
  }
  return { paid: false, token: String(row.payment_token) }
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
    insert into preorders (name, email, phone, profession, address, city, pincode, qty, payment_token, edition, twclid, ad_opt_out, variant, shell, plan, coupon_code, discount_paise)
    values (
      ${input.name}, ${input.email.toLowerCase()}, ${input.phone?.trim() || null},
      ${input.profession?.trim() || null}, ${input.address?.trim() || null},
      ${input.city?.trim() || null}, ${input.pincode?.trim() || null}, ${input.qty},
      ${token}, ${editionOf(input.edition)}, ${input.twclid ?? null},
      ${input.adOptOut === true}, ${input.variant ?? null}, ${input.shell ?? null},
      ${planOf(input.plan)}, ${input.couponCode ?? null}, ${input.discountPaise ?? 0}
    )
    on conflict (email) do nothing
    returning id
  `

  // ON CONFLICT (email) swallows an email collision, so zero rows means email.
  // A phone collision throws 23505 instead and is classified by the caller.
  if (rows.length > 0) return { status: 'created', token }

  const resume = await resumeToken(sql, input.email, input.phone ?? null, input.edition)
  return { status: 'duplicate', field: 'email', ...resume }
}

/**
 * The same lookup for a collision Postgres raised rather than absorbed — a
 * repeat phone number under a new address. Exported so the route can answer
 * it the same way it answers a repeat email.
 */
export async function resumeForEmail(
  email: string, phone: string | null, edition?: Edition,
): Promise<{ paid: boolean; token: string | null }> {
  const sql = client()
  if (!sql) return { paid: false, token: null }
  return resumeToken(sql, email, phone, edition)
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
  edition: Edition
  paidAt: Date | null
  /** How this booking is being paid for, which decides what is charged now. */
  plan: Plan
  /** The price arm it was booked under, or null for the standard price. */
  variant: string | null
  /** A coupon already validated and priced when the booking was made. */
  couponCode: string | null
  discountPaise: number
  /** Still owed in cash, once the deposit has settled. Zero until then. */
  balanceDuePaise: number
  /** When the balance was collected online instead of at the door. */
  balancePaidAt: Date | null
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
    select id, name, email, phone, qty, edition, paid_at, plan, variant,
           coupon_code, discount_paise, balance_due_paise, balance_paid_at
    from preorders where payment_token = ${token} limit 1`

  const r = rows[0]
  if (!r) return null
  return {
    id: Number(r.id), name: String(r.name), email: String(r.email),
    phone: r.phone === null ? null : String(r.phone),
    qty: Number(r.qty), edition: editionOf(r.edition),
    paidAt: r.paid_at ? new Date(r.paid_at as string) : null,
    plan: planOf(r.plan),
    variant: r.variant === null || r.variant === undefined ? null : String(r.variant),
    couponCode: r.coupon_code === null || r.coupon_code === undefined ? null : String(r.coupon_code),
    discountPaise: Number(r.discount_paise ?? 0),
    balanceDuePaise: Number(r.balance_due_paise ?? 0),
    balancePaidAt: r.balance_paid_at ? new Date(r.balance_paid_at as string) : null,
  }
}

/**
 * Switches an unpaid booking to the other plan.
 *
 * Someone who booked with a deposit and then decides to pay in full is the
 * same booking, not a second one, so the row moves rather than a new row being
 * created. `paid_at is null` in the predicate is what keeps this honest: a
 * settled booking's plan is the one its money was checked against, and
 * changing it afterwards would make the amount already captured look wrong.
 */
export async function setPlan(preorderId: number, plan: Plan): Promise<boolean> {
  const sql = client()
  if (!sql) return false
  const done = await sql`
    update preorders set plan = ${plan}
     where id = ${preorderId} and paid_at is null
    returning id`
  return done.length > 0
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
      /** Robot or kit, so the receipt names what is actually coming. */
      edition: Edition
      /** For the X Conversion API: the ad click this order came from, if any. */
      twclid: string | null
      /** The buyer asked not to be tracked (GPC); nothing goes to an ad platform. */
      adOptOut: boolean
      /** Still owed, in cash, when the box arrives. Zero on the full plan. */
      balanceDuePaise: number
      /** Which plan this settled under, so the receipt says the right thing. */
      plan: Plan
      /** What a coupon took off, if one was used. */
      discountPaise: number
      couponCode: string | null
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
   * this booking was quoted".
   */
  paidPaise?: number
}): Promise<MarkPaidResult> {
  const sql = client()
  if (!sql) return { status: 'unknown_order' }

  const rows = await sql`
    select id, name, email, qty, edition, twclid, ad_opt_out, variant, shell,
           phone, address, city, pincode, paid_at, plan, coupon_code, discount_paise
      from preorders where razorpay_order_id = ${input.orderId} limit 1`

  const row = rows[0]
  if (!row) return { status: 'unknown_order' }
  if (row.paid_at) return { status: 'already_paid' }

  // Priced from the row, never from the message. The plan, the quantity, the
  // arm and the discount were all fixed server-side when the order was
  // created, so this recomputes the same figure the gateway was asked for.
  const plan = planOf(row.plan)
  const couponCode = row.coupon_code === null || row.coupon_code === undefined ? null : String(row.coupon_code)
  const q = quote(
    plan,
    Number(row.qty),
    row.variant === null || row.variant === undefined ? null : String(row.variant),
    Number(row.discount_paise ?? 0),
  )
  const expected = q.nowPaise
  if (input.paidPaise !== undefined && input.paidPaise !== expected) {
    return { status: 'amount_mismatch', expectedPaise: expected, paidPaise: input.paidPaise }
  }
  const settledPaise = input.paidPaise ?? expected
  const balanceDue = q.balancePaise

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

  // Counted here and nowhere else. The update above settled exactly one row,
  // so a redelivered webhook cannot count a second redemption of the same
  // code — and a code typed by somebody who never paid never counts at all.
  if (couponCode) {
    try {
      await recordRedemption(couponCode)
    } catch (e) {
      // A counter that failed to move is worth knowing about, and is never
      // worth failing a settled payment over.
      console.error('[markPaid] could not count redemption', { code: couponCode, error: String(e) })
    }
  }

  const text = (v: unknown) => (v === null || v === undefined ? null : String(v))
  return {
    status: 'paid',
    name: String(row.name),
    email: String(row.email),
    qty: Number(row.qty),
    edition: editionOf(row.edition),
    twclid: text(row.twclid),
    adOptOut: row.ad_opt_out === true,
    amountPaise: settledPaise,
    balanceDuePaise: balanceDue,
    plan,
    discountPaise: q.discountPaise,
    couponCode,
    phone: text(row.phone),
    address: text(row.address),
    city: text(row.city),
    pincode: text(row.pincode),
  }
}

/* ------------------------------------------------------------------------ *
 * Unpaid-booking recovery
 *
 * Someone fills in the form, the payment window opens, and then the tab
 * closes. The booking is real — name, phone and address are in Postgres — and
 * the only thing missing is the payment. This is the one email that says so.
 * ------------------------------------------------------------------------ */

export type RecoverableBooking = {
  id: number
  name: string
  email: string
  token: string
  qty: number
  edition: Edition
  plan: Plan
  variant: string | null
  discountPaise: number
}

/**
 * Claims up to `limit` unpaid bookings for a reminder, and returns them.
 *
 * The claim and the read are one statement on purpose. Two overlapping cron
 * runs, or a retry after a timeout, would otherwise both select the same rows
 * and both email them. Marking first means the failure mode is a buyer who
 * never gets a reminder rather than one who gets several, and between those
 * two the silent one is the one to prefer: this address belongs to someone who
 * has not asked to hear from us twice.
 *
 * The window has both ends. Younger than `minAgeHours` is someone who may
 * still be mid-payment in another tab. Older than `maxAgeHours` is a booking
 * stale enough that an unexpected mail would read as spam.
 */
export async function claimBookingsForRecovery(opts: {
  minAgeHours?: number
  maxAgeHours?: number
  limit?: number
} = {}): Promise<RecoverableBooking[]> {
  const sql = client()
  if (!sql) return []
  const minAge = opts.minAgeHours ?? 1
  const maxAge = opts.maxAgeHours ?? 72
  const limit = Math.max(1, Math.min(200, opts.limit ?? 50))

  const rows = await sql`
    update preorders set recovery_sent_at = now()
     where id in (
       select id from preorders
        where paid_at is null
          and recovery_sent_at is null
          and payment_token is not null
          and created_at <= now() - make_interval(hours => ${minAge})
          and created_at >= now() - make_interval(hours => ${maxAge})
        order by created_at
        limit ${limit}
     )
    returning id, name, email, payment_token, qty, edition, plan, variant, discount_paise`

  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    email: String(r.email),
    token: String(r.payment_token),
    qty: Number(r.qty),
    edition: editionOf(r.edition),
    plan: planOf(r.plan),
    variant: r.variant === null || r.variant === undefined ? null : String(r.variant),
    discountPaise: Number(r.discount_paise ?? 0),
  }))
}

/**
 * Hands a claim back when the mail could not be sent at all, so the next run
 * tries again. Only ever called for a provider-level failure: a bounce is not
 * a reason to email the same person twice.
 */
export async function releaseRecoveryClaim(preorderId: number): Promise<void> {
  const sql = client()
  if (!sql) return
  await sql`update preorders set recovery_sent_at = null where id = ${preorderId} and paid_at is null`
}

/**
 * Attaches a validated code to an unpaid booking.
 *
 * The discount is stored, not the code alone, because the code's worth is
 * decided once — against this plan, this quantity, this price arm — and must
 * not drift afterwards. If the coupon's terms change tomorrow, the buyer who
 * booked today still gets what they were quoted.
 *
 * `paid_at is null` guards it: a settled booking's discount is part of the
 * amount already checked against its payment.
 */
export async function setCoupon(
  preorderId: number, code: string | null, discountPaise: number,
): Promise<boolean> {
  const sql = client()
  if (!sql) return false
  const done = await sql`
    update preorders
       set coupon_code = ${code}, discount_paise = ${Math.max(0, Math.floor(discountPaise))}
     where id = ${preorderId} and paid_at is null
    returning id`
  return done.length > 0
}

/* ------------------------------------------------------------------------ *
 * The balance, paid online instead of at the door
 *
 * A second payment against a booking that is already settled. It has its own
 * order id column and its own settle function, because the deposit's row
 * guard — `paid_at is null` — is the opposite of what is wanted here: this
 * only applies to a booking that *has* been paid for and still owes cash.
 * ------------------------------------------------------------------------ */

export type BalancePayable = {
  id: number
  name: string
  email: string
  qty: number
  edition: Edition
  balanceDuePaise: number
  /** Already settled online, so the page can say so rather than charge twice. */
  balancePaidAt: Date | null
  /** Null until the deposit settles; there is no balance before that. */
  paidAt: Date | null
}

export async function findBalanceByToken(token: string): Promise<BalancePayable | null> {
  const sql = client()
  if (!sql) return null
  const rows = await sql`
    select id, name, email, qty, edition, balance_due_paise, balance_paid_at, paid_at
      from preorders where payment_token = ${token} limit 1`
  const r = rows[0]
  if (!r) return null
  return {
    id: Number(r.id), name: String(r.name), email: String(r.email),
    qty: Number(r.qty), edition: editionOf(r.edition),
    balanceDuePaise: Number(r.balance_due_paise ?? 0),
    balancePaidAt: r.balance_paid_at ? new Date(r.balance_paid_at as string) : null,
    paidAt: r.paid_at ? new Date(r.paid_at as string) : null,
  }
}

/** Records which Razorpay order is this booking's balance payment. */
export async function attachBalanceOrder(preorderId: number, orderId: string): Promise<void> {
  const sql = client()
  if (!sql) return
  await sql`
    update preorders set balance_order_id = ${orderId}
     where id = ${preorderId} and balance_paid_at is null`
}

export type BalancePaidResult =
  | {
      status: 'paid'
      name: string; email: string; qty: number; edition: Edition
      amountPaise: number
      phone: string | null; address: string | null; city: string | null; pincode: string | null
    }
  | { status: 'already_paid' }
  | { status: 'unknown_order' }

/**
 * Settles the balance, and sets what is owed at the door to zero.
 *
 * Zeroing `balance_due_paise` is the point of the whole feature: that column
 * is what a courier is told to collect, and a buyer who has already paid
 * online being asked for cash again is the worst outcome this code can
 * produce. It happens in the same statement as the settlement, guarded by
 * `balance_paid_at is null`, so a redelivered webhook cannot double-count and
 * cannot un-zero it.
 *
 * Unlike the deposit, the amount is not re-derived from a price: the buyer was
 * quoted whatever was outstanding on their own row, less the incentive, and
 * that figure is checked against the capture here.
 */
export async function markBalancePaid(input: {
  orderId: string
  paymentId: string
  paidPaise?: number
  /** The same incentive the payment screen offered. */
  incentivePaise?: number
}): Promise<BalancePaidResult> {
  const sql = client()
  if (!sql) return { status: 'unknown_order' }

  const rows = await sql`
    select id, name, email, qty, edition, phone, address, city, pincode,
           balance_due_paise, balance_paid_at
      from preorders where balance_order_id = ${input.orderId} limit 1`

  const row = rows[0]
  if (!row) return { status: 'unknown_order' }
  if (row.balance_paid_at) return { status: 'already_paid' }

  const settled = input.paidPaise ?? Number(row.balance_due_paise ?? 0)

  const done = await sql`
    update preorders
       set balance_paid_at    = now(),
           balance_payment_id = ${input.paymentId},
           balance_due_paise  = 0
     where balance_order_id = ${input.orderId} and balance_paid_at is null
    returning id`

  if (done.length === 0) return { status: 'already_paid' }

  const text = (v: unknown) => (v === null || v === undefined ? null : String(v))
  return {
    status: 'paid',
    name: String(row.name), email: String(row.email),
    qty: Number(row.qty), edition: editionOf(row.edition),
    amountPaise: settled,
    phone: text(row.phone), address: text(row.address),
    city: text(row.city), pincode: text(row.pincode),
  }
}

/** Bookings that have paid a deposit and still owe cash at the door. */
export type BalanceOwing = {
  id: number
  name: string
  email: string
  token: string
  qty: number
  edition: Edition
  balanceDuePaise: number
  askedAt: Date | null
}

export async function bookingsOwingBalance(limit = 200): Promise<BalanceOwing[]> {
  const sql = client()
  if (!sql) return []
  const rows = await sql`
    select id, name, email, payment_token, qty, edition, balance_due_paise, balance_asked_at
      from preorders
     where paid_at is not null
       and balance_paid_at is null
       and balance_due_paise > 0
     order by paid_at
     limit ${Math.max(1, Math.min(500, limit))}`
  return rows.map((r) => ({
    id: Number(r.id), name: String(r.name), email: String(r.email),
    token: String(r.payment_token), qty: Number(r.qty), edition: editionOf(r.edition),
    balanceDuePaise: Number(r.balance_due_paise ?? 0),
    askedAt: r.balance_asked_at ? new Date(r.balance_asked_at as string) : null,
  }))
}

export async function markBalanceAsked(preorderId: number): Promise<void> {
  const sql = client()
  if (!sql) return
  await sql`update preorders set balance_asked_at = now() where id = ${preorderId}`
}
