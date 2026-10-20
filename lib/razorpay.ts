import crypto from 'node:crypto'
import { quote } from '@/lib/plans'

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

/**
 * Which Razorpay account a call speaks to.
 *
 * 'magic' exists so the one-tap window can be driven by test keys while the
 * form keeps taking real money through the live ones. Both halves of a pair
 * must be present or the scope is ignored entirely — half a key pair is how
 * you end up charging a live card against a test order.
 */
export type KeyScope = 'default' | 'magic'

export function magicKeysInUse(): boolean {
  return Boolean(process.env.MAGIC_RAZORPAY_KEY_ID && process.env.MAGIC_RAZORPAY_KEY_SECRET)
}

function credentials(scope: KeyScope = 'default') {
  const useMagic = scope === 'magic' && magicKeysInUse()
  const id = useMagic ? process.env.MAGIC_RAZORPAY_KEY_ID : process.env.RAZORPAY_KEY_ID
  const secret = useMagic ? process.env.MAGIC_RAZORPAY_KEY_SECRET : process.env.RAZORPAY_KEY_SECRET
  if (!id || !secret) return null
  return { id, secret, basic: Buffer.from(`${id}:${secret}`).toString('base64') }
}

function assertQty(qty: number): void {
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
    throw new RangeError(`Quantity must be a whole number between 1 and ${MAX_QTY}`)
  }
}

/**
 * The deposit plan's figures, kept as named helpers because that is how the
 * rest of the codebase and its tests talk about them. The arithmetic lives in
 * lib/plans.ts; these only name a column of it, so the two cannot disagree.
 */
export function orderAmountPaise(qty: number): number {
  return quote('deposit', qty).nowPaise
}

export function balanceDuePaise(qty: number, variant: string | null = null): number {
  return quote('deposit', qty, variant).balancePaise
}

/** Deposit plus balance must always reconstruct the price of the robots. */
export function totalPaise(qty: number): number {
  return quote('deposit', qty).listPaise
}

/**
 * Razorpay caps the receipt at 40 characters. Random rather than sequential so
 * the identifier leaks no order count.
 */
function receiptId(): string {
  return `pbl_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`
}

export type OrderRequest = {
  /** Already computed by lib/plans.ts. This function never prices anything. */
  amountPaise: number
  /**
   * Visible in the Razorpay dashboard, and read back by the webhook. Keep it
   * to strings: Razorpay stores notes as strings and a number round-trips as
   * one anyway, so a boolean or a number here reads as a bug later.
   */
  notes?: Record<string, string>
  /** Dashboard offer ids to attach, such as a No-Cost EMI offer. */
  offers?: string[]
  /** Magic Checkout needs both of these, or the order falls back to standard. */
  lineItems?: unknown[]
  lineItemsTotalPaise?: number
}

/**
 * Creates a Razorpay order for an amount this server decided.
 *
 * The client sends a token, and at most the name of a plan; it never sends a
 * price. Trusting a browser-supplied amount is how a robot gets bought for ₹1,
 * and it is the single most common way a checkout integration is exploited.
 */
export async function createOrder(input: OrderRequest, scope: KeyScope = 'default'): Promise<OrderResult> {
  const creds = credentials(scope)
  if (!creds) return { status: 'unconfigured' }

  const amountPaise = Math.round(input.amountPaise)
  if (!Number.isFinite(amountPaise) || amountPaise < 100) {
    return { status: 'upstream_error', detail: 'bad_amount' }
  }

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
        notes: input.notes ?? {},
        ...(input.offers?.length ? { offers: input.offers } : {}),
        ...(input.lineItems?.length
          ? { line_items: input.lineItems, line_items_total: input.lineItemsTotalPaise ?? amountPaise }
          : {}),
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
 * Reads an order back from Razorpay. Magic Checkout puts the buyer's address
 * on the order rather than in the callback, so this is the only way to see it.
 */
export async function fetchOrder(orderId: string, scope: KeyScope = 'default'): Promise<Record<string, unknown> | null> {
  const creds = credentials(scope)
  if (!creds) return null
  try {
    const res = await fetch(`${API}/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Basic ${creds.basic}` },
    })
    if (!res.ok) return null
    return (await res.json()) as Record<string, unknown>
  } catch {
    return null
  }
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
  /*
   * Either secret, because there may be two accounts sending here.
   * Razorpay signs a test-mode webhook with whatever secret is configured in
   * test mode, which is not the live one. Both are tried, both in constant
   * time, and a request that matches neither is rejected exactly as before —
   * accepting one more known secret is not the same as accepting anything.
   */
  const secrets = [process.env.RAZORPAY_WEBHOOK_SECRET, process.env.MAGIC_RAZORPAY_WEBHOOK_SECRET]
    .filter((v): v is string => Boolean(v))
  if (secrets.length === 0) return false

  const given = Buffer.from(signature, 'utf8')
  let matched = false
  for (const secret of secrets) {
    const expected = Buffer.from(
      crypto.createHmac('sha256', secret).update(rawBody).digest('hex'), 'utf8')
    // Not short-circuited: every candidate is compared, so the time taken
    // does not reveal which secret was the one that matched.
    if (expected.length === given.length && crypto.timingSafeEqual(expected, given)) matched = true
  }
  return matched
}
