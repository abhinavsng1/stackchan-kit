import { describe, it, expect } from 'vitest'
import { ROLES, shippedRoles, plannedRoles } from '@/lib/roles'
import { readFileSync, existsSync } from 'node:fs'

/**
 * The roles section replaces a count of expressions, which means it now
 * carries the page's claims about what the robot does. These tests exist to
 * stop it drifting into what the robot might one day do.
 */
describe('roles', () => {
  it('has an image that was actually rendered', () => {
    for (const r of ROLES) {
      for (const w of [800, 1600]) {
        const p = new URL(`../public${r.image}@${w}.webp`, import.meta.url)
        expect(existsSync(p), `${r.image}@${w}.webp is missing`).toBe(true)
      }
    }
  })

  it('splits what ships from what does not', () => {
    expect([...shippedRoles(), ...plannedRoles()]).toHaveLength(ROLES.length)
    for (const r of shippedRoles()) expect(r.shipped).toBe(true)
  })

  it('claims no capability the firmware does not have', () => {
    // Checked against pebble-robo-mono: there is no person detection on the
    // robot, no presence sensing, no proximity sensor driver, and no tutor
    // or lesson mode. The phone does the face tracking and sends angles.
    const prose = ROLES.map((r) => `${r.title} ${r.body}`).join(' ').toLowerCase()
    for (const claim of [
      'follows you around', 'recognises you', 'knows when you',
      'detects when', 'senses you', 'tutor', 'lesson', 'teaches you',
      'security', 'monitors your',
    ]) {
      expect(prose, `unsupported claim: "${claim}"`).not.toContain(claim)
    }
  })

  it('never says twelve faces', () => {
    // The shipped firmware has six emotions. The atlas on this site draws
    // twelve. Until those agree, the page counts neither.
    const prose = ROLES.map((r) => r.body).join(' ').toLowerCase()
    expect(prose).not.toMatch(/twelve|12 (faces|expressions)/)
  })

  it('is short enough to read', () => {
    for (const r of ROLES) {
      expect(r.title.split(/\s+/).length, `${r.id} title too long`).toBeLessThanOrEqual(5)
      expect(r.body.length, `${r.id} body too long`).toBeLessThan(230)
    }
  })
})

describe('the render manifest', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../public/media/render/manifest.json', import.meta.url), 'utf8'))

  it('marks every generated asset as a render', () => {
    // The rule is that nothing generated may sit on the page unlabelled, and
    // no real-footage caption may end up beside one.
    expect(manifest.assets.length).toBeGreaterThan(0)
    for (const a of manifest.assets) expect(a.render, `${a.file}`).toBe(true)
  })

  it('gives every asset alt text', () => {
    for (const a of manifest.assets) expect(a.alt?.length ?? 0).toBeGreaterThan(8)
  })
})
