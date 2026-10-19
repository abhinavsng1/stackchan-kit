import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * measure() is for studying the page; track() is for the moments the ad
 * campaigns are judged on. These run the real functions on the live host
 * with both pixels replaced, and hold the difference between them.
 */
const { pixel, x } = vi.hoisted(() => ({
  pixel: {
    initPixel: vi.fn(), pixelStandard: vi.fn(), pixelCustom: vi.fn(),
    stopPixel: vi.fn(), pixelConfigured: () => true,
  },
  x: { xEvent: vi.fn() },
}))
vi.mock('@/lib/pixel', () => pixel)
vi.mock('@/lib/x-pixel', () => x)

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubGlobal('window', { location: { hostname: 'pebblerobo.com', search: '' } })
})
afterEach(() => vi.unstubAllGlobals())

describe('measure()', () => {
  it('reaches neither Meta nor X', async () => {
    const { measure, EV } = await import('@/lib/analytics')
    for (const ev of [EV.robotTapped, EV.filmChosen, EV.pageEngaged, EV.pagePerformance,
      EV.reserveFieldCompleted, EV.demoAction, EV.sectionViewed]) {
      measure(ev, { section: 'why' })
    }
    expect(pixel.pixelStandard).not.toHaveBeenCalled()
    expect(pixel.pixelCustom).not.toHaveBeenCalled()
    expect(x.xEvent).not.toHaveBeenCalled()
  })

  it('sends nothing at all off the live site', async () => {
    window.location.hostname = 'localhost'
    const { measure, EV } = await import('@/lib/analytics')
    measure(EV.robotTapped, { location: 'hero' })
    expect(pixel.pixelCustom).not.toHaveBeenCalled()
  })
})

describe('track(), beside it', () => {
  it('still sends a section view to both, so the line between them is real', async () => {
    const { track, EV } = await import('@/lib/analytics')
    track(EV.sectionViewed, { section: 'does' })
    expect(pixel.pixelStandard).toHaveBeenCalledWith('ViewContent', expect.objectContaining({ section: 'does' }))
    expect(x.xEvent).toHaveBeenCalledWith('content', expect.anything())
  })
})
