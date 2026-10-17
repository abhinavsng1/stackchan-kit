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
  }
}

export async function listOrders(limit = 500): Promise<AdminOrder[]> {
  const sql = client()
  if (!sql) return []
  try {
    const rows = await sql`
    select id, name, email, phone, city, pincode, qty, edition, plan, shell,
           coupon_code, discount_paise, variant, amount_paid_paise, balance_due_paise,
           created_at, paid_at, balance_paid_at, balance_asked_at, recovery_sent_at,
           payment_token
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
