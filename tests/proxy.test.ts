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

  it('runs on the experiment page and on the whole back office, and nowhere else', async () => {
    const { config } = await import('@/proxy')
    // The admin pattern is here rather than on each page: a new admin route
    // is protected the moment it exists.
    expect(config.matcher).toEqual(['/pebble-chan', '/admin/:path*'])
  })
})

describe('the back office', () => {
  const ask = async (headers: Record<string, string> = {}) => {
    const { proxy } = await import('@/proxy')
    const { NextRequest } = await import('next/server')
    return proxy(new NextRequest('https://pebblerobo.com/admin/coupons', { headers }))
  }

  it('asks for a password', async () => {
    process.env.ADMIN_PASSWORD = 'hunter2'
    const res = await ask()
    expect(res.status).toBe(401)
    expect(res.headers.get('www-authenticate')).toContain('Basic realm="PebbleRobo"')
  })

  it('lets the right password through', async () => {
    process.env.ADMIN_PASSWORD = 'hunter2'
    const auth = `Basic ${Buffer.from('admin:hunter2').toString('base64')}`
    expect((await ask({ authorization: auth })).status).toBe(200)
  })

  it('refuses a wrong password', async () => {
    process.env.ADMIN_PASSWORD = 'hunter2'
    const auth = `Basic ${Buffer.from('admin:nope').toString('base64')}`
    expect((await ask({ authorization: auth })).status).toBe(401)
  })

  it('locks everybody out when no password is configured, rather than opening', async () => {
    delete process.env.ADMIN_PASSWORD
    const auth = `Basic ${Buffer.from('admin:').toString('base64')}`
    expect((await ask({ authorization: auth })).status).toBe(401)
  })
})
