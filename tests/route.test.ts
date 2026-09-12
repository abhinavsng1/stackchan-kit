import { describe, it, expect, vi, beforeEach } from 'vitest'

const createPreorder = vi.fn()
vi.mock('@/lib/preorders', () => ({ createPreorder }))

const { POST, GET } = await import('@/app/api/preorder/route')

const body = { name: 'Asha Rao', email: 'asha@example.com', qty: 2, city: 'Bengaluru' }

function post(payload: unknown, raw?: string) {
  return new Request('http://localhost/api/preorder', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ?? JSON.stringify(payload),
  })
}

beforeEach(() => {
  createPreorder.mockReset()
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

  it('returns 409 when the email is already on the list', async () => {
    createPreorder.mockResolvedValue({ status: 'duplicate' })
    const res = await POST(post(body))
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({ status: 'duplicate' })
  })

  it('is idempotent — a replayed request creates nothing extra', async () => {
    createPreorder.mockResolvedValueOnce({ status: 'created' })
    createPreorder.mockResolvedValueOnce({ status: 'duplicate' })
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
    const res = await POST(post(null, JSON.stringify({ ...body, city: 'x'.repeat(5000) })))
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

describe('GET /api/preorder', () => {
  it('is not allowed', async () => {
    expect((await GET()).status).toBe(405)
  })
})
