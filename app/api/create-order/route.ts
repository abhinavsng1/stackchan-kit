import { z } from 'zod'
import { createOrder } from '@/lib/razorpay'
import { findByPaymentToken, attachOrder } from '@/lib/preorders'

/** One token and nothing else. */
const MAX_BODY_BYTES = 256

/**
 * The request names a reservation, never a quantity and never a price.
 *
 * Both of those live on the reservation row, which the visitor cannot edit.
 * A request that could choose its own quantity could choose its own total, so
 * the only thing accepted here is a token identifying which reservation is
 * being paid for.
 */
const bodySchema = z.object({
  token: z.string().trim().regex(/^[a-f0-9]{32}$/, 'Invalid payment link'),
})

function json(body: unknown, status: number) {
  return Response.json(body, { status })
}

export async function POST(request: Request) {
  let raw: string
  try {
    raw = await request.text()
  } catch {
    return json({ error: 'Could not read the request.' }, 400)
  }

  if (raw.length > MAX_BODY_BYTES) {
    return json({ error: 'That request was too large.' }, 413)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw || '{}')
  } catch {
    return json({ error: 'Expected JSON.' }, 400)
  }

  const result = bodySchema.safeParse(parsed)
  if (!result.success) {
    return json({ error: 'This payment link is not valid.' }, 400)
  }

  const reservation = await findByPaymentToken(result.data.token)

  // A bad token and a missing reservation are answered identically, so the
  // endpoint cannot be used to find out which tokens exist.
  if (!reservation) {
    return json({ error: 'This payment link is not valid.' }, 404)
  }

  if (reservation.paidAt) {
    return json({ error: 'This reservation has already been paid for.' }, 409)
  }

  const order = await createOrder(reservation.qty)

  if (order.status === 'unconfigured') {
    return json({ error: 'Payments are not configured yet.' }, 503)
  }

  if (order.status === 'upstream_error') {
    const status = order.detail === 'unauthorized' ? 401 : 500
    return json({ error: 'Could not start the payment. Try again in a moment.' }, status)
  }

  // Recorded before the visitor pays, so the webhook that follows can find the
  // reservation this order belongs to. An order id we never issued matches no
  // row and settles nothing.
  await attachOrder(reservation.id, order.orderId)

  return json({
    key_id: order.keyId,
    order_id: order.orderId,
    amount: order.amountPaise,
    currency: order.currency,
    prefill: {
      name: reservation.name,
      email: reservation.email,
      contact: reservation.phone ?? '',
    },
  }, 201)
}
