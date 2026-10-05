import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'
import { VARIANT_COOKIE, isVariant } from '@/lib/variants'

const req = (cookie?: string) => {
  const r = new NextRequest(new URL('https://pebblerobo.com/pebble-chan'))
  if (cookie) r.cookies.set(VARIANT_COOKIE, cookie)
  return r
}

describe('variant assignment at the edge', () => {
  it('assigns one on a first visit and sets it', () => {
    const res = proxy(req())
    const set = res.cookies.get(VARIANT_COOKIE)
    expect(set).toBeDefined()
    expect(isVariant(String(set?.value))).toBe(true)
  })

  it('leaves an existing assignment alone, so a reload cannot reroll it', () => {
    const res = proxy(req('subscription'))
    expect(res.cookies.get(VARIANT_COOKIE)).toBeUndefined()
  })

  it('reassigns when the cookie holds something that is not a variant', () => {
    // The cookie is client-writable; a forged value must not reach pricing.
    const res = proxy(req('free-robot'))
    expect(isVariant(String(res.cookies.get(VARIANT_COOKIE)?.value))).toBe(true)
  })

  it('passes the assignment to the first render rather than the next one', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const res = proxy(req())
    expect(res.cookies.get(VARIANT_COOKIE)?.value).toBe('subscription')
    vi.restoreAllMocks()
  })

  it('only runs on the page being tested', async () => {
    const { config } = await import('@/proxy')
    expect(config.matcher).toEqual(['/pebble-chan'])
  })
})
