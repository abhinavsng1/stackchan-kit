import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * "Reserve Form Started" means someone began typing, not that they tapped a
 * colour swatch: the focus handler checks what received focus.
 */
const src = readFileSync(new URL('../components/ReserveForm.tsx', import.meta.url), 'utf8')

describe('Reserve Form Started', () => {
  it('only counts focus on a field someone fills in', () => {
    expect(src).toMatch(/if \(!isEntryField\(e\.target\)\) return/)
    expect(src).toMatch(/tag === 'textarea' \|\| tag === 'select'/)
    expect(src).toMatch(/'button'.*'radio'/)
  })
})
