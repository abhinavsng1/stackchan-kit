import { neon } from '@neondatabase/serverless'
import { isPlan, type Plan } from '@/lib/plans'

/**
 * How many people chose each way of paying, per day.
 *
 * Counted when a payment is started rather than when a page renders: every
 * visitor sees both plans, so a view says nothing, and the choice is only
 * real once somebody acts on it. Paired with the orders table — which records
 * the plan each booking actually settled under — this gives the two numbers a
 * take-up rate needs.
 *
 * A counter with no identity in it. Day and plan, and nothing else.
 */

function client() {
  const url = process.env.DATABASE_URL
  if (!url) return null
  return neon(url)
}

export async function recordPlanChosen(plan: string): Promise<boolean> {
  if (!isPlan(plan)) return false
  const sql = client()
  if (!sql) return false
  const day = new Date().toISOString().slice(0, 10)
  await sql`
    insert into plan_chosen (day, plan, count)
    values (${day}, ${plan}, 1)
    on conflict (day, plan) do update set count = plan_chosen.count + 1`
  return true
}

export type PlanTally = {
  plan: Plan
  /** Payment screens opened on this plan. */
  chosen: number
  /** Bookings that exist on it. */
  orders: number
  /** Bookings on it that were actually paid for. */
  paid: number
}

export async function planTally(): Promise<PlanTally[]> {
  const sql = client()
  if (!sql) return []
  const chosen = await sql`select plan, sum(count)::int total from plan_chosen group by plan`
  const orders = await sql`
    select plan, count(*)::int total, count(paid_at)::int paid from preorders group by plan`

  const out = new Map<string, PlanTally>()
  const row = (k: string): PlanTally =>
    out.get(k) ?? { plan: (isPlan(k) ? k : 'deposit'), chosen: 0, orders: 0, paid: 0 }

  for (const r of chosen) {
    const k = String(r.plan)
    out.set(k, { ...row(k), chosen: Number(r.total) })
  }
  for (const r of orders) {
    const k = String(r.plan)
    out.set(k, { ...row(k), orders: Number(r.total), paid: Number(r.paid) })
  }
  return [...out.values()].sort((a, b) => a.plan.localeCompare(b.plan))
}
