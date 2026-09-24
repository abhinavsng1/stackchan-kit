/**
 * Opening Razorpay's checkout, in one place.
 *
 * Both the order form and the standalone payment page need this, and a payment
 * flow that exists twice is a payment flow with two sets of bugs.
 *
 * The browser's part is deliberately small: hand a token to the server, receive
 * an order, show the modal, hand the result back to be verified. It never sees
 * a price and never sends one.
 */

export type CheckoutOutcome =
  | { status: 'paid'; paymentId: string }
  /** The buyer closed the modal. Nothing was charged; this is not an error. */
  | { status: 'dismissed' }
  | { status: 'failed'; message: string }
  /**
   * The payment likely succeeded but we could not confirm it here. Never told
   * to the buyer as a failure — their money may well have moved.
   */
  | { status: 'unconfirmed'; message: string }

type CheckoutResponse = {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

type RazorpayInstance = {
  open: () => void
  on: (event: 'payment.failed', handler: (r: { error?: { description?: string } }) => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
  }
}

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

/** Fetched on demand rather than on page load: most visitors never pay. */
export function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('load failed')), { once: true })
    })
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('load failed'))
    document.head.appendChild(s)
  })
}

export async function openCheckout(opts: {
  token: string
  description: string
  entity: string
}): Promise<CheckoutOutcome> {
  await loadCheckout()

  const orderRes = await fetch('/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: opts.token }),
  })
  const order = await orderRes.json()
  if (!orderRes.ok) throw new Error(order?.error ?? 'Could not start the payment.')
  if (!order.key_id) throw new Error('Payments are not configured.')

  const Razorpay = window.Razorpay
  if (!Razorpay) throw new Error('Could not start the payment.')

  return new Promise<CheckoutOutcome>((resolve) => {
    // Razorpay calls exactly one of handler / ondismiss / payment.failed, but
    // settling the promise twice would be a silent bug if that ever changed.
    let settled = false
    const finish = (outcome: CheckoutOutcome) => {
      if (settled) return
      settled = true
      resolve(outcome)
    }

    const rzp = new Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: opts.entity,
      description: opts.description,
      theme: { color: '#2f6bff' },
      prefill: order.prefill,

      handler: async (response: CheckoutResponse) => {
        try {
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          })
          const verdict = await verifyRes.json()
          if (!verifyRes.ok || verdict.status !== 'verified') throw new Error('unverified')
          finish({ status: 'paid', paymentId: verdict.payment_id })
        } catch {
          finish({
            status: 'unconfirmed',
            message: 'Your payment went through but we could not confirm it here.',
          })
        }
      },

      modal: { ondismiss: () => finish({ status: 'dismissed' }) },
    })

    rzp.on('payment.failed', (r) => {
      finish({
        status: 'failed',
        message: r?.error?.description ?? 'The payment did not go through. Nothing was charged.',
      })
    })

    rzp.open()
  })
}
