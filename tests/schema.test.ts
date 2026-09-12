import { describe, it, expect } from 'vitest'
import { preorderSchema, fieldErrors, PROFESSIONS } from '@/lib/schema'

const valid = {
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '9876543210',
  profession: 'Embedded / firmware',
  address: '12 Silicon Gardenia, 12th Main, JP Nagar 5th Phase',
  city: 'Bengaluru',
  pincode: '560078',
  qty: 2,
}

const reject = (patch: Record<string, unknown>) =>
  expect(preorderSchema.safeParse({ ...valid, ...patch }).success).toBe(false)

describe('preorderSchema', () => {
  it('accepts a complete reservation', () => {
    expect(preorderSchema.safeParse(valid).success).toBe(true)
  })

  describe('name', () => {
    it('rejects one that is too short', () => reject({ name: 'A' }))
    it('rejects one that is too long', () => reject({ name: 'x'.repeat(200) }))
    it('trims surrounding whitespace', () => {
      const r = preorderSchema.safeParse({ ...valid, name: '  Asha Rao  ' })
      expect(r.success && r.data.name).toBe('Asha Rao')
    })
  })

  describe('email', () => {
    it('rejects a malformed address', () => reject({ email: 'asha@' }))
    it('is required', () => reject({ email: '' }))
  })

  describe('phone', () => {
    it.each([
      ['9876543210', '+919876543210'],
      ['+91 98765 43210', '+919876543210'],
      ['098765-43210', '+919876543210'],
      ['0091 9876543210', '+919876543210'],
      ['91 9876543210', '+919876543210'],
    ])('normalises %s to one canonical form', (input, expected) => {
      const r = preorderSchema.safeParse({ ...valid, phone: input })
      expect(r.success && r.data.phone).toBe(expected)
    })

    it('rejects too few digits', () => reject({ phone: '98765432' }))
    it('rejects a landline-style leading digit', () => reject({ phone: '1234567890' }))
    it('rejects letters', () => reject({ phone: 'call me maybe' }))
    it('is required', () => reject({ phone: '' }))
  })

  describe('profession', () => {
    it('accepts every listed option', () => {
      for (const p of PROFESSIONS) {
        expect(preorderSchema.safeParse({ ...valid, profession: p }).success, p).toBe(true)
      }
    })
    it('rejects anything off the list', () => reject({ profession: 'Astronaut' }))
    it('is required', () => reject({ profession: '' }))
  })

  describe('address', () => {
    it('rejects a stub', () => reject({ address: 'here' }))
    it('rejects one that is too long', () => reject({ address: 'x'.repeat(400) }))
    it('is required', () => reject({ address: '' }))
  })

  describe('pincode', () => {
    it('accepts a six-digit code', () => {
      expect(preorderSchema.safeParse({ ...valid, pincode: '110001' }).success).toBe(true)
    })
    it('rejects five digits', () => reject({ pincode: '56007' }))
    it('rejects seven digits', () => reject({ pincode: '5600781' }))
    it('rejects a leading zero', () => reject({ pincode: '060078' }))
    it('rejects letters', () => reject({ pincode: 'ABC123' }))
  })

  describe('qty', () => {
    it('rejects zero', () => reject({ qty: 0 }))
    it('rejects more than five', () => reject({ qty: 6 }))
    it('rejects a fraction', () => reject({ qty: 2.5 }))
    it('coerces the string a form actually submits', () => {
      const r = preorderSchema.safeParse({ ...valid, qty: '3' })
      expect(r.success && r.data.qty).toBe(3)
    })
  })

  it('parses a filled honeypot — the route, not the schema, enforces it', () => {
    expect(preorderSchema.safeParse({ ...valid, company: 'Acme' }).success).toBe(true)
  })
})

describe('fieldErrors', () => {
  it('names every field that failed', () => {
    const r = preorderSchema.safeParse({ name: '', email: 'nope', phone: '1', qty: 99 })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(Object.keys(fieldErrors(r.error)).sort())
        .toEqual(['address', 'city', 'email', 'name', 'phone', 'pincode', 'profession', 'qty'].sort())
    }
  })
})
