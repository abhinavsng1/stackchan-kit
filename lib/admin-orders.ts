import { neon } from '@neondatabase/serverless'
import { planOf, quote, type Plan } from '@/lib/plans'
import { isEdition, type Edition } from '@/lib/kit'

/**
 * The order book, for the one person who chases it.
 *
 * Three groups, because there are exactly three things to do about an order:
 * get it paid for, get the balance settled, or leave it alone. Anything that
 * does not help with one of those is not on this page.
 *
 * Read-only. Nothing here changes an order; the one action the dashboard
 * offers — asking for the balance — goes through its own route so that it is
 * obvious which code can send email.
 */

function client() {
  const url = process.env.DATABASE_URL
  if (!url) return null
  return neon(url)
}

export const GROUPS = ['unpaid', 'balance_due', 'paid_in_full'] as const
export type Group = (typeof GROUPS)[number]

export const isGroup = (v: unknown): v is Group =>
  typeof v === 'string' && (GROUPS as readonly string[]).includes(v)

export const GROUP_LABEL: Record<Group, string> = {
  unpaid: 'Unpaid',
  balance_due: 'Deposit paid, balance due',
  paid_in_full: 'Paid in full',
}

export type AdminOrder = {
  id: number
  group: Group
  name: string
  email: string
  phone: string | null
  city: string | null
  pincode: string | null
  qty: number
  edition: Edition
  plan: Plan
  shell: string | null
  couponCode: string | null
  /** Taken so far, through Razorpay. */
  paidPaise: number
  /** Still to collect, in cash or online. */
  duePaise: number
  createdAt: Date
  paidAt: Date | null
  balancePaidAt: Date | null
  balanceAskedAt: Date | null
  recoverySentAt: Date | null
  /** The booking's own link, for the payment or the balance page. */
  token: string | null
  /* --- the rest of the record, for the row that gets opened --- */
  address: string | null
  variant: string | null
  discountPaise: number
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
  balancePaymentId: string | null
  balanceCollectedAt: Date | null
  needsReview: boolean
  archivedAt: Date | null
  adminNote: string | null
}

/** Which of the three buckets a row belongs in. */
function groupOf(r: Record<string, unknown>): Group {
  if (!r.paid_at) return 'unpaid'
  const owing = Number(r.balance_due_paise ?? 0)
  if (!r.balance_paid_at && owing > 0) return 'balance_due'
  return 'paid_in_full'
}

function toOrder(r: Record<string, unknown>): AdminOrder {
  const plan = planOf(r.plan)
  const qty = Number(r.qty ?? 1)
  const paidPaise = Number(r.amount_paid_paise ?? 0)
  const group = groupOf(r)

  // An unpaid booking has not been quoted anything yet, so what it "owes" is
  // what it would be charged if it paid now — the figure the chase email
  // would carry. A paid one owes whatever its own row says.
  const duePaise = group === 'unpaid'
    ? quote(plan, qty, r.variant === null || r.variant === undefined ? null : String(r.variant),
            Number(r.discount_paise ?? 0)).nowPaise
    : Number(r.balance_due_paise ?? 0)

  const date = (v: unknown) => (v ? new Date(String(v)) : null)
  const text = (v: unknown) => (v === null || v === undefined ? null : String(v))

  return {
    id: Number(r.id),
    group,
    name: String(r.name),
    email: String(r.email),
    phone: text(r.phone),
    city: text(r.city),
    pincode: text(r.pincode),
    qty,
    edition: isEdition(r.edition) ? r.edition : 'kit',
    plan,
    shell: text(r.shell),
    couponCode: text(r.coupon_code),
    paidPaise,
    duePaise,
    createdAt: new Date(String(r.created_at)),
    paidAt: date(r.paid_at),
    balancePaidAt: date(r.balance_paid_at),
    balanceAskedAt: date(r.balance_asked_at),
    recoverySentAt: date(r.recovery_sent_at),
    token: text(r.payment_token),
    address: text(r.address),
    variant: text(r.variant),
    discountPaise: Number(r.discount_paise ?? 0),
    razorpayOrderId: text(r.razorpay_order_id),
    razorpayPaymentId: text(r.razorpay_payment_id),
    balancePaymentId: text(r.balance_payment_id),
    balanceCollectedAt: date(r.balance_collected_at),
    needsReview: r.needs_review === true,
    archivedAt: date(r.archived_at),
    adminNote: text(r.admin_note),
  }
}

export async function listOrders(limit = 500): Promise<AdminOrder[]> {
  const sql = client()
  if (!sql) return []
  try {
    const rows = await sql`
    select id, name, email, phone, address, city, pincode, qty, edition, plan, shell,
           coupon_code, discount_paise, variant, amount_paid_paise, balance_due_paise,
           created_at, paid_at, balance_paid_at, balance_collected_at, balance_asked_at,
           recovery_sent_at, payment_token, razorpay_order_id, razorpay_payment_id,
           balance_payment_id, needs_review, archived_at, admin_note
      from preorders
     order by created_at desc
     limit ${Math.max(1, Math.min(2000, limit))}`
    return rows.map((r) => toOrder(r as Record<string, unknown>))
  } catch (e) {
    // Most often a deployment where db/schema.sql has not been run yet. An
    // empty table that says so beats a 500 that does not.
    console.error('[admin-orders] could not read the order book', { error: String(e) })
    return []
  }
}

export function tally(orders: AdminOrder[]): Record<Group, number> {
  const counts: Record<Group, number> = { unpaid: 0, balance_due: 0, paid_in_full: 0 }
  for (const o of orders) counts[o.group] += 1
  return counts
}

/* --------------------------------- CSV ---------------------------------- */

/**
 * Quoted on every field, always.
 *
 * Indian addresses are full of commas and Indian names are full of quotes
 * that a spreadsheet will happily eat. Quoting conditionally is how a column
 * ends up shifted by one for exactly the rows somebody needs.
 */
const cell = (v: unknown): string => {
  const s = v === null || v === undefined ? '' : String(v)
  return `"${s.replace(/"/g, '""')}"`
}

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '')
const rupees = (paise: number) => (paise / 100).toFixed(2)

export const CSV_COLUMNS = [
  'id', 'group', 'name', 'email', 'phone', 'city', 'pincode', 'qty', 'edition',
  'plan', 'shell', 'coupon', 'paid_inr', 'due_inr', 'booked', 'paid_on', 'balance_paid_on',
] as const

export function ordersCsv(orders: AdminOrder[]): string {
  const lines = [CSV_COLUMNS.join(',')]
  for (const o of orders) {
    lines.push([
      o.id, o.group, o.name, o.email, o.phone ?? '', o.city ?? '', o.pincode ?? '',
      o.qty, o.edition, o.plan, o.shell ?? '', o.couponCode ?? '',
      rupees(o.paidPaise), rupees(o.duePaise),
      day(o.createdAt), day(o.paidAt), day(o.balancePaidAt),
    ].map(cell).join(','))
  }
  // A trailing newline, so `wc -l` and every spreadsheet agree on the count.
  return `${lines.join('\n')}\n`
}

/* ------------------------------- WhatsApp -------------------------------- */

/**
 * A number in the form wa.me accepts: digits, with a country code, no plus.
 *
 * Returns null rather than guessing when there is nothing usable, because a
 * WhatsApp button that opens a chat with the wrong person is worse than no
 * button. Ten digits with no country code are assumed Indian, which is true
 * of every number this form has ever taken.
 */
export function whatsappNumber(phone: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  if (digits.length >= 11 && digits.length <= 15) return digits
  return null
}

export function whatsappLink(order: AdminOrder, siteUrl: string): string | null {
  const number = whatsappNumber(order.phone)
  if (!number) return null
  const first = order.name.trim().split(/\s+/)[0] ?? 'there'
  const money = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`

  const text = order.group === 'unpaid'
    ? `Hi ${first}, this is PebbleRobo. Your booking is still open — ${money(order.duePaise)} confirms it: ${siteUrl}/checkout?t=${order.token}`
    : order.group === 'balance_due'
      ? `Hi ${first}, this is PebbleRobo. Your robot is about to ship. ${money(order.duePaise)} is due on delivery — you can pay it now instead here: ${siteUrl}/pay-balance?t=${order.token}`
      : `Hi ${first}, this is PebbleRobo. Your order is paid in full and on its way.`

  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

/* -------------------------------- actions ------------------------------- */

/**
 * What the dashboard is allowed to do to an order.
 *
 * A fixed vocabulary rather than a general update, because three of these
 * settle money that never passed through the gateway and one destroys a row.
 * Each writes a note saying a person did it, so a payment with no Razorpay id
 * has an explanation attached instead of looking like a bug six months later.
 */
export const ACTIONS = [
  'archive', 'unarchive', 'delete',
  'mark_deposit_paid', 'mark_balance_collected', 'clear_review',
] as const
export type Action = (typeof ACTIONS)[number]

export const isAction = (v: unknown): v is Action =>
  typeof v === 'string' && (ACTIONS as readonly string[]).includes(v)

export type ActionResult =
  | { ok: true; note?: string }
  | { ok: false; error: string }

const stamp = (what: string) => `${what} by hand on ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`

export async function applyAction(id: number, action: Action, quote: {
  /** What this booking should have paid now, recomputed by the caller. */
  nowPaise: number
  balancePaise: number
}): Promise<ActionResult> {
  const sql = client()
  if (!sql) return { ok: false, error: 'No database.' }
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: 'Unknown order.' }

  try {
    if (action === 'archive') {
      await sql`update preorders set archived_at = now() where id = ${id}`
      return { ok: true, note: 'Archived.' }
    }

    if (action === 'unarchive') {
      await sql`update preorders set archived_at = null where id = ${id}`
      return { ok: true, note: 'Back in the list.' }
    }

    if (action === 'delete') {
      // Deliberately a hard delete, and deliberately the only one. Archiving
      // is what "I do not want to see this" means; this is for a row that
      // should never have existed — a test, or somebody who asked to be
      // erased — and the caller asks twice before getting here.
      const gone = await sql`delete from preorders where id = ${id} returning id`
      return gone.length
        ? { ok: true, note: 'Deleted. That one is gone for good.' }
        : { ok: false, error: 'That order no longer exists.' }
    }

    if (action === 'mark_deposit_paid') {
      // Money that arrived some other way — a transfer, a UPI to a phone.
      // razorpay_payment_id stays null on purpose: there is no gateway
      // payment to reconcile this against, and inventing an id would put a
      // string in the record that matches nothing in Razorpay.
      const done = await sql`
        update preorders
           set paid_at           = now(),
               amount_paid_paise = ${quote.nowPaise},
               balance_due_paise = ${quote.balancePaise},
               admin_note        = ${stamp('Deposit marked paid')}
         where id = ${id} and paid_at is null
        returning id`
      return done.length
        ? { ok: true, note: 'Marked paid. No gateway payment is attached to it.' }
        : { ok: false, error: 'That order is already paid for.' }
    }

    if (action === 'mark_balance_collected') {
      // The courier handed over cash, or it arrived some other way. Zeroing
      // what is owed is the point: that column is what a courier is told to
      // collect, and asking twice is the worst thing this page can cause.
      const done = await sql`
        update preorders
           set balance_collected_at = now(),
               balance_due_paise    = 0,
               admin_note           = ${stamp('Balance marked collected')}
         where id = ${id} and paid_at is not null and balance_due_paise > 0
        returning id`
      return done.length
        ? { ok: true, note: 'Balance settled. Nothing is owed at the door.' }
        : { ok: false, error: 'That order has no balance outstanding.' }
    }

    if (action === 'clear_review') {
      await sql`update preorders set needs_review = false where id = ${id}`
      return { ok: true, note: 'Cleared.' }
    }

    return { ok: false, error: 'Unknown action.' }
  } catch (e) {
    console.error('[admin-orders] action failed', { id, action, error: String(e) })
    return { ok: false, error: 'That did not go through.' }
  }
}
