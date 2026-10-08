import crypto from 'node:crypto'
import { PRICE, EDITION, type Edition } from '@/lib/kit'
import { isVariant, pricing } from '@/lib/variants'

/**
 * Razorpay, server side only.
 *
 * Two API calls and one HMAC is the whole surface, so this talks to the REST
 * API directly rather than pulling in the SDK — fewer dependencies to trust in
 * the one module that holds the key secret.
 *
 * Nothing here may be imported from a client component. KEY_SECRET has no
 * NEXT_PUBLIC_ prefix, so Next strips it from browser bundles either way, but
 * the rule matters: this module reads it, so it stays on the server.
 */

const API = 'https://api.razorpay.com/v1'

/** Matches the reserve form, which allows one to five kits. */
export const MAX_QTY = 5

export type OrderResult =
  | { status: 'created'; orderId: string; amountPaise: number; currency: 'INR'; keyId: string }
  | { status: 'unconfigured' }
  | { status: 'upstream_error'; detail: string }

function credentials() {
  const id = process.env.RAZORPAY_KEY_ID
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!id || !secret) return null
  return { id, secret, basic: Buffer.from(`${id}:${secret}`).toString('base64') }
}

function assertQty(qty: number): void {
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
    throw new RangeError(`Quantity must be a whole number between 1 and ${MAX_QTY}`)
  }
}

/**
 * What the gateway is asked for, decided here and nowhere else.
 *
 * This is the booking deposit, not the price of the kit. The balance is
 * collected in cash on delivery and never passes through Razorpay, so an
 * order created for the full price would overcharge by ₹4,500 a kit.
 *
 * The client sends a quantity; it never sends a price. Trusting a
 * browser-supplied amount is how a kit gets bought for ₹1, and it is
 * the single most common way a checkout integration is exploited.
 */
export function orderAmountPaise(qty: number): number {
  assertQty(qty)
  return PRICE.depositPaise * qty
}

/**
 * What is still owed when the box arrives.
 *
 * Computed server-side for the same reason the deposit is: this figure ends
 * up on a packing slip and in a courier's hands, and it is the only number
 * standing between a buyer and being asked for the wrong amount at the door.
 */
export function balanceDuePaise(qty: number, variant: string | null = null): number {
  assertQty(qty)
  // The assembled robot's two price arms owe different amounts on delivery.
  // An unrecognised variant falls back to the kit's balance rather than
  // guessing, because a wrong figure here is what a courier asks for at a door.
  if (variant && isVariant(variant)) return pricing(variant).balancePaise * qty
  return PRICE.balancePaise * qty
}

/** Deposit plus balance must always reconstruct the price of the kits. */
export function totalPaise(qty: number): number {
  return orderAmountPaise(qty) + balanceDuePaise(qty)
}

/**
 * Razorpay caps the receipt at 40 characters. Random rather than sequential so
 * the identifier leaks no order count.
 */
function receiptId(): string {
  return `pbl_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`
}

export async function createOrder(qty: number, edition: Edition = 'kit'): Promise<OrderResult> {
  const creds = credentials()
  if (!creds) return { status: 'unconfigured' }

  const amountPaise = orderAmountPaise(qty)

  let res: Response
  try {
    res = await fetch(`${API}/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds.basic}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: receiptId(),
        /* Visible in the Razorpay dashboard, where somebody reconciling a
           payment needs to know this was a deposit, not a full order. */
        notes: {
          kits: String(qty), edition, sku: EDITION[edition].sku,
          batch: '01', payment_type: 'booking_deposit',
          balance_due_on_delivery_paise: String(balanceDuePaise(qty)),
        },
      }),
    })
  } catch {
    return { status: 'upstream_error', detail: 'Could not reach the payment provider.' }
  }

  if (!res.ok) {
    // Razorpay's body can echo request detail; it is never handed to the
    // caller, only classified, so nothing from upstream reaches the browser.
    return {
      status: 'upstream_error',
      detail: res.status === 401 ? 'unauthorized' : `http_${res.status}`,
    }
  }

  const order = (await res.json()) as { id?: string; amount?: number }
  if (!order.id) return { status: 'upstream_error', detail: 'malformed_order' }

  // The key id goes back with the order rather than being embedded in the
  // page. It is publishable — Razorpay's checkout script needs it in the
  // browser — but there is no reason to publish it to people who are not
  // paying, so it travels with a response that already required a valid token.
  return { status: 'created', orderId: order.id, amountPaise, currency: 'INR', keyId: creds.id }
}

/**
 * The signature Razorpay returns to the browser after a successful payment.
 *
 * HMAC-SHA256 of "<order_id>|<payment_id>" keyed with the secret. Compared
 * with a constant-time equality: a plain `===` returns as soon as two bytes
 * differ, which leaks how much of a forged signature was right.
 */
export function verifyPaymentSignature(input: {
  orderId: string
  paymentId: string
  signature: string
}): boolean {
  const creds = credentials()
  if (!creds) return false

  const expected = crypto
    .createHmac('sha256', creds.secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest('hex')

  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(input.signature, 'utf8')
  // timingSafeEqual throws on a length mismatch, so the lengths are checked
  // first — and a wrong length is a wrong signature regardless.
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/**
 * Verifies a webhook really came from Razorpay.
 *
 * Signed with the *webhook* secret, which is a different value from the API
 * key secret, and computed over the raw request body. The body must not be
 * parsed and re-serialised first: key order and whitespace would change and
 * every signature would fail.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) return false

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(signature, 'utf8')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
