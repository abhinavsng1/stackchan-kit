import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The X pixel reports on the same moments as the Meta Pixel. These run the
 * real track() in browser-test mode against the queue X's base code installs.
 */

const IDS = {
  NEXT_PUBLIC_X_EVENT_PURCHASE: 'tw-rfx4u-purch',
  NEXT_PUBLIC_X_EVENT_LEAD: 'tw-rfx4u-lead1',
  NEXT_PUBLIC_X_EVENT_CHECKOUT: 'tw-rfx4u-check',
  NEXT_PUBLIC_X_EVENT_CONTENT: 'tw-rfx4u-cont1',
}

let twq: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetModules()
  for (const [k, v] of Object.entries(IDS)) vi.stubEnv(k, v)
  vi.stubEnv('NEXT_PUBLIC_ANALYTICS_TEST_MODE', '1')
  twq = vi.fn()
  vi.stubGlobal('window', { location: { hostname: 'localhost' }, twq })
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('event ids', () => {
  it('are read from the environment, so they can change without a code change', async () => {
    const { X_EVENTS } = await import('@/lib/x')
    expect(X_EVENTS).toEqual({
      purchase: 'tw-rfx4u-purch', lead: 'tw-rfx4u-lead1',
      checkout: 'tw-rfx4u-check', content: 'tw-rfx4u-cont1',
    })
  })

  it('default to the ids created in Events Manager for pixel rfx4u', async () => {
    for (const k of Object.keys(IDS)) vi.stubEnv(k, '')
    const { X_EVENTS } = await import('@/lib/x')
    expect(X_EVENTS).toEqual({
      purchase: 'tw-rfx4u-rgpx2', lead: 'tw-rfx4u-rgpxh',
      checkout: 'tw-rfx4u-rgpxi', content: 'tw-rfx4u-rgpxm',
    })
  })

  it('ignore an override that is not an id for this pixel', async () => {
    vi.stubEnv('NEXT_PUBLIC_X_EVENT_LEAD', 'tw-otherpx-abc')
    const { X_EVENTS } = await import('@/lib/x')
    expect(X_EVENTS.lead).toBe('tw-rfx4u-rgpxh')
  })
})

describe('mirroring Meta', () => {
  it('reports a Book or Buy press as Checkout initiated, with its value', async () => {
    const { track, EV } = await import('@/lib/analytics')
    track(EV.reserveCtaClicked, { location: 'buybox', qty: 2, edition: 'kit' })
    expect(twq).toHaveBeenCalledWith('event', 'tw-rfx4u-check', {
      value: 9998, currency: 'INR', contents: [{ content_id: 'PBL-KIT-01', num_items: 2 }],
    })
  })

  it('reports Content view once a visit, not once a section', async () => {
    const { track, EV } = await import('@/lib/analytics')
    track(EV.sectionViewed, { section: 'buy' })
    track(EV.sectionViewed, { section: 'specs' })
    const content = twq.mock.calls.filter((c) => c[1] === 'tw-rfx4u-cont1')
    expect(content).toHaveLength(1)
    expect(content[0][2]).toEqual({ contents: [{ content_id: 'PBL-BOT-01', content_name: 'buy' }] })
  })

  it('leaves Lead and Purchase to the call sites that know their conversion ids', async () => {
    const { track, EV } = await import('@/lib/analytics')
    track(EV.reserveSucceeded, { edition: 'assembled' })
    track(EV.paymentSucceeded, { qty: 1, edition: 'assembled' })
    expect(twq).not.toHaveBeenCalled()
  })

  it('sends nothing for an event with no id', async () => {
    const { X_EVENTS } = await import('@/lib/x')
    X_EVENTS.checkout = null
    const { track, EV } = await import('@/lib/analytics')
    track(EV.reserveCtaClicked, { location: 'nav' })
    expect(twq).not.toHaveBeenCalled()
  })
})
