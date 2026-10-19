import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { EV } from '@/lib/events'

/**
 * What the site reports, and what it must never report.
 *
 * The rule this file guards is the one the privacy page makes: analytics
 * events carry what happened, never who it happened to. A plan, a quantity,
 * a coupon code and an amount are all facts about an order; a name, an email
 * address and a phone number are facts about a person, and they go to the
 * profile — which is access-controlled — not into the event stream.
 */

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

describe('the new events exist and are named plainly', () => {
  it('covers the choices made before any money moves', () => {
    expect(EV.planChosen).toBe('Plan Chosen')
    expect(EV.couponApplied).toBe('Coupon Applied')
    expect(EV.couponRefused).toBe('Coupon Refused')
  })

  it('covers the balance being settled online', () => {
    expect(EV.balancePageOpened).toBe('Balance Page Opened')
    expect(EV.balancePaid).toBe('Balance Paid Online')
  })

  it('has no two events sharing a name', () => {
    const names = Object.values(EV)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('where they fire', () => {
  it('both plan pickers report the choice and where it was made', () => {
    for (const file of ['components/ReserveForm.tsx', 'components/CheckoutPanel.tsx']) {
      const src = read(file)
      expect(src).toContain('EV.planChosen')
      expect(src).toMatch(/location: '(form|checkout)'/)
    }
  })

  it('a code reports both verdicts, so a refused one is visible too', () => {
    const src = read('components/CouponField.tsx')
    expect(src).toContain('EV.couponApplied')
    expect(src).toContain('EV.couponRefused')
  })

  it('the balance page reports being opened, not just being paid', () => {
    // Otherwise "nobody pays early" and "nobody opened the email" look the same.
    const src = read('components/BalancePanel.tsx')
    expect(src).toContain('EV.balancePageOpened')
    expect(src).toContain('EV.balancePaid')
  })
})

describe('no personal data rides along', () => {
  const files = [
    'components/ReserveForm.tsx', 'components/CheckoutPanel.tsx',
    'components/CouponField.tsx', 'components/BalancePanel.tsx',
    'components/AmazonLink.tsx', 'components/AmazonButton.tsx',
  ]

  it('never puts a name, email, phone or address in an event', () => {
    for (const file of files) {
      const src = read(file)
      // Every track() call in these files, as written.
      const calls = src.match(/track\(EV\.[a-zA-Z]+,\s*\{[^}]*\}/g) ?? []
      for (const call of calls) {
        for (const forbidden of ['email', 'name:', 'phone', 'address', 'pincode']) {
          expect(call, `${file}: ${call}`).not.toContain(forbidden)
        }
      }
    }
  })
})
