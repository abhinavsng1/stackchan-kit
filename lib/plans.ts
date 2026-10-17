import { PRICE } from '@/lib/kit'
import { isVariant, pricing } from '@/lib/variants'

/**
 * How a buyer pays, and what that leaves owing at the door.
 *
 * Two plans for the same robot at the same price:
 *
 *   deposit  ₹499 now, the rest in cash when it arrives
 *   full     the whole price now, nothing on delivery
 *
 * Both are priced here and nowhere else. The browser may name a plan; it may
 * never name an amount. Everything downstream — the Razorpay order, the
 * settlement check, the receipt, the courier's label — reads the figures this
 * function returns, so there is one place a price can be wrong rather than
 * five places that can disagree.
 *
 * A discount arrives as paise and is applied to one side only:
 *
 *   on `deposit`, it comes off the cash balance, never off the ₹499, because
 *   the deposit is what makes a booking real and a ₹0 booking is not one;
 *   on `full`, it comes off the online amount, which is the only amount there is.
 *
 * Nothing here touches the database or the network, so it is cheap to call and
 * trivial to test — which matters, because this is the module that decides how
 * much money changes hands.
 */

export const PLANS = ['deposit', 'full'] as const
export type Plan = (typeof PLANS)[number]

export const DEFAULT_PLAN: Plan = 'deposit'

export function isPlan(v: unknown): v is Plan {
  return typeof v === 'string' && (PLANS as readonly string[]).includes(v)
}

/** A stored plan, read defensively: anything unrecognised was a deposit booking. */
export const planOf = (v: unknown): Plan => (isPlan(v) ? v : DEFAULT_PLAN)

/** Matches the reserve form, which allows one to five robots. */
export const MAX_QTY = 5

/**
 * The smallest amount Razorpay will accept for an order. A discount can never
 * take the online amount below it: a 100% code would otherwise produce an
 * order the gateway refuses, which reads to the buyer as a broken checkout.
 */
export const MIN_ORDER_PAISE = 100

export type Quote = {
  plan: Plan
  qty: number
  /** Charged through Razorpay, now. */
  nowPaise: number
  /** Collected in cash on delivery. Zero on the full plan. */
  balancePaise: number
  /** What the robots cost in total before any discount. */
  listPaise: number
  /** How much of the requested discount was actually applied. */
  discountPaise: number
}

function assertQty(qty: number): void {
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
    throw new RangeError(`Quantity must be a whole number between 1 and ${MAX_QTY}`)
  }
}

/**
 * The price of one booking.
 *
 * @param variant Which price arm this buyer was shown, or null for the
 *                standard price. An unrecognised value falls back to the
 *                standard price rather than guessing, because a wrong figure
 *                here is what a courier asks for at a door.
 * @param discountPaise A validated discount. Capped at what it comes off, so a
 *                code worth more than the order cannot produce a negative sum.
 */
export function quote(
  plan: Plan,
  qty: number,
  variant: string | null = null,
  discountPaise = 0,
): Quote {
  assertQty(qty)

  const arm = variant && isVariant(variant) ? pricing(variant) : null
  const depositEach = arm ? arm.depositPaise : PRICE.depositPaise
  const balanceEach = arm ? arm.balancePaise : PRICE.balancePaise
  const listPaise = (depositEach + balanceEach) * qty

  const wanted = Math.max(0, Math.floor(discountPaise))

  if (plan === 'full') {
    const applied = Math.min(wanted, Math.max(0, listPaise - MIN_ORDER_PAISE))
    return { plan, qty, nowPaise: listPaise - applied, balancePaise: 0, listPaise, discountPaise: applied }
  }

  const balanceFull = balanceEach * qty
  const applied = Math.min(wanted, balanceFull)
  return {
    plan,
    qty,
    nowPaise: depositEach * qty,
    balancePaise: balanceFull - applied,
    listPaise,
    discountPaise: applied,
  }
}

/** Rupees, for copy and for email. Amounts are whole rupees throughout. */
export function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`
}

/* -------------------- paying the balance before dispatch ------------------ */

/**
 * What it costs to settle the balance online instead of in cash at the door.
 *
 * A courier collecting cash costs money, and a parcel refused at the door
 * costs much more, so there is room to pay a buyer a little for doing it
 * early. BALANCE_PREPAY_DISCOUNT_PAISE is that incentive: unset means no
 * discount, and the page simply offers the convenience instead.
 *
 * The incentive can never exceed the balance, and never takes the payment
 * below what the gateway will accept.
 */
export function prepayBalance(balanceDuePaise: number, incentivePaise?: number): {
  duePaise: number
  incentivePaise: number
  nowPaise: number
} {
  const due = Math.max(0, Math.floor(balanceDuePaise))
  const configured = incentivePaise ?? Number(process.env.BALANCE_PREPAY_DISCOUNT_PAISE ?? 0)
  const wanted = Number.isFinite(configured) ? Math.max(0, Math.floor(configured)) : 0
  const incentive = Math.min(wanted, Math.max(0, due - MIN_ORDER_PAISE))
  return { duePaise: due, incentivePaise: incentive, nowPaise: due - incentive }
}
