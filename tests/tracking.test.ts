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
    'components/site/HeroRobot.tsx', 'components/site/DemoStage.tsx', 'components/site/Showcase.tsx',
    'components/site/HeroConversation.tsx',
  ]

  it('never puts a name, email, phone or address in an event', () => {
    for (const file of files) {
      const src = read(file)
      // Every track() and measure() call in these files, as written.
      const calls = src.match(/(?:track|measure)\(EV\.[a-zA-Z]+,\s*\{[^}]*\}/g) ?? []
      for (const call of calls) {
        for (const forbidden of ['email', 'name:', 'phone', 'address', 'pincode']) {
          expect(call, `${file}: ${call}`).not.toContain(forbidden)
        }
      }
    }
  })
})

describe('measurement stays out of the ad accounts', () => {
  // Detail gathered to study the page. Meta and X optimise on what they are
  // sent, so these go through measure(), which reaches Mixpanel alone.
  const MEASURED = ['robotTapped', 'filmChosen', 'pageEngaged', 'pagePerformance', 'reserveFieldCompleted', 'demoAction', 'heroVoice']
  const sources = [
    'components/Analytics.tsx', 'components/site/HeroRobot.tsx', 'components/site/DemoStage.tsx',
    'components/site/Showcase.tsx', 'components/ReserveForm.tsx', 'components/site/HeroConversation.tsx',
  ].map(read).join('\n')

  it('sends each of them with measure(), never track()', () => {
    for (const ev of MEASURED) {
      expect(sources, ev).toContain(`measure(EV.${ev}`)
      expect(sources, ev).not.toContain(`track(EV.${ev}`)
    }
  })

  it('keeps the sections the pixels were always sent, and adds the rest quietly', () => {
    const src = read('components/Analytics.tsx')
    expect(src).toMatch(/WATCH\.includes\(e\.target\.id\) \? track : measure/)
    expect(src).toMatch(/WATCH_QUIETLY = \['why', 'films', 'explore'\]/)
  })
})
