import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import crypto from 'node:crypto'
import { PRICE } from '@/lib/kit'
import { orderAmountPaise, verifyPaymentSignature, MAX_QTY } from '@/lib/razorpay'

const SECRET = 'test_secret_value'

beforeEach(() => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_key'
  process.env.RAZORPAY_KEY_SECRET = SECRET
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the amount is decided on the server', () => {
  it('charges the published price for one kit', () => {
    expect(orderAmountPaise(1)).toBe(PRICE.nowPaise)
  })

  it('multiplies by quantity', () => {
    expect(orderAmountPaise(3)).toBe(PRICE.nowPaise * 3)
  })

  it('stays in step with the price shown on the page', () => {
    // Guards against the display string and the charged amount drifting apart,
    // which would let the site advertise one price and bill another.
    const shown = Number(PRICE.now.replace(/[^\d]/g, ''))
    expect(orderAmountPaise(1)).toBe(shown * 100)
  })

  it.each([0, -1, 1.5, MAX_QTY + 1, NaN, Infinity])(
    'refuses a quantity of %s rather than pricing it', (qty) => {
      expect(() => orderAmountPaise(qty)).toThrow(RangeError)
    })
})

describe('payment signature verification', () => {
  const orderId = 'order_ABC123'
  const paymentId = 'pay_XYZ789'

  const sign = (payload: string, secret = SECRET) =>
    crypto.createHmac('sha256', secret).update(payload).digest('hex')

  it('accepts a signature made with the real secret', () => {
    expect(verifyPaymentSignature({
      orderId, paymentId, signature: sign(`${orderId}|${paymentId}`),
    })).toBe(true)
  })

  it('rejects a signature made with a different secret', () => {
    expect(verifyPaymentSignature({
      orderId, paymentId, signature: sign(`${orderId}|${paymentId}`, 'wrong_secret'),
    })).toBe(false)
  })

  it('rejects a signature for a different order', () => {
    // The payment really happened, but against someone else's order — this is
    // the replay the signature check exists to catch.
    expect(verifyPaymentSignature({
      orderId, paymentId, signature: sign(`order_OTHER|${paymentId}`),
    })).toBe(false)
  })

  it('rejects a signature for a different payment', () => {
    expect(verifyPaymentSignature({
      orderId, paymentId, signature: sign(`${orderId}|pay_OTHER`),
    })).toBe(false)
  })

  it('rejects a truncated signature without throwing', () => {
    // timingSafeEqual throws on unequal lengths; the guard must catch this
    // first or a short signature becomes a 500 instead of a refusal.
    expect(verifyPaymentSignature({
      orderId, paymentId, signature: sign(`${orderId}|${paymentId}`).slice(0, 20),
    })).toBe(false)
  })

  it('rejects an empty signature', () => {
    expect(verifyPaymentSignature({ orderId, paymentId, signature: '' })).toBe(false)
  })

  it('refuses everything when no secret is configured', () => {
    delete process.env.RAZORPAY_KEY_SECRET
    expect(verifyPaymentSignature({
      orderId, paymentId, signature: sign(`${orderId}|${paymentId}`),
    })).toBe(false)
  })
})

describe('order creation', () => {
  it('sends the server-computed amount, never a client one', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      new Response(JSON.stringify({ id: 'order_1', amount: PRICE.nowPaise * 2 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const { createOrder } = await import('@/lib/razorpay')
    const result = await createOrder(2)

    expect(result).toMatchObject({ status: 'created', orderId: 'order_1' })
    const init = fetchMock.mock.calls[0]?.[1]
    const body = JSON.parse(String(init?.body))
    expect(body.amount).toBe(PRICE.nowPaise * 2)
    expect(body.currency).toBe('INR')
    expect(String(body.receipt).length).toBeLessThanOrEqual(40)
  })

  it('reports an upstream 401 without leaking the reason outward', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })))
    const { createOrder } = await import('@/lib/razorpay')
    expect(await createOrder(1)).toEqual({ status: 'upstream_error', detail: 'unauthorized' })
  })

  it('survives the payment provider being unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED') }))
    const { createOrder } = await import('@/lib/razorpay')
    expect(await createOrder(1)).toMatchObject({ status: 'upstream_error' })
  })

  it('says so when keys are absent rather than calling out', async () => {
    delete process.env.RAZORPAY_KEY_ID
    delete process.env.RAZORPAY_KEY_SECRET
    const calls = vi.fn()
    vi.stubGlobal('fetch', calls)
    const { createOrder } = await import('@/lib/razorpay')
    expect(await createOrder(1)).toEqual({ status: 'unconfigured' })
    expect(calls).not.toHaveBeenCalled()
  })
})

describe('webhook signature', () => {
  it('accepts a body signed with the webhook secret', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test'
    const { verifyWebhookSignature } = await import('@/lib/razorpay')
    const body = '{"event":"payment.captured"}'
    const sig = crypto.createHmac('sha256', 'whsec_test').update(body).digest('hex')
    expect(verifyWebhookSignature(body, sig)).toBe(true)
  })

  it('rejects a body signed with the API key secret instead', async () => {
    // They are different values; using one for the other is a real mistake and
    // must fail closed rather than pass.
    process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test'
    const { verifyWebhookSignature } = await import('@/lib/razorpay')
    const body = '{"event":"payment.captured"}'
    expect(verifyWebhookSignature(body, crypto.createHmac('sha256', SECRET).update(body).digest('hex'))).toBe(false)
  })

  it('rejects a tampered body', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test'
    const { verifyWebhookSignature } = await import('@/lib/razorpay')
    const sig = crypto.createHmac('sha256', 'whsec_test').update('{"amount":899900}').digest('hex')
    expect(verifyWebhookSignature('{"amount":100}', sig)).toBe(false)
  })

  it('refuses everything when no webhook secret is set', async () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET
    const { verifyWebhookSignature } = await import('@/lib/razorpay')
    expect(verifyWebhookSignature('{}', 'a'.repeat(64))).toBe(false)
  })
})

describe('payment tokens', () => {
  it('are unguessable and never repeat', async () => {
    const { newPaymentToken } = await import('@/lib/preorders')
    const seen = new Set(Array.from({ length: 2000 }, () => newPaymentToken()))
    expect(seen.size).toBe(2000)
    for (const t of seen) expect(t).toMatch(/^[a-f0-9]{32}$/)
  })
})

describe('payment receipt', () => {
  const receipt = {
    name: 'Asha Rao', email: 'asha@example.com',
    qty: 2, amountPaise: 1_799_800, paymentId: 'pay_ABC123',
  }

  it('states the amount in rupees, not paise', async () => {
    const { receiptText, receiptHtml } = await import('@/lib/email')
    expect(receiptText(receipt)).toContain('₹17,998')
    expect(receiptHtml(receipt)).toContain('₹17,998')
    // The raw paise figure must never be shown as a price.
    expect(receiptText(receipt)).not.toContain('1799800')
  })

  it('carries the payment id so the buyer has a reference', async () => {
    const { receiptText, receiptHtml } = await import('@/lib/email')
    expect(receiptText(receipt)).toContain('pay_ABC123')
    expect(receiptHtml(receipt)).toContain('pay_ABC123')
  })

  it('greets by first name only', async () => {
    const { receiptText } = await import('@/lib/email')
    expect(receiptText(receipt)).toContain('Hi Asha,')
  })

  it('escapes a name that contains markup', async () => {
    const { receiptHtml } = await import('@/lib/email')
    const html = receiptHtml({ ...receipt, name: '<script>alert(1)</script> Rao' })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('reports rather than throws when no provider is configured', async () => {
    delete process.env.RESEND_API_KEY
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASSWORD
    const { sendPaymentReceiptEmail } = await import('@/lib/email')
    await expect(sendPaymentReceiptEmail(receipt)).resolves.toMatchObject({ ok: false, provider: 'none' })
  })
})

describe('order confirmation shows where it is going', () => {
  const full = {
    name: 'Asha Rao', email: 'asha@example.com', qty: 1,
    amountPaise: 899_900, paymentId: 'pay_ABC',
    phone: '+919876543210', address: '12 Silicon Gardenia, JP Nagar',
    city: 'Bengaluru', pincode: '560078',
  }

  it('prints the address back so a mistake is caught before the label', async () => {
    const { receiptText, receiptHtml } = await import('@/lib/email')
    for (const body of [receiptText(full), receiptHtml(full)]) {
      expect(body).toContain('12 Silicon Gardenia')
      expect(body).toContain('Bengaluru')
      expect(body).toContain('560078')
      expect(body).toContain('+919876543210')
    }
  })

  it('omits the shipping block entirely when there is no address', async () => {
    const { receiptText, receiptHtml } = await import('@/lib/email')
    const bare = { ...full, phone: null, address: null, city: null, pincode: null }
    // An empty "Shipping to" heading is worse than none at all.
    expect(receiptText(bare)).not.toContain('SHIPPING TO')
    expect(receiptHtml(bare)).not.toContain('Shipping to')
  })

  it('says the order is confirmed, not merely reserved', async () => {
    const { receiptSubject, receiptText } = await import('@/lib/email')
    expect(receiptSubject()).toContain('confirmed')
    expect(receiptText(full)).not.toMatch(/nothing has been charged/i)
  })
})
