import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prepayBalance, MIN_ORDER_PAISE } from '@/lib/plans'

/**
 * Turning cash on delivery into a payment before dispatch.
 *
 * The promise being tested is narrow and absolute: a buyer who pays here is
 * never asked for money at the door afterwards.
 */

describe('what it costs to settle early', () => {
  beforeEach(() => { delete process.env.BALANCE_PREPAY_DISCOUNT_PAISE })

  it('is the whole balance when no incentive is configured', () => {
    expect(prepayBalance(450_000)).toEqual({
      duePaise: 450_000, incentivePaise: 0, nowPaise: 450_000,
    })
  })

  it('takes the configured incentive off', () => {
    process.env.BALANCE_PREPAY_DISCOUNT_PAISE = '20000'
    expect(prepayBalance(450_000)).toEqual({
      duePaise: 450_000, incentivePaise: 20_000, nowPaise: 430_000,
    })
  })

  it('never discounts below what the gateway accepts', () => {
    process.env.BALANCE_PREPAY_DISCOUNT_PAISE = '999999'
    expect(prepayBalance(450_000).nowPaise).toBe(MIN_ORDER_PAISE)
  })

  it('ignores a nonsense setting rather than giving the robot away', () => {
    process.env.BALANCE_PREPAY_DISCOUNT_PAISE = 'free'
    expect(prepayBalance(450_000).incentivePaise).toBe(0)
  })
})

/* ------------------------- the order, and the webhook -------------------- */

const preorders = vi.hoisted(() => ({
  findBalanceByToken: vi.fn(),
  attachBalanceOrder: vi.fn(async () => {}),
  markBalancePaid: vi.fn(),
  markPaid: vi.fn(),
}))
vi.mock('@/lib/preorders', () => preorders)

type OrderCall = { amountPaise: number; notes?: Record<string, string> }
const createOrder = vi.hoisted(() => vi.fn(async (_i: OrderCall) => ({
  status: 'created' as const, orderId: 'order_bal', amountPaise: 0, currency: 'INR' as const, keyId: 'rzp_test',
})))
vi.mock('@/lib/razorpay', () => ({
  createOrder,
  verifyWebhookSignature: () => true,
  verifyPaymentSignature: () => true,
}))

const sendBalanceReceiptEmail = vi.hoisted(() => vi.fn(async () => ({ ok: true })))
vi.mock('@/lib/email', () => ({
  sendBalanceReceiptEmail,
  sendPaymentReceiptEmail: vi.fn(async () => ({ ok: true })),
}))
vi.mock('@/lib/x-conversions', () => ({ sendXConversion: vi.fn(), requestIdentity: () => ({}) }))
vi.mock('@/lib/mixpanel-server', () => ({ sendPaymentConfirmed: vi.fn() }))
vi.mock('@vercel/functions', () => ({ waitUntil: () => {} }))

const { POST: createBalanceOrder } = await import('@/app/api/create-balance-order/route')
const { POST: webhook } = await import('@/app/api/razorpay-webhook/route')

const TOKEN = 'c'.repeat(32)

const booking = (over: Record<string, unknown> = {}) => ({
  id: 9, name: 'Asha Rao', email: 'asha@example.com', qty: 1, edition: 'assembled',
  balanceDuePaise: 450_000, balancePaidAt: null, paidAt: new Date('2026-10-01'), ...over,
})

const ask = () => createBalanceOrder(new Request('https://pebblerobo.com/api/create-balance-order', {
  method: 'POST', body: JSON.stringify({ token: TOKEN }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.BALANCE_PREPAY_DISCOUNT_PAISE
  createOrder.mockResolvedValue({
    status: 'created', orderId: 'order_bal', amountPaise: 0, currency: 'INR', keyId: 'rzp_test',
  })
})

describe('starting a balance payment', () => {
  it('charges what this booking actually owes', async () => {
    preorders.findBalanceByToken.mockResolvedValue(booking())
    const res = await ask()
    expect(res.status).toBe(201)
    expect(createOrder.mock.calls[0]![0].amountPaise).toBe(450_000)
  })

  it('marks the order as a balance, so the webhook can tell it from a deposit', async () => {
    preorders.findBalanceByToken.mockResolvedValue(booking())
    await ask()
    expect(createOrder.mock.calls[0]![0].notes).toMatchObject({ payment_type: 'balance' })
  })

  it('applies the incentive the page promised', async () => {
    process.env.BALANCE_PREPAY_DISCOUNT_PAISE = '20000'
    preorders.findBalanceByToken.mockResolvedValue(booking())
    await ask()
    expect(createOrder.mock.calls[0]![0].amountPaise).toBe(430_000)
  })

  it('refuses a booking whose deposit was never paid', async () => {
    preorders.findBalanceByToken.mockResolvedValue(booking({ paidAt: null }))
    expect((await ask()).status).toBe(409)
    expect(createOrder).not.toHaveBeenCalled()
  })

  it('refuses one that owes nothing', async () => {
    preorders.findBalanceByToken.mockResolvedValue(booking({ balanceDuePaise: 0 }))
    expect((await ask()).status).toBe(409)
  })

  it('refuses one already settled online', async () => {
    preorders.findBalanceByToken.mockResolvedValue(booking({ balancePaidAt: new Date() }))
    expect((await ask()).status).toBe(409)
    expect(createOrder).not.toHaveBeenCalled()
  })

  it('answers an unknown token without saying whether it exists', async () => {
    preorders.findBalanceByToken.mockResolvedValue(null)
    expect((await ask()).status).toBe(404)
  })
})

describe('settling it', () => {
  const deliver = (notes: Record<string, string>) => webhook(new Request('https://pebblerobo.com/api/razorpay-webhook', {
    method: 'POST',
    headers: { 'x-razorpay-signature': 'ok' },
    body: JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_1', order_id: 'order_bal', amount: 450_000, notes } } },
    }),
  }))

  it('settles the balance, not the deposit, when the note says so', async () => {
    preorders.markBalancePaid.mockResolvedValue({
      status: 'paid', name: 'Asha', email: 'asha@example.com', qty: 1, edition: 'assembled',
      amountPaise: 450_000, phone: null, address: null, city: null, pincode: null,
    })
    const res = await deliver({ payment_type: 'balance' })

    expect(await res.json()).toEqual({ status: 'paid' })
    expect(preorders.markBalancePaid).toHaveBeenCalled()
    expect(preorders.markPaid).not.toHaveBeenCalled()
  })

  it('sends a receipt that says nothing is due at the door', async () => {
    preorders.markBalancePaid.mockResolvedValue({
      status: 'paid', name: 'Asha', email: 'asha@example.com', qty: 1, edition: 'assembled',
      amountPaise: 450_000, phone: null, address: null, city: null, pincode: null,
    })
    await deliver({ payment_type: 'balance' })
    expect(sendBalanceReceiptEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'asha@example.com', amountPaise: 450_000 }))
  })

  it('sends nothing on a redelivery, so nobody is told twice', async () => {
    preorders.markBalancePaid.mockResolvedValue({ status: 'already_paid' })
    const res = await deliver({ payment_type: 'balance' })
    expect(await res.json()).toEqual({ status: 'already_paid' })
    expect(sendBalanceReceiptEmail).not.toHaveBeenCalled()
  })

  it('still treats an unmarked payment as a deposit', async () => {
    preorders.markPaid.mockResolvedValue({ status: 'already_paid' })
    await deliver({ payment_type: 'booking_deposit' })
    expect(preorders.markPaid).toHaveBeenCalled()
    expect(preorders.markBalancePaid).not.toHaveBeenCalled()
  })
})
