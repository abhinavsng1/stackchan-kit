import { describe, expect, it } from 'vitest'
import {
  ordersCsv, CSV_COLUMNS, whatsappNumber, whatsappLink, tally, isGroup,
  type AdminOrder,
} from '@/lib/admin-orders'

/**
 * The order book's pure parts: which bucket a row is in, what a spreadsheet
 * gets, and what a WhatsApp button actually opens.
 */

const order = (over: Partial<AdminOrder> = {}): AdminOrder => ({
  id: 1, group: 'unpaid', name: 'Asha Rao', email: 'asha@example.com',
  phone: '+919876543210', city: 'Bengaluru', pincode: '560078', qty: 1,
  edition: 'assembled', plan: 'deposit', shell: 'graphite', couponCode: null,
  paidPaise: 0, duePaise: 49_900, createdAt: new Date('2026-10-01T10:00:00Z'),
  paidAt: null, balancePaidAt: null, balanceAskedAt: null, recoverySentAt: null,
  token: 'd'.repeat(32), address: '42, Sector 18', variant: null, discountPaise: 0,
  razorpayOrderId: null, razorpayPaymentId: null, balancePaymentId: null,
  balanceCollectedAt: null, needsReview: false, archivedAt: null, adminNote: null,
  srOrderId: null, srShipmentId: null, awbCode: null, courierName: null,
  srStatus: null, srStatusAt: null, pickupScheduledDate: null, labelUrl: null,
  remittanceUtr: null, remittanceStatus: null, remittanceDate: null,
  ...over,
})

describe('the three groups', () => {
  it('counts each one', () => {
    const counts = tally([
      order({ group: 'unpaid' }),
      order({ group: 'balance_due' }),
      order({ group: 'balance_due' }),
      order({ group: 'paid_in_full' }),
    ])
    expect(counts).toEqual({ unpaid: 1, balance_due: 2, paid_in_full: 1 })
  })

  it('recognises only the groups that exist', () => {
    expect(isGroup('balance_due')).toBe(true)
    expect(isGroup('refunded')).toBe(false)
  })
})

describe('the CSV', () => {
  it('starts with the header and ends with a newline', () => {
    const csv = ordersCsv([order()])
    expect(csv.split('\n')[0]).toBe(CSV_COLUMNS.join(','))
    expect(csv.endsWith('\n')).toBe(true)
  })

  it('quotes every field, so a comma in an address cannot shift a column', () => {
    const csv = ordersCsv([order({ city: 'Bengaluru, Karnataka' })])
    const line = csv.split('\n')[1]!
    expect(line).toContain('"Bengaluru, Karnataka"')
    expect(line.split('","').length).toBe(CSV_COLUMNS.length)
  })

  it('escapes a quote in a name rather than ending the field early', () => {
    const csv = ordersCsv([order({ name: 'Asha "Ash" Rao' })])
    expect(csv).toContain('"Asha ""Ash"" Rao"')
  })

  it('writes money in rupees, because that is what a spreadsheet is for', () => {
    const csv = ordersCsv([order({ paidPaise: 49_900, duePaise: 450_000 })])
    expect(csv).toContain('"499.00"')
    expect(csv).toContain('"4500.00"')
  })

  it('survives a row with nothing optional filled in', () => {
    const csv = ordersCsv([order({ phone: null, city: null, pincode: null, shell: null, paidAt: null })])
    expect(csv.split('\n')).toHaveLength(3)
  })
})

describe('the WhatsApp number', () => {
  it('adds India to a bare ten-digit number', () => {
    expect(whatsappNumber('9876543210')).toBe('919876543210')
  })

  it('keeps a number that already has its country code', () => {
    expect(whatsappNumber('+91 98765 43210')).toBe('919876543210')
  })

  it('gives up rather than guessing at something unusable', () => {
    expect(whatsappNumber('12345')).toBe(null)
    expect(whatsappNumber(null)).toBe(null)
  })
})

describe('the WhatsApp message', () => {
  const site = 'https://pebblerobo.com'

  it('sends an unpaid booking its own payment link', () => {
    const link = whatsappLink(order({ group: 'unpaid' }), site)!
    expect(link).toContain('https://wa.me/919876543210?text=')
    expect(decodeURIComponent(link)).toContain(`${site}/checkout?t=${'d'.repeat(32)}`)
  })

  it('sends a balance-due booking the balance page, with the amount', () => {
    const o = order({ group: 'balance_due', duePaise: 450_000 })
    expect(decodeURIComponent(whatsappLink(o, site)!)).toContain('/pay-balance?t=')
    expect(decodeURIComponent(whatsappLink(o, site)!)).toContain('₹4,500')
  })

  it('asks a paid buyer for nothing', () => {
    const text = decodeURIComponent(whatsappLink(order({ group: 'paid_in_full' }), site)!)
    expect(text).toContain('paid in full')
    expect(text).not.toContain('/checkout')
  })

  it('offers no button when there is no usable number', () => {
    expect(whatsappLink(order({ phone: null }), site)).toBe(null)
  })

  it('greets the buyer by first name only', () => {
    const text = decodeURIComponent(whatsappLink(order(), site)!)
    expect(text).toContain('Hi Asha,')
    expect(text).not.toContain('Asha Rao')
  })
})

describe('what the dashboard may do to an order', () => {
  it('knows its own vocabulary, and refuses anything else', async () => {
    const { isAction, ACTIONS } = await import('@/lib/admin-orders')
    expect(ACTIONS).toContain('archive')
    expect(ACTIONS).toContain('delete')
    expect(ACTIONS).toContain('mark_deposit_paid')
    expect(ACTIONS).toContain('mark_balance_collected')
    expect(isAction('refund')).toBe(false)
    expect(isAction('')).toBe(false)
  })
})

describe('the action route', () => {
  const call = async (body: unknown, auth = true) => {
    process.env.ADMIN_PASSWORD = 'pw'
    const { POST } = await import('@/app/api/admin/orders/[id]/route')
    return POST(
      new Request('https://pebblerobo.com/api/admin/orders/1', {
        method: 'POST',
        headers: auth ? { authorization: `Basic ${Buffer.from('a:pw').toString('base64')}` } : {},
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id: '1' }) },
    )
  }

  it('asks for the password first', async () => {
    expect((await call({ action: 'archive' }, false)).status).toBe(401)
  })

  it('refuses an action it does not know', async () => {
    expect((await call({ action: 'refund' })).status).toBe(400)
  })

  it('refuses to delete without a second confirmation', async () => {
    const res = await call({ action: 'delete' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/confirm/i)
  })
})
