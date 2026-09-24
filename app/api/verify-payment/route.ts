import { z } from 'zod'
import { verifyPaymentSignature, orderAmountPaise } from '@/lib/razorpay'
import { markPaid } from '@/lib/preorders'
import { sendPaymentReceiptEmail } from '@/lib/email'
import { waitUntil } from '@vercel/functions'

const MAX_BODY_BYTES = 1024

/** Razorpay ids are short and alphanumeric; the signature is 64 hex chars. */
const bodySchema = z.object({
  razorpay_order_id: z.string().trim().min(1).max(64),
  razorpay_payment_id: z.string().trim().min(1).max(64),
  razorpay_signature: z.string().trim().regex(/^[a-f0-9]{64}$/i, 'Malformed signature'),
})

function json(body: unknown, status: number) {
  return Response.json(body, { status })
}

/**
 * Confirms that a payment Razorpay reported to the browser really happened and
 * really was for this order.
 *
 * Worth being precise about what this does and does not prove. The signature
 * is unforgeable without the key secret, so a valid one means Razorpay
 * genuinely charged that payment against that order. What it cannot do is
 * guarantee it will ever be called: the browser could close, the network could
 * drop, or an attacker could simply decline to send the callback. Fulfilment
 * must therefore be driven by the `payment.captured` webhook, with this
 * endpoint serving the fast path that lets the visitor see a confirmation.
 */
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
    return json({ status: 'invalid', error: 'Missing or malformed payment details.' }, 400)
  }

  const ok = verifyPaymentSignature({
    orderId: result.data.razorpay_order_id,
    paymentId: result.data.razorpay_payment_id,
    signature: result.data.razorpay_signature,
  })

  if (!ok) {
    // A failed check means tampering or a replay. Nothing is recorded as paid,
    // and the response says no more than it has to.
    return json({ status: 'invalid', error: 'Payment could not be verified.' }, 400)
  }

  // The signature holds, so settle the reservation now rather than making the
  // visitor wait on the webhook. markPaid re-checks the amount against the
  // reservation and is idempotent, so whichever of the two arrives second
  // changes nothing — and a caller who skips this endpoint entirely is still
  // settled by the webhook.
  //
  // Note what is *not* trusted here: the amount is never taken from this
  // request. It is read from the reservation the order was issued against.
  const settled = await markPaid({
    orderId: result.data.razorpay_order_id,
    paymentId: result.data.razorpay_payment_id,
    expectedPaiseFor: orderAmountPaise,
  })

  if (settled.status === 'unknown_order') {
    return json({ status: 'invalid', error: 'Payment could not be verified.' }, 400)
  }

  // Whichever of this and the webhook settles first sends the receipt; the
  // other gets 'already_paid' and sends nothing.
  if (settled.status === 'paid') {
    const receipt = sendPaymentReceiptEmail({
      name: settled.name,
      email: settled.email,
      qty: settled.qty,
      amountPaise: settled.amountPaise,
      phone: settled.phone,
      address: settled.address,
      city: settled.city,
      pincode: settled.pincode,
      paymentId: result.data.razorpay_payment_id,
    })
    try { waitUntil(receipt) } catch { void receipt.catch(() => {}) }
  }

  return json({ status: 'verified', payment_id: result.data.razorpay_payment_id }, 200)
}
