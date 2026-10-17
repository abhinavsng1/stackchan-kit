import { z } from 'zod'
import { createOrder } from '@/lib/razorpay'
import { findBalanceByToken, attachBalanceOrder } from '@/lib/preorders'
import { prepayBalance } from '@/lib/plans'
import { EDITION } from '@/lib/kit'

/**
 * Starts a payment for what is still owed at the door.
 *
 * A separate route from create-order, deliberately. The two look alike and
 * guard opposite states: that one refuses a booking that has been paid for,
 * this one refuses a booking that has not. Folding them together would mean
 * one function whose safety check depends on a flag in its own request body.
 */

const MAX_BODY_BYTES = 256

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
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'That request was too large.' }, 413)

  let parsed: unknown
  try {
    parsed = JSON.parse(raw || '{}')
  } catch {
    return json({ error: 'Expected JSON.' }, 400)
  }

  const result = bodySchema.safeParse(parsed)
  if (!result.success) return json({ error: 'This link is not valid.', code: 'bad_token' }, 400)

  const booking = await findBalanceByToken(result.data.token)
  if (!booking) return json({ error: 'This link is not valid.', code: 'unknown_token' }, 404)

  // No deposit means no balance. Sending this buyer to the deposit page is
  // the useful answer, and it reveals nothing they do not already know.
  if (!booking.paidAt) {
    return json({ error: 'This booking has not been paid for yet.', code: 'not_booked' }, 409)
  }
  if (booking.balancePaidAt || booking.balanceDuePaise <= 0) {
    return json({ error: 'Nothing is left to pay on this booking.', code: 'already_paid' }, 409)
  }

  const { nowPaise, incentivePaise, duePaise } = prepayBalance(booking.balanceDuePaise)

  const order = await createOrder({
    amountPaise: nowPaise,
    notes: {
      kits: String(booking.qty),
      edition: booking.edition,
      sku: EDITION[booking.edition].sku,
      batch: '01',
      // The webhook branches on this. It is the only thing that tells a
      // settled payment for ₹4,500 apart from a deposit of the same size.
      payment_type: 'balance',
      balance_due_paise: String(duePaise),
      prepay_incentive_paise: String(incentivePaise),
    },
  })

  if (order.status === 'unconfigured') {
    console.error('[create-balance-order] Razorpay keys are not set')
    return json({ error: 'Payments are not configured yet.', code: 'not_configured' }, 503)
  }
  if (order.status === 'upstream_error') {
    const unauthorized = order.detail === 'unauthorized'
    console.error('[create-balance-order] payment gateway refused', { detail: order.detail })
    return json({
      error: 'Could not start the payment. Try again in a moment.',
      code: unauthorized ? 'gateway_unauthorized' : 'gateway_error',
    }, unauthorized ? 401 : 500)
  }

  await attachBalanceOrder(booking.id, order.orderId)

  return json({
    key_id: order.keyId,
    order_id: order.orderId,
    amount: order.amountPaise,
    currency: order.currency,
    due_paise: duePaise,
    incentive_paise: incentivePaise,
    prefill: { name: booking.name, email: booking.email },
  }, 201)
}
