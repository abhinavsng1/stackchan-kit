import { describe, it, expect } from 'vitest'
import { indexForProgress, progressIn } from '@/lib/scroll-sequence'

/**
 * A sticky sequence turns "how far have we scrolled through this section"
 * into "which frame is showing". Both halves get their edges pinned here,
 * because the failure modes are silent: an index one past the end renders
 * nothing, and a progress that never reaches 1 means the last frame is
 * unreachable no matter how far you scroll.
 */
describe('indexForProgress', () => {
  it('shows the first frame at the top and the last at the bottom', () => {
    expect(indexForProgress(0, 12)).toBe(0)
    expect(indexForProgress(1, 12)).toBe(11)
  })

  it('never returns an index outside the sequence, however wild the input', () => {
    for (const p of [-5, -0.2, 1.2, 99, Number.NaN]) {
      const i = indexForProgress(p, 12)
      expect(Number.isInteger(i)).toBe(true)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThanOrEqual(11)
    }
  })

  it('gives every frame an equal share of the scroll', () => {
    // 12 frames over 0..1 is a band of 1/12 each. Frame 5 owns [5/12, 6/12).
    expect(indexForProgress(5 / 12 + 0.001, 12)).toBe(5)
    expect(indexForProgress(6 / 12 - 0.001, 12)).toBe(5)
    expect(indexForProgress(6 / 12 + 0.001, 12)).toBe(6)
  })

  it('handles a single-frame sequence without dividing by zero', () => {
    expect(indexForProgress(0.5, 1)).toBe(0)
  })
})

describe('progressIn', () => {
  // top = the section's distance above the viewport top, once it is pinned.
  it('is 0 while the section is still arriving', () => {
    expect(progressIn(0, 2000, 800)).toBe(0)
    expect(progressIn(-50, 2000, 800)).toBe(0)
  })

  it('reaches 1 by the time the section has fully passed', () => {
    // 2000 tall, 800 viewport: 1200px of travel while pinned.
    expect(progressIn(1200, 2000, 800)).toBe(1)
    expect(progressIn(9999, 2000, 800)).toBe(1)
  })

  it('is halfway at half the travel', () => {
    expect(progressIn(600, 2000, 800)).toBeCloseTo(0.5)
  })

  it('does not divide by zero when the section is shorter than the viewport', () => {
    const p = progressIn(10, 500, 800)
    expect(Number.isFinite(p)).toBe(true)
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThanOrEqual(1)
  })
})
