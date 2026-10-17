import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * When a person first exists in Mixpanel.
 *
 * Until now that was the moment their order row was written, which made
 * everybody who typed an email and then stopped invisible — the people most
 * worth a follow-up. A profile is now written as soon as there is an address
 * to attach one to, and it says plainly that nothing has been ordered yet.
 */

const mixpanel = vi.hoisted(() => ({
  identify: vi.fn(),
  people: { set: vi.fn(), set_once: vi.fn(), increment: vi.fn() },
  track: vi.fn(),
  register: vi.fn(),
  unregister: vi.fn(),
  init: vi.fn(),
  opt_out_tracking: vi.fn(),
  reset: vi.fn(),
}))
vi.mock('mixpanel-browser', () => ({ default: mixpanel }))
vi.mock('@/lib/pixel', () => ({
  initPixel: vi.fn(), pixelStandard: vi.fn(), pixelCustom: vi.fn(),
  stopPixel: vi.fn(), pixelConfigured: () => false,
}))
vi.mock('@/lib/x-pixel', () => ({ xEvent: vi.fn(), storedTwclid: () => null }))
vi.mock('@/lib/analytics-environment', () => ({ analyticsMode: () => 'live' }))

/**
 * Just enough browser for initAnalytics to run. jsdom is not a dependency of
 * this project and adding one for three properties would be a poor trade.
 */
function stubBrowser() {
  const win = { innerWidth: 1280, location: { pathname: '/', search: '' } }
  Object.defineProperty(globalThis, 'window', { value: win, configurable: true, writable: true })
  Object.defineProperty(globalThis, 'document', { value: { referrer: '' }, configurable: true, writable: true })
}

const load = async () => {
  stubBrowser()
  process.env.NEXT_PUBLIC_MIXPANEL_TOKEN = 'token'
  const mod = await import('@/lib/analytics')
  await mod.initAnalytics()
  return mod
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  // identifyPerson hashes the address with SubtleCrypto, which jsdom has.
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', { value: require('node:crypto').webcrypto })
  }
})

const profileFrom = () => {
  const call = mixpanel.people.set.mock.calls.at(-1)
  return (call?.[0] ?? {}) as Record<string, unknown>
}

describe('somebody who is still filling the form', () => {
  it('gets a profile, with their address on it', async () => {
    const { identifyPerson } = await load()
    await identifyPerson({ email: 'Asha@Example.com', name: 'Asha Rao', stage: 'filling' })

    expect(mixpanel.identify).toHaveBeenCalled()
    expect(profileFrom()).toMatchObject({ $email: 'Asha@Example.com', $name: 'Asha Rao' })
  })

  it('is identified by a hash, never by the address itself', async () => {
    const { identifyPerson } = await load()
    await identifyPerson({ email: 'asha@example.com', stage: 'filling' })
    const id = String(mixpanel.identify.mock.calls.at(-1)?.[0])
    expect(id).toMatch(/^[0-9a-f]{64}$/)
    expect(id).not.toContain('asha')
  })

  it('is not recorded as having ordered anything', async () => {
    const { identifyPerson } = await load()
    await identifyPerson({ email: 'asha@example.com', stage: 'filling' })
    expect(profileFrom()).not.toHaveProperty('Last Order At')
  })

  it('is stamped with when they started, once', async () => {
    const { identifyPerson } = await load()
    await identifyPerson({ email: 'asha@example.com', stage: 'filling' })
    const keys = mixpanel.people.set_once.mock.calls.flatMap((c) => Object.keys(c[0] as object))
    expect(keys).toContain('Form Started At')
  })
})

describe('somebody who actually orders', () => {
  it('is recorded as having ordered', async () => {
    const { identifyPerson } = await load()
    await identifyPerson({ email: 'asha@example.com', stage: 'ordered', qty: 2 })
    expect(profileFrom()).toHaveProperty('Last Order At')
    expect(profileFrom()['Kits Ordered']).toBe(2)
  })

  it('does not get a form-started stamp on top of the order', async () => {
    const { identifyPerson } = await load()
    await identifyPerson({ email: 'asha@example.com', stage: 'ordered' })
    const keys = mixpanel.people.set_once.mock.calls.flatMap((c) => Object.keys(c[0] as object))
    expect(keys).not.toContain('Form Started At')
  })
})

describe('the profile queue', () => {
  it('is not batched, because nothing flushes it when a tab goes away', async () => {
    await load()
    const options = mixpanel.init.mock.calls.at(-1)?.[1] as Record<string, unknown>
    expect(options.batch_requests).toBe(false)
  })
})
