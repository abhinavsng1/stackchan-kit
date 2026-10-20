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
    expect(c).toMatchObject({ email: 'asha@example.com', address: '42, Sector 18', city: 'Bengaluru' })
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

  it('still gives up when nothing anywhere knows who paid', () => {
    expect(resolveMagicCustomer({}, {}, null)).toBe(null)
    expect(resolveMagicCustomer({}, { contact: '+919000090000' }, null)).toBe(null)
  })

  it('does not accept a blank email as an identity', () => {
    expect(resolveMagicCustomer({}, { email: '   ' }, { email: null, contact: '+91900', pincode: null })).toBe(null)
  })
})
