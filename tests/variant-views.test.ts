import { describe, it, expect, beforeEach, vi } from 'vitest'

const sql = vi.hoisted(() => vi.fn())
vi.mock('@neondatabase/serverless', () => ({ neon: () => sql }))

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('DATABASE_URL', 'postgres://stub')
  sql.mockReset(); sql.mockResolvedValue([])
})

describe('counting who saw which price', () => {
  it('counts a known variant', async () => {
    const { recordVariantView } = await import('@/lib/variant-views')
    await expect(recordVariantView('lifetime')).resolves.toBe(true)
    expect(String(sql.mock.calls[0][0])).toContain('variant_views')
  })

  it('refuses an unknown variant rather than inventing an arm', async () => {
    const { recordVariantView } = await import('@/lib/variant-views')
    await expect(recordVariantView('free')).resolves.toBe(false)
    expect(sql).not.toHaveBeenCalled()
  })

  it('increments rather than overwriting', async () => {
    const { recordVariantView } = await import('@/lib/variant-views')
    await recordVariantView('subscription')
    const q = String(sql.mock.calls[0][0]).toLowerCase()
    expect(q).toContain('on conflict')
    expect(q).toContain('+ 1')
  })

  it('stores nothing that identifies the visitor', async () => {
    const { recordVariantView } = await import('@/lib/variant-views')
    await recordVariantView('lifetime')
    const text = sql.mock.calls.map((c) => JSON.stringify(c)).join(' ').toLowerCase()
    for (const w of ['ip', 'agent', 'session', 'cookie', 'referer']) {
      expect(text, `variant_views must not record ${w}`).not.toContain(w)
    }
  })
})

describe('bot traffic', () => {
  it('is not counted, or a crawler decides the experiment', async () => {
    const { looksLikeBot } = await import('@/lib/variant-views')
    for (const ua of [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'facebookexternalhit/1.1', 'Twitterbot/1.0', 'AhrefsBot/7.0', 'curl/8.4.0',
      'Mozilla/5.0 (compatible; bingbot/2.0)', '',
    ]) expect(looksLikeBot(ua), `${ua} should be treated as a bot`).toBe(true)
  })

  it('counts an ordinary browser', async () => {
    const { looksLikeBot } = await import('@/lib/variant-views')
    expect(looksLikeBot(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
    )).toBe(false)
  })
})
