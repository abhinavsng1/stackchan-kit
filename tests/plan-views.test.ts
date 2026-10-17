import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Counting which plan people act on.
 *
 * A counter that silently accepts nonsense is worse than no counter, so the
 * guard against a made-up plan name is the thing worth testing.
 */

const calls = vi.hoisted(() => ({ statements: [] as string[] }))

vi.mock('@neondatabase/serverless', () => ({
  neon: () => async (strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.statements.push(`${strings.join('?')} :: ${values.join(',')}`)
    if (strings.join(' ').includes('from plan_chosen')) return [{ plan: 'full', total: 4 }]
    if (strings.join(' ').includes('from preorders')) return [{ plan: 'full', total: 3, paid: 2 }]
    return []
  },
}))

beforeEach(() => {
  calls.statements = []
  process.env.DATABASE_URL = 'postgres://test'
})

describe('recording a choice', () => {
  it('counts a real plan', async () => {
    const { recordPlanChosen } = await import('@/lib/plan-views')
    expect(await recordPlanChosen('full')).toBe(true)
    expect(calls.statements.join(' ')).toContain('insert into plan_chosen')
  })

  it('refuses a plan that does not exist, and writes nothing', async () => {
    const { recordPlanChosen } = await import('@/lib/plan-views')
    expect(await recordPlanChosen('later')).toBe(false)
    expect(calls.statements).toHaveLength(0)
  })

  it('does nothing at all without a database, rather than throwing', async () => {
    delete process.env.DATABASE_URL
    const { recordPlanChosen } = await import('@/lib/plan-views')
    expect(await recordPlanChosen('full')).toBe(false)
  })
})

describe('reading the tally', () => {
  it('puts attempts, orders and settlements side by side', async () => {
    const { planTally } = await import('@/lib/plan-views')
    expect(await planTally()).toEqual([{ plan: 'full', chosen: 4, orders: 3, paid: 2 }])
  })

  it('is empty rather than broken when there is no database', async () => {
    delete process.env.DATABASE_URL
    const { planTally } = await import('@/lib/plan-views')
    expect(await planTally()).toEqual([])
  })
})
