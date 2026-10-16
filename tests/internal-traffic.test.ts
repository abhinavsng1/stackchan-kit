import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * ?internal=1 marks this browser as ours until ?internal=0, so our own visits
 * can be filtered out of every Mixpanel report.
 */

function browser(search: string, store: Map<string, string>) {
  vi.stubGlobal('window', { location: { search, hostname: 'pebblerobo.com' } })
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) },
  })
}

afterEach(() => { vi.unstubAllGlobals() })

describe('the internal-traffic flag', async () => {
  const { isInternal } = await import('@/lib/analytics')

  it('is set by ?internal=1 and remembered without it', () => {
    const store = new Map<string, string>()
    browser('?internal=1', store)
    expect(isInternal()).toBe(true)
    browser('', store)
    expect(isInternal()).toBe(true)
  })

  it('is cleared by ?internal=0', () => {
    const store = new Map<string, string>([['pebble:internal', '1']])
    browser('?internal=0', store)
    expect(isInternal()).toBe(false)
    browser('', store)
    expect(isInternal()).toBe(false)
  })

  it('is off when storage is unavailable', () => {
    vi.stubGlobal('window', { location: { search: '?internal=1' } })
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    expect(isInternal()).toBe(false)
  })

  it('becomes a super property, and is unregistered when cleared', () => {
    const src = readFileSync(new URL('../lib/analytics.ts', import.meta.url), 'utf8')
    expect(src).toMatch(/register\(\{ internal: true \}\)/)
    expect(src).toMatch(/unregister\('internal'\)/)
  })
})
