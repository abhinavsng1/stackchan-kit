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

describe('the hero button', () => {
  const src = readFileSync(new URL('../components/AmazonButton.tsx', import.meta.url), 'utf8')
  const hero = readFileSync(new URL('../components/site/Hero.tsx', import.meta.url), 'utf8')

  it('takes the second button, and the demo link moves to the price line', () => {
    // Most people have bought from Amazon and have not bought from us; that
    // recognition is worth more in the hero than a link to the demo.
    expect(hero).toContain('<AmazonButton location="hero" />')
    expect(hero).toContain('see what it does')
  })

  it('stays the quieter of the two, because booking here is ₹499', () => {
    expect(src).toContain('btn btn-amazon')
    expect(src).not.toContain('btn-brand')
  })

  it('offers Amazon as an alternative, not the way in', () => {
    // As "Buy on", it took four hero clicks for every one Book got, and
    // none became an order.
    expect(src).toContain('<span>Also on</span>')
    expect(src).not.toContain('<span>Buy on</span>')
  })

  it('wears Amazon’s orange as a tint, so Book still leads', () => {
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
    expect(css).toMatch(/\.btn-amazon \{[^}]*--btn-bd: #ff9900/)
    expect(css).toMatch(/\.btn-amazon \{[^}]*--btn-bg: #fff4e0/)
  })

  it('shows Amazon’s own artwork rather than a redrawing of it', () => {
    // The mark is theirs. The file is Amazon's published SVG; nothing here
    // draws paths of its own.
    expect(src).toContain('AMAZON.logo')
    expect(AMAZON.logo).toBe('/brand/amazon.svg')
    expect(src).not.toMatch(/<svg|<path/)
  })

  it('names itself for a screen reader, which cannot see a logo', () => {
    expect(src).toContain('alt="Amazon"')
    expect(src).toMatch(/aria-label=.*Amazon/)
  })

  it('opens in a new tab, safely', () => {
    expect(src).toContain('target="_blank"')
    expect(src).toContain('rel="noopener noreferrer"')
  })
})

describe('the artwork', () => {
  it('is on disk and can scale, which the published file could not', () => {
    const svg = readFileSync(new URL('../public/brand/amazon.svg', import.meta.url), 'utf8')
    // Amazon publishes it without a viewBox, so it renders at one size and
    // one size only until this is added.
    expect(svg).toContain('viewBox="0 0 603 182"')
    expect(svg).toContain('#ff9900')
  })
})
