import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { SHELLS, SHELL_IDS } from '@/lib/shells'
import { preorderSchema } from '@/lib/schema'

/**
 * Choosing a colour is optional, and the order still has to carry one.
 *
 * A buyer who ignores the picker must get a robot anyway, so the field
 * defaults rather than validating — but the default has to be written down
 * somewhere, because "whatever colour it happens to be" is not a thing that
 * can be packed.
 */
describe('the shell ids', () => {
  it('matches the colourways the site actually shows', () => {
    expect(SHELL_IDS).toEqual(SHELLS.map((s) => s.id))
    expect(SHELL_IDS.length).toBeGreaterThan(1)
  })
})

describe('the order schema', () => {
  const valid = {
    name: 'Aarav Sharma', email: 'aarav@example.com', phone: '9876543210',
    address: '42, Sector 18', city: 'Gurugram', pincode: '122002', qty: 1,
  }

  it('accepts an order with no colour and fills in the default', () => {
    const r = preorderSchema.safeParse(valid)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.shell).toBe('graphite')
  })

  it('keeps the colour the buyer actually chose', () => {
    const r = preorderSchema.safeParse({ ...valid, shell: 'ember' })
    expect(r.success && r.data.shell).toBe('ember')
  })

  it('refuses a colour that is not made', () => {
    // A colour nobody prints is an order nobody can pack.
    expect(preorderSchema.safeParse({ ...valid, shell: 'chartreuse' }).success).toBe(false)
  })

  it('never blocks an order over the colour', () => {
    // Optional means optional: an empty select must not fail validation.
    expect(preorderSchema.safeParse({ ...valid, shell: '' }).success).toBe(true)
  })
})

describe('the colour reaches the people who need it', () => {
  it('is stored on the order', () => {
    const sql = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8')
    expect(sql).toMatch(/add column if not exists\s+shell\b/)
  })

  it('is written on insert and read back', () => {
    const src = readFileSync(new URL('../lib/preorders.ts', import.meta.url), 'utf8')
    expect(src).toMatch(/insert into preorders \([^)]*\bshell\b/)
    expect(src).toMatch(/select[^;]*\bshell\b/)
  })

  it('appears in the order email, so the box can be packed', () => {
    // A colour the buyer picked and nobody downstream can see is worse than
    // not offering the choice.
    const src = readFileSync(new URL('../lib/email.ts', import.meta.url), 'utf8')
    expect(src).toMatch(/shell/i)
  })
})
