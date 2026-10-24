import { describe, it, expect } from 'vitest'
import { normalisePhone, splitName, mapOrder, COD_ENCODING } from '@/lib/shiprocket/map'
import type { AdminOrder } from '@/lib/admin-orders'

/**
 * Shiprocket validates hard and explains badly: a rejected create comes back
 * as a 400 with a sentence in it. Every rule below is one their API enforces,
 * so catching it here turns a failed dispatch into a fixable field.
 */

const order = (over: Partial<AdminOrder> = {}): AdminOrder => ({
  id: 142,
  group: 'balance_due',
  name: 'Aarav Sharma', email: 'aarav@example.com',
  phone: '9876543210',
  address: '42, Sector 18, Near the park', city: 'Gurugram', pincode: '122002',
  qty: 1,
  edition: 'assembled', plan: 'deposit', shell: 'graphite',
  couponCode: null, discountPaise: 0, variant: null,
  paidPaise: 49_900, duePaise: 450_000,
  createdAt: new Date('2026-10-01T10:00:00Z'),
  paidAt: new Date('2026-10-01T10:05:00Z'),
  balancePaidAt: null, balanceAskedAt: null, recoverySentAt: null,
  balanceCollectedAt: null, token: null,
  razorpayOrderId: 'order_x', razorpayPaymentId: 'pay_x', balancePaymentId: null,
  needsReview: false, archivedAt: null, adminNote: null,
  srOrderId: null, srShipmentId: null, awbCode: null, courierName: null,
  srStatus: null, srStatusAt: null, pickupScheduledDate: null, labelUrl: null,
  remittanceUtr: null, remittanceStatus: null, remittanceDate: null,
  ...over,
})

const dims = { length: 30, breadth: 24, height: 14, weight: 1.2 }
const opts = { pickupLocation: 'Primary', ...dims }

describe('normalisePhone', () => {
  it('keeps a plain ten-digit number', () => {
    expect(normalisePhone('9876543210')).toBe('9876543210')
  })

  it('strips the country code, spaces and hyphens', () => {
    for (const raw of ['+91 98765 43210', '+919876543210', '098765-43210', '91 9876543210']) {
      expect(normalisePhone(raw), raw).toBe('9876543210')
    }
  })

  it('rejects a number made of one repeated digit', () => {
    // Shiprocket rejects these outright: "A number made of one repeated digit
    // is rejected." Catching it here names the field instead of failing the
    // whole dispatch.
    expect(normalisePhone('9999999999')).toBeNull()
    expect(normalisePhone('0000000000')).toBeNull()
  })

  it('rejects anything that is not ten digits once cleaned', () => {
    for (const raw of ['', '12345', '98765432101234', 'not a phone', null]) {
      expect(normalisePhone(raw as string), String(raw)).toBeNull()
    }
  })
})

describe('splitName', () => {
  it('splits on the last space', () => {
    expect(splitName('Aarav Sharma')).toEqual({ first: 'Aarav', last: 'Sharma' })
    expect(splitName('Mary Anne Van Der Berg'))
      .toEqual({ first: 'Mary Anne Van Der', last: 'Berg' })
  })

  it('gives a single-word name an empty last name, not a missing one', () => {
    // billing_last_name is a required KEY whose value may be empty. Omitting
    // it 400s; sending "" is accepted.
    expect(splitName('Prince')).toEqual({ first: 'Prince', last: '' })
  })

  it('tolerates stray whitespace', () => {
    expect(splitName('  Aarav   Sharma  ')).toEqual({ first: 'Aarav', last: 'Sharma' })
  })
})

describe('mapOrder — the money', () => {
  it('sends the true order value and what is already paid', () => {
    expect(COD_ENCODING).toBe('partial')
    const r = mapOrder(order(), opts)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.payload.payment_method).toBe('COD')
    expect(r.payload.sub_total).toBe(4999)
    expect(r.payload.partial_cod_collected).toBe(499)
  })

  it('under balance-only, sends just what is owed and no partial field', () => {
    const r = mapOrder(order(), { ...opts, encoding: 'balance-only' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.payload.sub_total).toBe(4500)
    expect(r.payload.partial_cod_collected).toBeUndefined()
  })

  it('multiplies both halves by quantity', () => {
    const r = mapOrder(order({ qty: 2, paidPaise: 99_800, duePaise: 900_000 }), opts)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.payload.sub_total).toBe(9998)
    expect(r.payload.partial_cod_collected).toBe(998)
    expect(r.payload.order_items[0].units).toBe(2)
  })

  it('keeps partial_cod_collected strictly below sub_total', () => {
    // Shiprocket raises a custom 422 otherwise. An order whose deposit somehow
    // equals its value is a data problem, not something to send.
    const r = mapOrder(order({ paidPaise: 499_900, duePaise: 0 }), opts)
    expect(r.ok).toBe(false)
  })

  it('refuses an order that was never paid', () => {
    const r = mapOrder(order({ paidAt: null, paidPaise: 0 }), opts)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.reason).toMatch(/paid/i)
  })
})

describe('mapOrder — the fields Shiprocket rejects', () => {
  const fails = (over: Partial<AdminOrder>, field: RegExp) => {
    const r = mapOrder(order(over), opts)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(field)
  }

  it('rejects a city over thirty characters', () =>
    fails({ city: 'A'.repeat(31) }, /city/i))

  it('accepts a city of exactly thirty', () => {
    expect(mapOrder(order({ city: 'A'.repeat(30) }), opts).ok).toBe(true)
  })

  it('rejects an address over 190 characters rather than truncating it', () => {
    // A silently shortened address produces a parcel that cannot be
    // delivered, which is worse than a dispatch that refuses to start.
    fails({ address: 'A'.repeat(191) }, /address/i)
  })

  it('rejects an address under three characters', () => fails({ address: 'A' }, /address/i))

  it('rejects a pincode that is not six digits', () => {
    for (const p of ['12345', '1234567', 'abcdef', '012345']) fails({ pincode: p }, /pincode/i)
  })

  it('rejects a missing address, city or pincode', () => {
    fails({ address: null }, /address/i)
    fails({ city: null }, /city/i)
    fails({ pincode: null }, /pincode/i)
  })

  it('rejects an unusable phone number', () => fails({ phone: '+1 555 0100' }, /phone/i))
})

describe('mapOrder — the payload Shiprocket expects', () => {
  const r = mapOrder(order(), opts)

  it('carries every field their spec marks required', () => {
    expect(r.ok).toBe(true)
    if (!r.ok) return
    for (const k of [
      'order_id', 'order_date', 'payment_method', 'sub_total', 'shipping_is_billing',
      'billing_customer_name', 'billing_last_name', 'billing_address', 'billing_city',
      'billing_state', 'billing_country', 'billing_pincode', 'billing_phone',
      'billing_email', 'order_items', 'pickup_location', 'length', 'breadth',
      'height', 'weight',
    ]) {
      expect(r.payload, `missing ${k}`).toHaveProperty(k)
    }
  })

  it('uses our primary key as the order id, which is their retry key', () => {
    // Create is idempotent on (order_id, channel_id): re-posting a known id
    // returns the existing order unchanged.
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.payload.order_id).toBe('PBL-142')
  })

  it('uses no character their order id forbids', () => {
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.payload.order_id).not.toMatch(/[?!=+\\,*^%]/)
    expect(r.payload.order_id.length).toBeLessThanOrEqual(50)
  })

  it('asks for structured errors rather than a sentence', () => {
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.payload.verbose).toBe(true)
  })

  it('ships to the billing address, because there is only one', () => {
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.payload.shipping_is_billing).toBe(true)
  })

  it('dates the order no earlier than Shiprocket accepts', () => {
    // Their create rejects an order_date more than six months old, and some
    // of these preorders are old.
    const old = mapOrder(order({ createdAt: new Date('2024-01-01') }), opts)
    expect(old.ok).toBe(true)
    if (!old.ok) return
    const age = Date.now() - new Date(old.payload.order_date).getTime()
    expect(age).toBeLessThan(180 * 24 * 3600 * 1000)
  })

  it('sends dimensions in cm and weight in kg', () => {
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.payload).toMatchObject({ length: 30, breadth: 24, height: 14, weight: 1.2 })
  })
})
