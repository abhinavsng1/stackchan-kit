import { adminAuthorised, adminChallenge } from '@/lib/admin-auth'
import { applyAction, isAction, listOrders } from '@/lib/admin-orders'
import { quote } from '@/lib/plans'

/**
 * One order, acted on from the dashboard.
 *
 * Every action names itself, and the two that settle money recompute the
 * figures here rather than taking them from the request. The dashboard may
 * say "this one paid"; it may not say how much.
 *
 * Deleting asks twice: the button confirms, and the request still has to
 * carry `confirm: true`. A destructive call that works by accident is one
 * that will happen by accident.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!adminAuthorised(request)) return adminChallenge()

  const { id } = await context.params
  const orderId = Number(id)

  let body: { action?: unknown; confirm?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Expected JSON.' }, { status: 400 })
  }

  if (!isAction(body.action)) {
    return Response.json({ ok: false, error: 'Unknown action.' }, { status: 400 })
  }
  if (body.action === 'delete' && body.confirm !== true) {
    return Response.json({ ok: false, error: 'Deleting needs confirm: true.' }, { status: 400 })
  }

  // The amounts come from the order's own plan, quantity, arm and discount —
  // the same quote() the gateway was given — so marking something paid by
  // hand records what it actually costs.
  const order = (await listOrders()).find((o) => o.id === orderId)
  if (!order) return Response.json({ ok: false, error: 'Unknown order.' }, { status: 404 })

  const q = quote(order.plan, order.qty, order.variant, order.discountPaise)
  const result = await applyAction(orderId, body.action, {
    nowPaise: q.nowPaise,
    balancePaise: q.balancePaise,
  })

  return Response.json(result, { status: result.ok ? 200 : 409 })
}
