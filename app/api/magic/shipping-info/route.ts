import { magicEnabled, shippingFor, type MagicAddress } from '@/lib/magic'
import { attachMagicBuyer, findMagicOrder } from '@/lib/magic-orders'

/**
 * Magic Checkout asks whether we deliver to an address, and on what terms.
 *
 * Razorpay calls this from its own servers, so it is unauthenticated by
 * design — the docs require it. What keeps that safe is that it reveals
 * nothing: it takes a PIN code and answers whether we ship there, which is
 * written on the site anyway, and it reads no buyer, no order and no row.
 *
 * The documented method is GET-with-a-body, which not every runtime will
 * deliver intact, so both verbs are accepted and both read the body.
 */

export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 8 * 1024

async function answer(request: Request) {
  if (!magicEnabled()) return Response.json({ error: 'not enabled' }, { status: 404 })

  let raw = ''
  try {
    raw = await request.text()
  } catch {
    return Response.json({ addresses: [] }, { status: 200 })
  }
  if (raw.length > MAX_BODY_BYTES) return Response.json({ error: 'too large' }, { status: 413 })

  let body: { addresses?: MagicAddress[]; [k: string]: unknown } = {}
  try {
    body = raw ? JSON.parse(raw) : {}
  } catch {
    body = {}
  }

  const addresses = Array.isArray(body.addresses) ? body.addresses : []
  const askedOrderId = typeof body.razorpay_order_id === 'string' ? body.razorpay_order_id : ''

  /*
   * Which plan this order is on, from our own record of it.
   *
   * It decides whether cash at the door may be offered at all. A ₹499 deposit
   * order holds a ₹499 cart, so COD on it would collect ₹499 at the door and
   * let the ₹4,500 that pays for the robot quietly disappear. Unknown is
   * treated as not-full, so a lookup that fails errs towards prepaid rather
   * than towards losing the balance.
   */
  const ours = askedOrderId ? await findMagicOrder(askedOrderId) : null
  const plan = ours?.plan === 'full' ? 'full' : ours?.plan === 'deposit' ? 'deposit' : null

  const answer = { addresses: addresses.map((a) => shippingFor(a, plan)) }

  /*
   * The earliest we ever learn who is buying.
   *
   * Razorpay sends the email and contact here, before the payment, and this
   * is the only point in the one-tap flow where we see them on our own
   * servers. An order once came back from the Orders API with no customer at
   * all and the webhook had nothing to write a booking against, so the
   * sighting is kept against the order id rather than used and discarded.
   *
   * Awaited, not fired and forgotten: the payment can land within seconds of
   * the last address check, and a note written after the webhook has already
   * looked is a note that was never there.
   */
  if (askedOrderId) {
    await attachMagicBuyer({
      orderId: askedOrderId,
      email: typeof body.email === 'string' ? body.email : null,
      contact: typeof body.contact === 'string' ? body.contact : null,
      pincode: addresses[0]?.zipcode ?? null,
    })
  }

  /**
   * What Razorpay asked and what we said, while this is still being proved
   * out. Payment methods greying out in the window is the symptom of an
   * address Razorpay considers unserviceable, and without this there is no
   * way to tell a wrong answer from a question we never understood.
   *
   * The buyer's contact and email are deliberately not logged: the PIN code
   * is what decides serviceability, and it is the only part of this request
   * worth keeping.
   */
  console.log('[magic/shipping-info]', JSON.stringify({
    method: request.method,
    contentType: request.headers.get('content-type'),
    bodyBytes: raw.length,
    keys: Object.keys(body ?? {}),
    plan: plan ?? '(unknown)',
    asked: addresses.map((a) => ({ id: a.id, zipcode: a.zipcode, state: a.state_code, country: a.country })),
    answered: answer.addresses.map((a) => ({ id: a.id, methods: a.shipping_methods })),
  }))

  return Response.json(answer, { status: 200 })
}

export const POST = answer
export const GET = answer
