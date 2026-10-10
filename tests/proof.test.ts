import { describe, it, expect } from 'vitest'
import { FEATURED, WALL, SOCIALS, visibleProof, placeholdersAllowed } from '@/lib/proof'

/**
 * The stories section is laid out with placeholder quotes until real ones
 * arrive. A placeholder testimonial on the live store would be a fake review,
 * so the one thing these tests guard is that production can never show one.
 */
describe('social proof', () => {
  it('shows no placeholder in production', () => {
    const p = visibleProof('production')
    expect(p.featured?.placeholder).toBeFalsy()
    for (const x of [...p.wall, ...p.socials]) expect(x.placeholder, x.id).toBeFalsy()
    expect(p.showingPlaceholders).toBe(false)
  })

  it('shows placeholders locally and on previews, so the section can be reviewed', () => {
    expect(placeholdersAllowed(undefined)).toBe(true)
    expect(placeholdersAllowed('preview')).toBe(true)
    expect(placeholdersAllowed('production')).toBe(false)
  })

  it('hides the stories section in production while every entry is a placeholder', () => {
    const allPlaceholder = [FEATURED, ...WALL].every((x) => x.placeholder)
    if (allPlaceholder) expect(visibleProof('production').hasStories).toBe(false)
  })

  it('gives every photo and video alt text and a credit', () => {
    for (const x of WALL) {
      if (x.kind === 'quote') continue
      expect(x.alt.length, x.id).toBeGreaterThan(8)
      expect(x.credit.length, x.id).toBeGreaterThan(1)
    }
  })

  it('has unique ids', () => {
    const ids = [FEATURED, ...WALL, ...SOCIALS].map((x) => x.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
