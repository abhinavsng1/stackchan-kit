import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readMagicPayment, readMagicCustomer, shippingFor, servicedPincode, lineItemsFor, magicEnabled, magicOrderAmount, magicBalanceDue } from '@/lib/magic'
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

  it('offers cash at the door on the full price, once the account can take it', () => {
    process.env.MAGIC_COD = '1'
    const [method] = shippingFor({ id: '0', zipcode: '560078', country: 'IN' }, 'full').shipping_methods
    expect(method).toMatchObject({ serviceable: true, cod: true })
  })

  it('never offers it on a deposit order, however enabled the account is', () => {
    // The deposit order holds a ₹499 cart. Cash on delivery against it means
    // collecting ₹499 at the door and letting the ₹4,500 that pays for the
    // robot disappear — the money gone before anybody notices.
    process.env.MAGIC_COD = '1'
    const [method] = shippingFor({ id: '0', zipcode: '560078', country: 'IN' }, 'deposit').shipping_methods
    expect(method).toMatchObject({ serviceable: true, cod: false })
  })

  it('errs towards prepaid when it cannot tell which plan the order is on', () => {
    process.env.MAGIC_COD = '1'
    const [method] = shippingFor({ id: '0', zipcode: '560078', country: 'IN' }, null).shipping_methods
    expect(method.cod).toBe(false)
  })

  it('offers nothing where we do not, and charges no COD fee either', () => {
    const [method] = shippingFor({ id: '0', zipcode: '560078', country: 'US' }).shipping_methods
    expect(method).toMatchObject({ serviceable: false, cod: false, cod_fee: 0 })
  })
})

describe('the cart Razorpay is given', () => {
  it('always carries a total, without which the order is not a Magic order', () => {
    const { lineItems, lineItemsTotalPaise } = lineItemsFor('full', 1)
    expect(lineItems).toHaveLength(1)
    expect(lineItemsTotalPaise).toBe(LIST)
  })

  it('totals by quantity', () => {
    expect(lineItemsFor('full', 3).lineItemsTotalPaise).toBe(LIST * 3)
  })

  it('takes a discount off the total it declares', () => {
    expect(lineItemsFor('full', 1, 'assembled', 50_000).lineItemsTotalPaise).toBe(LIST - 50_000)
  })
})


/* --------------------------- the two doors ------------------------------- */

describe('selling the ₹499 booking through the one-tap window', () => {
  it('asks Razorpay for the deposit, not the price of the robot', () => {
    expect(magicOrderAmount('deposit', 1)).toBe(PRICE.depositPaise)
    expect(magicOrderAmount('full', 1)).toBe(LIST)
  })

  it('declares a cart worth exactly what it charges, so nothing reads as cash on delivery', () => {
    // The whole reason the window broke the first time: a shortfall between
    // the cart and the payment is partial COD, which this account cannot take.
    const { lineItemsTotalPaise } = lineItemsFor('deposit', 1)
    expect(lineItemsTotalPaise).toBe(magicOrderAmount('deposit', 1))
  })

  it('still owes the balance, and says so in the line it shows the buyer', () => {
    expect(magicBalanceDue('deposit', 1)).toBe(PRICE.balancePaise)
    expect(magicBalanceDue('full', 1)).toBe(0)
    expect(lineItemsFor('deposit', 1).lineItems[0]!.description).toContain('4,500')
  })

  it('counts by quantity on both doors', () => {
    expect(magicOrderAmount('deposit', 3)).toBe(PRICE.depositPaise * 3)
    expect(lineItemsFor('deposit', 3).lineItemsTotalPaise).toBe(PRICE.depositPaise * 3)
    expect(magicBalanceDue('deposit', 3)).toBe(PRICE.balancePaise * 3)
  })

  it('takes a deposit discount off the door, never off the ₹499 charged now', () => {
    expect(magicOrderAmount('deposit', 1, 50_000)).toBe(PRICE.depositPaise)
    expect(magicBalanceDue('deposit', 1, 50_000)).toBe(PRICE.balancePaise - 50_000)
  })

  it('names the colour the way the buyer knows it, not by its id', () => {
    // 'graphite' is an internal id; the swatch says Black. Razorpay's cart is
    // the last place a wrong colour can be caught, so it has to use the same
    // word the page did.
    const line = lineItemsFor('deposit', 1, 'assembled', 0, 'graphite').lineItems[0]!
    expect(line.name).toContain('Black')
    expect(line.name).not.toContain('graphite')
    expect(lineItemsFor('full', 1, 'assembled', 0, null).lineItems[0]!.name).not.toContain('·')
  })

  it('shows the robot they chose, not always the black one', () => {
    expect(lineItemsFor('full', 1, 'assembled', 0, 'moss').lineItems[0]!.image_url).toContain('float-shell-moss')
    expect(lineItemsFor('full', 1, 'assembled', 0, null).lineItems[0]!.image_url).toContain('float-shell-graphite')
  })

  it('ignores a colour we do not sell rather than printing it', () => {
    const line = lineItemsFor('full', 1, 'assembled', 0, 'tartan').lineItems[0]!
    expect(line.name).not.toContain('tartan')
    expect(line.image_url).toContain('float-shell-graphite')
  })
})

describe('reading a ₹499 booking back, after it has settled', () => {
  const order = {
    amount: PRICE.depositPaise,
    amount_paid: PRICE.depositPaise,
    amount_due: 0,
    notes: { plan: 'deposit', balance_due_paise: String(PRICE.balancePaise) },
  }

  it('is a deposit with a balance, not a sale in full', () => {
    // Left to arithmetic this is a fully-paid order and the ₹4,500 a courier
    // collects would vanish from the booking.
    expect(readMagicPayment(order, { method: 'upi' })).toEqual({
      plan: 'deposit',
      paidPaise: PRICE.depositPaise,
      balanceDuePaise: PRICE.balancePaise,
      unrecognised: false,
    })
  })

  it('carries a discounted balance through unchanged', () => {
    const discounted = { ...order, notes: { plan: 'deposit', balance_due_paise: '400000' } }
    expect(readMagicPayment(discounted, { method: 'card' }).balanceDuePaise).toBe(400_000)
  })

  it('still reads a full sale as owing nothing', () => {
    const full = { amount: LIST, amount_paid: LIST, amount_due: 0, notes: { plan: 'full', balance_due_paise: '0' } }
    expect(readMagicPayment(full, { method: 'upi' })).toMatchObject({ plan: 'full', balanceDuePaise: 0 })
  })

  it('falls back to the arithmetic when an order carries no note', () => {
    expect(readMagicPayment({ amount: LIST, amount_paid: LIST, amount_due: 0 }, { method: 'upi' }))
      .toMatchObject({ plan: 'full', balanceDuePaise: 0 })
  })

  it('flags a deposit whose balance it cannot read, rather than calling it paid in full', () => {
    // The dangerous direction: falling through to the arithmetic here would
    // record a ₹499 booking as a completed sale and send the courier to the
    // door with nothing to collect.
    const bad = { ...order, notes: { plan: 'deposit', balance_due_paise: 'who knows' } }
    expect(readMagicPayment(bad, { method: 'upi' })).toMatchObject({
      plan: 'deposit', unrecognised: true,
    })
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

  it('asks the gateway for the deposit when the deposit door is tapped', async () => {
    const { createOrder } = await import('@/lib/razorpay')
    vi.mocked(createOrder).mockResolvedValue({
      status: 'created', keyId: 'rzp_test', orderId: 'order_1', amountPaise: PRICE.depositPaise, currency: 'INR',
    } as Awaited<ReturnType<typeof createOrder>>)

    await call(order, { plan: 'deposit', qty: 1, shell: 'graphite' })

    const asked = vi.mocked(createOrder).mock.calls.at(-1)![0]
    expect(asked.amountPaise).toBe(PRICE.depositPaise)
    // The cart must match the charge exactly, or Razorpay reads the gap as COD.
    expect(asked.lineItemsTotalPaise).toBe(PRICE.depositPaise)
    // What the courier is owed cannot be derived afterwards, so it travels here.
    expect(asked.notes).toMatchObject({
      plan: 'deposit', balance_due_paise: String(PRICE.balancePaise), shell: 'graphite',
    })
  })

  it('asks for the whole price when the full door is tapped', async () => {
    const { createOrder } = await import('@/lib/razorpay')
    vi.mocked(createOrder).mockResolvedValue({
      status: 'created', keyId: 'rzp_test', orderId: 'order_2', amountPaise: LIST, currency: 'INR',
    } as Awaited<ReturnType<typeof createOrder>>)

    await call(order, { plan: 'full', qty: 1 })

    const asked = vi.mocked(createOrder).mock.calls.at(-1)![0]
    expect(asked.amountPaise).toBe(LIST)
    expect(asked.notes).toMatchObject({ plan: 'full', balance_due_paise: '0' })
  })

  it('refuses a plan it does not sell, rather than falling back to one', async () => {
    expect((await call(order, { plan: 'whenever', qty: 1 })).status).toBe(400)
  })

  it('ignores a colour that is not on sale instead of recording it', async () => {
    const { createOrder } = await import('@/lib/razorpay')
    vi.mocked(createOrder).mockResolvedValue({
      status: 'created', keyId: 'k', orderId: 'order_3', amountPaise: LIST, currency: 'INR',
    } as Awaited<ReturnType<typeof createOrder>>)

    await call(order, { plan: 'full', qty: 1, shell: 'tartan' })
    expect(vi.mocked(createOrder).mock.calls.at(-1)![0].notes).not.toHaveProperty('shell')
  })
})

describe('what a one-tap sale reports', () => {
  it('builds a profile under the same id the browser would have used', async () => {
    const { buildBuyerProfile, buyerDistinctId } = await import('@/lib/mixpanel-server')
    const built = buildBuyerProfile('tok', {
      email: 'Asha@Example.com', name: 'Asha Rao', phone: '+919876543210',
      city: 'Bengaluru', pincode: '560078', qty: 1, edition: 'assembled',
    })
    expect(built.$distinct_id).toBe(buyerDistinctId('asha@example.com'))
    expect(built.$set).toMatchObject({
      $email: 'Asha@Example.com', $name: 'Asha Rao', $phone: '+919876543210',
      $city: 'Bengaluru', Pincode: '560078', 'Bought With': 'one-tap',
    })
  })

  it('records an unpaid balance in rupees, where a person reads it', async () => {
    const { buildBuyerProfile } = await import('@/lib/mixpanel-server')
    const built = buildBuyerProfile('tok', { email: 'a@b.com', balanceDuePaise: 450_000 })
    expect(built.$set['Balance Due']).toBe(4500)
  })

  it('leaves out what it was never told, rather than writing blanks', async () => {
    const { buildBuyerProfile } = await import('@/lib/mixpanel-server')
    const built = buildBuyerProfile('tok', { email: 'a@b.com' })
    expect(built.$set).not.toHaveProperty('$name')
    expect(built.$set).not.toHaveProperty('$phone')
  })
})

describe('an abandoned checkout', () => {
  beforeEach(() => { process.env.MAGIC_CHECKOUT = '1' })

  it('refuses a request that names no order', async () => {
    const { POST } = await import('@/app/api/magic/abandon/route')
    const call = (body: unknown) =>
      POST(new Request('https://pebblerobo.com/api/magic/abandon', {
        method: 'POST', body: JSON.stringify(body),
      }))
    expect((await call({})).status).toBe(400)
    expect((await call({ order_id: 'x' })).status).toBe(400)
  })

  it('does not exist with the flag off', async () => {
    delete process.env.MAGIC_CHECKOUT
    const { POST } = await import('@/app/api/magic/abandon/route')
    const res = await POST(new Request('https://pebblerobo.com/api/magic/abandon', {
      method: 'POST', body: JSON.stringify({ order_id: 'order_abc123' }),
    }))
    expect(res.status).toBe(404)
  })
})

describe('partial COD, the way Razorpay says to recognise it', () => {
  // Their integration note for native merchants: the tell is the order status,
  // not the arithmetic. 'attempted' means money is still owed at the door.
  const advance = PRICE.depositPaise
  const atTheDoor = PRICE.balancePaise

  it('reads an advance paid online with the rest owed at the door', () => {
    const order = {
      amount: LIST, amount_paid: advance, amount_due: atTheDoor, status: 'attempted',
    }
    expect(readMagicPayment(order, { method: 'card', status: 'captured' })).toEqual({
      plan: 'deposit',
      paidPaise: advance,
      balanceDuePaise: atTheDoor,
      unrecognised: false,
    })
  })

  it('adds the COD fee, which the order amount does not include', () => {
    const order = {
      amount: LIST, amount_paid: advance, amount_due: atTheDoor,
      status: 'attempted', cod_fee: 2_000,
    }
    expect(readMagicPayment(order, { method: 'card', status: 'captured' }).balanceDuePaise)
      .toBe(atTheDoor + 2_000)
  })

  it('is not confused with a sale that completed', () => {
    const paidInFull = { amount: LIST, amount_paid: LIST, amount_due: 0, status: 'paid' }
    expect(readMagicPayment(paidInFull, { method: 'upi', status: 'captured' }))
      .toMatchObject({ plan: 'full', balanceDuePaise: 0 })
  })

  it('is not confused with a plain cash-on-delivery order', () => {
    // Nothing settled online, the whole price at the door.
    const cod = { amount: LIST, amount_paid: 0, amount_due: LIST, status: 'attempted' }
    expect(readMagicPayment(cod, { method: 'cod', status: 'pending' }))
      .toMatchObject({ paidPaise: 0, balanceDuePaise: LIST })
  })

  it('still trusts our own note over the status, where we wrote one', () => {
    // Today's ₹499 orders carry the plan and balance in their notes, and those
    // must keep winning while both shapes are in flight.
    const ours = {
      amount: PRICE.depositPaise, amount_paid: PRICE.depositPaise, amount_due: 0,
      status: 'paid',
      notes: { plan: 'deposit', balance_due_paise: String(atTheDoor) },
    }
    expect(readMagicPayment(ours, { method: 'upi', status: 'captured' }))
      .toMatchObject({ plan: 'deposit', balanceDuePaise: atTheDoor })
  })
})

describe('who asks which way the buyer wants to pay', () => {
  it('leaves it to the page while the gateway cannot take cash at the door', async () => {
    const { gatewayCarriesTheChoice } = await import('@/lib/magic')
    delete process.env.MAGIC_COD
    expect(gatewayCarriesTheChoice()).toBe(false)
  })

  it('hands it to the gateway the moment COD is on', async () => {
    // Then the choice is a payment method, which is the one thing Razorpay's
    // window genuinely controls — and the page stops asking.
    const { gatewayCarriesTheChoice } = await import('@/lib/magic')
    process.env.MAGIC_COD = '1'
    expect(gatewayCarriesTheChoice()).toBe(true)
  })
})

describe('what the gateway cart says about the balance', () => {
  it('names the ₹4,500 on the line itself, not only in the description', () => {
    // Razorpay sees a ₹499 order that settles in full, so unless the line
    // says so, nothing on the screen where somebody decides to pay mentions
    // the ₹4,500 a courier will ask them for.
    const line = lineItemsFor('deposit', 1, 'assembled', 0, 'graphite').lineItems[0]!
    expect(line.name).toContain('4,500')
    expect(line.name).toContain('on delivery')
    expect(line.name).toContain('Black')
  })

  it('stays short enough that the money is not the part cut off', () => {
    // Razorpay truncates the line to roughly two lines. The full edition name
    // — "PebbleRobo robot, fully assembled" — pushed the ₹4,500 past the end,
    // so the one figure the buyer needed was the one thing hidden.
    const line = lineItemsFor('deposit', 1, 'assembled', 0, 'ember').lineItems[0]!
    expect(line.name.length).toBeLessThanOrEqual(45)
    expect(line.name).not.toContain('fully assembled')
    // And the money is last, so if anything goes it is the colour.
    expect(line.name.indexOf('4,500')).toBeGreaterThan(line.name.indexOf('Ember'))
  })

  it('counts the balance by quantity', () => {
    expect(lineItemsFor('deposit', 2).lineItems[0]!.name).toContain('9,000')
  })

  it('says nothing about a balance on a full-price order', () => {
    expect(lineItemsFor('full', 1).lineItems[0]!.name).not.toContain('on delivery')
  })
})

describe('the abandoned-checkout webhook', () => {
  beforeEach(() => { process.env.MAGIC_CHECKOUT = '1' })

  const send = async (body: unknown) => {
    const { POST } = await import('@/app/api/magic/abandoned/route')
    return POST(new Request('https://pebblerobo.com/api/magic/abandoned', {
      method: 'POST', body: JSON.stringify(body),
    }))
  }

  it('answers 200 even to a shape it does not recognise', async () => {
    // A webhook answered with an error is one Razorpay retries and then stops
    // sending. Nothing here is worth losing the feed over.
    expect((await send({ something: 'else' })).status).toBe(200)
    expect((await send({})).status).toBe(200)
  })

  it('does not exist with the flag off', async () => {
    delete process.env.MAGIC_CHECKOUT
    expect((await send({ razorpay_order_id: 'order_x' })).status).toBe(404)
  })

  it('survives a body that is not JSON at all', async () => {
    const { POST } = await import('@/app/api/magic/abandoned/route')
    const res = await POST(new Request('https://pebblerobo.com/api/magic/abandoned', {
      method: 'POST', body: 'not json',
    }))
    expect(res.status).toBe(200)
  })

  it('refuses a body big enough to be an attack', async () => {
    const { POST } = await import('@/app/api/magic/abandoned/route')
    const res = await POST(new Request('https://pebblerobo.com/api/magic/abandoned', {
      method: 'POST', body: 'x'.repeat(20_000),
    }))
    expect(res.status).toBe(413)
  })
})
