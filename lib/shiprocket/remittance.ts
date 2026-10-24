import { neon } from '@neondatabase/serverless'
import { srFetch } from './client'

/**
 * Finding out whether the cash actually arrived.
 *
 * There is no remittance API. The whole of Shiprocket's Account module is a
 * wallet balance, and their own docs say the "statement" endpoint is not a
 * statement. What exists is three fields hanging off an order, so this polls
 * them.
 *
 * The distinction this file exists to protect: delivered is a courier's
 * claim, remitted is a bank's. Shiprocket pays COD out on roughly D+8 working
 * days, Mondays, Wednesdays and Fridays, and only once KYC has cleared. An
 * order can sit delivered for a fortnight with the money still theirs.
 */

export type Remittance = { utr: string | null; status: string | null; date: string | null }

const txt = (v: unknown) => {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

export function remittanceOf(body: Record<string, unknown>): Remittance {
  const data = (body?.data ?? {}) as Record<string, unknown> | null
  const d = (data ?? {}) as Record<string, unknown>
  return {
    utr: txt(d.remittance_utr),
    // Verbatim. Shiprocket publishes no enum for this, so nothing branches on
    // it and nothing tidies it up.
    status: txt(d.remittance_status),
    date: txt(d.remittance_date),
  }
}

/**
 * Is this enough to say the balance was collected?
 *
 * Only a UTR will do. A remittance_status is Shiprocket's opinion about its
 * own payout; a UTR is a reference a bank issued for a transfer that
 * happened.
 */
export function shouldRecord(r: Remittance, alreadyCollected: Date | null): boolean {
  if (alreadyCollected) return false
  return Boolean(r.utr)
}

/**
 * Poll every shipped order that has no UTR yet.
 *
 * Deliberately small: a handful of orders, once a day. There is no bulk
 * remittance endpoint to batch against, and the rate limit is per minute.
 */
export async function pollRemittances(): Promise<{ checked: number; recorded: number }> {
  const url = process.env.DATABASE_URL
  if (!url) return { checked: 0, recorded: 0 }
  const sql = neon(url)

  const rows = await sql`
    select id, sr_order_id, balance_collected_at
      from preorders
     where sr_order_id is not null
       and balance_collected_at is null
       and archived_at is null`

  let recorded = 0
  for (const row of rows) {
    const res = await srFetch(`/orders/show/${row.sr_order_id}`, { method: 'GET' })
    if (!res.ok) continue
    const body = await res.json().catch(() => ({})) as Record<string, unknown>
    const r = remittanceOf(body)

    // Store what we learn either way: the status is useful to look at even
    // before the money moves.
    await sql`
      update preorders
         set remittance_status = ${r.status}, remittance_utr = ${r.utr},
             remittance_date = ${r.date}
       where id = ${row.id}`

    if (shouldRecord(r, row.balance_collected_at ? new Date(row.balance_collected_at as string) : null)) {
      await sql`
        update preorders set balance_collected_at = now()
         where id = ${row.id} and balance_collected_at is null`
      recorded += 1
    }
  }

  return { checked: rows.length, recorded }
}
