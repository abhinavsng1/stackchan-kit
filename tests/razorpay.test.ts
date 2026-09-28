import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import crypto from 'node:crypto'
import { PRICE } from '@/lib/kit'
import {
  orderAmountPaise, balanceDuePaise, totalPaise, verifyPaymentSignature, MAX_QTY,
} from '@/lib/razorpay'

const SECRET = 'test_secret_value'

beforeEach(() => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_key'
  process.env.RAZORPAY_KEY_SECRET = SECRET
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the amount is decided on the server', () => {
  it('charges the booking deposit, not the price of the kit', () => {
    // Charging PRICE.nowPaise here would take ₹4,999 for something the buyer
    // was told costs ₹499 today, with the rest due to a courier.
    expect(orderAmountPaise(1)).toBe(PRICE.depositPaise)
    expect(orderAmountPaise(1)).not.toBe(PRICE.nowPaise)
  })

  it('multiplies both halves by quantity', () => {
    expect(orderAmountPaise(3)).toBe(PRICE.depositPaise * 3)
    expect(balanceDuePaise(3)).toBe(PRICE.balancePaise * 3)
  })

  it('splits the price exactly — no rupee appears or vanishes', () => {
    for (const qty of [1, 2, 3, 4, 5]) {
      expect(totalPaise(qty)).toBe(PRICE.nowPaise * qty)
    }
  })

  it('stays in step with the figures shown on the page', () => {
    // Guards against a display string and a charged amount drifting apart,
    // which would let the site advertise one figure and bill another.
    const shown = (s: string) => Number(s.replace(/[^\d]/g, '')) * 100
    expect(orderAmountPaise(1)).toBe(shown(PRICE.deposit))
    expect(balanceDuePaise(1)).toBe(shown(PRICE.balance))
    expect(PRICE.nowPaise).toBe(shown(PRICE.now))
  })

  it.each([0, -1, 1.5, MAX_QTY + 1, NaN, Infinity])(
    'refuses to quote a balance for a quantity of %s', (qty) => {
      expect(() => balanceDuePaise(qty)).toThrow(RangeError)
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
      new Response(JSON.stringify({ id: 'order_1', amount: PRICE.depositPaise * 2 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const { createOrder } = await import('@/lib/razorpay')
    const result = await createOrder(2)

    expect(result).toMatchObject({ status: 'created', orderId: 'order_1' })
    const init = fetchMock.mock.calls[0]?.[1]
    const body = JSON.parse(String(init?.body))
    // The deposit, never the price of the kits.
    expect(body.amount).toBe(PRICE.depositPaise * 2)
    expect(body.currency).toBe('INR')
    // What the courier will be asked for, recorded where a human reconciling
    // a payment in the Razorpay dashboard can see it.
    expect(body.notes.payment_type).toBe('booking_deposit')
    expect(body.notes.balance_due_on_delivery_paise).toBe(String(PRICE.balancePaise * 2))
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
    const sig = crypto.createHmac('sha256', 'whsec_test').update('{"amount":499900}').digest('hex')
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
    qty: 2, amountPaise: 99_800, balanceDuePaise: 900_000, paymentId: 'pay_ABC123',
  }

  it('states the amounts in rupees, not paise', async () => {
    const { receiptText, receiptHtml } = await import('@/lib/email')
    for (const body of [receiptText(receipt), receiptHtml(receipt)]) {
      expect(body).toContain('₹998')      // deposit taken
      expect(body).toContain('₹9,000')    // cash due at the door
      expect(body).toContain('₹9,998')    // and what the two come to
      // The raw paise figures must never be shown as a price.
      expect(body).not.toContain('99800')
      expect(body).not.toContain('900000')
    }
  })

  it('tells the buyer to have the balance ready, in cash', async () => {
    // Someone who does not read this is someone the courier turns away.
    const { receiptText, receiptHtml } = await import('@/lib/email')
    for (const body of [receiptText(receipt), receiptHtml(receipt)]) {
      expect(body).toMatch(/cash/i)
      expect(body).toMatch(/courier/i)
    }
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
    city: 'Bengaluru', pincode: '560078', balanceDuePaise: 900_000,
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

  it('says the booking is confirmed, and does not claim the kit is paid for', async () => {
    const { receiptSubject, receiptText } = await import('@/lib/email')
    expect(receiptSubject()).toContain('confirmed')
    // "Nothing more is needed from you" was true when the whole price was
    // taken at checkout. It is now the opposite of true.
    expect(receiptText(full)).not.toMatch(/nothing more is needed/i)
    expect(receiptText(full)).not.toMatch(/nothing has been charged/i)
  })
})

describe('payment failures are reportable', () => {
  const ORDER_URL = 'http://localhost/api/create-order'

  async function attempt(fetchImpl: typeof fetch) {
    vi.stubGlobal('fetch', fetchImpl)
    vi.stubGlobal('window', {
      Razorpay: function () { return { open() {}, on() {} } },
      document: undefined,
    } as unknown as Window)
    const { openCheckout, CheckoutError } = await import('@/lib/checkout')
    try {
      await openCheckout({ token: 'a'.repeat(32), entity: 'Pebble Robo', description: 'kit' })
      return null
    } catch (e) {
      return e instanceof CheckoutError ? e.detail : { stage: 'not-a-CheckoutError' }
    }
  }

  it('names an expired or wrong gateway key, the failure nobody can pay through', async () => {
    // This is the one that cost hours: every buyer blocked, and no signal.
    const detail = await attempt(async () =>
      new Response(JSON.stringify({ error: 'nope', code: 'gateway_unauthorized' }), { status: 401 }))
    expect(detail).toMatchObject({
      stage: 'create_order', code: 'gateway_unauthorized', httpStatus: 401,
    })
  })

  it('distinguishes a dead network from a refusal', async () => {
    const detail = await attempt(async () => { throw new TypeError('Failed to fetch') })
    expect(detail).toMatchObject({ stage: 'create_order', code: 'network' })
  })

  it('reports an unusable payment link separately from a gateway fault', async () => {
    const detail = await attempt(async () =>
      new Response(JSON.stringify({ error: 'no', code: 'unknown_token' }), { status: 404 }))
    expect(detail).toMatchObject({ stage: 'create_order', code: 'unknown_token', httpStatus: 404 })
  })

  it('falls back to a code rather than reporting nothing', async () => {
    const detail = await attempt(async () => new Response('not json', { status: 500 }))
    expect(detail).toMatchObject({ stage: 'create_order', code: 'http_error', httpStatus: 500 })
  })

  it('carries no buyer details into analytics', async () => {
    const detail = await attempt(async () =>
      new Response(JSON.stringify({ error: 'x', code: 'gateway_error' }), { status: 500 }))
    const keys = Object.keys(detail ?? {})
    for (const forbidden of ['name', 'email', 'phone', 'address', 'amount', 'card']) {
      expect(keys).not.toContain(forbidden)
    }
  })
})
