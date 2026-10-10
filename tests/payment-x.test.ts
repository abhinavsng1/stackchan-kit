import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The sale is reported to X from both places an order can be settled — the
 * browser's callback and Razorpay's webhook — under the payment id, and from
 * neither for a buyer who ordered with Global Privacy Control on.
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

const sendXConversion = vi.hoisted(() => vi.fn(async () => ({ ok: true, status: 200 })))
vi.mock('@/lib/x-conversions', () => ({
  sendXConversion,
  requestIdentity: (r: Request) => ({
    ipAddress: r.headers.get('x-forwarded-for'), userAgent: r.headers.get('user-agent'),
  }),
}))

const bg = vi.hoisted(() => ({ jobs: [] as Promise<unknown>[] }))
vi.mock('@vercel/functions', () => ({ waitUntil: (p: Promise<unknown>) => { bg.jobs.push(p) } }))

const { POST: verify } = await import('@/app/api/verify-payment/route')
const { POST: webhook } = await import('@/app/api/razorpay-webhook/route')

const paid = (adOptOut: boolean) => ({
  status: 'paid', name: 'Asha Rao', email: 'asha@example.com', qty: 1, edition: 'assembled',
  twclid: 'click1', adOptOut, amountPaise: 49_900, balanceDuePaise: 450_000,
  phone: '+919876543210', address: null, city: null, pincode: null,
})

const fromBrowser = () => new Request('http://localhost/api/verify-payment', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9', 'user-agent': 'Mozilla/5.0' },
  body: JSON.stringify({
    razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'a'.repeat(64),
  }),
})

const fromRazorpay = () => new Request('http://localhost/api/razorpay-webhook', {
  method: 'POST',
  headers: { 'x-razorpay-signature': 'sig' },
  body: JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1', amount: 49_900 } } },
  }),
})

beforeEach(() => {
  markPaid.mockReset()
  sendXConversion.mockClear()
  bg.jobs.length = 0
})

describe('the sale reaches X', () => {
  it('from the browser callback, with the buyer\'s address and browser', async () => {
    markPaid.mockResolvedValue(paid(false))
    await verify(fromBrowser())
    expect(sendXConversion).toHaveBeenCalledWith({
      event: 'purchase',
      conversionId: 'pay_1',
      identity: {
        email: 'asha@example.com', phone: '+919876543210', twclid: 'click1',
        ipAddress: '203.0.113.9', userAgent: 'Mozilla/5.0',
      },
    })
  })

  it('from the webhook, without an address — Razorpay sent that request, not the buyer', async () => {
    markPaid.mockResolvedValue(paid(false))
    await webhook(fromRazorpay())
    expect(sendXConversion).toHaveBeenCalledWith({
      event: 'purchase',
      conversionId: 'pay_1',
      identity: { email: 'asha@example.com', phone: '+919876543210', twclid: 'click1' },
    })
  })

  it('once: a second settlement of the same order reports nothing', async () => {
    markPaid.mockResolvedValue({ status: 'already_paid' })
    await verify(fromBrowser())
    await webhook(fromRazorpay())
    expect(sendXConversion).not.toHaveBeenCalled()
  })

  it('never, for a buyer who ordered with Global Privacy Control on', async () => {
    markPaid.mockResolvedValue(paid(true))
    await verify(fromBrowser())
    markPaid.mockResolvedValue(paid(true))
    await webhook(fromRazorpay())
    expect(sendXConversion).not.toHaveBeenCalled()
  })
})
