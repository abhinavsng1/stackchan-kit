import { z } from 'zod'
import { createOrder } from '@/lib/razorpay'
import { findByPaymentToken, attachOrder, setPlan } from '@/lib/preorders'
import { PLANS, quote, type Plan } from '@/lib/plans'
import { EDITION } from '@/lib/kit'

/** A token and at most the name of a plan. */
const MAX_BODY_BYTES = 256

/**
 * The request names a booking and, optionally, how the buyer wants to pay.
 *
 * It never names a quantity and never names a price. Both live on the booking
 * row, which the visitor cannot edit. A request that could choose its own
 * quantity could choose its own total.
 *
 * A plan is different: it is a choice, not a figure. Accepting it lets someone
 * who booked with a deposit decide at the payment screen to pay in full
 * instead, without creating a second booking — and whichever they pick, the
 * amount is still computed here from the row.
 */
const bodySchema = z.object({
  token: z.string().trim().regex(/^[a-f0-9]{32}$/, 'Invalid payment link'),
  plan: z.enum(PLANS).optional(),
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
    return json({ error: 'This payment link is not valid.', code: 'bad_token' }, 400)
  }

  const reservation = await findByPaymentToken(result.data.token)

  // A bad token and a missing reservation are answered identically, so the
  // endpoint cannot be used to find out which tokens exist.
  if (!reservation) {
    return json({ error: 'This payment link is not valid.', code: 'unknown_token' }, 404)
  }

  if (reservation.paidAt) {
    return json({ error: 'This reservation has already been paid for.', code: 'already_paid' }, 409)
  }

  // The plan the buyer just chose wins, and is written to the row before the
  // order is created: settlement re-prices from the row, so a plan left stale
  // here would reject the payment it just authorised as the wrong amount.
  let plan: Plan = reservation.plan
  if (result.data.plan && result.data.plan !== plan) {
    const moved = await setPlan(reservation.id, result.data.plan)
    if (moved) plan = result.data.plan
  }

  const q = quote(plan, reservation.qty, reservation.variant, reservation.discountPaise)

  const order = await createOrder({
    amountPaise: q.nowPaise,
    /* Visible in the Razorpay dashboard, where somebody reconciling a payment
       needs to know whether this was a deposit or the whole price. */
    notes: {
      kits: String(reservation.qty),
      edition: reservation.edition,
      sku: EDITION[reservation.edition].sku,
      batch: '01',
      plan,
      payment_type: plan === 'full' ? 'full_payment' : 'booking_deposit',
      balance_due_on_delivery_paise: String(q.balancePaise),
      ...(reservation.couponCode ? { coupon: reservation.couponCode } : {}),
      ...(q.discountPaise ? { discount_paise: String(q.discountPaise) } : {}),
    },
  })

  if (order.status === 'unconfigured') {
    console.error('[create-order] Razorpay keys are not set')
    return json({ error: 'Payments are not configured yet.', code: 'not_configured' }, 503)
  }

  if (order.status === 'upstream_error') {
    // `code` is a fixed vocabulary, never upstream text, so it is safe to hand
    // to the browser — and the browser is what reports it to analytics. An
    // expired or wrong key shows up as gateway_unauthorized, which is the
    // single most useful thing to see in a dashboard: it means nobody can pay.
    const unauthorized = order.detail === 'unauthorized'
    console.error('[create-order] payment gateway refused', { detail: order.detail })
    return json({
      error: 'Could not start the payment. Try again in a moment.',
      code: unauthorized ? 'gateway_unauthorized' : 'gateway_error',
    }, unauthorized ? 401 : 500)
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
    plan,
    balance_due_paise: q.balancePaise,
    discount_paise: q.discountPaise,
    prefill: {
      name: reservation.name,
      email: reservation.email,
      contact: reservation.phone ?? '',
    },
  }, 201)
}
