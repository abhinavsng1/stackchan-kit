import { verifyWebhookSignature, orderAmountPaise } from '@/lib/razorpay'
import { markPaid } from '@/lib/preorders'
import { sendPaymentReceiptEmail } from '@/lib/email'
import { waitUntil } from '@vercel/functions'

/**
 * The authoritative record of a payment.
 *
 * Everything else is a convenience. The browser callback tells the visitor
 * what happened; this tells us. It arrives server to server, it is signed, and
 * Razorpay retries it until we answer 2xx — so a closed tab, a dropped
 * connection, or a visitor who simply never comes back cannot leave a paid
 * order looking unpaid.
 */

/** Large enough for any payment payload, small enough to refuse a flood. */
const MAX_BODY_BYTES = 64 * 1024

/**
 * Razorpay treats a slow reply as a failure and redelivers, so the receipt is
 * sent after the response goes out. The payment is already recorded by then;
 * a mail server having a bad minute cannot un-record it.
 */
function afterResponse(work: Promise<unknown>) {
  try {
    waitUntil(work)
  } catch {
    void work.catch(() => {})
  }
}

type Entity = { id?: string; order_id?: string; amount?: number; status?: string }

export async function POST(request: Request) {
  const signature = request.headers.get('x-razorpay-signature')
  if (!signature) return new Response('missing signature', { status: 400 })

  // Raw text, deliberately: the signature covers these exact bytes, so parsing
  // and re-serialising first would invalidate every one of them.
  let raw: string
  try {
    raw = await request.text()
  } catch {
    return new Response('unreadable', { status: 400 })
  }
  if (raw.length > MAX_BODY_BYTES) return new Response('too large', { status: 413 })

  if (!verifyWebhookSignature(raw, signature)) {
    // Unsigned or wrongly signed: this did not come from Razorpay. Answered
    // 400 rather than 200, so a misconfigured secret surfaces as failed
    // deliveries in the dashboard instead of silently dropping payments.
    return new Response('bad signature', { status: 400 })
  }

  let event: { event?: string; payload?: Record<string, { entity?: Entity }> }
  try {
    event = JSON.parse(raw)
  } catch {
    return new Response('bad json', { status: 400 })
  }

  // Only the events that mean money actually moved. Anything else is
  // acknowledged, so Razorpay stops retrying what we will never act on.
  if (event.event !== 'payment.captured' && event.event !== 'order.paid') {
    return Response.json({ status: 'ignored' }, { status: 200 })
  }

  const payment = event.payload?.payment?.entity
  if (!payment?.id || !payment.order_id || typeof payment.amount !== 'number') {
    return Response.json({ status: 'ignored', reason: 'incomplete' }, { status: 200 })
  }

  const result = await markPaid({
    orderId: payment.order_id,
    paymentId: payment.id,
    paidPaise: payment.amount,
    expectedPaiseFor: orderAmountPaise,
  })

  // An amount mismatch is the one worth shouting about. A correctly signed
  // payment for the wrong sum means something is wrong on our own pricing
  // path, and the reservation stays unpaid until a person looks at it.
  if (result.status === 'amount_mismatch') {
    console.error('[razorpay] amount mismatch — reservation left unpaid', {
      order_id: payment.order_id,
      expected_paise: result.expectedPaise,
      paid_paise: result.paidPaise,
    })
  }

  // 'paid' is returned by exactly one call per reservation, so a redelivered
  // webhook cannot send a second receipt.
  if (result.status === 'paid') {
    afterResponse(sendPaymentReceiptEmail({
      name: result.name,
      email: result.email,
      qty: result.qty,
      amountPaise: result.amountPaise,
      paymentId: payment.id,
    }))
  }

  // Every outcome above is answered 200: a retry would reach the same verdict,
  // and redelivering an event we have already judged is just noise.
  return Response.json({ status: result.status }, { status: 200 })
}
