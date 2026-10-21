import { EDITION, PRICE, type Edition } from '@/lib/kit'
import { shellById, isOrderableShell } from '@/lib/shells'
import { DEFAULT_PLAN, quote, type Plan } from '@/lib/plans'

/**
 * Razorpay Magic Checkout: one tap, with the address collected by Razorpay.
 *
 * Everything here is behind MAGIC_CHECKOUT=1 and does nothing with the flag
 * off. It is written ahead of Razorpay enabling the feature on the account
 * (support ticket #21434798), so the one rule it follows throughout is: read
 * what the order says, never assume what it will say. Partial COD in
 * particular is configured on Razorpay's side, and the shape it arrives in is
 * not documented for custom web integrations — so unknown shapes are logged
 * and flagged rather than guessed at.
 *
 * https://razorpay.com/docs/payments/magic-checkout/web
 */

export function magicEnabled(): boolean {
  return process.env.MAGIC_CHECKOUT === '1'
}

/** Razorpay will not take an order, or a line item, below one rupee. */
const MIN_LINE_TOTAL_PAISE = 100

/** The robot they actually chose, in the cart Razorpay shows them. */
const shotFor = (shell: string | null) =>
  `https://pebblerobo.com/media/shots/float-shell-${
    shell && isOrderableShell(shell) ? shell : 'graphite'
  }.webp`

/** Rupees for a line the buyer reads inside Razorpay's window. */
const rupeesPlain = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`

/**
 * Whether to offer Razorpay's own cash-on-delivery inside the one-tap window.
 *
 * Off, and not as a workaround.
 *
 * Razorpay's COD is not this product's cash on delivery. Ours is
 * balance_due_paise: the deposit settles through the gateway and a courier
 * collects the rest against that figure, which Razorpay never sees. Theirs
 * means Razorpay marks the whole order unpaid and the entire price is
 * collected at the door.
 *
 * One-tap sells the robot outright at the full price, so there is nothing
 * left to collect; the deposit plan keeps its cash balance and does not go
 * through this window at all. Neither plan wants the method, and offering
 * one the account cannot take is what broke the window: Razorpay rejected
 * the shipping method, the address would not save, and every other payment
 * option greyed out with it.
 *
 * MAGIC_COD=1 turns it on, for the day one_cc_partial_payments_cod is
 * enabled on the account and a ₹499 advance can run through here too.
 */
export function magicCodEnabled(): boolean {
  return process.env.MAGIC_COD === '1'
}

/**
 * The cart, as Magic Checkout wants it.
 *
 * Both `line_items` and `line_items_total` are required: an order without the
 * total is silently treated as a standard order, which is the kind of failure
 * that looks like the feature simply not working.
 */
export function lineItemsFor(
  plan: Plan,
  qty: number,
  edition: Edition = 'assembled',
  discountPaise = 0,
  shell: string | null = null,
) {
  const e = EDITION[edition]
  const q = quote(plan, qty, null, discountPaise)
  /*
   * The colour by the name the buyer knows it by.
   *
   * `shell` is an internal id — 'graphite', 'bone' — and the names on the
   * page are Black and White. Razorpay's cart is the last thing somebody
   * reads before paying and the one place a wrong colour can still be
   * caught, so it has to say the same word the swatch did.
   */
  const colour = shell && isOrderableShell(shell) ? ` · ${shellById(shell).name}` : ''

  if (plan === 'deposit') {
    // The cart has to total exactly what the window charges, or Razorpay
    // reads the shortfall as cash on delivery — a method this account cannot
    // take, and the thing that greyed out every payment option the first
    // time. So the deposit is sold as the deposit: ₹499 asked, ₹499 declared,
    // nothing outstanding as far as Razorpay is concerned. The balance is our
    // arrangement with the buyer and is collected at the door, exactly as it
    // is for a booking made through the form.
    const each = Math.round(q.nowPaise / qty)
    return {
      lineItems: [{
        sku: `${e.sku}-deposit`,
        variant_id: `${e.sku}-${edition}-deposit`,
        price: each,
        offer_price: each,
        tax_amount: 0,
        quantity: qty,
        name: `${e.name} — booking${colour}`,
        description: `Books ${qty === 1 ? 'one robot' : `${qty} robots`}. ${rupeesPlain(q.balancePaise)} is collected in cash on delivery.`,
        image_url: shotFor(shell),
      }],
      lineItemsTotalPaise: Math.max(MIN_LINE_TOTAL_PAISE, q.nowPaise),
    }
  }

  const unit = PRICE.depositPaise + PRICE.balancePaise
  // The discount is applied to the first unit's offer price rather than spread
  // across them, because the totals have to add up exactly and paise do not
  // divide evenly.
  const total = q.nowPaise
  return {
    lineItems: [{
      sku: e.sku,
      variant_id: `${e.sku}-${edition}`,
      price: unit,
      offer_price: Math.max(MIN_LINE_TOTAL_PAISE, Math.round(total / qty)),
      tax_amount: 0,
      quantity: qty,
      name: `${e.name}${colour}`,
      description: 'Assembled, flashed and tested. Ships from Bengaluru.',
      image_url: shotFor(shell),
    }],
    lineItemsTotalPaise: Math.max(MIN_LINE_TOTAL_PAISE, total),
  }
}

/* ------------------------------ shipping -------------------------------- */

export type MagicAddress = {
  id: string
  zipcode?: string
  state_code?: string
  country?: string
}

export type ShippingMethod = {
  id: string
  name: string
  description: string
  serviceable: boolean
  shipping_fee: number
  cod: boolean
  cod_fee: number
}

/** A PIN code is six digits and never starts with zero. */
export const servicedPincode = (zip: string | undefined): boolean =>
  typeof zip === 'string' && /^[1-9]\d{5}$/.test(zip.trim())

/**
 * What we will do for one address.
 *
 * Delivery is free everywhere we ship, so the only real question is whether
 * the PIN code exists. Cash on delivery is offered because that is this
 * product's whole arrangement — ₹499 books it and the rest is collected at
 * the door — and `cod_fee` stays zero because the buyer is not charged for
 * choosing it.
 */
export function shippingFor(
  address: MagicAddress,
  /**
   * Which plan this order is on, read from our own record of it.
   *
   * COD is only ever correct on the full price. On a ₹499 deposit order the
   * cart Razorpay holds is ₹499 — so "cash on delivery" would mean collecting
   * ₹499 at the door and nothing else, and the ₹4,500 that pays for the robot
   * would simply cease to exist. The money is gone before anybody notices,
   * which is the worst kind of bug this codebase can have.
   *
   * What we actually want for the deposit is partial COD: a ₹4,999 cart with
   * a ₹499 advance taken online. That is a separate Razorpay feature, being
   * enabled on the account, and until it is implemented a deposit order must
   * not offer cash at the door at all.
   */
  plan: Plan | null = null,
): { id: string; zipcode?: string; country?: string; shipping_methods: ShippingMethod[] } {
  const serviceable = servicedPincode(address.zipcode)
    && (address.country ?? 'IN').toUpperCase() === 'IN'
  const codAllowed = plan === 'full' && magicCodEnabled()

  return {
    id: address.id,
    zipcode: address.zipcode,
    country: address.country ?? 'IN',
    shipping_methods: [{
      // Razorpay's own example numbers these. A non-numeric id is not
      // documented as a problem, but matching the documented shape costs
      // nothing and removes one thing to wonder about.
      id: '1',
      name: 'Standard delivery',
      description: 'Free delivery across India',
      serviceable,
      shipping_fee: 0,
      cod: serviceable && codAllowed,
      // Zero whenever cod is false, which Razorpay requires, and zero when it
      // is true because we do not charge for paying at the door.
      cod_fee: 0,
    }],
  }
}

/* ---------------------- reading back what was paid ----------------------- */

export type MagicPayment = {
  /** 'cod' for cash on delivery, anything else for a prepaid method. */
  method?: string
  amount?: number
  notes?: Record<string, string>
  /** Razorpay documents both on the payment entity in a webhook payload. */
  email?: string
  contact?: string
}

export type MagicOrder = {
  id?: string
  amount?: number
  amount_paid?: number
  amount_due?: number
  partial_payment?: boolean
  status?: string
  customer_details?: {
    name?: string
    email?: string
    contact?: string
    shipping_address?: Record<string, string>
    billing_address?: Record<string, string>
  }
  notes?: Record<string, string>
}

export type MagicOutcome = {
  plan: Plan
  /** What actually settled online. */
  paidPaise: number
  /** What a courier still collects. */
  balanceDuePaise: number
  /** True when nothing about the payment matched a shape we understand. */
  unrecognised: boolean
}

/**
 * Works out what a Magic Checkout payment means for the booking.
 *
 * The three shapes this can take, and how each is read:
 *
 *   - prepaid in full: the order is paid, nothing is due at the door;
 *   - cash on delivery: nothing settled online, the whole price at the door;
 *   - partial COD: part online, the remainder at the door. Razorpay
 *     configures this per account and the custom-web docs do not describe the
 *     field it arrives in, so it is derived from the arithmetic — what the
 *     order is for, less what was paid — rather than from a flag whose name
 *     we would be guessing.
 *
 * Anything that does not add up is returned with `unrecognised` set, so the
 * caller can record the order and flag it for a person instead of inventing a
 * balance for a courier to collect.
 */
export function readMagicPayment(order: MagicOrder, payment: MagicPayment): MagicOutcome {
  const orderTotal = Number(order.amount ?? 0)
  const paid = Number(order.amount_paid ?? payment.amount ?? 0)
  const isCod = (payment.method ?? '').toLowerCase() === 'cod'

  if (isCod && paid <= 0) {
    return { plan: DEFAULT_PLAN, paidPaise: 0, balanceDuePaise: orderTotal, unrecognised: orderTotal <= 0 }
  }

  const due = Number(order.amount_due ?? Math.max(0, orderTotal - paid))

  /*
   * What the order said it was, when it said it.
   *
   * A deposit sold through this window is fully paid as far as Razorpay is
   * concerned — ₹499 asked, ₹499 settled — so the arithmetic below would read
   * it as a sale in full and quietly drop the ₹4,500 a courier still has to
   * collect. The plan and the balance are therefore written into the order's
   * notes when it is created, and read back here in preference to anything
   * inferred. Arithmetic is the fallback, not the first answer.
   */
  const declared = order.notes?.plan
  const declaredBalance = Number(order.notes?.balance_due_paise ?? NaN)

  if (declared === 'deposit' && paid > 0) {
    const readable = Number.isFinite(declaredBalance) && declaredBalance >= 0
    // An order that says it is a deposit but cannot say what is owed must not
    // fall through to the arithmetic below, which would read it as a sale in
    // full and tell a courier to collect nothing. Record it, flag it, and let
    // a person decide what the door is owed.
    return {
      plan: 'deposit',
      paidPaise: paid,
      balanceDuePaise: readable ? declaredBalance : 0,
      unrecognised: !readable,
    }
  }

  if (declared === 'full' && paid > 0 && due <= 0) {
    return { plan: 'full', paidPaise: paid, balanceDuePaise: 0, unrecognised: false }
  }

  if (due <= 0 && paid > 0) {
    return { plan: 'full', paidPaise: paid, balanceDuePaise: 0, unrecognised: false }
  }

  if (paid > 0 && due > 0) {
    // Partial: an advance online, the rest at the door. Recorded as a deposit
    // booking, because that is exactly what it is.
    return { plan: 'deposit', paidPaise: paid, balanceDuePaise: due, unrecognised: false }
  }

  return { plan: DEFAULT_PLAN, paidPaise: paid, balanceDuePaise: due, unrecognised: true }
}

/** The buyer, as Magic Checkout hands them over. */
export type MagicCustomer = {
  name: string
  email: string
  phone: string | null
  address: string | null
  city: string | null
  pincode: string | null
}

/**
 * Razorpay writes void@razorpay.com when the buyer gave no email — it is a
 * sentinel, not an address, and a receipt sent there goes nowhere. Email is
 * optional in the Magic window unless the account is set to require it.
 */
const text = (v: string | undefined | null) => (v && v.trim() ? v.trim() : null)

export function realEmail(v: string | undefined | null): string | null {
  const e = (v ?? '').trim().toLowerCase()
  if (!e || !e.includes('@')) return null
  if (e.endsWith('@razorpay.com')) return null
  if (e.endsWith('.invalid')) return null
  return e
}

export function readMagicCustomer(order: MagicOrder): MagicCustomer | null {
  const c = order.customer_details
  if (!c?.email) return null
  const a = c.shipping_address ?? c.billing_address ?? {}
  const line = [a.line1, a.line2].map((v) => v?.trim()).filter(Boolean).join(', ')
  return {
    name: (c.name ?? a.name ?? 'PebbleRobo buyer').trim(),
    email: c.email.trim().toLowerCase(),
    phone: text(c.contact ?? a.contact),
    address: line || null,
    city: text(a.city),
    pincode: text(a.zipcode),
  }
}

/**
 * Who bought it, from whichever source actually knows.
 *
 * Three sightings of the same person, in order of how much they tell us:
 *
 *   1. the order's own `customer_details`, which carries the full shipping
 *      address and is what this was written against;
 *   2. what the shipping-info callback told us while they were still filling
 *      in the window, kept against the order id;
 *   3. the payment entity in the webhook payload, which Razorpay documents as
 *      carrying `email` and `contact`.
 *
 * The first has been seen to arrive empty on a captured payment — no buyer,
 * no booking, no confirmation, and a retry that failed identically every
 * time. The other two are poorer records, and both are better than losing a
 * paid customer. Anything missing stays null rather than invented: a booking
 * with no address is a thing a person can fix, and a wrong address is not.
 */
export function resolveMagicCustomer(
  order: MagicOrder,
  payment: MagicPayment,
  ours: { email: string | null; contact: string | null; pincode: string | null } | null = null,
  orderId = '',
): (MagicCustomer & { emailKnown: boolean }) | null {
  const c = order.customer_details
  const a = c?.shipping_address ?? c?.billing_address ?? {}
  const line = [a.line1, a.line2].map((v) => v?.trim()).filter(Boolean).join(', ')

  // Taken field by field, not source by source. Razorpay's order is the only
  // one carrying an address, and it can still be the one missing the email —
  // preferring it wholesale is how a real phone number was dropped in favour
  // of a blank one.
  const email = realEmail(c?.email) ?? realEmail(ours?.email) ?? realEmail(payment.email)
  const phone = text(c?.contact) ?? text(a.contact) ?? text(ours?.contact) ?? text(payment.contact)
  const name = text(c?.name) ?? text(a.name)
  const pincode = text(a.zipcode) ?? text(ours?.pincode)

  // Nothing to reach them by at all. Still refused, so the webhook retries
  // rather than writing a booking belonging to nobody.
  if (!email && !phone) return null

  return {
    name: name ?? 'PebbleRobo buyer',
    // Keyed on email, so a buyer who gave none still needs one that is theirs
    // alone: two emailless orders sharing a placeholder would collapse into a
    // single row and one of the two sales would disappear. `.invalid` is
    // reserved by the RFCs and can never be delivered to or registered.
    email: email ?? `no-email+${orderId || 'unknown'}@pebblerobo.invalid`,
    emailKnown: Boolean(email),
    phone,
    address: line || null,
    city: text(a.city),
    pincode,
  }
}

/** What a Magic order is worth, before Razorpay takes anything. */
export function magicOrderAmount(plan: Plan, qty: number, discountPaise = 0): number {
  return quote(plan, qty, null, discountPaise).nowPaise
}

/** What a courier is still owed after a one-tap booking settles. */
export function magicBalanceDue(plan: Plan, qty: number, discountPaise = 0): number {
  return quote(plan, qty, null, discountPaise).balancePaise
}
