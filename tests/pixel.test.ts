import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../lib/analytics.ts', import.meta.url), 'utf8')
const pixel = readFileSync(new URL('../lib/pixel.ts', import.meta.url), 'utf8')

describe('Meta Pixel wiring', () => {
  it('maps the reservation to Lead, which is the conversion worth optimising for', () => {
    expect(src).toMatch(/reserveSucceeded\]:\s*'Lead'/)
  })

  it('maps the CTA and section views to Meta standard events', () => {
    expect(src).toMatch(/reserveCtaClicked\]:\s*'InitiateCheckout'/)
    expect(src).toMatch(/sectionViewed\]:\s*'ViewContent'/)
  })

  it('still sends anything unmapped, as a custom event', () => {
    expect(src).toMatch(/pixelCustom\(/)
  })

  it('loads nothing at module scope — the script is injected on consent', () => {
    expect(pixel).not.toMatch(/^import .*fbevents/m)
    expect(pixel).toMatch(/function initPixel/)
    expect(pixel).toMatch(/document\.createElement\('script'\)/)
  })

  it('refuses to fire before init, so nothing leaks pre-consent', () => {
    expect(pixel).toMatch(/if \(!started\) return/)
  })

  it('withdrawing consent stops the pixel as well as Mixpanel', () => {
    expect(src).toMatch(/stopPixel\(\)/)
  })

  it("drives Meta's consent API from our own banner, both ways", () => {
    expect(pixel).toMatch(/'consent', 'grant'/)
    expect(pixel).toMatch(/'consent', 'revoke'/)
  })
})

describe('pixel runtime', () => {
  beforeEach(() => { vi.resetModules() })
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID
    // @ts-expect-error cleaning the test global
    delete globalThis.window
  })

  it('is inert with no id configured', async () => {
    const m = await import('@/lib/pixel')
    expect(m.pixelConfigured()).toBe(false)
    expect(() => m.pixelStandard('Lead')).not.toThrow()
  })

  it('reports configured once an id is present', async () => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = '1463673029143081'
    const m = await import('@/lib/pixel')
    expect(m.pixelConfigured()).toBe(true)
    expect(m.pixelId()).toBe('1463673029143081')
  })
})

describe('the consent banner says where the data goes', () => {
  const banner = readFileSync(new URL('../components/Analytics.tsx', import.meta.url), 'utf8')
  it('names Meta rather than only mentioning analytics', () => {
    expect(banner).toMatch(/Meta/)
  })
  it('still promises that form input is never recorded', () => {
    expect(banner).toMatch(/never recorded/)
  })
})
