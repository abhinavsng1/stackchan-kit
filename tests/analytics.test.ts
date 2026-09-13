import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Configuration guard. These options decide what gets recorded about real
 * people, so a change to any of them should be deliberate and visible in a diff.
 */
const src = readFileSync(new URL('../lib/analytics.ts', import.meta.url), 'utf8')

describe('session replay configuration', () => {
  it('never records what anyone types', () => {
    expect(src).toMatch(/record_mask_all_inputs:\s*true/)
  })

  it('enables replay and heatmap collection', () => {
    expect(src).toMatch(/record_sessions_percent:\s*100/)
    expect(src).toMatch(/record_heatmap_data:\s*true/)
    expect(src).toMatch(/autocapture:\s*true/)
  })

  it('does not record the network, the canvas, or images and video', () => {
    expect(src).toMatch(/record_network:\s*false/)
    expect(src).toMatch(/record_canvas:\s*false/)
    expect(src).toMatch(/record_block_selector:\s*'img, video'/)
  })

  it('loads the SDK lazily, never at module scope', () => {
    expect(src).toMatch(/await import\('mixpanel-browser'\)/)
    expect(src).not.toMatch(/^import mixpanel from/m)
  })

  it('no longer gates collection on a stored consent answer', () => {
    expect(src).not.toMatch(/readConsent/)
    expect(src).not.toMatch(/CONSENT_KEY/)
  })
})

describe('reserve funnel events', () => {
  const events = readFileSync(new URL('../lib/events.ts', import.meta.url), 'utf8')
  it('covers the whole path from CTA to outcome', () => {
    for (const key of ['reserveCtaClicked', 'reserveSubmitted', 'reserveSucceeded',
                       'reserveDuplicate', 'reserveFailed']) {
      expect(events).toContain(key)
    }
  })
})

describe('the form never leaks personal data into analytics', () => {
  const form = readFileSync(new URL('../components/ReserveForm.tsx', import.meta.url), 'utf8')
  it('tracks quantity and profession but never anything identifying', () => {
    const trackCalls = form.match(/track\([^)]*\)/gs) ?? []
    expect(trackCalls.length).toBeGreaterThan(0)
    for (const call of trackCalls) {
      for (const field of ['email', 'name', 'phone', 'address', 'city', 'pincode']) {
        expect(call, `track() must not carry ${field}`).not.toMatch(new RegExp(`\\b${field}\\b`))
      }
    }
  })
})
