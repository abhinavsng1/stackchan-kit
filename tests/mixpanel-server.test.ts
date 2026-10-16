import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import crypto from 'node:crypto'

/**
 * "Payment Confirmed (server)" goes to Mixpanel from both routes that can
 * settle an order, carries what the funnel needs (edition, quantity, amount),
 * and none of the buyer's personal details.
 */

const markPaid = vi.hoisted(() => vi.fn())
vi.mock('@/lib/preorders', () => ({ markPaid }))

vi.mock('@/lib/razorpay', () => ({
  verifyPaymentSignature: () => true,
  verifyWebhookSignature: () => true,
  orderAmountPaise: (q: number) => 49_900 * q,
  balanceDuePaise: (q: number) => 450_000 * q,
}))
vi.mock('@/lib/email', () => ({ sendPaymentReceiptEmail: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/x-conversions', () => ({
  sendXConversion: vi.fn(async () => ({ ok: true, status: 200 })),
  requestIdentity: () => ({ ipAddress: null, userAgent: null }),
}))
const bg = vi.hoisted(() => ({ jobs: [] as Promise<unknown>[] }))
vi.mock('@vercel/functions', () => ({ waitUntil: (p: Promise<unknown>) => { bg.jobs.push(p) } }))

const { buildPaymentConfirmed, sendPaymentConfirmed, PAYMENT_CONFIRMED } = await import('@/lib/mixpanel-server')
const { POST: verify } = await import('@/app/api/verify-payment/route')
const { POST: webhook } = await import('@/app/api/razorpay-webhook/route')

const BUYER = {
  name: 'Asha Rao', email: 'Asha@Example.com', phone: '+919876543210',
  address: '12 MG Road, Indiranagar', city: 'Bengaluru', pincode: '560038',
}

const paid = () => ({
  status: 'paid', ...BUYER, qty: 2, edition: 'kit',
  twclid: null, adOptOut: false, amountPaise: 99_800, balanceDuePaise: 900_000,
})

/** Every personal value, and the forms it could be normalised into. */
const PII = [
  BUYER.name, BUYER.email, BUYER.email.toLowerCase(), BUYER.phone, BUYER.phone.slice(3),
  BUYER.address, BUYER.city, BUYER.pincode,
]
const PII_KEYS = /name|email|phone|address|city|pincode|\$ip/i

function assertNoPii(payload: unknown) {
  const json = JSON.stringify(payload)
  for (const v of PII) expect(json, v).not.toContain(v)
  const keys: string[] = []
  const walk = (o: unknown) => {
    if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { keys.push(k); walk(v) }
  }
  walk(payload)
  for (const k of keys) expect(k, k).not.toMatch(PII_KEYS)
}

const fetchMock = vi.fn(async (..._args: unknown[]) => new Response('1', { status: 200 }))

beforeEach(() => {
  markPaid.mockReset()
  fetchMock.mockClear()
  bg.jobs.length = 0
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('NEXT_PUBLIC_MIXPANEL_TOKEN', 'tok_test')
  vi.stubEnv('VERCEL_ENV', 'production')
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

const sentEvents = () => fetchMock.mock.calls.flatMap((c) => {
  const [url, init] = c as [string, RequestInit]
  expect(url).toMatch(/^https:\/\/api\.mixpanel\.com\/track/)
  return JSON.parse(String(init.body)) as Array<{ event: string; properties: Record<string, unknown> }>
})

describe('the payload', () => {
  const event = buildPaymentConfirmed('tok_test', {
    orderId: 'order_1', paymentId: 'pay_1', email: BUYER.email,
    edition: 'kit', qty: 2, amountPaise: 99_800, balanceDuePaise: 900_000, source: 'webhook',
  })

  it('carries the edition, quantity and amount', () => {
    expect(event.event).toBe(PAYMENT_CONFIRMED)
    expect(event.properties).toMatchObject({ token: 'tok_test', edition: 'kit', qty: 2, amount_inr: 998, source: 'webhook' })
  })

  it('has no name, email, phone or address in it', () => {
    assertNoPii(event)
  })

  it('does not send the raw order or payment id', () => {
    const json = JSON.stringify(event)
    expect(json).not.toContain('order_1')
    expect(json).not.toContain('pay_1')
  })

  it('lands on the same id the browser identifies the buyer by', () => {
    const browserId = crypto.createHash('sha256').update('asha@example.com').digest('hex')
    expect(event.properties.distinct_id).toBe(browserId)
  })

  it('falls back to the order when there is no email', () => {
    const anon = buildPaymentConfirmed('t', {
      orderId: 'order_1', paymentId: 'pay_1', edition: 'assembled', qty: 1, amountPaise: 49_900, source: 'verify',
    })
    expect(anon.properties.distinct_id).toBe(`order:${anon.properties.order_id_hash}`)
  })
})

describe('sending', () => {
  it('never throws when Mixpanel is unreachable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('down'))
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(sendPaymentConfirmed({
      orderId: 'o', paymentId: 'p', edition: 'assembled', qty: 1, amountPaise: 49_900, source: 'verify',
    })).resolves.toEqual({ ok: false, reason: 'unreachable' })
    errors.mockRestore()
  })

  it('sends nothing from a preview deployment', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    await sendPaymentConfirmed({ orderId: 'o', paymentId: 'p', edition: 'assembled', qty: 1, amountPaise: 49_900, source: 'verify' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('from the payment routes', () => {
  const fromBrowser = () => new Request('http://localhost/api/verify-payment', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'a'.repeat(64) }),
  })
  const fromRazorpay = () => new Request('http://localhost/api/razorpay-webhook', {
    method: 'POST',
    headers: { 'x-razorpay-signature': 'sig' },
    body: JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1', amount: 99_800 } } } }),
  })

  it('is sent once per settlement, from either route, with no personal data', async () => {
    markPaid.mockResolvedValue(paid())
    await verify(fromBrowser())
    await webhook(fromRazorpay())
    await Promise.all(bg.jobs)
    const events = sentEvents()
    expect(events.map((e) => [e.event, e.properties.source])).toEqual([
      [PAYMENT_CONFIRMED, 'verify'], [PAYMENT_CONFIRMED, 'webhook'],
    ])
    // The same payment, so Mixpanel keeps one of the two.
    expect(events[0].properties.$insert_id).toBe(events[1].properties.$insert_id)
    for (const e of events) assertNoPii(e)
  })

  it('is not sent for an order that was already settled', async () => {
    markPaid.mockResolvedValue({ status: 'already_paid' })
    await verify(fromBrowser())
    await webhook(fromRazorpay())
    await Promise.all(bg.jobs)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('cannot break the webhook when Mixpanel fails', async () => {
    markPaid.mockResolvedValue(paid())
    fetchMock.mockRejectedValue(new Error('down'))
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await webhook(fromRazorpay())
    await Promise.all(bg.jobs)
    expect(res.status).toBe(200)
    errors.mockRestore()
    fetchMock.mockReset()
    fetchMock.mockImplementation(async () => new Response('1', { status: 200 }))
  })
})
