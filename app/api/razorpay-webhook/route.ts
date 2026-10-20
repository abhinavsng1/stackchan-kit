import { verifyWebhookSignature, fetchOrder } from '@/lib/razorpay'
import { markPaid, markBalancePaid, createSettledBooking } from '@/lib/preorders'
import { sendPaymentReceiptEmail, sendBalanceReceiptEmail } from '@/lib/email'
import { waitUntil } from '@vercel/functions'
import { sendXConversion } from '@/lib/x-conversions'
import { sendPaymentConfirmed, sendBuyerProfile } from '@/lib/mixpanel-server'
import { resolveMagicCustomer, readMagicPayment, type MagicOrder } from '@/lib/magic'
import { recallMagicBuyer } from '@/lib/magic-buyers'

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

type Entity = {
  id?: string; order_id?: string; amount?: number; status?: string
  /** 'cod' on a cash-on-delivery payment through Magic Checkout. */
  method?: string
  notes?: Record<string, string>
  /** Razorpay documents both on the payment entity. The one-tap path needs
      them when the order itself comes back without a customer. */
  email?: string
  contact?: string
}

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

  /**
   * Which of the two payments this is.
   *
   * A booking deposit and a balance payment are both captures against the
   * same buyer, and for a ₹4,500 balance on a ₹4,500 cash balance they can
   * even be the same amount. The note is set when the order is created and is
   * the only thing that tells them apart, so it is read before anything else.
   */
  if (payment.notes?.payment_type === 'balance') {
    const balance = await markBalancePaid({
      orderId: payment.order_id,
      paymentId: payment.id,
      paidPaise: payment.amount,
    })

    if (balance.status === 'paid') {
      afterResponse(sendBalanceReceiptEmail({
        name: balance.name, email: balance.email, qty: balance.qty,
        edition: balance.edition, amountPaise: balance.amountPaise,
        phone: balance.phone, address: balance.address,
        city: balance.city, pincode: balance.pincode,
        paymentId: payment.id,
      }))
    }

    if (balance.status === 'unknown_order') {
      console.error('[razorpay] balance payment for an order we never issued', {
        order_id: payment.order_id,
      })
    }

    return Response.json({ status: balance.status }, { status: 200 })
  }

  /**
   * One-tap checkout, where there is no booking row to settle because Magic
   * Checkout collected the buyer itself. The row is written here, from what
   * Razorpay hands back — which means this is the only webhook branch that
   * can create an order rather than complete one, and the only one where a
   * duplicate would owe somebody a second robot. createSettledBooking is
   * idempotent on the order id for exactly that reason.
   */
  if (payment.notes?.payment_type === 'magic') {
    const order = (await fetchOrder(payment.order_id)) as MagicOrder | null
    if (!order) {
      console.error('[razorpay] magic order could not be read back', { order_id: payment.order_id })
      // Not acknowledged: Razorpay retries, and a retry is far better than a
      // paid buyer with no booking.
      return Response.json({ status: 'retry' }, { status: 500 })
    }

    // What the shipping-info callback saw while they were still typing. Read
    // before the order is given up on, because it is the record that exists
    // when the order's own customer_details does not.
    const remembered = await recallMagicBuyer(payment.order_id)
    const customer = resolveMagicCustomer(order, payment, remembered)
    const outcome = readMagicPayment(order, payment)

    if (!customer) {
      // All three sources empty. Logged without the payload, because what is
      // missing is the point and what is present is a buyer's contact detail.
      console.error('[razorpay] magic order carried no buyer', {
        order_id: payment.order_id,
        had_customer_details: Boolean(order.customer_details?.email),
        had_remembered: Boolean(remembered?.email),
        had_payment_email: Boolean(payment.email),
      })
      return Response.json({ status: 'retry' }, { status: 500 })
    }

    if (outcome.unrecognised) {
      // Recorded, flagged, and never guessed at: inventing a balance here is
      // inventing what a courier asks a real person for at a door.
      console.error('[razorpay] magic payment shape not recognised', {
        order_id: payment.order_id, amount: order.amount,
        amount_paid: order.amount_paid, amount_due: order.amount_due,
        method: payment.method,
      })
    }

    const written = await createSettledBooking({
      ...customer,
      qty: Number(payment.notes.kits ?? order.notes?.kits ?? 1) || 1,
      edition: 'assembled',
      plan: outcome.plan,
      // Chosen before the window opened, carried on the order, and recorded
      // here — otherwise a one-tap sale arrives with no colour and somebody
      // has to ask the buyer what they picked.
      shell: payment.notes.shell ?? order.notes?.shell ?? null,
      orderId: payment.order_id,
      paymentId: payment.id,
      paidPaise: outcome.paidPaise,
      balanceDuePaise: outcome.balanceDuePaise,
      couponCode: payment.notes.coupon ?? null,
      discountPaise: Number(payment.notes.discount_paise ?? 0) || 0,
      needsReview: outcome.unrecognised,
    })

    if (written.status === 'paid') {
      const qty = Number(payment.notes.kits ?? 1) || 1
      afterResponse(sendPaymentReceiptEmail({
        name: customer.name, email: customer.email, qty,
        edition: 'assembled', amountPaise: outcome.paidPaise,
        balanceDuePaise: outcome.balanceDuePaise,
        phone: customer.phone, address: customer.address,
        city: customer.city, pincode: customer.pincode,
        paymentId: payment.id,
      }))

      // The sale, reported the way every other sale is. A one-tap buyer never
      // touches our form, so the browser cannot identify them and this is the
      // only place their profile can be written at all — without it the sale
      // lands in Mixpanel as an event belonging to nobody.
      afterResponse(sendPaymentConfirmed({
        orderId: payment.order_id, paymentId: payment.id, email: customer.email,
        edition: 'assembled', qty, amountPaise: outcome.paidPaise,
        balanceDuePaise: outcome.balanceDuePaise, source: 'webhook',
      }))
      afterResponse(sendBuyerProfile({
        email: customer.email, name: customer.name, phone: customer.phone,
        city: customer.city, pincode: customer.pincode, qty,
        edition: 'assembled', balanceDuePaise: outcome.balanceDuePaise,
      }))

      // Nothing at all for a buyer whose browser asked not to be tracked.
      if (payment.notes.ad_opt_out !== '1') {
        afterResponse(sendXConversion({
          event: 'purchase',
          conversionId: payment.id,
          identity: { email: customer.email, phone: customer.phone, twclid: null },
        }))
      }
    }

    return Response.json({ status: written.status }, { status: 200 })
  }

  const result = await markPaid({
    orderId: payment.order_id,
    paymentId: payment.id,
    paidPaise: payment.amount,
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
      edition: result.edition,
      amountPaise: result.amountPaise,
      balanceDuePaise: result.balanceDuePaise,
      phone: result.phone,
      address: result.address,
      city: result.city,
      pincode: result.pincode,
      paymentId: payment.id,
    }))
    // The sale, in Mixpanel, from where it is known to have happened. No
    // personal data; see lib/mixpanel-server.ts.
    afterResponse(sendPaymentConfirmed({
      orderId: payment.order_id, paymentId: payment.id, email: result.email,
      edition: result.edition, qty: result.qty, amountPaise: result.amountPaise,
      balanceDuePaise: result.balanceDuePaise, source: 'webhook',
    }))
    // The sale, reported to X. Whichever of this and the browser callback
    // settles the order sends it, exactly once. Razorpay made this request,
    // not the buyer, so no address or user agent goes with it. Nothing at all
    // for a buyer who ordered with Global Privacy Control on.
    if (!result.adOptOut) afterResponse(sendXConversion({
      event: 'purchase',
      conversionId: payment.id,
      identity: { email: result.email, phone: result.phone, twclid: result.twclid },
    }))
  }

  // Every outcome above is answered 200: a retry would reach the same verdict,
  // and redelivering an event we have already judged is just noise.
  return Response.json({ status: result.status }, { status: 200 })
}
