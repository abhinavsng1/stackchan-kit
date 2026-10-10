/**
 * The pricing experiment on /pebble-chan.
 *
 * Two ways of paying for the same assembled robot. Each visitor sees exactly
 * one of them, because a page showing both is a menu, not a test — and the
 * question being asked is which framing people respond to, not which they pick
 * when offered the choice.
 *
 * A caveat that belongs with the code rather than only in a report: at this
 * site's order volume neither arm will reach statistical significance for
 * months. What this buys now is clean, attributable data from the first order
 * onward, so the question is answerable later instead of starting then.
 */
export const VARIANTS = ['lifetime', 'subscription'] as const
export type Variant = (typeof VARIANTS)[number]

/** Set by proxy.ts on first visit and read everywhere after. */
export const VARIANT_COOKIE = 'pbl_v'
export const VARIANT_COOKIE_DAYS = 180

export function isVariant(v: string): v is Variant {
  return (VARIANTS as readonly string[]).includes(v)
}

/**
 * Fifty-fifty. `rand` is injected so the split is testable rather than
 * asserted over a sample and hoped about.
 */
export function assignVariant(rand: number = Math.random()): Variant {
  return rand < 0.5 ? 'lifetime' : 'subscription'
}

export type VariantPricing = {
  /** Taken now, through Razorpay. Identical across arms by design. */
  deposit: string; depositPaise: number
  /** Collected in cash when it arrives. */
  balance: string; balancePaise: number
  /** What the device costs in total, deposit included. */
  total: string; totalPaise: number
  /** Recurring, after delivery. Zero on the lifetime arm. */
  monthly: string; monthlyPaise: number
}

export const PEBBLE: Record<Variant, VariantPricing> = {
  lifetime: {
    deposit: '₹499', depositPaise: 49_900,
    balance: '₹4,500', balancePaise: 450_000,
    total: '₹4,999', totalPaise: 499_900,
    monthly: '₹0', monthlyPaise: 0,
  },
  subscription: {
    deposit: '₹499', depositPaise: 49_900,
    balance: '₹3,500', balancePaise: 350_000,
    total: '₹3,999', totalPaise: 399_900,
    monthly: '₹899', monthlyPaise: 89_900,
  },
}

export function pricing(v: Variant): VariantPricing {
  return PEBBLE[v]
}

/**
 * What the buyer is told they keep if they stop paying.
 *
 * Written here rather than in the page because it is a promise about the
 * product, and a promise is the kind of thing that should be hard to change
 * by accident while editing layout.
 */
export const SUBSCRIPTION_TERMS = {
  includes: ['Voice in and out', 'An AI that answers', 'New expressions as they ship'],
  keeps: 'Faces, motion and touch keep working.',
  loses: 'It stops talking.',
} as const
