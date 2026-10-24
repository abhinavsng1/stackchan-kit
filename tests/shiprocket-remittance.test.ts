import { describe, it, expect } from 'vitest'
import { remittanceOf, shouldRecord } from '@/lib/shiprocket/remittance'

/**
 * The only place this system decides that money arrived.
 *
 * "Delivered" means a courier says they handed a box over. Shiprocket remits
 * COD on roughly D+8 working days, Mondays, Wednesdays and Fridays, and only
 * once KYC has cleared. Writing balance_collected_at on a delivery scan would
 * put ₹4,500 in the books that is not in the bank.
 */

describe('remittanceOf', () => {
  it('reads the payout fields off an order', () => {
    const r = remittanceOf({
      data: {
        remittance_utr: 'UTR12345', remittance_status: 'Paid',
        remittance_date: '2026-10-20',
      },
    })
    expect(r).toEqual({ utr: 'UTR12345', status: 'Paid', date: '2026-10-20' })
  })

  it('returns nulls while the money is still in transit', () => {
    const r = remittanceOf({ data: { remittance_utr: null, remittance_status: null } })
    expect(r.utr).toBeNull()
  })

  it('survives a response shaped differently from the one documented', () => {
    expect(remittanceOf({}).utr).toBeNull()
    expect(remittanceOf({ data: null }).utr).toBeNull()
  })

  it('keeps the status verbatim, because its values are undocumented', () => {
    // Shiprocket publishes no enum for remittance_status, so nothing branches
    // on it and nothing normalises it.
    expect(remittanceOf({ data: { remittance_status: 'something unexpected' } }).status)
      .toBe('something unexpected')
  })
})

describe('shouldRecord', () => {
  it('records only when there is a bank reference', () => {
    expect(shouldRecord({ utr: 'UTR1', status: 'Paid', date: '2026-10-20' }, null)).toBe(true)
  })

  it('refuses a payout with a status but no UTR', () => {
    // A status is Shiprocket's opinion. A UTR is a bank's.
    expect(shouldRecord({ utr: null, status: 'Processing', date: null }, null)).toBe(false)
  })

  it('refuses an empty-string UTR', () => {
    expect(shouldRecord({ utr: '', status: 'Paid', date: null }, null)).toBe(false)
  })

  it('does not rewrite an order already recorded as collected', () => {
    expect(shouldRecord({ utr: 'UTR1', status: 'Paid', date: '2026-10-20' }, new Date())).toBe(false)
  })
})
