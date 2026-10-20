import { z } from 'zod'
import { createOrder } from '@/lib/razorpay'
import { recordMagicOrder } from '@/lib/magic-orders'
import { magicEnabled, lineItemsFor, magicOrderAmount, magicBalanceDue } from '@/lib/magic'
import { validateCoupon } from '@/lib/coupons'
import { noCostEmiOfferId } from '@/lib/emi'
import { PLANS } from '@/lib/plans'
import { isOrderableShell } from '@/lib/shells'

/**
 * The order behind the one-tap path.
 *
 * No booking row exists yet: Magic Checkout collects the name, phone and
 * address itself, and the row is written when the payment settles. So this
 * route has nothing to look up and nothing to trust — the only input is a
 * quantity and, optionally, a code, and both are priced here.
 */

export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 512

const bodySchema = z.object({
  qty: z.coerce.number().int().min(1).max(5).default(1),
  coupon: z.string().trim().max(32).optional(),
  // Which of the two doors was tapped. Anything else is not a plan we sell,
  // and the price is re-derived from this on the server regardless of what
  // the button believed it was asking for.
  plan: z.enum(PLANS).default('full'),
  // Chosen outside Razorpay's window, because the window cannot ask. It is a
  // label on the order, never a price: every colour costs the same.
  shell: z.string().trim().max(32).optional(),
})

export async function POST(request: Request) {
  if (!magicEnabled()) return Response.json({ error: 'not enabled' }, { status: 404 })

  let raw: string
  try {
    raw = await request.text()
  } catch {
    return Response.json({ error: 'Could not read the request.' }, { status: 400 })
  }
  if (raw.length > MAX_BODY_BYTES) return Response.json({ error: 'too large' }, { status: 413 })

  let parsed: unknown
  try {
    parsed = JSON.parse(raw || '{}')
  } catch {
    return Response.json({ error: 'Expected JSON.' }, { status: 400 })
  }

  const result = bodySchema.safeParse(parsed)
  if (!result.success) return Response.json({ error: 'Check the request.' }, { status: 400 })

  const { qty, plan } = result.data
  const wantedShell = result.data.shell ?? ''
  const shell = isOrderableShell(wantedShell) ? wantedShell : null

  // No email yet — Magic Checkout has not asked for one — so a per-buyer
  // limit cannot be enforced here. apply-promotion sees the address and does
  // enforce it, which is the point at which the buyer is actually known.
  let discountPaise = 0
  let couponCode: string | null = null
  if (result.data.coupon) {
    const verdict = await validateCoupon({ code: result.data.coupon, plan, qty })
    if (verdict.valid) {
      discountPaise = verdict.discountPaise
      couponCode = verdict.code
    }
  }

  const amountPaise = magicOrderAmount(plan, qty, discountPaise)
  const balanceDuePaise = magicBalanceDue(plan, qty, discountPaise)
  const { lineItems, lineItemsTotalPaise } = lineItemsFor(plan, qty, 'assembled', discountPaise, shell)
  const offer = noCostEmiOfferId()

  // 'magic' so this window can run on test keys while the form keeps taking
  // real money on the live ones.
  const order = await createOrder({
    amountPaise,
    lineItems,
    lineItemsTotalPaise,
    ...(offer ? { offers: [offer] } : {}),
    notes: {
      kits: String(qty),
      edition: 'assembled',
      batch: '01',
      // Read by the webhook: a Magic order has no booking row to find, so it
      // has to be told to create one rather than look one up.
      payment_type: 'magic',
      // Read by the webhook in preference to any arithmetic. A deposit sold
      // here settles in full at ₹499, so what a courier is still owed cannot
      // be worked out from the payment afterwards — it has to be recorded at
      // the moment the price was decided.
      plan,
      balance_due_paise: String(balanceDuePaise),
      ...(shell ? { shell } : {}),
      // The buyer's browser said "do not track" on this very request. The
      // webhook never sees their browser, so the signal has to travel with
      // the order or it is lost between here and the sale.
      ...(request.headers.get('sec-gpc') === '1' ? { ad_opt_out: '1' } : {}),
      ...(couponCode ? { coupon: couponCode } : {}),
      ...(discountPaise ? { discount_paise: String(discountPaise) } : {}),
    },
  }, 'magic')

  if (order.status !== 'created') {
    console.error('[magic/order] could not create', { status: order.status })
    return Response.json({ error: 'Could not start the payment.' }, { status: 502 })
  }

  /*
   * Our own copy of the order, written before anybody pays for it.
   *
   * Everything decided here — the plan, the colour, what a courier is owed —
   * is now on our side of the wire, so the webhook does not have to hope
   * Razorpay echoes it back. Awaited, because the payment can settle within
   * seconds and a row written after the webhook has looked is a row that was
   * never there. It fails soft inside, so bookkeeping cannot cost the sale.
   */
  await recordMagicOrder({
    orderId: order.orderId,
    plan, qty, shell,
    couponCode,
    discountPaise,
    amountPaise,
    balanceDuePaise,
    email: null, contact: null, pincode: null,
  })

  return Response.json({
    key_id: order.keyId,
    order_id: order.orderId,
    amount: order.amountPaise,
    currency: order.currency,
    coupon: couponCode,
  }, { status: 201 })
}
