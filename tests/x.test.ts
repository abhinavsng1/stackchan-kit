import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import crypto from 'node:crypto'
import { X_EVENTS, X_PIXEL_ID } from '@/lib/x'
import { X_BASE_CODE, isTwclid } from '@/lib/x-pixel'
import {
  buildConversion, identifiersFor, normalisePhone, sendXConversion, requestIdentity,
} from '@/lib/x-conversions'

const sha = (v: string) => crypto.createHash('sha256').update(v).digest('hex')

describe('the X base code', () => {
  it('configures the pixel this site reports to', () => {
    expect(X_PIXEL_ID).toBe('rfx4u')
    expect(X_BASE_CODE).toContain(`twq('config','${X_PIXEL_ID}');`)
    expect(X_BASE_CODE).toContain('https://static.ads-twitter.com/uwt.js')
  })

  it('accepts a real click id and refuses anything that is not one', () => {
    expect(isTwclid('2abc_DEF-123.x~')).toBe(true)
    expect(isTwclid('')).toBe(false)
    expect(isTwclid('<script>')).toBe(false)
    expect(isTwclid('a'.repeat(201))).toBe(false)
  })
})

describe('identifiers', () => {
  it('trims and lowercases an email before hashing it, as X asks', () => {
    expect(identifiersFor({ email: '  Asha.Rao@Example.COM ' }).hashed_email)
      .toBe(sha('asha.rao@example.com'))
  })

  it('hashes the phone in E.164, never the plain number', () => {
    const ids = identifiersFor({ phone: '+919876543210' })
    expect(ids.hashed_phone_number).toBe(sha('+919876543210'))
    expect(JSON.stringify(ids)).not.toContain('9876543210')
    expect(normalisePhone('98765 43210')).toBe('+919876543210')
    expect(normalisePhone('12345')).toBeNull()
  })

  it('sends an IP address only alongside a user agent, as a pair', () => {
    expect(identifiersFor({ ipAddress: '192.0.2.1' })).toEqual({})
    expect(identifiersFor({ ipAddress: '192.0.2.1', userAgent: 'UA' }))
      .toEqual({ ip_address: '192.0.2.1', user_agent: 'UA' })
  })

  it('reads the buyer, not the proxy, from a forwarded request', () => {
    const req = new Request('http://x.test', {
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1', 'user-agent': 'Mozilla/5.0' },
    })
    expect(requestIdentity(req)).toEqual({ ipAddress: '203.0.113.9', userAgent: 'Mozilla/5.0' })
  })

  it('builds the request body X documents', () => {
    const body = buildConversion({
      eventId: 'tw-rfx4u-abcde', conversionId: 'pay_123',
      identity: { email: 'a@b.co', twclid: 'click1' }, at: new Date('2026-10-08T00:00:00Z'),
    })
    expect(body).toEqual({
      conversions: [{
        conversion_time: '2026-10-08T00:00:00.000Z',
        event_id: 'tw-rfx4u-abcde',
        event_source_url: 'https://pebblerobo.com/',
        conversion_id: 'pay_123',
        identifiers: [{ twclid: 'click1', hashed_email: sha('a@b.co') }],
      }],
    })
  })
})

describe('sending a conversion', () => {
  const fetchMock = vi.fn()
  const saved = { ...X_EVENTS }

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    Object.assign(X_EVENTS, saved)
  })

  const purchase = { event: 'purchase' as const, conversionId: 'pay_1', identity: { email: 'a@b.co' } }

  it('sends nothing without the access token', async () => {
    vi.stubEnv('X_PIXEL_TOKEN', '')
    X_EVENTS.purchase = 'tw-rfx4u-abcde'
    await expect(sendXConversion(purchase)).resolves.toEqual({ ok: false, reason: 'no_token' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends nothing for an event that has no id in Events Manager yet', async () => {
    vi.stubEnv('X_PIXEL_TOKEN', 'secret')
    X_EVENTS.purchase = null
    await expect(sendXConversion(purchase)).resolves.toMatchObject({ reason: 'event_not_configured' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts to the pixel\'s endpoint with the token in the header, not the body', async () => {
    vi.stubEnv('X_PIXEL_TOKEN', 'secret')
    X_EVENTS.purchase = 'tw-rfx4u-abcde'
    await expect(sendXConversion(purchase)).resolves.toEqual({ ok: true, status: 200 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://ads-api.x.com/12/measurement/conversions/rfx4u')
    expect(init.headers['X-Pixel-Token']).toBe('secret')
    expect(init.body).not.toContain('secret')
    expect(JSON.parse(init.body).conversions[0]).toMatchObject({
      event_id: 'tw-rfx4u-abcde', conversion_id: 'pay_1',
    })
  })

  it('reports a refusal or an outage instead of throwing', async () => {
    vi.stubEnv('X_PIXEL_TOKEN', 'secret')
    X_EVENTS.purchase = 'tw-rfx4u-abcde'
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 400 }))
    await expect(sendXConversion(purchase)).resolves.toEqual({ ok: false, reason: 'refused', status: 400 })
    fetchMock.mockRejectedValueOnce(new Error('down'))
    await expect(sendXConversion(purchase)).resolves.toEqual({ ok: false, reason: 'unreachable' })
  })
})
