import crypto from 'node:crypto'
import type { Edition } from '@/lib/kit'

/**
 * "Payment Confirmed (server)", sent to Mixpanel from the routes that settle
 * an order.
 *
 * The browser's "Payment Succeeded" is the funnel's last step, but a browser
 * can be closed, blocked or offline at exactly that moment, so the browser
 * count runs below what was really paid. This one comes from the
 * webhook and the verify route, after markPaid has written the row, so it is
 * the number to reconcile against.
 *
 * No personal data goes with it: no name, email, phone or address. The
 * distinct_id is the same one-way hash of the email the browser identifies the
 * buyer by (lib/analytics.ts, personId), so the event lands on that buyer's
 * existing timeline. That hash is already Mixpanel's id for them, and it cannot
 * be turned back into an address. Without an email it falls back to a hash of
 * the order id.
 *
 * Like the X module, this never throws. A sale that is safely in Postgres must
 * not fail because an analytics endpoint had a bad minute.
 */

const ENDPOINT = 'https://api.mixpanel.com/track?ip=0'
export const PAYMENT_CONFIRMED = 'Payment Confirmed (server)'

const sha256Hex = (v: string) => crypto.createHash('sha256').update(v, 'utf8').digest('hex')

/** The browser's identified id for a buyer: SHA-256 of the trimmed, lowercased email. */
export const buyerDistinctId = (email: string) => sha256Hex(email.trim().toLowerCase())

export type PaymentConfirmed = {
  /** 'deposit' or 'full'. */
  plan?: string
  orderId: string
  paymentId: string
  /** Only used to derive the distinct_id. Never sent. */
  email?: string | null
  edition: Edition
  qty: number
  amountPaise: number
  balanceDuePaise?: number
  /** Which route settled it. */
  source: 'webhook' | 'verify'
  at?: Date
}

export function buildPaymentConfirmed(token: string, input: PaymentConfirmed) {
  const orderHash = sha256Hex(`order:${input.orderId}`).slice(0, 24)
  const distinctId = input.email?.trim() ? buyerDistinctId(input.email) : `order:${orderHash}`
  return {
    event: PAYMENT_CONFIRMED,
    properties: {
      token,
      distinct_id: distinctId,
      time: (input.at ?? new Date()).getTime(),
      // Mixpanel drops a second event with the same $insert_id, so a webhook
      // and the verify route reporting one payment count once.
      $insert_id: sha256Hex(`payment:${input.paymentId}`).slice(0, 32),
      order_id_hash: orderHash,
      edition: input.edition,
      qty: input.qty,
      amount_paise: input.amountPaise,
      amount_inr: input.amountPaise / 100,
      ...(input.balanceDuePaise !== undefined ? { balance_due_inr: input.balanceDuePaise / 100 } : {}),
      source: input.source,
      ...(input.plan ? { plan: input.plan } : {}),
      // A one-tap buyer can complete a purchase without giving an email —
      // it is optional in Razorpay's window. The sale is still counted, under
      // a per-order id, and this says which kind of row it is.
      //
      // Named for the buyer rather than the field, because the test that
      // guards this payload rejects any property whose *name* contains
      // "email" — and that rule is worth more than the nicer word.
      buyer_identified: Boolean(input.email?.trim()),
      server: true,
    },
  }
}

export type MixpanelResult = { ok: true } | { ok: false; reason: 'no_token' | 'not_production' | 'refused' | 'unreachable' }

export async function sendPaymentConfirmed(input: PaymentConfirmed): Promise<MixpanelResult> {
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN
  if (!token) return { ok: false, reason: 'no_token' }
  // Previews share the project token; keep them out of the live numbers, the
  // same rule the browser follows (lib/analytics-environment.ts).
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return { ok: false, reason: 'not_production' }
  }
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/plain' },
      body: JSON.stringify([buildPaymentConfirmed(token, input)]),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      console.error('[mixpanel] server event refused', { status: res.status })
      return { ok: false, reason: 'refused' }
    }
    return { ok: true }
  } catch {
    console.error('[mixpanel] server event unreachable')
    return { ok: false, reason: 'unreachable' }
  }
}

/* --------------------------- the buyer's profile ------------------------- */

const ENGAGE = 'https://api.mixpanel.com/engage'

export type BuyerProfileInput = {
  email: string
  name?: string | null
  phone?: string | null
  city?: string | null
  pincode?: string | null
  qty?: number
  edition?: Edition
  /** What is still owed at the door, so an unpaid balance sits on the profile. */
  balanceDuePaise?: number
  at?: Date
}

/**
 * Writes a buyer's profile from the server.
 *
 * The browser does this for anybody who fills in the order form, because it
 * knows who they are. One-tap checkout does not: Razorpay collects the name,
 * phone and address inside its own window, and our page never sees them. So
 * for those buyers this is the only moment a profile can be written at all,
 * and without it a one-tap sale shows up in Mixpanel as an event belonging to
 * nobody.
 *
 * Same distinct_id as the browser uses — SHA-256 of the lowercased email — so
 * a buyer who browsed anonymously first, then bought in one tap, is one
 * person rather than two.
 */
export function buildBuyerProfile(token: string, input: BuyerProfileInput) {
  const now = (input.at ?? new Date()).toISOString()
  const set: Record<string, string | number> = {
    $email: input.email,
    'Last Order At': now,
    'Bought With': 'one-tap',
  }
  if (input.name) set.$name = input.name
  if (input.phone) set.$phone = input.phone
  if (input.city) set.$city = input.city
  if (input.pincode) set.Pincode = input.pincode
  if (input.qty) set['Kits Ordered'] = input.qty
  if (input.edition) set.Edition = input.edition
  if (input.balanceDuePaise !== undefined) set['Balance Due'] = input.balanceDuePaise / 100

  return {
    $token: token,
    $distinct_id: buyerDistinctId(input.email),
    // Mixpanel creates the profile on first write; this is also what makes
    // the person appear in the Users view at all.
    $set: set,
  }
}

export async function sendBuyerProfile(input: BuyerProfileInput): Promise<MixpanelResult> {
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN
  if (!token) return { ok: false, reason: 'no_token' }
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return { ok: false, reason: 'not_production' }
  }
  try {
    const res = await fetch(ENGAGE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/plain' },
      body: JSON.stringify([buildBuyerProfile(token, input)]),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      console.error('[mixpanel] profile refused', { status: res.status })
      return { ok: false, reason: 'refused' }
    }
    return { ok: true }
  } catch {
    console.error('[mixpanel] profile unreachable')
    return { ok: false, reason: 'unreachable' }
  }
}
