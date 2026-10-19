import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { AMAZON, PRICE } from '@/lib/kit'
import { EV } from '@/lib/events'

/**
 * The second place to buy.
 *
 * What is tested here is the honesty of it rather than the link: this site
 * sells a ₹499 booking, Amazon sells the robot outright, and a visitor who
 * clicks through expecting the first and meets the second was misled by us.
 */
describe('the Amazon listing', () => {
  it('points at the product, by its own identifier', () => {
    expect(AMAZON.url).toBe(`https://www.amazon.in/dp/${AMAZON.asin}`)
    expect(AMAZON.asin).toMatch(/^[A-Z0-9]{10}$/)
  })

  it('is on amazon.in, because that is where this robot ships from', () => {
    expect(new URL(AMAZON.url).hostname).toBe('www.amazon.in')
  })

  it('has an event of its own, so the two channels can be compared', () => {
    expect(EV.amazonClicked).toBe('Amazon Listing Opened')
  })
})

describe('what the page says about it', () => {
  const src = readFileSync(new URL('../components/AmazonLink.tsx', import.meta.url), 'utf8')

  it('names the full price, not the booking deposit', () => {
    // PRICE.now is the whole price; PRICE.deposit is the ₹499 that books one
    // here. Quoting the deposit beside an Amazon link would be a bait.
    expect(src).toContain('PRICE.now')
    expect(src).not.toContain('PRICE.deposit')
  })

  it('opens in a new tab without handing Amazon the referrer window', () => {
    expect(src).toContain('target="_blank"')
    expect(src).toContain('rel="noopener noreferrer"')
  })

  it('says whose delivery and returns apply', () => {
    expect(src).toMatch(/delivery and returns/)
  })

  it('still describes the two prices as different things', () => {
    expect(PRICE.depositPaise).toBeLessThan(PRICE.nowPaise)
  })
})

describe('the hero mention', () => {
  const src = readFileSync(new URL('../components/AmazonLink.tsx', import.meta.url), 'utf8')
  const hero = readFileSync(new URL('../components/site/Hero.tsx', import.meta.url), 'utf8')

  it('rides on the price line rather than taking a button', () => {
    // Amazon is reassurance, not a third thing to decide between. A ghost
    // button beside the two real calls to action read as clutter.
    expect(hero).toContain('<AmazonInline location="hero" />')
    expect(hero).not.toContain('btn-ghost hero-cta">Also')
  })

  it('inherits the colour of the line it sits in, and underlines itself', () => {
    // Same colour as the price line it ends, so it reads as a fact rather
    // than a second call to action — but underlined, or at that size it
    // would not read as a link at all.
    expect(src).toContain("color: 'inherit'")
    expect(src).toContain('textDecoration')
  })

  it('opens in a new tab, safely, and says so to a screen reader', () => {
    expect(src).toContain('target="_blank"')
    expect(src).toContain('rel="noopener noreferrer"')
    expect(src).toMatch(/aria-label=.*Amazon/)
  })

  it('never draws the mark itself', () => {
    // A redrawn Amazon logo would be both a worse logo and a trademark we had
    // no right to redraw. If a badge ever appears it is Amazon's own file.
    expect(src).not.toMatch(/<svg|<path/)
    expect(AMAZON.badge).toBe(null)
  })
})
