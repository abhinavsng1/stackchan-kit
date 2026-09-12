import { describe, it, expect } from 'vitest'
import { preorderSchema, fieldErrors } from '@/lib/schema'

const valid = { name: 'Asha Rao', email: 'asha@example.com', qty: 2, city: 'Bengaluru' }

describe('preorderSchema', () => {
  it('accepts a valid reservation', () => {
    const r = preorderSchema.safeParse(valid)
    expect(r.success).toBe(true)
  })

  it('rejects a malformed email', () => {
    const r = preorderSchema.safeParse({ ...valid, email: 'asha@' })
    expect(r.success).toBe(false)
    if (!r.success) expect(fieldErrors(r.error).email).toBeTruthy()
  })

  it('rejects a name that is too short', () => {
    const r = preorderSchema.safeParse({ ...valid, name: 'A' })
    expect(r.success).toBe(false)
  })

  it('rejects qty below 1', () => {
    expect(preorderSchema.safeParse({ ...valid, qty: 0 }).success).toBe(false)
  })

  it('rejects qty above 5', () => {
    expect(preorderSchema.safeParse({ ...valid, qty: 6 }).success).toBe(false)
  })

  it('rejects a fractional qty', () => {
    expect(preorderSchema.safeParse({ ...valid, qty: 2.5 }).success).toBe(false)
  })

  it('coerces the string qty a form actually submits', () => {
    const r = preorderSchema.safeParse({ ...valid, qty: '3' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.qty).toBe(3)
  })

  it('treats city as optional', () => {
    const { city, ...rest } = valid
    expect(preorderSchema.safeParse(rest).success).toBe(true)
    expect(preorderSchema.safeParse({ ...rest, city: '' }).success).toBe(true)
  })

  it('rejects an oversized name', () => {
    expect(preorderSchema.safeParse({ ...valid, name: 'x'.repeat(200) }).success).toBe(false)
  })

  it('parses a filled honeypot — the route, not the schema, enforces it', () => {
    expect(preorderSchema.safeParse({ ...valid, company: 'Acme' }).success).toBe(true)
  })

  it('trims surrounding whitespace from the name', () => {
    const r = preorderSchema.safeParse({ ...valid, name: '  Asha Rao  ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.name).toBe('Asha Rao')
  })
})

describe('fieldErrors', () => {
  it('maps each issue to its field and keeps the first message', () => {
    const r = preorderSchema.safeParse({ name: '', email: 'nope', qty: 99 })
    expect(r.success).toBe(false)
    if (!r.success) {
      const f = fieldErrors(r.error)
      expect(Object.keys(f).sort()).toEqual(['email', 'name', 'qty'])
    }
  })
})
