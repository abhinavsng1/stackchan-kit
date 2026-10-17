import { adminAuthorised, adminChallenge } from '@/lib/admin-auth'
import { findBalanceByToken, bookingsOwingBalance, markBalanceAsked } from '@/lib/preorders'
import { sendBalanceRequestEmail } from '@/lib/email'
import { prepayBalance } from '@/lib/plans'

/**
 * Emails one buyer the link to settle their balance before dispatch.
 *
 * Driven from a button rather than a schedule, because the right moment is
 * "this batch is being packed on Thursday" — which is a thing a person knows
 * and a cron does not. Sending it twice is allowed but recorded, so the
 * dashboard can show who has already been asked.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!adminAuthorised(request)) return adminChallenge()

  const { id } = await context.params
  const preorderId = Number(id)
  if (!Number.isInteger(preorderId) || preorderId <= 0) {
    return Response.json({ ok: false, error: 'Unknown order.' }, { status: 400 })
  }

  // Read through the same list the dashboard shows, so an order that is not
  // actually owing cannot be emailed by posting its id.
  const owing = (await bookingsOwingBalance()).find((o) => o.id === preorderId)
  if (!owing) {
    return Response.json({ ok: false, error: 'That order does not owe a balance.' }, { status: 409 })
  }

  const booking = await findBalanceByToken(owing.token)
  if (!booking) {
    return Response.json({ ok: false, error: 'Unknown order.' }, { status: 404 })
  }

  const { incentivePaise, duePaise } = prepayBalance(booking.balanceDuePaise)
  const sent = await sendBalanceRequestEmail({
    name: booking.name,
    email: booking.email,
    token: owing.token,
    qty: booking.qty,
    edition: booking.edition,
    duePaise,
    incentivePaise,
  })

  if (!sent.ok) {
    console.error('[ask-balance] could not send', { id: preorderId, reason: sent.reason })
    return Response.json({ ok: false, error: 'Could not send that email.' }, { status: 502 })
  }

  await markBalanceAsked(preorderId)
  return Response.json({ ok: true })
}
