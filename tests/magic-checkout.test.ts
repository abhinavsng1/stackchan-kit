import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readMagicPayment, readMagicCustomer, shippingFor, servicedPincode, lineItemsFor, magicEnabled } from '@/lib/magic'
import { PRICE } from '@/lib/kit'

/**
 * Magic Checkout, which is written but not switched on.
 *
 * The rule the whole module follows: read what the order says, never assume
 * what it will say. Partial COD is configured on Razorpay's side and its
 * shape is not documented for custom web integrations, so these tests pin the
 * behaviour for the shapes we understand — and pin that an unfamiliar one is
 * flagged rather than guessed at.
 */

const LIST = PRICE.depositPaise + PRICE.balancePaise

afterEach(() => { delete process.env.MAGIC_CHECKOUT; delete process.env.MAGIC_COD })

describe('the flag', () => {
  it('is off unless it is explicitly on', () => {
    expect(magicEnabled()).toBe(false)
    process.env.MAGIC_CHECKOUT = '0'
    expect(magicEnabled()).toBe(false)
    process.env.MAGIC_CHECKOUT = '1'
    expect(magicEnabled()).toBe(true)
  })
})

describe('reading what was paid', () => {
  it('a prepaid order owes nothing at the door', () => {
    expect(readMagicPayment({ amount: LIST, amount_paid: LIST, amount_due: 0 }, { method: 'upi' }))
      .toEqual({ plan: 'full', paidPaise: LIST, balanceDuePaise: 0, unrecognised: false })
  })

  it('a cash-on-delivery order owes the whole price at the door', () => {
    expect(readMagicPayment({ amount: LIST, amount_paid: 0 }, { method: 'cod' }))
      .toEqual({ plan: 'deposit', paidPaise: 0, balanceDuePaise: LIST, unrecognised: false })
  })

  it('a partial payment is a deposit booking, with the rest at the door', () => {
    const out = readMagicPayment(
      { amount: LIST, amount_paid: 49_900, amount_due: LIST - 49_900 },
      { method: 'cod', amount: 49_900 },
    )
    expect(out).toEqual({
      plan: 'deposit', paidPaise: 49_900, balanceDuePaise: LIST - 49_900, unrecognised: false,
    })
  })

  it('derives what is still owed when the order does not say', () => {
    const out = readMagicPayment({ amount: LIST, amount_paid: 49_900 }, { method: 'card' })
    expect(out.balanceDuePaise).toBe(LIST - 49_900)
  })

  it('flags a shape it does not understand instead of inventing a balance', () => {
    const out = readMagicPayment({}, {})
    expect(out.unrecognised).toBe(true)
  })

  it('flags a cash order for nothing at all', () => {
    expect(readMagicPayment({ amount: 0 }, { method: 'cod' }).unrecognised).toBe(true)
  })
})

describe('reading the buyer', () => {
  const order = {
    customer_details: {
      name: 'Asha Rao', email: 'ASHA@Example.com ', contact: '+919876543210',
      shipping_address: {
        line1: '42, Sector 18', line2: 'Near the park', city: 'Gurugram',
        state: 'HR', zipcode: '122002', country: 'IN',
      },
    },
  }

  it('takes the shipping address, joined into one line', () => {
    expect(readMagicCustomer(order)).toEqual({
      name: 'Asha Rao', email: 'asha@example.com', phone: '+919876543210',
      address: '42, Sector 18, Near the park', city: 'Gurugram', pincode: '122002',
    })
  })

  it('falls back to the billing address when there is no shipping one', () => {
    const billing = { customer_details: { email: 'a@b.com', billing_address: { line1: 'X', city: 'Pune', zipcode: '411001' } } }
    expect(readMagicCustomer(billing)).toMatchObject({ city: 'Pune', pincode: '411001' })
  })

  it('gives up when there is no email, because a booking needs one', () => {
    expect(readMagicCustomer({ customer_details: { name: 'Nobody' } })).toBe(null)
    expect(readMagicCustomer({})).toBe(null)
  })
})

describe('answering whether we ship there', () => {
  it('accepts a real Indian PIN code', () => {
    expect(servicedPincode('560078')).toBe(true)
  })

  it('refuses one that cannot exist', () => {
    expect(servicedPincode('012345')).toBe(false)
    expect(servicedPincode('56007')).toBe(false)
    expect(servicedPincode(undefined)).toBe(false)
  })

  it('offers free delivery where we ship, and never Razorpay\u2019s own COD', () => {
    // One-tap sells the robot outright, so nothing is left for the door —
    // and the account cannot take COD anyway. Offering it is what made
    // Razorpay reject the whole shipping method.
    const [method] = shippingFor({ id: '0', zipcode: '560078', country: 'IN' }).shipping_methods
    expect(method).toMatchObject({ id: '1', serviceable: true, shipping_fee: 0, cod: false, cod_fee: 0 })
  })

  it('can offer it the day the account can take it', () => {
    process.env.MAGIC_COD = '1'
    const [method] = shippingFor({ id: '0', zipcode: '560078', country: 'IN' }).shipping_methods
    expect(method).toMatchObject({ serviceable: true, cod: true })
  })

  it('offers nothing where we do not, and charges no COD fee either', () => {
    const [method] = shippingFor({ id: '0', zipcode: '560078', country: 'US' }).shipping_methods
    expect(method).toMatchObject({ serviceable: false, cod: false, cod_fee: 0 })
  })
})

describe('the cart Razorpay is given', () => {
  it('always carries a total, without which the order is not a Magic order', () => {
    const { lineItems, lineItemsTotalPaise } = lineItemsFor(1)
    expect(lineItems).toHaveLength(1)
    expect(lineItemsTotalPaise).toBe(LIST)
  })

  it('totals by quantity', () => {
    expect(lineItemsFor(3).lineItemsTotalPaise).toBe(LIST * 3)
  })

  it('takes a discount off the total it declares', () => {
    expect(lineItemsFor(1, 'assembled', 50_000).lineItemsTotalPaise).toBe(LIST - 50_000)
  })
})

/* ----------------------------- the endpoints ----------------------------- */

vi.mock('@/lib/coupons', () => ({
  listCoupons: vi.fn(async () => []),
  validateCoupon: vi.fn(async () => ({ valid: false, reason: 'unknown' })),
  findCoupon: vi.fn(async () => null),
  discountFor: () => 0,
  normaliseCode: (c: string) => c.trim().toUpperCase(),
}))
vi.mock('@/lib/razorpay', () => ({ createOrder: vi.fn() }))

const { POST: shipping } = await import('@/app/api/magic/shipping-info/route')
const { POST: promotions } = await import('@/app/api/magic/promotions/route')
const { POST: order } = await import('@/app/api/magic/order/route')

const call = (fn: (r: Request) => Promise<Response>, body: unknown) =>
  fn(new Request('https://pebblerobo.com/api/magic/x', { method: 'POST', body: JSON.stringify(body) }))

describe('with the flag off', () => {
  beforeEach(() => { delete process.env.MAGIC_CHECKOUT })

  it('shipping-info does not exist', async () => {
    expect((await call(shipping, { addresses: [] })).status).toBe(404)
  })

  it('promotions does not exist', async () => {
    expect((await call(promotions, {})).status).toBe(404)
  })

  it('no order can be created', async () => {
    expect((await call(order, { qty: 1 })).status).toBe(404)
  })
})

describe('with the flag on', () => {
  beforeEach(() => { process.env.MAGIC_CHECKOUT = '1' })

  it('answers each address it is given', async () => {
    const res = await call(shipping, {
      addresses: [{ id: '0', zipcode: '560078', country: 'IN' }, { id: '1', zipcode: 'nope' }],
    })
    const body = await res.json()
    expect(body.addresses).toHaveLength(2)
    expect(body.addresses[0].shipping_methods[0].serviceable).toBe(true)
    expect(body.addresses[1].shipping_methods[0].serviceable).toBe(false)
  })

  it('survives a request with no addresses at all', async () => {
    expect((await call(shipping, {})).status).toBe(200)
  })
})
