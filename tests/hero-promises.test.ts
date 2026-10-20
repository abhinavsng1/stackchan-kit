import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { FAQS } from '@/lib/kit'

/**
 * The line under the Book button answers the three questions people open
 * most in the FAQ. It is a promise made where the decision is made, so each
 * part has to stay true to the FAQ's own answer: if an answer changes, this
 * fails and the line has to change with it.
 */
const hero = readFileSync(new URL('../components/site/Hero.tsx', import.meta.url), 'utf8')
const answer = (q: RegExp) => FAQS.find((f) => q.test(f.q))?.a ?? ''

describe('the promises under the Book button', () => {
  it('are on the first screen', () => {
    expect(hero).toContain("const PROMISES = ['No tech skills needed', 'No subscription', 'Talks over your Wi-Fi']")
    expect(hero).toContain('PROMISES.map')
  })

  it('say under each button what it costs', () => {
    // Book and Amazon differ in when you pay; that has to be readable at the button.
    expect(hero).toContain('{PRICE.balance} more when it arrives')
    expect(hero).toContain('{PRICE.now}, paid upfront')
  })

  it('match what the FAQ says', () => {
    expect(answer(/technical/i)).toMatch(/^Not at all/)
    expect(answer(/subscription/i)).toMatch(/There is no subscription/)
    expect(answer(/Wi-Fi/i)).toMatch(/To talk with you, yes/)
  })
})
