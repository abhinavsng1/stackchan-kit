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

/**
 * Everything worth knowing about a failure, in a shape safe to send to
 * analytics: vocabulary and gateway diagnostics, never a name, card or amount.
 */
export type FailureDetail = {
  /** Where it broke, so a dashboard can separate "nobody can pay" from "this
   *  buyer's card was declined". */
  stage: 'script' | 'create_order' | 'gateway' | 'verify'
  /** Our fixed vocabulary, or Razorpay's error code. */
  code?: string
  description?: string
  /** Razorpay's own breakdown of where in their flow it went wrong. */
  source?: string
  step?: string
  reason?: string
  httpStatus?: number
}

export type CheckoutOutcome =
  | { status: 'paid'; paymentId: string }
  /** The buyer closed the modal. Nothing was charged; this is not an error. */
  | { status: 'dismissed' }
  | { status: 'failed'; message: string; detail: FailureDetail }
  /**
   * The payment likely succeeded but we could not confirm it here. Never told
   * to the buyer as a failure — their money may well have moved.
   */
  | { status: 'unconfirmed'; message: string; detail: FailureDetail }

type CheckoutResponse = {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

type RazorpayError = {
  code?: string; description?: string; source?: string; step?: string; reason?: string
}

type RazorpayInstance = {
  open: () => void
  on: (event: 'payment.failed', handler: (r: { error?: RazorpayError }) => void) => void
}

/**
 * Thrown when checkout cannot even be started. Carries the detail so the
 * caller can report it rather than losing it to a bare message string.
 */
export class CheckoutError extends Error {
  detail: FailureDetail
  constructor(message: string, detail: FailureDetail) {
    super(message)
    this.detail = detail
  }
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
  // A blocked or failed script is invisible otherwise: the button simply does
  // nothing, and ad blockers cause this often enough to be worth naming.

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
  try {
    await loadCheckout()
  } catch {
    throw new CheckoutError('Could not load the payment window. Check any ad blocker and try again.',
      { stage: 'script', code: 'script_blocked' })
  }

  let orderRes: Response
  try {
    orderRes = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: opts.token }),
    })
  } catch {
    throw new CheckoutError('No connection. Check your network and try again.',
      { stage: 'create_order', code: 'network' })
  }

  const order = await orderRes.json().catch(() => ({}))
  if (!orderRes.ok) {
    throw new CheckoutError(order?.error ?? 'Could not start the payment.',
      { stage: 'create_order', code: order?.code ?? 'http_error', httpStatus: orderRes.status })
  }
  if (!order.key_id) {
    throw new CheckoutError('Payments are not configured.',
      { stage: 'create_order', code: 'no_key' })
  }

  const Razorpay = window.Razorpay
  if (!Razorpay) {
    throw new CheckoutError('Could not start the payment.',
      { stage: 'script', code: 'no_global' })
  }

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
        let verifyStatus: number | undefined
        let verifyCode: string | undefined
        try {
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          })
          verifyStatus = verifyRes.status
          const verdict = await verifyRes.json().catch(() => ({}))
          verifyCode = verdict?.code
          if (!verifyRes.ok || verdict.status !== 'verified') throw new Error('unverified')
          finish({ status: 'paid', paymentId: verdict.payment_id })
        } catch {
          finish({
            status: 'unconfirmed',
            message: 'Your payment went through but we could not confirm it here.',
            detail: { stage: 'verify', code: verifyCode ?? 'verify_failed', httpStatus: verifyStatus },
          })
        }
      },

      modal: { ondismiss: () => finish({ status: 'dismissed' }) },
    })

    rzp.on('payment.failed', (r) => {
      const e = r?.error ?? {}
      finish({
        status: 'failed',
        message: e.description ?? 'The payment did not go through. Nothing was charged.',
        detail: {
          stage: 'gateway',
          code: e.code, description: e.description,
          source: e.source, step: e.step, reason: e.reason,
        },
      })
    })

    rzp.open()
  })
}
