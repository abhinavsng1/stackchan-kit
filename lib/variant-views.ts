import { neon } from '@neondatabase/serverless'
import { isVariant } from '@/lib/variants'

/**
 * The denominator of the experiment.
 *
 * Counted on the server as the page renders rather than beaconed from the
 * browser: an ad blocker that swallows the beacon would silently shrink one
 * arm's denominator and inflate its conversion rate, which is worse than
 * having no number at all.
 *
 * A counter, not a log. Day and variant, nothing else — no address, no agent
 * string, nothing to join on.
 */
function client() {
  const url = process.env.DATABASE_URL
  if (!url) return null
  return neon(url)
}

const BOTS = /bot|crawl|spider|slurp|facebookexternalhit|preview|curl|wget|headless|lighthouse|monitor|pingdom|fetch/i

/**
 * Whether to leave this request out of the count.
 *
 * An empty agent counts as a bot. Real browsers always send one, and leaving
 * the unknown in is how a scraper ends up deciding which price wins.
 */
export function looksLikeBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true
  return BOTS.test(userAgent)
}

export async function recordVariantView(variant: string): Promise<boolean> {
  if (!isVariant(variant)) return false
  const sql = client()
  if (!sql) return false
  const day = new Date().toISOString().slice(0, 10)
  await sql`
    insert into variant_views (day, variant, count)
    values (${day}, ${variant}, 1)
    on conflict (day, variant) do update set count = variant_views.count + 1`
  return true
}

export type VariantTally = { variant: string; views: number; orders: number; paid: number }

/** Views against orders, per arm — the only comparison the experiment supports. */
export async function variantTally(): Promise<VariantTally[]> {
  const sql = client()
  if (!sql) return []
  const views = await sql`select variant, sum(count)::int total from variant_views group by variant`
  const orders = await sql`
    select variant, count(*)::int total, count(paid_at)::int paid
      from preorders where variant is not null group by variant`

  const out = new Map<string, VariantTally>()
  for (const r of views) {
    out.set(String(r.variant), { variant: String(r.variant), views: Number(r.total), orders: 0, paid: 0 })
  }
  for (const r of orders) {
    const k = String(r.variant)
    const row = out.get(k) ?? { variant: k, views: 0, orders: 0, paid: 0 }
    row.orders = Number(r.total); row.paid = Number(r.paid)
    out.set(k, row)
  }
  return [...out.values()].sort((a, b) => a.variant.localeCompare(b.variant))
}
