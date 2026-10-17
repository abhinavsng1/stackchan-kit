import { describe, expect, it } from 'vitest'
import { quote, isPlan, planOf, rupees, MIN_ORDER_PAISE } from '@/lib/plans'
import { PRICE } from '@/lib/kit'
import { pricing } from '@/lib/variants'

/**
 * The money module. Every assertion here is about a figure that ends up either
 * on a payment screen or in a courier's hand, so they are written as the
 * promise made to the buyer rather than as the arithmetic.
 */
describe('quote', () => {
  it('books a robot for the deposit and leaves the rest for the door', () => {
    const q = quote('deposit', 1)
    expect(q.nowPaise).toBe(PRICE.depositPaise)
    expect(q.balancePaise).toBe(PRICE.balancePaise)
    expect(q.nowPaise + q.balancePaise).toBe(q.listPaise)
  })

  it('charges the whole price up front on the full plan, with nothing on delivery', () => {
    const q = quote('full', 1)
    expect(q.nowPaise).toBe(PRICE.depositPaise + PRICE.balancePaise)
    expect(q.balancePaise).toBe(0)
  })

  it('multiplies by quantity on both plans', () => {
    expect(quote('deposit', 3).nowPaise).toBe(PRICE.depositPaise * 3)
    expect(quote('deposit', 3).balancePaise).toBe(PRICE.balancePaise * 3)
    expect(quote('full', 3).nowPaise).toBe((PRICE.depositPaise + PRICE.balancePaise) * 3)
  })

  it('prices the arm the buyer was actually shown', () => {
    const sub = pricing('subscription')
    const q = quote('deposit', 1, 'subscription')
    expect(q.balancePaise).toBe(sub.balancePaise)
    expect(quote('full', 1, 'subscription').nowPaise).toBe(sub.depositPaise + sub.balancePaise)
  })

  it('falls back to the standard price for an unrecognised arm', () => {
    expect(quote('deposit', 1, 'nonsense').balancePaise).toBe(PRICE.balancePaise)
  })

  it('refuses a quantity outside what the form allows', () => {
    expect(() => quote('deposit', 0)).toThrow(RangeError)
    expect(() => quote('deposit', 6)).toThrow(RangeError)
    expect(() => quote('deposit', 1.5)).toThrow(RangeError)
  })
})

describe('a discount', () => {
  it('comes off the cash balance on the deposit plan, never off the deposit', () => {
    const q = quote('deposit', 1, null, 50_000)
    expect(q.nowPaise).toBe(PRICE.depositPaise)
    expect(q.balancePaise).toBe(PRICE.balancePaise - 50_000)
    expect(q.discountPaise).toBe(50_000)
  })

  it('comes off the online amount on the full plan', () => {
    const q = quote('full', 1, null, 50_000)
    expect(q.nowPaise).toBe(PRICE.depositPaise + PRICE.balancePaise - 50_000)
    expect(q.balancePaise).toBe(0)
  })

  it('never takes the balance below zero', () => {
    const q = quote('deposit', 1, null, 9_999_999)
    expect(q.balancePaise).toBe(0)
    expect(q.discountPaise).toBe(PRICE.balancePaise)
  })

  it('never produces an order the gateway would refuse', () => {
    const q = quote('full', 1, null, 9_999_999)
    expect(q.nowPaise).toBe(MIN_ORDER_PAISE)
  })

  it('ignores a negative or fractional discount rather than inventing money', () => {
    expect(quote('deposit', 1, null, -500).balancePaise).toBe(PRICE.balancePaise)
    expect(quote('deposit', 1, null, 10.9).discountPaise).toBe(10)
  })
})

describe('reading a stored plan', () => {
  it('accepts the two that exist', () => {
    expect(isPlan('deposit')).toBe(true)
    expect(isPlan('full')).toBe(true)
  })

  it('treats anything else as a deposit booking rather than throwing', () => {
    expect(isPlan('later')).toBe(false)
    expect(planOf(null)).toBe('deposit')
    expect(planOf('emi')).toBe('deposit')
    expect(planOf('full')).toBe('full')
  })
})

describe('rupees', () => {
  it('writes paise as the amount a person would say', () => {
    expect(rupees(49_900)).toBe('₹499')
    expect(rupees(499_900)).toBe('₹4,999')
    expect(rupees(0)).toBe('₹0')
  })
})
