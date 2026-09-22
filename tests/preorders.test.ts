import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { sql, neon } = vi.hoisted(() => ({ sql: vi.fn(), neon: vi.fn() }))
vi.mock('@neondatabase/serverless', () => ({ neon }))

import { createPreorder, duplicateField } from '@/lib/preorders'

const minimal = { name: 'Asha Rao', email: 'ASHA@example.com', qty: 1 }

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', 'postgresql://test-only.invalid/reservations')
  sql.mockReset().mockResolvedValue([{ id: 1 }])
  neon.mockReset().mockReturnValue(sql)
})
afterEach(() => vi.unstubAllEnvs())

describe('reservation persistence', () => {
  it('writes SQL NULL for every omitted optional detail, preserving email and quantity', async () => {
    await expect(createPreorder(minimal)).resolves.toEqual({ status: 'created' })
    expect(sql.mock.calls[0].slice(1)).toEqual([
      'Asha Rao', 'asha@example.com', null, null, null, null, null, 1,
    ])
  })

  it('writes blank optional fields as NULL instead of a shared empty phone', async () => {
    await createPreorder({
      ...minimal, phone: ' ', profession: '', address: '\t', city: '', pincode: ' ',
    })
    expect(sql.mock.calls[0].slice(1)).toEqual([
      'Asha Rao', 'asha@example.com', null, null, null, null, null, 1,
    ])
  })

  it('preserves all supplied details from the earlier full form', async () => {
    await createPreorder({
      ...minimal, phone: '+919876543210', profession: 'Robotics',
      address: '12 Silicon Gardenia', city: 'Bengaluru', pincode: '560078', qty: 2,
    })
    expect(sql.mock.calls[0].slice(1)).toEqual([
      'Asha Rao', 'asha@example.com', '+919876543210', 'Robotics',
      '12 Silicon Gardenia', 'Bengaluru', '560078', 2,
    ])
  })

  it('still identifies an email duplicate when no phone was supplied', async () => {
    sql.mockResolvedValue([])
    await expect(createPreorder(minimal)).resolves.toEqual({ status: 'duplicate', field: 'email' })
  })

  it('retains classification of a collision on an optional supplied phone', async () => {
    const error = Object.assign(new Error('duplicate key'), {
      code: '23505', constraint: 'preorders_phone_key',
    })
    sql.mockRejectedValue(error)
    await expect(createPreorder({ ...minimal, phone: '+919876543210' })).rejects.toBe(error)
    expect(duplicateField(error)).toBe('phone')
  })

  it('does not attempt a connection without a configured database', async () => {
    vi.stubEnv('DATABASE_URL', '')
    await expect(createPreorder(minimal)).resolves.toEqual({ status: 'unconfigured' })
    expect(neon).not.toHaveBeenCalled()
    expect(sql).not.toHaveBeenCalled()
  })
})
