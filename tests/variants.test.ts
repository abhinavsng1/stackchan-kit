import { describe, it, expect } from 'vitest'
import {
  VARIANTS, VARIANT_COOKIE, isVariant, assignVariant, pricing, PEBBLE,
} from '@/lib/variants'

describe('variant assignment', () => {
  it('offers exactly the two prices being tested', () => {
    expect([...VARIANTS]).toEqual(['lifetime', 'subscription'])
  })

  it('splits fifty-fifty on the boundary', () => {
    expect(assignVariant(0)).toBe('lifetime')
    expect(assignVariant(0.4999)).toBe('lifetime')
    expect(assignVariant(0.5)).toBe('subscription')
    expect(assignVariant(0.9999)).toBe('subscription')
  })

  it('splits evenly over many draws, so neither arm is starved', () => {
    let lifetime = 0
    for (let i = 0; i < 10_000; i++) if (assignVariant(i / 10_000) === 'lifetime') lifetime++
    expect(lifetime).toBe(5000)
  })

  it('accepts only the two known names from a cookie', () => {
    for (const v of VARIANTS) expect(isVariant(v)).toBe(true)
    // The cookie is attacker-controlled; an unknown value must not become a price.
    for (const v of ['free', 'LIFETIME', '', 'subscription ', '__proto__']) {
      expect(isVariant(v), `${v} must not be a variant`).toBe(false)
    }
  })
})

describe('what each variant costs', () => {
  it('takes the same ₹499 prebook either way, so the gateway call never changes', () => {
    expect(pricing('lifetime').depositPaise).toBe(49_900)
    expect(pricing('subscription').depositPaise).toBe(49_900)
  })

  it('charges the rest on delivery, and the two differ', () => {
    expect(pricing('lifetime').balancePaise).toBe(450_000)
    expect(pricing('subscription').balancePaise).toBe(350_000)
  })

  it('has deposit plus balance reconstruct the device price exactly', () => {
    for (const v of VARIANTS) {
      const p = pricing(v)
      expect(p.depositPaise + p.balancePaise).toBe(p.totalPaise)
    }
  })

  it('charges a monthly fee on the subscription arm only', () => {
    expect(pricing('lifetime').monthlyPaise).toBe(0)
    expect(pricing('subscription').monthlyPaise).toBe(89_900)
  })

  it('keeps the display strings in step with the paise, so the page cannot lie', () => {
    const n = (s: string) => Number(s.replace(/[^\d]/g, '')) * 100
    for (const v of VARIANTS) {
      const p = pricing(v)
      expect(n(p.deposit)).toBe(p.depositPaise)
      expect(n(p.balance)).toBe(p.balancePaise)
      expect(n(p.total)).toBe(p.totalPaise)
    }
    expect(n(PEBBLE.subscription.monthly)).toBe(89_900)
  })

  it('names the cookie it is stored under', () => {
    expect(VARIANT_COOKIE).toBe('pbl_v')
  })
})

describe('what the courier is told to collect', () => {
  it('bills the kit balance when no variant was recorded', async () => {
    const { balanceDuePaise } = await import('@/lib/razorpay')
    const { PRICE } = await import('@/lib/kit')
    expect(balanceDuePaise(1, null)).toBe(PRICE.balancePaise)
    expect(balanceDuePaise(2)).toBe(PRICE.balancePaise * 2)
  })

  it('bills each arm the amount that arm was shown', async () => {
    const { balanceDuePaise } = await import('@/lib/razorpay')
    expect(balanceDuePaise(1, 'lifetime')).toBe(450_000)
    expect(balanceDuePaise(1, 'subscription')).toBe(350_000)
    expect(balanceDuePaise(3, 'subscription')).toBe(350_000 * 3)
  })

  it('falls back rather than guessing when the variant is unrecognised', async () => {
    // A wrong figure here is what somebody is asked for at their door.
    const { balanceDuePaise } = await import('@/lib/razorpay')
    const { PRICE } = await import('@/lib/kit')
    expect(balanceDuePaise(1, 'free')).toBe(PRICE.balancePaise)
  })
})

describe('the form small print', () => {
  it('quotes the balance for the arm the buyer is looking at', async () => {
    // "₹4,500" under a form on a ₹3,500 page is the small print contradicting
    // the price above it.
    const src = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../components/ReserveForm.tsx', import.meta.url), 'utf8'))
    expect(src).toContain('const owed = variant ? pricing(variant).balance : PRICE.balance')
    expect(src).not.toMatch(/courier collects \{PRICE\.balance\}/)
  })
})

describe('the quantity label', () => {
  it('counts robots on the product page and kits on the kit page', async () => {
    // The same form serves both editions. "Kits: 2" on a page selling an
    // assembled robot is the form describing a different product from the one
    // above it, so the label names neither.
    const src = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../components/ReserveForm.tsx', import.meta.url), 'utf8'))
    // The original worry was a robot page calling the thing a "kit". A
    // neutral label settles that outright — and unlike a label that changes
    // with the edition, it cannot drift back into naming the wrong product.
    expect(src).toContain('>Quantity</label>')
    expect(src).not.toMatch(/>\s*Kits\s*</)
  })
})
