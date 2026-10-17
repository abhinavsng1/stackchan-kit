import { EDITION, PRICE, type Edition } from '@/lib/kit'
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

/**
 * Whether to offer cash on delivery inside the one-tap window.
 *
 * On by default, because that is this product's arrangement. It is a switch
 * rather than a constant because COD in Magic Checkout has to be enabled by
 * Razorpay on the account, and a shipping method that offers a payment
 * option the account cannot take is one Razorpay may reject outright —
 * taking every other payment method down with it. MAGIC_COD=0 is the way to
 * find out whether that is what is happening, without a deploy to change
 * code.
 */
export function magicCodEnabled(): boolean {
  return process.env.MAGIC_COD !== '0'
}

/**
 * The cart, as Magic Checkout wants it.
 *
 * Both `line_items` and `line_items_total` are required: an order without the
 * total is silently treated as a standard order, which is the kind of failure
 * that looks like the feature simply not working.
 */
export function lineItemsFor(qty: number, edition: Edition = 'assembled', discountPaise = 0) {
  const e = EDITION[edition]
  const unit = PRICE.depositPaise + PRICE.balancePaise
  // The discount is applied to the first unit's offer price rather than spread
  // across them, because the totals have to add up exactly and paise do not
  // divide evenly.
  const total = unit * qty - Math.max(0, discountPaise)
  return {
    lineItems: [{
      sku: e.sku,
      variant_id: `${e.sku}-${edition}`,
      price: unit,
      offer_price: Math.max(100, Math.round(total / qty)),
      tax_amount: 0,
      quantity: qty,
      name: e.name,
      description: 'Assembled, flashed and tested. Ships from Bengaluru.',
      image_url: 'https://pebblerobo.com/media/shots/float-shell-graphite.webp',
    }],
    lineItemsTotalPaise: Math.max(100, total),
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
export function shippingFor(address: MagicAddress): { id: string; zipcode?: string; country?: string; shipping_methods: ShippingMethod[] } {
  const serviceable = servicedPincode(address.zipcode)
    && (address.country ?? 'IN').toUpperCase() === 'IN'

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
      cod: serviceable && magicCodEnabled(),
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

export function readMagicCustomer(order: MagicOrder): MagicCustomer | null {
  const c = order.customer_details
  if (!c?.email) return null
  const a = c.shipping_address ?? c.billing_address ?? {}
  const line = [a.line1, a.line2].map((v) => v?.trim()).filter(Boolean).join(', ')
  const text = (v: string | undefined) => (v && v.trim() ? v.trim() : null)
  return {
    name: (c.name ?? a.name ?? 'PebbleRobo buyer').trim(),
    email: c.email.trim().toLowerCase(),
    phone: text(c.contact ?? a.contact),
    address: line || null,
    city: text(a.city),
    pincode: text(a.zipcode),
  }
}

/** What a Magic order is worth, before Razorpay takes anything. */
export function magicOrderAmount(qty: number, discountPaise = 0): number {
  return quote('full', qty, null, discountPaise).nowPaise
}
