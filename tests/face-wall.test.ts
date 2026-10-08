import { describe, it, expect } from 'vitest'
import { FACES } from '@/lib/faces'
import { WHEN } from '@/app/pebble-chan/when'

/**
 * The atlas carries a `use` note written for someone wiring the firmware
 * ("bus fault, torque refused"). The product page needs the same trigger said
 * the way a buyer would say it, so it keeps its own line per face — and the
 * failure mode of a second list is that it falls behind the first.
 */
describe('the face captions', () => {
  it('has a line for every face in the atlas', () => {
    for (const f of FACES) {
      expect(WHEN[f.id], `no caption for "${f.id}"`).toBeTruthy()
    }
  })

  it('carries no caption for a face that no longer exists', () => {
    const ids = new Set(FACES.map((f) => f.id))
    for (const id of Object.keys(WHEN)) {
      expect(ids.has(id), `caption for unknown face "${id}"`).toBe(true)
    }
  })

  it('says when, not what the serial command is', () => {
    for (const [id, line] of Object.entries(WHEN)) {
      expect(line, `${id} reads like a command`).not.toMatch(/emote |\bcmd\b|firmware|bus fault|torque/i)
    }
  })
})
