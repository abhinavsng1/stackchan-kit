import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  reservationSubject, reservationText, reservationHtml,
  sendReservationEmail, emailConfigured,
} from '@/lib/email'
import type { PreorderRecord } from '@/lib/preorders'

const record: PreorderRecord = {
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '+919876543210',
  profession: 'Embedded / firmware',
  address: '12 Silicon Gardenia, 12th Main, JP Nagar 5th Phase',
  city: 'Bengaluru',
  pincode: '560078',
  qty: 2,
}

const env = { ...process.env }
beforeEach(() => {
  delete process.env.RESEND_API_KEY
  delete process.env.SMTP_USER
  delete process.env.SMTP_PASSWORD
})
afterEach(() => { process.env = { ...env } })

describe('confirmation content', () => {
  it('says what it is about', () => {
    expect(reservationSubject()).toBe('Your Pebble-chan is reserved')
  })

  it.each([['text', reservationText], ['html', reservationHtml]])(
    'the %s version repeats back everything needed to spot a mistake',
    (_label, render) => {
      const body = render(record)
      for (const needle of [
        'Asha', '12 Silicon Gardenia', 'Bengaluru', '560078',
        '+919876543210', '₹11,999', 'support@pebblerobo.com',
      ]) {
        expect(body, needle).toContain(needle)
      }
      expect(body).toContain('2')
    },
  )

  it('states plainly that no money has been taken', () => {
    expect(reservationText(record).toLowerCase()).toContain('nothing has been charged')
    expect(reservationHtml(record).toLowerCase()).toContain('nothing has been charged')
  })

  it('credits the upstream project', () => {
    expect(reservationText(record)).toContain('Stack-chan')
    expect(reservationText(record)).toContain('Apache License 2.0')
  })

  it('keeps the plain-text version free of markup', () => {
    expect(reservationText(record)).not.toMatch(/<[a-z/][^>]*>/i)
  })

  it('escapes anything a visitor typed, so a name cannot inject markup', () => {
    const nasty = { ...record, name: '<script>alert(1)</script>Mallory', city: 'a<b>c' }
    const html = reservationHtml(nasty)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('a&lt;b&gt;c')
  })
})

describe('provider selection', () => {
  it('reports itself unconfigured when no credentials exist', () => {
    expect(emailConfigured()).toBe(false)
  })

  it('is configured by a Resend key alone', () => {
    process.env.RESEND_API_KEY = 're_test'
    expect(emailConfigured()).toBe(true)
  })

  it('is configured by SMTP credentials alone', () => {
    process.env.SMTP_USER = 'support@pebblerobo.com'
    process.env.SMTP_PASSWORD = 'secret'
    expect(emailConfigured()).toBe(true)
  })

  it('needs both halves of the SMTP credentials', () => {
    process.env.SMTP_USER = 'support@pebblerobo.com'
    expect(emailConfigured()).toBe(false)
  })

  it('reports a failure rather than throwing when nothing is configured', async () => {
    const result = await sendReservationEmail(record)
    expect(result.ok).toBe(false)
    expect(result).toMatchObject({ provider: 'none' })
  })
})
