import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PRICE } from '@/lib/kit'

/**
 * The reminder for a booking that was never paid for.
 *
 * Three promises are tested here, in order of how much they would cost to
 * break: nobody but Cron can trigger it, nobody is emailed twice, and the
 * figures in the mail are the ones the buyer would actually be charged.
 */

const preorders = vi.hoisted(() => ({
  claimBookingsForRecovery: vi.fn(async () => [] as unknown[]),
  releaseRecoveryClaim: vi.fn(async () => {}),
}))
vi.mock('@/lib/preorders', () => preorders)

type MailResult = { ok: boolean; provider: 'resend'; reason?: string }
const sendRecoveryEmail = vi.hoisted(() =>
  vi.fn(async (_r: unknown): Promise<MailResult> => ({ ok: true, provider: 'resend' })))
vi.mock('@/lib/email', () => ({ sendRecoveryEmail }))

const { GET } = await import('@/app/api/cron/recover-unpaid/route')

const call = (headers: Record<string, string> = {}) =>
  GET(new Request('https://pebblerobo.com/api/cron/recover-unpaid', { headers }))

const due = (over: Record<string, unknown> = {}) => ({
  id: 7, name: 'Asha Rao', email: 'asha@example.com', token: 'b'.repeat(32),
  qty: 1, edition: 'assembled', plan: 'deposit', variant: null, discountPaise: 0,
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'shhh'
  preorders.claimBookingsForRecovery.mockResolvedValue([])
  sendRecoveryEmail.mockResolvedValue({ ok: true, provider: 'resend' })
})

describe('who may run it', () => {
  it('turns away a request with no secret', async () => {
    const res = await call()
    expect(res.status).toBe(401)
    expect(preorders.claimBookingsForRecovery).not.toHaveBeenCalled()
  })

  it('turns away a wrong secret', async () => {
    expect((await call({ authorization: 'Bearer wrong' })).status).toBe(401)
  })

  it('refuses everybody when no secret is configured, rather than opening up', async () => {
    delete process.env.CRON_SECRET
    expect((await call({ authorization: 'Bearer ' })).status).toBe(401)
    expect(preorders.claimBookingsForRecovery).not.toHaveBeenCalled()
  })

  it('lets Cron through', async () => {
    expect((await call({ authorization: 'Bearer shhh' })).status).toBe(200)
  })
})

describe('what it sends', () => {
  it('emails the booking its own payment link and the deposit it owes', async () => {
    preorders.claimBookingsForRecovery.mockResolvedValue([due()])
    const res = await call({ authorization: 'Bearer shhh' })

    expect(await res.json()).toEqual({ claimed: 1, sent: 1, failed: 0 })
    expect(sendRecoveryEmail).toHaveBeenCalledWith(expect.objectContaining({
      email: 'asha@example.com',
      token: 'b'.repeat(32),
      nowPaise: PRICE.depositPaise,
      balancePaise: PRICE.balancePaise,
    }))
  })

  it('quotes the whole price, and nothing on delivery, for a full-plan booking', async () => {
    preorders.claimBookingsForRecovery.mockResolvedValue([due({ plan: 'full' })])
    await call({ authorization: 'Bearer shhh' })
    expect(sendRecoveryEmail).toHaveBeenCalledWith(expect.objectContaining({
      nowPaise: PRICE.depositPaise + PRICE.balancePaise,
      balancePaise: 0,
    }))
  })

  it('only asks for bookings old enough to have stalled and young enough to still matter', async () => {
    await call({ authorization: 'Bearer shhh' })
    expect(preorders.claimBookingsForRecovery)
      .toHaveBeenCalledWith(expect.objectContaining({ minAgeHours: 1, maxAgeHours: 72 }))
  })
})

describe('when the mail cannot go out', () => {
  it('hands the claim back so the next run retries, and says so', async () => {
    preorders.claimBookingsForRecovery.mockResolvedValue([due()])
    sendRecoveryEmail.mockResolvedValue({ ok: false, provider: 'resend', reason: 'rate limited' })

    const res = await call({ authorization: 'Bearer shhh' })

    expect(await res.json()).toEqual({ claimed: 1, sent: 0, failed: 1 })
    expect(preorders.releaseRecoveryClaim).toHaveBeenCalledWith(7)
  })

  it('keeps the claim when the mail went out, so nobody is reminded twice', async () => {
    preorders.claimBookingsForRecovery.mockResolvedValue([due()])
    await call({ authorization: 'Bearer shhh' })
    expect(preorders.releaseRecoveryClaim).not.toHaveBeenCalled()
  })

  it('carries on through the rest of the batch after one failure', async () => {
    preorders.claimBookingsForRecovery.mockResolvedValue([due({ id: 1 }), due({ id: 2 })])
    sendRecoveryEmail
      .mockResolvedValueOnce({ ok: false, provider: 'resend', reason: 'bounced' })
      .mockResolvedValueOnce({ ok: true, provider: 'resend' })

    expect(await (await call({ authorization: 'Bearer shhh' })).json())
      .toEqual({ claimed: 2, sent: 1, failed: 1 })
  })
})
