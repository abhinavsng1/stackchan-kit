import { describe, expect, it } from 'vitest'
import { resolveMagicCustomer } from '@/lib/magic'
import { normaliseOrderId } from '@/lib/magic-orders'

/**
 * Putting a name on money that has already arrived.
 *
 * A captured one-tap payment once left no booking and no email, because the
 * only place the webhook looked for the buyer — the order's own
 * customer_details — came back empty. These pin the other two places it now
 * looks, and pin that it still refuses to invent a buyer it cannot find.
 */

const FULL = {
  customer_details: {
    name: 'Asha Rao',
    email: 'ASHA@example.com',
    contact: '+919876543210',
    shipping_address: { line1: '42, Sector 18', city: 'Bengaluru', zipcode: '560078' },
  },
}

describe('the order id, spelled one way', () => {
  it('adds the prefix the shipping callback leaves off', () => {
    // Razorpay sends razorpay_order_id without `order_` to that callback and
    // with it everywhere else. Stored as received, the two never meet.
    expect(normaliseOrderId('TqGzRgz5URBk8k')).toBe('order_TqGzRgz5URBk8k')
  })

  it('leaves an id that already has it alone', () => {
    expect(normaliseOrderId('order_TqGzRgz5URBk8k')).toBe('order_TqGzRgz5URBk8k')
    expect(normaliseOrderId('  order_x  ')).toBe('order_x')
  })

  it('refuses to turn nothing into an id', () => {
    expect(normaliseOrderId('   ')).toBe('')
  })
})

describe('finding the buyer', () => {
  it('prefers the order, which is the only source carrying an address', () => {
    const c = resolveMagicCustomer(FULL, { email: 'other@example.com' },
      { email: 'third@example.com', contact: null, pincode: null })
    expect(c).toMatchObject({
      email: 'asha@example.com', address: '42, Sector 18', city: 'Bengaluru', emailKnown: true,
    })
  })

  it('falls back to our own row for the order', () => {
    const c = resolveMagicCustomer({}, {}, { email: 'Asha@example.com', contact: '+919876543210', pincode: '560078' })
    expect(c).toMatchObject({ email: 'asha@example.com', phone: '+919876543210', pincode: '560078' })
  })

  it('falls back to the payment entity, which Razorpay always sends', () => {
    const c = resolveMagicCustomer({}, { email: 'asha@example.com', contact: '+919000090000' }, null)
    expect(c).toMatchObject({ email: 'asha@example.com', phone: '+919000090000' })
  })

  it('prefers what we recorded over what the payment carries', () => {
    const c = resolveMagicCustomer({}, { email: 'card@example.com' },
      { email: 'typed@example.com', contact: null, pincode: null })
    expect(c?.email).toBe('typed@example.com')
  })

  it('leaves the address empty rather than inventing one', () => {
    // A booking with no address is a phone call. A wrong one posts a robot
    // to a stranger.
    const c = resolveMagicCustomer({}, { email: 'asha@example.com' }, null)
    expect(c).toMatchObject({ address: null, city: null })
  })

  it('gives up only when there is no way to reach them at all', () => {
    expect(resolveMagicCustomer({}, {}, null)).toBe(null)
    expect(resolveMagicCustomer({}, { email: '   ' }, null)).toBe(null)
  })

  it('keeps a sale that has a phone number and no email', () => {
    // Email is optional in Razorpay's window. A paid order with a number we
    // can ring is worth far more than a tidy refusal.
    const c = resolveMagicCustomer({}, { contact: '+919000090000' }, null, 'order_X')
    expect(c).toMatchObject({ phone: '+919000090000', emailKnown: false })
    expect(c?.email).toBe('no-email+order_X@pebblerobo.invalid')
  })
})

describe('the email Razorpay sends when there is no email', () => {
  it('treats void@razorpay.com as nobody, not as an address', () => {
    // A receipt posted there goes nowhere, and the sale looks confirmed.
    const order = { customer_details: { email: 'void@razorpay.com', shipping_address: { zipcode: '226028' } } }
    const c = resolveMagicCustomer(order, {}, { email: null, contact: '+918004358495', pincode: null }, 'order_Y')
    expect(c).toMatchObject({ emailKnown: false, phone: '+918004358495', pincode: '226028' })
  })

  it('still takes the address from the order while taking the email from us', () => {
    const order = {
      customer_details: {
        email: 'void@razorpay.com',
        shipping_address: { line1: '42, Sector 18', city: 'Lucknow', zipcode: '226028' },
      },
    }
    const c = resolveMagicCustomer(order, {}, { email: 'asha@example.com', contact: null, pincode: null })
    expect(c).toMatchObject({
      email: 'asha@example.com', emailKnown: true, address: '42, Sector 18', city: 'Lucknow',
    })
  })

  it('gives two emailless buyers two different rows', () => {
    // Keyed on email: one shared placeholder and the second sale overwrites
    // the first.
    const a = resolveMagicCustomer({}, { contact: '+919000000001' }, null, 'order_A')
    const b = resolveMagicCustomer({}, { contact: '+919000000002' }, null, 'order_B')
    expect(a!.email).not.toBe(b!.email)
  })

  it('never reads its own placeholder back as a real address', () => {
    const c = resolveMagicCustomer(
      { customer_details: { email: 'no-email+order_A@pebblerobo.invalid' } },
      { contact: '+919000000001' }, null, 'order_A')
    expect(c?.emailKnown).toBe(false)
  })
})
