import { describe, it, expect } from 'vitest'
import {
  CAMPAIGN, PRICE, campaignActive, campaignLeft, campaignMsLeft,
} from '@/lib/kit'

/**
 * The campaign makes a scarcity claim on a page whose whole argument is that
 * its claims can be checked, so the deadline has to behave like a fact.
 */
describe('the early bird campaign', () => {
  const ends = new Date(CAMPAIGN.endsAt)

  it('ends at a fixed instant, not a duration from whenever you arrived', () => {
    // Two visitors, hours apart, must be told the same closing time.
    expect(new Date(CAMPAIGN.endsAt).getTime()).toBe(ends.getTime())
    expect(CAMPAIGN.endsAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('is live before the deadline and closed after it', () => {
    expect(campaignActive(new Date(ends.getTime() - 1000))).toBe(true)
    expect(campaignActive(new Date(ends.getTime() + 1000))).toBe(false)
  })

  it('never counts below zero once it has closed', () => {
    const after = new Date(ends.getTime() + 9_000_000)
    expect(campaignMsLeft(after)).toBe(0)
    expect(campaignLeft(after)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  })

  it('splits the remaining time correctly', () => {
    const t = new Date(ends.getTime() - ((2 * 86_400 + 3 * 3600 + 4 * 60 + 5) * 1000))
    expect(campaignLeft(t)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5 })
  })

  it('advertises a saving that matches the two prices shown', () => {
    const n = (s: string) => Number(s.replace(/[^\d]/g, ''))
    expect(n(PRICE.mrp) - n(PRICE.now)).toBe(n(PRICE.save))
  })

  it('charges, in paise, exactly the price it displays', () => {
    expect(PRICE.nowPaise).toBe(Number(PRICE.now.replace(/[^\d]/g, '')) * 100)
  })
})
