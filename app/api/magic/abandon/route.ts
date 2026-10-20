import { z } from 'zod'
import { magicEnabled } from '@/lib/magic'
import { markMagicOrderAbandoned } from '@/lib/magic-orders'

/**
 * The buyer closed the payment window without paying.
 *
 * Told to us by the page, because nothing else can tell us: Razorpay sends no
 * webhook for a window somebody shut. Without it an abandoned order and a
 * payment whose webhook never arrived look identical in the table, and those
 * two want opposite responses — one is a follow-up, the other is a fault.
 *
 * Nothing here is trusted beyond "this order id stopped": the row is only
 * moved off 'created', so a claim about an order that was really paid for
 * changes nothing. No money, no booking and no personal detail is touched,
 * which is what makes it safe to accept from a browser at all.
 */

export const dynamic = 'force-dynamic'

const bodySchema = z.object({ order_id: z.string().trim().min(6).max(64) })

export async function POST(request: Request) {
  if (!magicEnabled()) return Response.json({ error: 'not enabled' }, { status: 404 })

  let parsed: unknown
  try {
    parsed = await request.json()
  } catch {
    return Response.json({ error: 'Expected JSON.' }, { status: 400 })
  }

  const result = bodySchema.safeParse(parsed)
  if (!result.success) return Response.json({ error: 'Check the request.' }, { status: 400 })

  await markMagicOrderAbandoned(result.data.order_id)
  return Response.json({ ok: true }, { status: 200 })
}
