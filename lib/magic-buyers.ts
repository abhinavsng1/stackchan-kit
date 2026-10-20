import { neon } from '@neondatabase/serverless'

/**
 * Who is buying, learned before the money moves.
 *
 * A one-tap buyer never touches our form, so the only thing we know about
 * them is what Razorpay hands over. For one order that turned out to be
 * nothing at all: `GET /v1/orders/:id` came back without `customer_details`,
 * the webhook had no email to write a booking against, and a captured
 * payment left no row and no confirmation. Razorpay retried; every retry
 * read the same empty order and failed the same way.
 *
 * Razorpay does tell us who they are, earlier and by another route. The
 * shipping-info callback carries `email` and `contact` while the buyer is
 * still filling in the window — documented, and visible in our own logs for
 * the order that failed. So we write it down the moment we see it, keyed by
 * the order, and the webhook has somewhere to look when the order itself
 * says nothing.
 *
 * This is a lookup of last resort, not a booking. It holds only what the
 * callback gives us and it is read exactly once, by the webhook, to put a
 * name on money that has already arrived.
 */

function client() {
  const url = process.env.DATABASE_URL
  if (!url) return null
  return neon(url)
}

export type MagicBuyer = {
  email: string | null
  contact: string | null
  pincode: string | null
}

/**
 * The callback sends the order id without its `order_` prefix; the webhook
 * and the Orders API both use it with. One spelling is stored, or the two
 * halves of this never meet.
 */
export function normaliseOrderId(id: string): string {
  const trimmed = id.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('order_') ? trimmed : `order_${trimmed}`
}

/**
 * Remember a buyer against their order.
 *
 * Fails soft on purpose: this runs inside the endpoint Razorpay calls to ask
 * whether we deliver somewhere, and a database that is down must not turn
 * into an unserviceable address and a window full of greyed-out payment
 * methods. Losing the note costs us a fallback; failing the answer costs the
 * sale outright.
 */
export async function rememberMagicBuyer(input: {
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
      insert into magic_buyers (razorpay_order_id, email, contact, pincode)
      values (${orderId}, ${email}, ${contact}, ${pincode})
      on conflict (razorpay_order_id) do update set
        -- Razorpay calls this more than once as the buyer edits the address.
        -- A later call that has dropped the email must not erase an earlier
        -- one that had it: email is optional in the callback, contact is not.
        email   = coalesce(excluded.email, magic_buyers.email),
        contact = coalesce(excluded.contact, magic_buyers.contact),
        pincode = coalesce(excluded.pincode, magic_buyers.pincode),
        seen_at = now()`
  } catch (error) {
    console.error('[magic-buyers] could not remember', { orderId, error: String(error) })
  }
}

/** What we knew about this order before the payment landed, if anything. */
export async function recallMagicBuyer(orderId: string): Promise<MagicBuyer | null> {
  const id = normaliseOrderId(orderId)
  if (!id) return null
  const sql = client()
  if (!sql) return null
  try {
    const rows = await sql`
      select email, contact, pincode from magic_buyers
      where razorpay_order_id = ${id} limit 1`
    const row = rows[0]
    if (!row) return null
    return {
      email: (row.email as string | null) ?? null,
      contact: (row.contact as string | null) ?? null,
      pincode: (row.pincode as string | null) ?? null,
    }
  } catch (error) {
    console.error('[magic-buyers] could not recall', { orderId: id, error: String(error) })
    return null
  }
}
