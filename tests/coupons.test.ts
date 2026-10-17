import { beforeEach, describe, expect, it, vi } from 'vitest'
import { discountFor, couponLabel, normaliseCode, CODE_PATTERN, type Coupon } from '@/lib/coupons'
import { quote } from '@/lib/plans'
import { PRICE } from '@/lib/kit'

/**
 * What a code is worth, and which side of the order it comes off.
 *
 * The arithmetic is tested here without a database. What the database adds —
 * expiry, limits, which plans — is tested against a fake connection below.
 */

const LIST = PRICE.depositPaise + PRICE.balancePaise

const coupon = (over: Partial<Coupon> = {}): Coupon => ({
  code: 'SAVE', kind: 'fixed', value: 50_000, maxDiscountPaise: null, minQty: 1,
  plans: [], startsAt: null, endsAt: null, maxUses: null, perEmailLimit: null,
  redeemed: 0, active: true, label: null, ...over,
})

describe('what a code takes off', () => {
  it('a fixed code is worth its face value', () => {
    expect(discountFor(coupon({ kind: 'fixed', value: 50_000 }), LIST)).toBe(50_000)
  })

  it('a percentage is of the whole order, not of the deposit', () => {
    expect(discountFor(coupon({ kind: 'percent', value: 10 }), LIST)).toBe(Math.floor(LIST / 10))
  })

  it('respects the cap on a percentage code', () => {
    const c = coupon({ kind: 'percent', value: 50, maxDiscountPaise: 20_000 })
    expect(discountFor(c, LIST)).toBe(20_000)
  })

  it('can never exceed the order itself', () => {
    expect(discountFor(coupon({ value: 9_999_999 }), LIST)).toBe(LIST)
  })
})

describe('where the discount lands', () => {
  it('comes off the cash at the door on a deposit booking', () => {
    const d = discountFor(coupon({ value: 50_000 }), LIST)
    const q = quote('deposit', 1, null, d)
    expect(q.nowPaise).toBe(PRICE.depositPaise)
    expect(q.balancePaise).toBe(PRICE.balancePaise - 50_000)
  })

  it('comes off what is charged now when paying in full', () => {
    const d = discountFor(coupon({ value: 50_000 }), LIST)
    expect(quote('full', 1, null, d).nowPaise).toBe(LIST - 50_000)
  })
})

describe('codes as typed', () => {
  it('are the same code in any case, with stray spaces removed', () => {
    expect(normaliseCode(' diwali500 ')).toBe('DIWALI500')
  })

  it('accepts what a person would print, and refuses what they would not', () => {
    for (const ok of ['SAVE10', 'DIWALI-500', 'A1', 'X_Y']) expect(CODE_PATTERN.test(ok)).toBe(true)
    for (const no of ['A', '-LEADING', 'has space', 'ünicode', 'A'.repeat(33)]) {
      expect(CODE_PATTERN.test(no)).toBe(false)
    }
  })

  it('labels itself in rupees when nothing better is set', () => {
    expect(couponLabel(coupon(), 50_000)).toBe('SAVE — ₹500 off')
    expect(couponLabel(coupon({ label: 'Diwali' }), 50_000)).toBe('Diwali')
  })
})

/* ------------------------- against a fake database ----------------------- */

const rows = vi.hoisted(() => ({ coupon: null as Record<string, unknown> | null, used: 0 }))

vi.mock('@neondatabase/serverless', () => ({
  neon: () => {
    const run = async (strings: TemplateStringsArray) => {
      const text = strings.join(' ')
      if (text.includes('from coupons')) return rows.coupon ? [rows.coupon] : []
      if (text.includes('count(*)')) return [{ n: rows.used }]
      return []
    }
    return run
  },
}))

const dbCoupon = (over: Record<string, unknown> = {}) => ({
  code: 'SAVE', kind: 'fixed', value: 50_000, max_discount_paise: null, min_qty: 1,
  plans: [], starts_at: null, ends_at: null, max_uses: null, per_email_limit: null,
  redeemed: 0, active: true, label: null, ...over,
})

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://test'
  rows.coupon = dbCoupon()
  rows.used = 0
})

describe('validating a code against one order', () => {
  const check = async (over: Record<string, unknown> = {}, order: Record<string, unknown> = {}) => {
    rows.coupon = dbCoupon(over)
    const { validateCoupon } = await import('@/lib/coupons')
    return validateCoupon({ code: 'SAVE', plan: 'deposit', qty: 1, email: 'a@example.com', ...order })
  }

  it('accepts a live code and prices it', async () => {
    expect(await check()).toMatchObject({ valid: true, code: 'SAVE', discountPaise: 50_000 })
  })

  it('refuses one that has been deactivated, saying only that it is not valid', async () => {
    expect(await check({ active: false })).toEqual({ valid: false, reason: 'unknown' })
  })

  it('refuses one that has expired', async () => {
    expect(await check({ ends_at: '2020-01-01T00:00:00Z' })).toEqual({ valid: false, reason: 'expired' })
  })

  it('refuses one that has not started', async () => {
    expect(await check({ starts_at: '2999-01-01T00:00:00Z' })).toEqual({ valid: false, reason: 'expired' })
  })

  it('refuses a full-price code on a deposit booking', async () => {
    expect(await check({ plans: ['full'] })).toEqual({ valid: false, reason: 'wrong_plan' })
    expect(await check({ plans: ['full'] }, { plan: 'full' })).toMatchObject({ valid: true })
  })

  it('refuses an order below the minimum quantity', async () => {
    expect(await check({ min_qty: 2 })).toEqual({ valid: false, reason: 'min_qty' })
    expect(await check({ min_qty: 2 }, { qty: 2 })).toMatchObject({ valid: true })
  })

  it('refuses a code that has been used up, without saying so', async () => {
    expect(await check({ max_uses: 10, redeemed: 10 })).toEqual({ valid: false, reason: 'used_up' })
  })

  it('refuses a second use by the same buyer, and says so plainly', async () => {
    rows.used = 1
    expect(await check({ per_email_limit: 1 })).toEqual({ valid: false, reason: 'already_used' })
  })

  it('counts only settled orders against a buyer, so an abandoned one costs nothing', async () => {
    rows.used = 0
    expect(await check({ per_email_limit: 1 })).toMatchObject({ valid: true })
  })

  it('refuses a code that does not exist', async () => {
    rows.coupon = null
    const { validateCoupon } = await import('@/lib/coupons')
    expect(await validateCoupon({ code: 'NOPE', plan: 'deposit', qty: 1 }))
      .toEqual({ valid: false, reason: 'unknown' })
  })

  it('never returns more than the side it comes off can absorb', async () => {
    const verdict = await check({ value: 9_999_999 })
    expect(verdict).toMatchObject({ valid: true, discountPaise: PRICE.balancePaise })
  })
})

describe('when the table cannot be read at all', () => {
  it('treats the code as simply not applying, rather than failing the order', async () => {
    vi.resetModules()
    vi.doMock('@neondatabase/serverless', () => ({
      neon: () => async () => { throw new Error('relation "coupons" does not exist') },
    }))
    const { validateCoupon } = await import('@/lib/coupons')
    expect(await validateCoupon({ code: 'SAVE', plan: 'deposit', qty: 1 }))
      .toEqual({ valid: false, reason: 'unknown' })
    vi.doUnmock('@neondatabase/serverless')
    vi.resetModules()
  })
})
