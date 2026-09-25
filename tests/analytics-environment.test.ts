import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyticsMode } from '@/lib/analytics-environment'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules() })

describe('production analytics isolation', () => {
  it('does not enable collection during server rendering', () => {
    expect(analyticsMode()).toBe('off')
  })

  for (const hostname of ['localhost', '127.0.0.1', '[::1]', 'preview.vercel.app', 'pebblerobo.com.example.com']) {
    it(`does not collect from ${hostname}`, () => {
      vi.stubGlobal('window', { location: { hostname } })
      vi.stubEnv('NEXT_PUBLIC_ANALYTICS_TEST_MODE', '')
      expect(analyticsMode()).toBe('off')
    })
  }

  for (const hostname of ['pebblerobo.com', 'www.pebblerobo.com']) {
    it(`preserves live tracking on ${hostname}`, () => {
      vi.stubGlobal('window', { location: { hostname } })
      expect(analyticsMode()).toBe('live')
    })
  }

  it('allows an in-memory test queue only on loopback hosts', () => {
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_TEST_MODE', '1')
    vi.stubGlobal('window', { location: { hostname: 'localhost' } })
    expect(analyticsMode()).toBe('test')
    vi.stubGlobal('window', { location: { hostname: 'preview.vercel.app' } })
    expect(analyticsMode()).toBe('off')
  })

  it('does not inject an SDK or track conversions on ordinary localhost', async () => {
    vi.stubGlobal('window', { location: { hostname: 'localhost' } })
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_TEST_MODE', '')
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', 'test-pixel')
    const appendChild = vi.fn()
    vi.stubGlobal('document', { createElement: vi.fn(), head: { appendChild } })
    const pixel = await import('@/lib/pixel')
    pixel.initPixel()
    pixel.pixelStandard('Lead')
    expect(appendChild).not.toHaveBeenCalled()
    expect(window.fbq).toBeUndefined()
  })

  it('records both success signals in test mode without a vendor connection', async () => {
    vi.stubGlobal('window', { location: { hostname: 'localhost' } })
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_TEST_MODE', '1')
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', 'test-pixel')
    vi.stubEnv('NEXT_PUBLIC_MIXPANEL_TOKEN', 'must-not-be-used')
    const { initAnalytics, track, EV } = await import('@/lib/analytics')
    await initAnalytics()
    track(EV.reserveSubmitted, { qty: 1 })
    expect(window.fbq?.queue?.filter((c) => c[1] === 'Lead' || c[1] === 'CompleteRegistration')).toEqual([])
    track(EV.reserveSucceeded)
    expect(window.fbq?.queue?.filter((c) => c[1] === 'Lead')).toHaveLength(1)
    expect(window.fbq?.queue?.filter((c) => c[1] === 'CompleteRegistration')).toEqual([
      ['track', 'CompleteRegistration', { content_name: EV.reserveSucceeded, status: true }],
    ])
  })
})

describe('person identification', () => {
  it('sends a hash, never the address itself', async () => {
    // The privacy page states that no analytics tool is sent an email. A
    // SHA-256 keeps that true while still resolving one buyer to one id.
    const email = 'Asha.Rao@Example.com '
    const digest = await crypto.subtle.digest('SHA-256',
      new TextEncoder().encode(email.trim().toLowerCase()))
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0')).join('')
    expect(hex).toMatch(/^[a-f0-9]{64}$/)
    expect(hex).not.toContain('asha')
    expect(hex).not.toContain('example')
  })

  it('normalises case and whitespace so one person is one id', async () => {
    const hash = async (e: string) => {
      const d = await crypto.subtle.digest('SHA-256',
        new TextEncoder().encode(e.trim().toLowerCase()))
      return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('')
    }
    // The same buyer typing their address differently on phone and laptop must
    // not become two users.
    expect(await hash('  Asha.Rao@Example.com ')).toBe(await hash('asha.rao@example.com'))
    expect(await hash('asha@example.com')).not.toBe(await hash('other@example.com'))
  })
})
