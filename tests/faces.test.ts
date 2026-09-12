import { describe, it, expect } from 'vitest'
import { FACES, faceSvg, SCREEN, byId } from '@/lib/faces'

/**
 * The 3D panel is now the only consumer of these, so nothing on screen would
 * obviously break if one went malformed. These assert the shapes stay valid.
 */
describe('the firmware face table', () => {
  it('carries all twelve expressions', () => {
    expect(FACES).toHaveLength(12)
    expect(FACES.map((f) => f.id)).toEqual([
      'neutral', 'happy', 'excited', 'love', 'sleepy', 'sad',
      'angry', 'surprised', 'curious', 'doubt', 'wink', 'error',
    ])
  })

  it('draws every face at the real panel size', () => {
    for (const f of FACES) {
      const svg = faceSvg(f)
      expect(svg, f.id).toContain(`viewBox="0 0 ${SCREEN.w} ${SCREEN.h}"`)
      // an SVG without intrinsic size will not load as a texture
      expect(svg, f.id).toContain(`width="${SCREEN.w}"`)
      expect(svg, f.id).toContain(`height="${SCREEN.h}"`)
      expect(svg.startsWith('<svg'), f.id).toBe(true)
      expect(svg.endsWith('</svg>'), f.id).toBe(true)
    }
  })

  it('gives every face a background, an eye colour and an accent', () => {
    for (const f of FACES) {
      for (const key of ['bg', 'eye', 'acc'] as const) {
        expect(f[key], `${f.id}.${key}`).toMatch(/^#[0-9A-Fa-f]{6}$/)
      }
    }
  })

  it('paints something for both eyes and rest on every face', () => {
    for (const f of FACES) {
      expect(f.eyes().length, `${f.id} eyes`).toBeGreaterThan(20)
      expect(f.rest().length, `${f.id} rest`).toBeGreaterThan(10)
    }
  })

  it('closes the eyes when asked, for the blink frame', () => {
    const open = faceSvg(FACES[0])
    const shut = faceSvg(FACES[0], { eyeScaleY: 0.06 })
    expect(shut).not.toBe(open)
    expect(shut).toContain('scale(1 0.06)')
  })

  it('falls back to Neutral for an unknown id', () => {
    expect(byId('banana').id).toBe('neutral')
    expect(byId('angry').id).toBe('angry')
  })

  it('never blinks a face drawn with closed or arc eyes', () => {
    for (const id of ['happy', 'love', 'sleepy', 'doubt', 'wink', 'error']) {
      expect(byId(id).blinks, id).toBe(false)
    }
  })
})
