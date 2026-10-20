import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { sql, neon } = vi.hoisted(() => ({ sql: vi.fn(), neon: vi.fn() }))
vi.mock('@neondatabase/serverless', () => ({ neon }))

import { createSettledBooking } from '@/lib/preorders'

/**
 * A booking written after the money has already arrived.
 *
 * This row is inserted by the webhook, which means a failure here is not a
 * form that can be filled in again — it is a captured payment with nothing
 * recorded against it. A unique index on `phone` did exactly that: a
 * returning buyer with a new email violated it, the insert threw, Razorpay
 * retried into the same wall and gave up.
 */

const booking = {
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '+918004358495',
  address: '42, Sector 18',
  city: 'Bengaluru',
  pincode: '560078',
  qty: 1,
  edition: 'assembled' as const,
  plan: 'deposit' as const,
  shell: 'graphite',
  orderId: 'order_TqGZ7JofOpOj9o',
  paymentId: 'pay_1',
  paidPaise: 49_900,
  balanceDuePaise: 450_000,
}

const uniqueViolation = (constraint: string) =>
  Object.assign(new Error('duplicate key value'), { code: '23505', constraint })

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', 'postgresql://test-only.invalid/reservations')
  sql.mockReset()
  neon.mockReset().mockReturnValue(sql)
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('a paid booking that collides with an old one', () => {
  it('records the sale anyway, without the number that collided', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    sql
      .mockResolvedValueOnce([])                                   // no existing order
      .mockRejectedValueOnce(uniqueViolation('preorders_phone_key'))
      .mockResolvedValueOnce([{ id: 7, payment_token: 'tok' }])

    await expect(createSettledBooking(booking)).resolves.toMatchObject({ status: 'paid', id: 7 })

    const retry = sql.mock.calls.at(-1)!.slice(1)
    expect(retry).toContain(null)
    expect(retry).not.toContain('+918004358495')
  })

  it('flags it for a person and says what happened', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    sql
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(uniqueViolation('preorders_phone_key'))
      .mockResolvedValueOnce([{ id: 7, payment_token: 'tok' }])

    await createSettledBooking(booking)

    const retry = sql.mock.calls.at(-1)!.slice(1)
    expect(retry).toContain(true)                                  // needs_review
    const note = retry.find((v) => typeof v === 'string' && v.startsWith('Paid,'))
    expect(note).toContain('preorders_phone_key')
    expect(note).toMatch(/ask the buyer/i)
  })

  it('writes the phone normally when nothing collides', async () => {
    sql
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 8, payment_token: 'tok' }])

    await createSettledBooking(booking)

    expect(sql).toHaveBeenCalledTimes(2)
    expect(sql.mock.calls.at(-1)!.slice(1)).toContain('+918004358495')
  })

  it('does not swallow a failure that is not a unique violation', async () => {
    sql
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(Object.assign(new Error('connection lost'), { code: '08006' }))

    // Thrown, so the webhook answers 500 and Razorpay retries — which is the
    // right answer when the database was simply unreachable.
    await expect(createSettledBooking(booking)).rejects.toThrow('connection lost')
  })

  it('never writes twice for the same Razorpay order', async () => {
    sql.mockResolvedValueOnce([{ id: 3 }])
    await expect(createSettledBooking(booking)).resolves.toEqual({ status: 'already_paid' })
    expect(sql).toHaveBeenCalledTimes(1)
  })
})
