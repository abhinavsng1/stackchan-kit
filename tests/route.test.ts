import { describe, it, expect, vi, beforeEach } from 'vitest'

const createPreorder = vi.fn()
const duplicateField = (e: unknown): 'email' | 'phone' | null => {
  if (typeof e !== 'object' || e === null || !('code' in e)) return null
  const err = e as { code?: string; constraint?: string; message?: string }
  if (err.code !== '23505') return null
  return `${err.constraint ?? ''} ${err.message ?? ''}`.includes('email') ? 'email' : 'phone'
}
vi.mock('@/lib/preorders', () => ({ createPreorder, duplicateField }))

const sendReservationEmail = vi.fn()
vi.mock('@/lib/email', () => ({ sendReservationEmail }))

// Capture background work so tests can wait for it deterministically.
const bg = vi.hoisted(() => ({ jobs: [] as Promise<unknown>[] }))
vi.mock('@vercel/functions', () => ({
  waitUntil: (p: Promise<unknown>) => { bg.jobs.push(p) },
}))
const settleBackground = () => Promise.all(bg.jobs.splice(0))

const { POST, GET } = await import('@/app/api/preorder/route')

const body = {
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '9876543210',
  profession: 'Embedded / firmware',
  address: '12 Silicon Gardenia, 12th Main, JP Nagar 5th Phase',
  city: 'Bengaluru',
  pincode: '560078',
  qty: 2,
}

function post(payload: unknown, raw?: string) {
  return new Request('http://localhost/api/preorder', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ?? JSON.stringify(payload),
  })
}

beforeEach(() => {
  createPreorder.mockReset()
  sendReservationEmail.mockReset()
  sendReservationEmail.mockResolvedValue({ ok: true, provider: 'resend', id: 'e_1' })
  bg.jobs.length = 0
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /api/preorder', () => {
  it('returns 201 and stores the reservation on first submit', async () => {
    createPreorder.mockResolvedValue({ status: 'created' })
    const res = await POST(post(body))
    expect(res.status).toBe(201)
    await expect(res.json()).resolves.toEqual({ status: 'created' })
    expect(createPreorder).toHaveBeenCalledOnce()
  })

  it('returns 409 naming the email when that address is already on the list', async () => {
    createPreorder.mockResolvedValue({ status: 'duplicate', field: 'email' })
    const res = await POST(post(body))
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({ status: 'duplicate', field: 'email' })
  })

  it('returns 409 naming the phone when a new email reuses a taken number', async () => {
    createPreorder.mockRejectedValue(Object.assign(new Error('duplicate key'), {
      code: '23505', constraint: 'preorders_phone_key',
    }))
    const res = await POST(post(body))
    expect(res.status).toBe(409)
    // The visitor deliberately used a different email; saying "you are already
    // on the list" without naming the phone is what confused a real person.
    await expect(res.json()).resolves.toEqual({ status: 'duplicate', field: 'phone' })
  })

  it('is idempotent — a replayed request creates nothing extra', async () => {
    createPreorder.mockResolvedValueOnce({ status: 'created' })
    createPreorder.mockResolvedValueOnce({ status: 'duplicate', field: 'email' })
    expect((await POST(post(body))).status).toBe(201)
    expect((await POST(post(body))).status).toBe(409)
  })

  it('returns 400 with field errors for a malformed email', async () => {
    const res = await POST(post({ ...body, email: 'asha@' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.fields.email).toBeTruthy()
    expect(createPreorder).not.toHaveBeenCalled()
  })

  it('rejects qty outside 1..5 even though the client allows only 1..5', async () => {
    const res = await POST(post({ ...body, qty: 500 }))
    expect(res.status).toBe(400)
    expect(createPreorder).not.toHaveBeenCalled()
  })

  it('refuses an oversized body without parsing it', async () => {
    const res = await POST(post(null, JSON.stringify({ ...body, address: 'x'.repeat(5000) })))
    expect(res.status).toBe(413)
    expect(createPreorder).not.toHaveBeenCalled()
  })

  it('returns 400 for a body that is not JSON', async () => {
    const res = await POST(post(null, 'not json at all'))
    expect(res.status).toBe(400)
  })

  it('silently discards a bot that filled the honeypot', async () => {
    const res = await POST(post({ ...body, company: 'Acme' }))
    expect(res.status).toBe(201)
    expect(createPreorder).not.toHaveBeenCalled()
  })

  it('returns 503 when the database is not configured', async () => {
    createPreorder.mockResolvedValue({ status: 'unconfigured' })
    const res = await POST(post(body))
    expect(res.status).toBe(503)
  })

  it('stores every field the form collects', async () => {
    createPreorder.mockResolvedValue({ status: 'created' })
    await POST(post(body))
    const arg = createPreorder.mock.calls[0][0]
    expect(Object.keys(arg).sort()).toEqual(
      ['address', 'city', 'email', 'name', 'phone', 'pincode', 'profession', 'qty'].sort())
    expect(arg.phone).toBe('+919876543210')
    expect(arg).not.toHaveProperty('company')
  })

  it('treats a phone already on the list as a duplicate, not a crash', async () => {
    createPreorder.mockRejectedValue(Object.assign(new Error('dup'), { code: '23505' }))
    const res = await POST(post(body))
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({ status: 'duplicate', field: 'phone' })
  })

  it('rejects an address that is missing', async () => {
    const { address, ...rest } = body
    const res = await POST(post(rest))
    expect(res.status).toBe(400)
    expect((await res.json()).fields.address).toBeTruthy()
    expect(createPreorder).not.toHaveBeenCalled()
  })

  it('rejects a malformed phone number', async () => {
    const res = await POST(post({ ...body, phone: '12345' }))
    expect(res.status).toBe(400)
    expect((await res.json()).fields.phone).toBeTruthy()
  })

  it('rejects a profession that is not on the list', async () => {
    const res = await POST(post({ ...body, profession: 'Astronaut' }))
    expect(res.status).toBe(400)
  })

  it('returns 500 when the insert throws', async () => {
    createPreorder.mockRejectedValue(new Error('connection reset'))
    const res = await POST(post(body))
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toHaveProperty('error')
  })

  it('does not leak the underlying error to the client', async () => {
    createPreorder.mockRejectedValue(new Error('password authentication failed for user'))
    const json = await (await POST(post(body))).json()
    expect(JSON.stringify(json)).not.toContain('password')
  })
})

describe('confirmation email', () => {
  it('is sent to the address that reserved, once, on a new reservation', async () => {
    createPreorder.mockResolvedValue({ status: 'created' })
    await POST(post(body))
    await settleBackground()
    expect(sendReservationEmail).toHaveBeenCalledOnce()
    expect(sendReservationEmail.mock.calls[0][0].email).toBe('asha@example.com')
  })

  it('is not sent again to someone already on the list', async () => {
    createPreorder.mockResolvedValue({ status: 'duplicate', field: 'email' })
    const res = await POST(post(body))
    await settleBackground()
    expect(res.status).toBe(409)
    expect(sendReservationEmail).not.toHaveBeenCalled()
  })

  it('is not sent when the database is unconfigured', async () => {
    createPreorder.mockResolvedValue({ status: 'unconfigured' })
    await POST(post(body))
    await settleBackground()
    expect(sendReservationEmail).not.toHaveBeenCalled()
  })

  it('is not sent to a bot that filled the honeypot', async () => {
    await POST(post({ ...body, company: 'Acme' }))
    await settleBackground()
    expect(sendReservationEmail).not.toHaveBeenCalled()
  })

  it('does not make the visitor wait for the mail server', async () => {
    createPreorder.mockResolvedValue({ status: 'created' })

    // An email that never finishes. If the route awaited it, this test would
    // hang rather than fail — which is exactly the bug worth catching.
    let release!: () => void
    sendReservationEmail.mockImplementation(
      () => new Promise((resolve) => { release = () => resolve({ ok: true, provider: 'resend' }) }),
    )

    const res = await POST(post(body))
    expect(res.status).toBe(201)
    await expect(res.json()).resolves.toEqual({ status: 'created' })

    release()
    await settleBackground()
  })

  it('a failed email still leaves the visitor reserved', async () => {
    createPreorder.mockResolvedValue({ status: 'created' })
    sendReservationEmail.mockResolvedValue({ ok: false, provider: 'smtp', reason: 'auth failed' })
    const res = await POST(post(body))
    await settleBackground()
    expect(res.status).toBe(201)
    await expect(res.json()).resolves.toEqual({ status: 'created' })
  })

  it('an email that throws cannot break the request', async () => {
    createPreorder.mockResolvedValue({ status: 'created' })
    sendReservationEmail.mockRejectedValue(new Error('mail server on fire'))
    const res = await POST(post(body))
    await expect(settleBackground()).rejects.toThrow()
    expect(res.status).toBe(201)
  })
})

describe('GET /api/preorder', () => {
  it('is not allowed', async () => {
    expect((await GET()).status).toBe(405)
  })
})
