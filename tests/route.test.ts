import { describe, it, expect, vi, beforeEach } from 'vitest'

const createPreorder = vi.fn()
const duplicateField = (e: unknown): 'email' | 'phone' | null => {
  if (typeof e !== 'object' || e === null || !('code' in e)) return null
  const err = e as { code?: string; constraint?: string; message?: string }
  if (err.code !== '23505') return null
  return `${err.constraint ?? ''} ${err.message ?? ''}`.includes('email') ? 'email' : 'phone'
}
/* Unpaid with no resumable token is the default here; the tests that care
   about resuming set their own return. */
const resumeForEmail = vi.hoisted(() => vi.fn(async () => ({ paid: false, token: null })))
vi.mock('@/lib/preorders', () => ({ createPreorder, duplicateField, resumeForEmail }))

const sendReservationEmail = vi.fn()
vi.mock('@/lib/email', () => ({ sendReservationEmail }))

const sendXConversion = vi.hoisted(() => vi.fn(async () => ({ ok: true, status: 200 })))
vi.mock('@/lib/x-conversions', () => ({
  sendXConversion,
  requestIdentity: (r: Request) => ({ ipAddress: r.headers.get('x-forwarded-for'), userAgent: r.headers.get('user-agent') }),
}))

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

function post(payload: unknown, raw?: string, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/preorder', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: raw ?? JSON.stringify(payload),
  })
}

beforeEach(() => {
  createPreorder.mockReset()
  sendXConversion.mockClear()
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
    createPreorder.mockResolvedValue({
      status: 'duplicate', field: 'email', paid: true, token: null,
    })
    const res = await POST(post(body))
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({
      status: 'duplicate', field: 'email', paid: true, token: null,
    })
  })

  it('lets a returning buyer resume an unpaid order instead of calling it a duplicate', async () => {
    createPreorder.mockResolvedValue({
      status: 'duplicate', field: 'email', paid: false, token: 'b'.repeat(32),
    })
    const res = await POST(post(body))
    expect(res.status).toBe(409)
    // The token is what lets the form offer "pay" rather than a dead end.
    await expect(res.json()).resolves.toMatchObject({ paid: false, token: 'b'.repeat(32) })
  })

  it('never returns a token for an order that is already paid for', async () => {
    createPreorder.mockResolvedValue({
      status: 'duplicate', field: 'email', paid: true, token: null,
    })
    const res = await POST(post(body))
    await expect(res.json()).resolves.toMatchObject({ paid: true, token: null })
  })

  it('returns 409 naming the phone when a new email reuses a taken number', async () => {
    createPreorder.mockRejectedValue(Object.assign(new Error('duplicate key'), {
      code: '23505', constraint: 'preorders_phone_key',
    }))
    const res = await POST(post(body))
    expect(res.status).toBe(409)
    // The visitor deliberately used a different email; saying "you are already
    // on the list" without naming the phone is what confused a real person.
    await expect(res.json()).resolves.toEqual({
      status: 'duplicate', field: 'phone', paid: false, token: null,
    })
  })

  it('is idempotent — a replayed request creates nothing extra', async () => {
    createPreorder.mockResolvedValueOnce({ status: 'created' })
    createPreorder.mockResolvedValueOnce({
      status: 'duplicate', field: 'email', paid: false, token: null,
    })
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
    // An exact set, not a subset: the point is that a new field reaching the
    // database write has to be added here deliberately. 'shell' is on the
    // list because the colour picker was added, not because the list drifted.
    expect(Object.keys(arg).sort()).toEqual(
      ['address', 'city', 'edition', 'email', 'name', 'phone', 'pincode',
       'profession', 'qty', 'shell'].sort())
    // The optional field still arrives filled, because the schema defaults it.
    expect(arg.shell).toBe('graphite')
    expect(arg.phone).toBe('+919876543210')
    expect(arg).not.toHaveProperty('company')
  })

  it('records the edition the buyer chose', async () => {
    createPreorder.mockResolvedValue({ status: 'created' })
    await POST(post({ ...body, edition: 'assembled' }))
    await POST(post({ ...body, edition: 'kit' }))
    expect(createPreorder.mock.calls.map((c) => c[0].edition)).toEqual(['assembled', 'kit'])
  })

  it('records an order from a page that predates the robot as a kit', async () => {
    // That page sold only the kit, so an order with no edition was for one.
    createPreorder.mockResolvedValue({ status: 'created' })
    await POST(post(body))
    expect(createPreorder.mock.calls[0][0].edition).toBe('kit')
  })

  it('refuses an edition that does not exist', async () => {
    const res = await POST(post({ ...body, edition: 'gold' }))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({ fields: { edition: expect.any(String) } })
    expect(createPreorder).not.toHaveBeenCalled()
  })

  it('carries the chosen edition into a resumed order', async () => {
    createPreorder.mockRejectedValue(Object.assign(new Error('dup'), { code: '23505' }))
    await POST(post({ ...body, edition: 'assembled' }))
    expect(resumeForEmail).toHaveBeenLastCalledWith('asha@example.com', '+919876543210', 'assembled')
  })

  it('treats a phone already on the list as a duplicate, not a crash', async () => {
    createPreorder.mockRejectedValue(Object.assign(new Error('dup'), { code: '23505' }))
    const res = await POST(post(body))
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({
      status: 'duplicate', field: 'phone', paid: false, token: null,
    })
  })

  it('refuses an order that could not be shipped', async () => {
    const res = await POST(post({ name: body.name, email: body.email, qty: 1 }))
    expect(res.status).toBe(400)
    const fields = (await res.json()).fields
    for (const f of ['phone', 'address', 'city', 'pincode']) expect(fields[f]).toBeTruthy()
    expect(createPreorder).not.toHaveBeenCalled()
  })

  it('hands the payment token back so checkout can open straight away', async () => {
    createPreorder.mockResolvedValue({ status: 'created', token: 'a'.repeat(32) })
    const res = await POST(post(body))
    await settleBackground()
    expect(res.status).toBe(201)
    await expect(res.json()).resolves.toEqual({ status: 'created', token: 'a'.repeat(32) })
  })

  it.each([
    ['address', 'here'], ['city', 'A'], ['pincode', '123'],
  ])('rejects a malformed %s', async (field, value) => {
    const res = await POST(post({ ...body, [field]: value }))
    expect(res.status).toBe(400)
    expect((await res.json()).fields[field]).toBeTruthy()
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

  it('accepts a reservation with no profession at all', async () => {
    createPreorder.mockResolvedValue({ status: 'created' })
    const { profession, ...rest } = body
    const res = await POST(post(rest))
    expect(res.status).toBe(201)
    expect(createPreorder).toHaveBeenCalledOnce()
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

describe('email is tied to payment, not to placing an order', () => {
  // The route used to confirm the moment the row was written. Once payment
  // moved onto the page that became a promise made before any money had
  // moved: someone who closed the payment window was told their kit was
  // reserved. Confirmation now comes from the payment settling instead.

  it('sends nothing when an order is placed but not yet paid for', async () => {
    createPreorder.mockResolvedValue({ status: 'created', token: 'a'.repeat(32) })
    await POST(post(body))
    await settleBackground()
    expect(sendReservationEmail).not.toHaveBeenCalled()
  })

  it('sends nothing to someone who already ordered', async () => {
    createPreorder.mockResolvedValue({ status: 'duplicate', field: 'email' })
    const res = await POST(post(body))
    await settleBackground()
    expect(res.status).toBe(409)
    expect(sendReservationEmail).not.toHaveBeenCalled()
  })

  it('sends nothing when the database is unconfigured', async () => {
    createPreorder.mockResolvedValue({ status: 'unconfigured' })
    await POST(post(body))
    await settleBackground()
    expect(sendReservationEmail).not.toHaveBeenCalled()
  })

  it('sends nothing to a bot that filled the honeypot', async () => {
    await POST(post({ ...body, company: 'Acme' }))
    await settleBackground()
    expect(sendReservationEmail).not.toHaveBeenCalled()
  })
})

describe('GET /api/preorder', () => {
  it('is not allowed', async () => {
    expect((await GET()).status).toBe(405)
  })
})

describe('X conversions from the order route', () => {
  const browser = { 'x-forwarded-for': '203.0.113.9', 'user-agent': 'Mozilla/5.0' }

  it('reports a new order as a lead, under the id the browser will send too', async () => {
    createPreorder.mockResolvedValue({ status: 'created', token: 'a'.repeat(32) })
    await POST(post({ ...body, twclid: 'click1', xid: 'abcd1234-ef' }, undefined, browser))
    await settleBackground()
    expect(sendXConversion).toHaveBeenCalledOnce()
    expect(sendXConversion).toHaveBeenCalledWith({
      event: 'lead',
      conversionId: 'abcd1234-ef',
      identity: {
        email: 'asha@example.com', phone: '+919876543210', twclid: 'click1',
        ipAddress: '203.0.113.9', userAgent: 'Mozilla/5.0',
      },
    })
    // The click id is kept with the order for the sale, the lead id is not.
    expect(createPreorder.mock.calls[0][0]).toMatchObject({ twclid: 'click1' })
    expect(createPreorder.mock.calls[0][0]).not.toHaveProperty('xid')
  })

  it('drops a malformed click id rather than refusing the order', async () => {
    createPreorder.mockResolvedValue({ status: 'created', token: 'a'.repeat(32) })
    const res = await POST(post({ ...body, twclid: '<script>' }))
    expect(res.status).toBe(201)
    expect(createPreorder.mock.calls[0][0].twclid).toBeUndefined()
  })

  it('reports nothing for a duplicate — it is not a new order', async () => {
    createPreorder.mockResolvedValue({ status: 'duplicate', field: 'email', paid: false, token: null })
    await POST(post(body))
    await settleBackground()
    expect(sendXConversion).not.toHaveBeenCalled()
  })

  it('reports nothing, and remembers not to, when the browser sends Global Privacy Control', async () => {
    createPreorder.mockResolvedValue({ status: 'created', token: 'a'.repeat(32) })
    await POST(post(body, undefined, { ...browser, 'sec-gpc': '1' }))
    await settleBackground()
    expect(sendXConversion).not.toHaveBeenCalled()
    // Kept with the order, so the payment webhook honours it as well.
    expect(createPreorder.mock.calls[0][0]).toMatchObject({ adOptOut: true })
  })
})
