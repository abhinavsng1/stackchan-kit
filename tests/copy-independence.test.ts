import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The re-skin reimplements cgotchi's design system, which is fair: tokens, a
 * type scale and a spacing rhythm are measurable facts about a visual
 * language. Their sentences are not. Two headings on this site had tracked
 * theirs word for word, which is the one line the brief draws.
 *
 * This is a guard against it coming back, not a claim that these five
 * strings are the only way to go wrong.
 */
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name)
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : sources(p)
    return /\.tsx?$/.test(e.name) ? [readFileSync(p, 'utf8')] : []
  })
}

const prose = [
  ...sources(new URL('../app', import.meta.url).pathname),
  ...sources(new URL('../components', import.meta.url).pathname),
  ...sources(new URL('../lib', import.meta.url).pathname),
].join('\n')

describe('the copy is ours', () => {
  const borrowed = [
    'Three ways to meet',        // "Three ways to meet cgotchi."
    'Serious dev board',         // "Small cube. Serious dev board."
    'Small cube',
    'Your code finally has a body',
    "whatever you flash it to be",
    'May cause weekend projects',
  ]

  for (const phrase of borrowed) {
    it(`does not carry "${phrase}"`, () => {
      expect(prose.toLowerCase()).not.toContain(phrase.toLowerCase())
    })
  }
})
