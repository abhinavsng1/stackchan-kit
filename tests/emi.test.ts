import { afterEach, describe, expect, it } from 'vitest'
import { EMI_TERMS, emiFromMonthlyPaise, emiFromLine, affordabilityWidgetEnabled, noCostEmiOfferId } from '@/lib/emi'

/**
 * What the site is allowed to claim about EMI.
 *
 * This account has credit-card EMI only: debit-card and cardless EMI were
 * both rejected. A page that implies otherwise sends a buyer to a payment
 * screen that refuses their card, so the wording is tested rather than
 * trusted to stay right while somebody edits layout.
 */

afterEach(() => {
  delete process.env.NEXT_PUBLIC_EMI_FROM_MONTHLY_PAISE
  delete process.env.NEXT_PUBLIC_AFFORDABILITY_WIDGET
  delete process.env.RAZORPAY_NOCOST_EMI_OFFER_ID
})

describe('the wording', () => {
  it('always says eligible credit cards', () => {
    expect(EMI_TERMS.availability).toContain('eligible credit cards')
  })

  it('never promises debit or cardless EMI, which this account cannot do', () => {
    const everything = Object.values(EMI_TERMS).join(' ').toLowerCase()
    expect(everything).not.toContain('debit')
    expect(everything).not.toContain('cardless')
    expect(everything).not.toContain('no card')
  })

  it('names the bank on the No-Cost offer rather than claiming it generally', () => {
    expect(EMI_TERMS.noCost).toContain('ICICI')
    expect(EMI_TERMS.noCost.toLowerCase()).toContain('credit cards')
  })
})

describe('the monthly figure', () => {
  it('says nothing at all when none is configured', () => {
    expect(emiFromMonthlyPaise()).toBe(null)
    expect(emiFromLine()).toBe(null)
  })

  it('quotes what was configured, and never a figure of its own', () => {
    process.env.NEXT_PUBLIC_EMI_FROM_MONTHLY_PAISE = '83300'
    expect(emiFromLine()).toBe('or from ₹833/month with EMI on eligible credit cards')
  })

  it('ignores a nonsense value rather than printing NaN at a buyer', () => {
    process.env.NEXT_PUBLIC_EMI_FROM_MONTHLY_PAISE = 'cheap'
    expect(emiFromMonthlyPaise()).toBe(null)
    process.env.NEXT_PUBLIC_EMI_FROM_MONTHLY_PAISE = '-100'
    expect(emiFromMonthlyPaise()).toBe(null)
  })
})

describe('the optional extras', () => {
  it('keeps the affordability widget off unless it is switched on', () => {
    expect(affordabilityWidgetEnabled()).toBe(false)
    process.env.NEXT_PUBLIC_AFFORDABILITY_WIDGET = '1'
    expect(affordabilityWidgetEnabled()).toBe(true)
  })

  it('attaches no offer when none is configured', () => {
    expect(noCostEmiOfferId()).toBe(null)
    process.env.RAZORPAY_NOCOST_EMI_OFFER_ID = ' offer_Toy0FZZfGZReRl '
    expect(noCostEmiOfferId()).toBe('offer_Toy0FZZfGZReRl')
  })
})
