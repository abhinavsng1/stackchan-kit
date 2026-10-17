import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PRICE } from '@/lib/kit'

/**
 * Paying for a booking: what the gateway is asked for, and who decides it.
 *
 * The browser may say which plan it wants. It may never say what that costs.
 */

const preorders = vi.hoisted(() => ({
  findByPaymentToken: vi.fn(),
  attachOrder: vi.fn(async () => {}),
  setPlan: vi.fn(async () => true),
}))
vi.mock('@/lib/preorders', () => preorders)

type OrderCall = { amountPaise: number; notes?: Record<string, string>; offers?: string[] }
const createOrder = vi.hoisted(() => vi.fn(async (_input: OrderCall) => ({
  status: 'created' as const, orderId: 'order_1', amountPaise: 0, currency: 'INR' as const, keyId: 'rzp_test',
})))
vi.mock('@/lib/razorpay', () => ({ createOrder }))

const { POST } = await import('@/app/api/create-order/route')

const TOKEN = 'a'.repeat(32)

const booking = (over: Record<string, unknown> = {}) => ({
  id: 7, name: 'Asha Rao', email: 'asha@example.com', phone: '+919876543210',
  qty: 1, edition: 'assembled', paidAt: null, plan: 'deposit', variant: null,
  couponCode: null, discountPaise: 0, balanceDuePaise: 0, balancePaidAt: null,
  ...over,
})

const post = (body: unknown) =>
  POST(new Request('https://pebblerobo.com/api/create-order', {
    method: 'POST', body: JSON.stringify(body),
  }))

beforeEach(() => {
  vi.clearAllMocks()
  createOrder.mockResolvedValue({
    status: 'created', orderId: 'order_1', amountPaise: 0, currency: 'INR', keyId: 'rzp_test',
  })
})

describe('the amount the gateway is asked for', () => {
  it('is the deposit for a deposit booking', async () => {
    preorders.findByPaymentToken.mockResolvedValue(booking())
    const res = await post({ token: TOKEN })
    expect(res.status).toBe(201)
    expect(createOrder.mock.calls[0]?.[0]).toMatchObject({ amountPaise: PRICE.depositPaise })
  })

  it('is the whole price when the booking is on the full plan', async () => {
    preorders.findByPaymentToken.mockResolvedValue(booking({ plan: 'full' }))
    await post({ token: TOKEN })
    expect(createOrder.mock.calls[0]![0].amountPaise)
      .toBe(PRICE.depositPaise + PRICE.balancePaise)
  })

  it('is never taken from the request', async () => {
    preorders.findByPaymentToken.mockResolvedValue(booking())
    await post({ token: TOKEN, amount: 100, qty: 5 })
    expect(createOrder.mock.calls[0]![0].amountPaise).toBe(PRICE.depositPaise)
  })
})

describe('switching plan at the payment screen', () => {
  it('moves the booking before charging, so settlement checks the same figure', async () => {
    preorders.findByPaymentToken.mockResolvedValue(booking({ plan: 'deposit' }))
    const res = await post({ token: TOKEN, plan: 'full' })
    const body = await res.json()

    expect(preorders.setPlan).toHaveBeenCalledWith(7, 'full')
    expect(body.plan).toBe('full')
    expect(createOrder.mock.calls[0]![0].amountPaise)
      .toBe(PRICE.depositPaise + PRICE.balancePaise)
    expect(body.balance_due_paise).toBe(0)
  })

  it('charges the old plan if the row could not be moved', async () => {
    preorders.findByPaymentToken.mockResolvedValue(booking({ plan: 'deposit' }))
    preorders.setPlan.mockResolvedValueOnce(false)
    const res = await post({ token: TOKEN, plan: 'full' })
    expect((await res.json()).plan).toBe('deposit')
    expect(createOrder.mock.calls[0]![0].amountPaise).toBe(PRICE.depositPaise)
  })

  it('refuses a plan that does not exist', async () => {
    preorders.findByPaymentToken.mockResolvedValue(booking())
    const res = await post({ token: TOKEN, plan: 'emi' })
    expect(res.status).toBe(400)
    expect(createOrder).not.toHaveBeenCalled()
  })
})

describe('what the dashboard is told', () => {
  it('names the plan and what the courier still collects', async () => {
    preorders.findByPaymentToken.mockResolvedValue(booking())
    await post({ token: TOKEN })
    expect(createOrder.mock.calls[0]![0].notes).toMatchObject({
      plan: 'deposit',
      payment_type: 'booking_deposit',
      balance_due_on_delivery_paise: String(PRICE.balancePaise),
    })
  })

  it('says full payment, and nothing due, on the full plan', async () => {
    preorders.findByPaymentToken.mockResolvedValue(booking({ plan: 'full' }))
    await post({ token: TOKEN })
    expect(createOrder.mock.calls[0]![0].notes).toMatchObject({
      plan: 'full',
      payment_type: 'full_payment',
      balance_due_on_delivery_paise: '0',
    })
  })
})

describe('bookings that cannot be paid for', () => {
  it('refuses one that is already paid', async () => {
    preorders.findByPaymentToken.mockResolvedValue(booking({ paidAt: new Date() }))
    const res = await post({ token: TOKEN })
    expect(res.status).toBe(409)
    expect(createOrder).not.toHaveBeenCalled()
  })

  it('answers an unknown token exactly as it answers a malformed one', async () => {
    preorders.findByPaymentToken.mockResolvedValue(null)
    expect((await post({ token: TOKEN })).status).toBe(404)
    expect((await post({ token: 'nope' })).status).toBe(400)
  })
})

describe('the No-Cost EMI offer', () => {
  afterEach(() => { delete process.env.RAZORPAY_NOCOST_EMI_OFFER_ID })

  it('is attached when the whole price is being charged', async () => {
    process.env.RAZORPAY_NOCOST_EMI_OFFER_ID = 'offer_test'
    preorders.findByPaymentToken.mockResolvedValue(booking({ plan: 'full' }))
    await post({ token: TOKEN })
    expect(createOrder.mock.calls[0]![0]).toMatchObject({ offers: ['offer_test'] })
  })

  it('is left off a deposit, which is below the offer’s own floor', async () => {
    process.env.RAZORPAY_NOCOST_EMI_OFFER_ID = 'offer_test'
    preorders.findByPaymentToken.mockResolvedValue(booking({ plan: 'deposit' }))
    await post({ token: TOKEN })
    expect(createOrder.mock.calls[0]![0]).not.toHaveProperty('offers')
  })

  it('attaches nothing when no offer is configured', async () => {
    preorders.findByPaymentToken.mockResolvedValue(booking({ plan: 'full' }))
    await post({ token: TOKEN })
    expect(createOrder.mock.calls[0]![0]).not.toHaveProperty('offers')
  })
})
