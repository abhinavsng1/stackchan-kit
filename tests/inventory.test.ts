import { describe, it, expect } from 'vitest'
import {
  SKU_PATTERN, normaliseSku, demandKey, moveProblem, tallyDemand, withDemand,
  DIRECTION, REASONS, type Item,
} from '@/lib/inventory'

/**
 * The arithmetic, with no database in sight.
 *
 * Everything here is a rule that decides whether a figure on the shelf page
 * can be trusted: which way a reason is allowed to point, what counts as
 * already sold, and what happens to demand for something nobody is counting.
 */

const item = (over: Partial<Item> = {}): Item => ({
  sku: 'PBL-EMBER', name: 'PebbleRobo, Ember', kind: 'finished',
  edition: 'assembled', shell: 'ember',
  onHand: 4, reorderAt: null, active: true, note: null,
  updatedAt: new Date('2026-10-24T00:00:00Z'),
  ...over,
})

describe('skus', () => {
  it('stores and compares one spelling', () => {
    expect(normaliseSku(' pbl-ember ')).toBe('PBL-EMBER')
  })

  it('takes what somebody would print on a box, and nothing stranger', () => {
    for (const ok of ['PBL-EMBER', 'A1', 'CORE_S3.LITE']) expect(SKU_PATTERN.test(ok), ok).toBe(true)
    for (const bad of ['', 'A', '-LEADING', 'has space', 'Á', 'X'.repeat(33)]) {
      expect(SKU_PATTERN.test(bad), bad).toBe(false)
    }
  })
})

describe('moveProblem', () => {
  it('refuses a move with the wrong sign for its reason', () => {
    // "damaged 2" meaning two more robots is the entry nobody notices until
    // the shelf is empty.
    expect(moveProblem({ reason: 'damaged', delta: 2, onHand: 9 })).toMatch(/takes stock away/i)
    expect(moveProblem({ reason: 'built', delta: -2, onHand: 9 })).toMatch(/adds stock/i)
  })

  it('allows a count to go either way', () => {
    expect(moveProblem({ reason: 'count', delta: 3, onHand: 1 })).toBeNull()
    expect(moveProblem({ reason: 'count', delta: -1, onHand: 1 })).toBeNull()
  })

  it('has a direction for every reason it offers', () => {
    for (const r of REASONS) expect(DIRECTION[r], r).toBeDefined()
  })

  it('refuses a change that would leave fewer than zero things', () => {
    expect(moveProblem({ reason: 'damaged', delta: -5, onHand: 4 })).toMatch(/only 4/)
  })

  it('lets a shipment take the count negative', () => {
    // Dispatch reports what happened rather than proposing it: the robot is
    // on a courier whatever the figure said, and a refused entry would keep
    // the figure wrong and quiet.
    expect(moveProblem({ reason: 'shipped', delta: -5, onHand: 4 })).toBeNull()
  })

  it('refuses nothing-at-all and fractions', () => {
    expect(moveProblem({ reason: 'built', delta: 0, onHand: 1 })).toMatch(/nothing/i)
    expect(moveProblem({ reason: 'built', delta: 1.5, onHand: 1 })).toMatch(/whole number/i)
  })
})

describe('demand', () => {
  it('keys an order with no colour as a real value, not a missing one', () => {
    // Kits sold for months with no colour at all. Those orders are demand for
    // something, and it has to land somewhere.
    expect(demandKey('kit', null)).not.toBe(demandKey('kit', 'ember'))
    expect(tallyDemand([{ edition: 'kit', shell: null, units: 4 }]).get(demandKey('kit', null))).toBe(4)
  })

  it('adds up the units, not the orders', () => {
    const d = tallyDemand([
      { edition: 'assembled', shell: 'ember', units: 2 },
      { edition: 'assembled', shell: 'ember', units: 3 },
      { edition: 'assembled', shell: 'graphite', units: 1 },
    ])
    expect(d.get(demandKey('assembled', 'ember'))).toBe(5)
    expect(d.get(demandKey('assembled', 'graphite'))).toBe(1)
  })
})

describe('withDemand', () => {
  const demand = tallyDemand([
    { edition: 'assembled', shell: 'ember', units: 6 },
    { edition: 'assembled', shell: 'moss', units: 2 },
  ])

  it('subtracts what is already sold', () => {
    const { stock } = withDemand([item({ onHand: 4 })], demand)
    expect(stock[0].committed).toBe(6)
    expect(stock[0].available).toBe(-2)
  })

  it('counts no demand against a part, because no order names one', () => {
    const { stock } = withDemand([item({ sku: 'SCS0009', kind: 'part', edition: null, shell: null })], demand)
    expect(stock[0].committed).toBe(0)
    expect(stock[0].available).toBe(stock[0].onHand)
  })

  it('reports demand that no sku is counting rather than dropping it', () => {
    // The dangerous case: a shelf that looks fine because the thing people
    // bought is not on it.
    const { unstocked } = withDemand([item()], demand)
    expect(unstocked).toEqual([{ edition: 'assembled', shell: 'moss', units: 2 }])
  })

  it('judges "low" on what can still be promised, not on what is on the bench', () => {
    const { stock } = withDemand([item({ onHand: 8, reorderAt: 3 })], demand)
    expect(stock[0].onHand).toBe(8)
    expect(stock[0].available).toBe(2)
    expect(stock[0].low).toBe(true)
  })

  it('never warns when no level was set', () => {
    expect(withDemand([item({ onHand: 0, reorderAt: null })], demand).stock[0].low).toBe(false)
  })
})
