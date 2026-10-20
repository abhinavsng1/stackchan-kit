import { neon } from '@neondatabase/serverless'

/**
 * A one-tap order, written when it is created rather than when it is paid.
 *
 * The one-tap path used to record nothing until the webhook arrived, which
 * meant everything about the sale had to survive a round trip through
 * Razorpay and come back intact. Twice it did not: once the order came back
 * with no buyer on it at all, and a captured payment left no booking and no
 * confirmation.
 *
 * So the order is written here first, with everything we decided at the
 * moment we decided it — which plan, how many, which colour, what a courier
 * is owed. The buyer's email and contact are added when Razorpay asks us
 * about shipping, which is the first time we see them. The webhook then only
 * has to say "this order was paid", and every detail it needs is already on
 * our side of the wire.
 *
 * Rows for orders that were never paid are kept. An abandoned window is worth
 * knowing about, and a payment that arrives late still finds its order.
 */

function client() {
  const url = process.env.DATABASE_URL
  if (!url) return null
  return neon(url)
}

export type MagicOrderRow = {
  orderId: string
  plan: string
  qty: number
  shell: string | null
  couponCode: string | null
  discountPaise: number
  amountPaise: number
  balanceDuePaise: number
  email: string | null
  contact: string | null
  pincode: string | null
  status: string
}

/**
 * The shipping callback sends the order id without its `order_` prefix; the
 * webhook and the Orders API both use it with. One spelling is stored, or the
 * two halves of this never meet.
 */
export function normaliseOrderId(id: string): string {
  const trimmed = id.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('order_') ? trimmed : `order_${trimmed}`
}

/**
 * Record an order the moment Razorpay accepts it.
 *
 * Fails soft. The order exists at Razorpay whether or not we manage to write
 * this row, and refusing to open the payment window because our own
 * bookkeeping is down would turn a logging problem into a lost sale. The
 * webhook can still fall back to the order's notes.
 */
export async function recordMagicOrder(row: Omit<MagicOrderRow, 'status'>): Promise<void> {
  const orderId = normaliseOrderId(row.orderId)
  if (!orderId) return
  const sql = client()
  if (!sql) return
  try {
    await sql`
      insert into magic_orders (
        razorpay_order_id, plan, qty, shell, coupon_code, discount_paise,
        amount_paise, balance_due_paise, email, contact, pincode, status
      ) values (
        ${orderId}, ${row.plan}, ${row.qty}, ${row.shell}, ${row.couponCode},
        ${row.discountPaise}, ${row.amountPaise}, ${row.balanceDuePaise},
        ${row.email}, ${row.contact}, ${row.pincode}, 'created'
      )
      on conflict (razorpay_order_id) do nothing`
  } catch (error) {
    console.error('[magic-orders] could not record', { orderId, error: String(error) })
  }
}

/**
 * Add the buyer to an order we already have.
 *
 * Razorpay calls the shipping endpoint repeatedly as someone edits their
 * address, and the email is optional on that callback while the contact is
 * not — so a later call that has dropped the email must never erase an
 * earlier one that carried it.
 */
export async function attachMagicBuyer(input: {
  orderId: string
  email?: string | null
  contact?: string | null
  pincode?: string | null
}): Promise<void> {
  const orderId = normaliseOrderId(input.orderId)
  if (!orderId) return
  const sql = client()
  if (!sql) return

  const email = input.email?.trim().toLowerCase() || null
  const contact = input.contact?.trim() || null
  const pincode = input.pincode?.trim() || null
  if (!email && !contact) return

  try {
    await sql`
      update magic_orders set
        email   = coalesce(${email}, email),
        contact = coalesce(${contact}, contact),
        pincode = coalesce(${pincode}, pincode),
        seen_at = now()
      where razorpay_order_id = ${orderId}`
  } catch (error) {
    console.error('[magic-orders] could not attach buyer', { orderId, error: String(error) })
  }
}

/** Everything we knew about this order before the money landed. */
export async function findMagicOrder(orderId: string): Promise<MagicOrderRow | null> {
  const id = normaliseOrderId(orderId)
  if (!id) return null
  const sql = client()
  if (!sql) return null
  try {
    const rows = await sql`
      select razorpay_order_id, plan, qty, shell, coupon_code, discount_paise,
             amount_paise, balance_due_paise, email, contact, pincode, status
      from magic_orders where razorpay_order_id = ${id} limit 1`
    const r = rows[0]
    if (!r) return null
    return {
      orderId: String(r.razorpay_order_id),
      plan: String(r.plan),
      qty: Number(r.qty) || 1,
      shell: (r.shell as string | null) ?? null,
      couponCode: (r.coupon_code as string | null) ?? null,
      discountPaise: Number(r.discount_paise) || 0,
      amountPaise: Number(r.amount_paise) || 0,
      balanceDuePaise: Number(r.balance_due_paise) || 0,
      email: (r.email as string | null) ?? null,
      contact: (r.contact as string | null) ?? null,
      pincode: (r.pincode as string | null) ?? null,
      status: String(r.status),
    }
  } catch (error) {
    console.error('[magic-orders] could not read', { orderId: id, error: String(error) })
    return null
  }
}

/** Mark the order paid. Never undone, and never the thing that fails a sale. */
export async function markMagicOrderPaid(orderId: string, paymentId: string): Promise<void> {
  const id = normaliseOrderId(orderId)
  if (!id) return
  const sql = client()
  if (!sql) return
  try {
    await sql`
      update magic_orders
      set status = 'paid', razorpay_payment_id = ${paymentId}, paid_at = now()
      where razorpay_order_id = ${id} and status <> 'paid'`
  } catch (error) {
    console.error('[magic-orders] could not mark paid', { orderId: id, error: String(error) })
  }
}
