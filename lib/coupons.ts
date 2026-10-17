import { neon } from '@neondatabase/serverless'
import { isPlan, quote, rupees, type Plan } from '@/lib/plans'

/**
 * Discount codes.
 *
 * The rule this module exists to enforce: a browser may say which code it
 * holds; it may never say what that code is worth. Every figure here is read
 * from Postgres and computed on the server, and the same function prices a
 * code at the form, at the payment screen and inside Magic Checkout's
 * promotions endpoint — so the three cannot quote different numbers.
 *
 * A redemption is counted when the payment settles, not when the code is
 * entered. Otherwise a run of people typing a code and abandoning would
 * exhaust it for the buyers who would actually have paid.
 */

function client() {
  const url = process.env.DATABASE_URL
  if (!url) return null
  return neon(url)
}

/** Codes are stored and compared uppercase, so pebble10 and PEBBLE10 are one code. */
export const normaliseCode = (code: string) => code.trim().toUpperCase()

/** Loose enough for anything a person would print, tight enough to index. */
export const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,31}$/

export type Coupon = {
  code: string
  kind: 'fixed' | 'percent'
  value: number
  maxDiscountPaise: number | null
  minQty: number
  /** Empty means every plan. */
  plans: Plan[]
  startsAt: Date | null
  endsAt: Date | null
  maxUses: number | null
  perEmailLimit: number | null
  redeemed: number
  active: boolean
  label: string | null
}

export type CouponVerdict =
  | { valid: true; code: string; discountPaise: number; label: string }
  | { valid: false; reason: CouponRefusal }

/**
 * Why a code was refused, in a fixed vocabulary.
 *
 * Deliberately coarse. "This code is not valid" covers a code that never
 * existed, one that was deactivated and one that has run out, because telling
 * a stranger which of those is true turns the endpoint into a way to enumerate
 * our codes. The reasons that describe the buyer's own order — the wrong plan,
 * too few robots — are specific, because those a buyer can act on.
 */
export type CouponRefusal =
  | 'unknown'
  | 'expired'
  | 'wrong_plan'
  | 'min_qty'
  | 'used_up'
  | 'already_used'
  | 'unconfigured'

export const refusalMessage = (reason: CouponRefusal, minQty = 1): string => ({
  unknown: 'That code is not valid.',
  expired: 'That code has expired.',
  wrong_plan: 'That code only applies when you pay the full amount now.',
  min_qty: `That code needs at least ${minQty} robots.`,
  used_up: 'That code is not valid.',
  already_used: 'You have already used that code.',
  unconfigured: 'Codes are not available right now.',
}[reason])

function rowToCoupon(r: Record<string, unknown>): Coupon {
  const plans = Array.isArray(r.plans) ? r.plans.map(String).filter(isPlan) : []
  return {
    code: String(r.code),
    kind: r.kind === 'percent' ? 'percent' : 'fixed',
    value: Number(r.value),
    maxDiscountPaise: r.max_discount_paise === null || r.max_discount_paise === undefined
      ? null : Number(r.max_discount_paise),
    minQty: Number(r.min_qty ?? 1),
    plans,
    startsAt: r.starts_at ? new Date(String(r.starts_at)) : null,
    endsAt: r.ends_at ? new Date(String(r.ends_at)) : null,
    maxUses: r.max_uses === null || r.max_uses === undefined ? null : Number(r.max_uses),
    perEmailLimit: r.per_email_limit === null || r.per_email_limit === undefined
      ? null : Number(r.per_email_limit),
    redeemed: Number(r.redeemed ?? 0),
    active: r.active === true,
    label: r.label === null || r.label === undefined ? null : String(r.label),
  }
}

export async function findCoupon(code: string): Promise<Coupon | null> {
  const sql = client()
  if (!sql) return null
  const rows = await sql`select * from coupons where code = ${normaliseCode(code)} limit 1`
  return rows[0] ? rowToCoupon(rows[0] as Record<string, unknown>) : null
}

/**
 * What a code is worth on an order, as a number of paise off the list price.
 *
 * Pure, so the arithmetic can be tested without a database — and so the same
 * figure can be recomputed at settlement from the stored code.
 */
export function discountFor(coupon: Coupon, listPaise: number): number {
  const raw = coupon.kind === 'fixed'
    ? coupon.value
    : Math.floor((listPaise * coupon.value) / 100)
  const capped = coupon.maxDiscountPaise === null ? raw : Math.min(raw, coupon.maxDiscountPaise)
  return Math.max(0, Math.min(capped, listPaise))
}

/** How a code reads on a payment screen: "PEBBLE10 — ₹500 off". */
export function couponLabel(coupon: Coupon, discountPaise: number): string {
  if (coupon.label) return coupon.label
  return `${coupon.code} — ${rupees(discountPaise)} off`
}

/**
 * Validates a code against one specific order, and prices it.
 *
 * Takes the order rather than just the code because almost every limit is
 * relative to it: the plan it is being used on, how many robots, which buyer.
 * A code checked in the abstract and applied to something else is how a
 * full-price-only discount ends up coming off a deposit.
 */
export async function validateCoupon(input: {
  code: string
  plan: Plan
  qty: number
  variant?: string | null
  /** Lower-cased by the caller or here; used only for the per-buyer limit. */
  email?: string | null
  now?: Date
}): Promise<CouponVerdict> {
  const sql = client()
  if (!sql) return { valid: false, reason: 'unconfigured' }

  const code = normaliseCode(input.code)
  if (!CODE_PATTERN.test(code)) return { valid: false, reason: 'unknown' }

  const coupon = await findCoupon(code)
  if (!coupon || !coupon.active) return { valid: false, reason: 'unknown' }

  const now = input.now ?? new Date()
  if (coupon.startsAt && now < coupon.startsAt) return { valid: false, reason: 'expired' }
  if (coupon.endsAt && now > coupon.endsAt) return { valid: false, reason: 'expired' }

  if (coupon.plans.length > 0 && !coupon.plans.includes(input.plan)) {
    return { valid: false, reason: 'wrong_plan' }
  }
  if (input.qty < coupon.minQty) return { valid: false, reason: 'min_qty' }
  if (coupon.maxUses !== null && coupon.redeemed >= coupon.maxUses) {
    return { valid: false, reason: 'used_up' }
  }

  if (coupon.perEmailLimit !== null && input.email) {
    // Settled orders only. A booking that was never paid for has not used
    // anybody's allowance.
    const used = await sql`
      select count(*)::int n from preorders
       where coupon_code = ${code}
         and email = ${input.email.trim().toLowerCase()}
         and paid_at is not null`
    if (Number(used[0]?.n ?? 0) >= coupon.perEmailLimit) {
      return { valid: false, reason: 'already_used' }
    }
  }

  // Priced against the list, then handed to quote(), which decides which side
  // of the order it comes off and caps it there.
  const list = quote(input.plan, input.qty, input.variant ?? null).listPaise
  const discountPaise = discountFor(coupon, list)
  if (discountPaise <= 0) return { valid: false, reason: 'unknown' }

  const applied = quote(input.plan, input.qty, input.variant ?? null, discountPaise).discountPaise
  return { valid: true, code, discountPaise: applied, label: couponLabel(coupon, applied) }
}

/**
 * Counts one redemption, at settlement.
 *
 * Unconditional on purpose: markPaid has already established that this
 * payment settled exactly once, so this runs exactly once per order. It is
 * also allowed to overshoot max_uses slightly under concurrency — two buyers
 * paying for the last use in the same second both get their robot, which is
 * the right way round for a marketing code to fail.
 */
export async function recordRedemption(code: string): Promise<void> {
  const sql = client()
  if (!sql) return
  await sql`update coupons set redeemed = redeemed + 1 where code = ${normaliseCode(code)}`
}

/* --------------------------------- admin -------------------------------- */

export async function listCoupons(): Promise<Coupon[]> {
  const sql = client()
  if (!sql) return []
  const rows = await sql`select * from coupons order by created_at desc limit 200`
  return rows.map((r) => rowToCoupon(r as Record<string, unknown>))
}

export type NewCoupon = {
  code: string
  kind: 'fixed' | 'percent'
  value: number
  maxDiscountPaise?: number | null
  minQty?: number
  plans?: Plan[]
  startsAt?: Date | null
  endsAt?: Date | null
  maxUses?: number | null
  perEmailLimit?: number | null
  label?: string | null
}

export async function createCoupon(input: NewCoupon): Promise<{ ok: boolean; reason?: string }> {
  const sql = client()
  if (!sql) return { ok: false, reason: 'unconfigured' }

  const code = normaliseCode(input.code)
  if (!CODE_PATTERN.test(code)) return { ok: false, reason: 'A code is letters and numbers, 2 to 32 characters.' }
  if (!Number.isInteger(input.value) || input.value <= 0) return { ok: false, reason: 'Value must be a positive whole number.' }
  if (input.kind === 'percent' && input.value > 100) return { ok: false, reason: 'A percentage cannot exceed 100.' }

  try {
    await sql`
      insert into coupons (code, kind, value, max_discount_paise, min_qty, plans,
                           starts_at, ends_at, max_uses, per_email_limit, label)
      values (${code}, ${input.kind}, ${input.value}, ${input.maxDiscountPaise ?? null},
              ${input.minQty ?? 1}, ${input.plans ?? []}, ${input.startsAt ?? null},
              ${input.endsAt ?? null}, ${input.maxUses ?? null},
              ${input.perEmailLimit ?? null}, ${input.label ?? null})`
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('duplicate key')) return { ok: false, reason: 'That code already exists.' }
    return { ok: false, reason: 'Could not create that code.' }
  }
}

/**
 * Codes are deactivated, never deleted. An order that used one still points at
 * it, and a dangling code is a receipt nobody can explain.
 */
export async function setCouponActive(code: string, active: boolean): Promise<void> {
  const sql = client()
  if (!sql) return
  await sql`update coupons set active = ${active} where code = ${normaliseCode(code)}`
}
