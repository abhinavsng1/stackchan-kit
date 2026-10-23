import { magicEnabled } from '@/lib/magic'
import { attachMagicBuyer, markMagicOrderAbandoned, normaliseOrderId } from '@/lib/magic-orders'

/**
 * Razorpay telling us somebody walked away from the checkout.
 *
 * Configured in the Dashboard under Magic Checkout → "Enable the Abandoned
 * webhook to track". It is the only route by which we learn who abandoned a
 * window: our own page can only report the dismissal, and by then the buyer
 * has typed their email into Razorpay's form, not ours. Of thirty-one
 * abandoned checkouts we had an email for five.
 *
 * The payload shape is not documented anywhere we could find, so this reads
 * it defensively rather than against a schema: any of the spellings Razorpay
 * uses elsewhere is accepted, anything unrecognised is ignored, and the key
 * names it actually sent are logged so the shape can be learned from one real
 * delivery. Values are not logged — the keys are the question, the buyer's
 * address is not ours to put in a log.
 *
 * Unauthenticated by design, like the shipping and promotions callbacks. What
 * keeps that safe is that it can only ever move an order off 'created' and
 * attach contact details to an order that already exists: no money, no
 * booking, and nothing at all for an order id that was never ours.
 */

export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 16 * 1024

/** Razorpay spells the same thing several ways across its callbacks. */
function pick(body: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = body[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

async function receive(request: Request) {
  if (!magicEnabled()) return Response.json({ error: 'not enabled' }, { status: 404 })

  let raw = ''
  try {
    raw = await request.text()
  } catch {
    return Response.json({ ok: true }, { status: 200 })
  }
  if (raw.length > MAX_BODY_BYTES) return Response.json({ error: 'too large' }, { status: 413 })

  let body: Record<string, unknown> = {}
  try {
    const parsed = raw ? JSON.parse(raw) : {}
    body = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    body = {}
  }

  // Razorpay nests the interesting part under different names depending on the
  // callback, so the top level and one level down are both searched.
  const nested = ['order', 'cart', 'customer', 'customer_details', 'data']
    .map((k) => body[k])
    .find((v) => v && typeof v === 'object') as Record<string, unknown> | undefined
  const flat = { ...(nested ?? {}), ...body }

  const orderId = pick(flat, ['razorpay_order_id', 'order_id', 'id'])
  const email = pick(flat, ['email', 'customer_email'])
  const contact = pick(flat, ['contact', 'phone', 'customer_contact'])

  /*
   * What Razorpay sent, by key only. One real delivery tells us the shape
   * this was written blind against; after that the guesswork above can be
   * replaced with the field names it actually uses.
   */
  console.log('[magic/abandoned]', JSON.stringify({
    method: request.method,
    bodyBytes: raw.length,
    topKeys: Object.keys(body),
    nestedKeys: nested ? Object.keys(nested) : [],
    matched: {
      order_id: Boolean(orderId),
      email: Boolean(email),
      contact: Boolean(contact),
    },
  }))

  if (orderId && normaliseOrderId(orderId)) {
    // The buyer first: an abandoned checkout we cannot write to is not a
    // recovery, it is a row in a table.
    await attachMagicBuyer({ orderId, email, contact })
    await markMagicOrderAbandoned(orderId)
  }

  // Always 200. A webhook we answer with an error is a webhook Razorpay
  // retries and eventually stops sending, and nothing here is worth that.
  return Response.json({ ok: true }, { status: 200 })
}

export const POST = receive
export const GET = receive
