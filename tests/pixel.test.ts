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

describe('collection now starts on load', () => {
  const provider = readFileSync(new URL('../components/Analytics.tsx', import.meta.url), 'utf8')
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8')

  it('has no consent gate left in the provider', () => {
    expect(provider).not.toMatch(/Analytics choice/)
    expect(provider).not.toMatch(/readConsent|writeConsent/)
  })

  it('still discloses collection in the footer, gate or no gate', () => {
    expect(page).toMatch(/session\s+replays/)
    expect(page).toMatch(/Meta/)
    expect(page).toMatch(/never recorded/)
  })
})
