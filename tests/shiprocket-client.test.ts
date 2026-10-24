import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkBody, SHIPROCKET_BASE } from '@/lib/shiprocket/client'

/**
 * Shiprocket's worst habit, pinned.
 *
 * assign/awb, generate/pickup, generate/label, manifests/generate and
 * serviceability all report business failures inside HTTP 200. Branching on
 * res.ok treats an empty wallet as a successful dispatch, which is how a
 * parcel ends up marked shipped having never been booked.
 */
describe('checkBody', () => {
  it('points at the documented production host', () => {
    expect(SHIPROCKET_BASE).toBe('https://apiv2.shiprocket.in/v1/external')
  })

  it('treats an unassigned AWB as a failure however cheerful the status line', () => {
    const r = checkBody('awb', { awb_assign_status: 0, message: 'Please recharge your ShipRocket wallet' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(/recharge/i)
  })

  it('reads the wallet code out of a 200', () => {
    const r = checkBody('awb', {
      awb_assign_status: 0,
      status_code: 350,
      message: 'Please recharge your ShipRocket wallet. The minimum required balance is Rs 500',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.walletEmpty).toBe(true)
  })

  it('accepts an assigned AWB', () => {
    const r = checkBody('awb', {
      awb_assign_status: 1,
      response: { data: { awb_code: '19041424751540', courier_name: 'Delhivery Surface' } },
    })
    expect(r.ok).toBe(true)
  })

  it('treats a 404 nested in a 200 as unserviceable', () => {
    const r = checkBody('serviceability', { status: 404, message: 'No Courier Serviceable' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(/serviceable/i)
  })

  it('accepts a serviceability response that offers a COD courier', () => {
    const r = checkBody('serviceability', {
      status: 200,
      data: { available_courier_companies: [{ courier_company_id: 43, cod: 1 }] },
    })
    expect(r.ok).toBe(true)
  })

  it('rejects a serviceability response where no courier does COD', () => {
    // A courier serviceable for prepaid is not necessarily serviceable for
    // cash, and this product is only ever shipped COD.
    const r = checkBody('serviceability', {
      status: 200,
      data: { available_courier_companies: [{ courier_company_id: 43, cod: 0 }] },
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(/cash|cod/i)
  })

  it('treats an unscheduled pickup as a failure', () => {
    expect(checkBody('pickup', { pickup_status: 0, message: 'Already in Pickup Queue.' }).ok).toBe(false)
    expect(checkBody('pickup', { pickup_status: 1, response: {} }).ok).toBe(true)
  })

  it('treats an ungenerated label as a failure', () => {
    expect(checkBody('label', { label_created: 0, not_created: [1] }).ok).toBe(false)
    expect(checkBody('label', { label_created: 1, label_url: 'https://x/l.pdf' }).ok).toBe(true)
  })

  it('accepts a created order and rejects one without a shipment id', () => {
    expect(checkBody('create', { order_id: 1, shipment_id: 2, status: 'NEW' }).ok).toBe(true)
    expect(checkBody('create', { message: 'Oops! Invalid Data.' }).ok).toBe(false)
  })
})

describe('srFetch', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.SHIPROCKET_EMAIL = 'api@example.com'
    process.env.SHIPROCKET_PASSWORD = 'secret'
  })

  const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

  it('re-logs in exactly once on a 401, then retries the call once', async () => {
    const calls: string[] = []
    const fetcher = vi.fn(async (url: string) => {
      calls.push(url)
      if (url.endsWith('/auth/login')) return json({ token: 'fresh' })
      return calls.filter((c) => c.endsWith('/orders/show/1')).length === 1
        ? json({ message: 'Token has expired' }, 401)
        : json({ data: { remittance_utr: 'UTR1' } })
    })
    const { srFetch } = await import('@/lib/shiprocket/client')
    const r = await srFetch('/orders/show/1', {}, { fetcher, token: 'stale' })
    expect(r.status).toBe(200)
    expect(calls.filter((c) => c.endsWith('/auth/login'))).toHaveLength(1)
  })

  it('does not loop when the fresh token is also rejected', async () => {
    const fetcher = vi.fn(async (url: string) =>
      url.endsWith('/auth/login') ? json({ token: 'fresh' }) : json({ message: 'Token has expired' }, 401))
    const { srFetch } = await import('@/lib/shiprocket/client')
    const r = await srFetch('/orders/show/1', {}, { fetcher, token: 'stale' })
    expect(r.status).toBe(401)
    // One login, two attempts at the call. Never more.
    expect(fetcher.mock.calls.filter((c) => String(c[0]).endsWith('/auth/login'))).toHaveLength(1)
  })

  it('surfaces a rate limit without retrying it', async () => {
    const fetcher = vi.fn(async () =>
      json({ message: 'Too Many Attempts.', status_code: 429 }, 429, { 'retry-after': '37' }))
    const { srFetch } = await import('@/lib/shiprocket/client')
    const r = await srFetch('/orders', {}, { fetcher, token: 't' })
    expect(r.status).toBe(429)
    expect(r.headers.get('retry-after')).toBe('37')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('never retries a failed login, because the lockout is half an hour', async () => {
    const fetcher = vi.fn(async () =>
      json({ message: 'Too many failed login attempts. Please try after half an hour.', status_code: 400 }, 400))
    const { login } = await import('@/lib/shiprocket/client')
    await expect(login({ fetcher })).rejects.toThrow(/half an hour|login/i)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('sends the bearer token and asks for JSON', async () => {
    let seen: Record<string, string> = {}
    const fetcher = vi.fn(async (_u: string, init: RequestInit) => {
      seen = Object.fromEntries(new Headers(init.headers).entries())
      return json({ ok: true })
    })
    const { srFetch } = await import('@/lib/shiprocket/client')
    await srFetch('/orders', {}, { fetcher, token: 'abc' })
    expect(seen.authorization).toBe('Bearer abc')
    expect(seen['content-type']).toBe('application/json')
  })
})
