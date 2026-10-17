import { claimBookingsForRecovery, releaseRecoveryClaim } from '@/lib/preorders'
import { sendRecoveryEmail } from '@/lib/email'
import { quote } from '@/lib/plans'

/**
 * One reminder per unpaid booking, sent once a day.
 *
 * Daily rather than hourly because this account is on Vercel's Hobby plan,
 * which allows one run a day. It costs nothing: a booking stays claimable
 * for three days, so a daily run still reaches everybody — a few hours later
 * than an hourly one would.
 *
 * Vercel Cron calls this; nothing else should. Cron sends
 * `Authorization: Bearer $CRON_SECRET`, and with no secret configured the
 * route refuses every request rather than defaulting to open — an endpoint
 * that emails buyers is not one to leave reachable by anybody who guesses the
 * path.
 *
 * The claim happens in Postgres before any mail is sent (see
 * lib/preorders.ts), so two overlapping runs cannot both email the same
 * person. What each run does afterwards is send mail and count.
 */

/** A run is bounded so a backlog cannot turn into a mail flood or a timeout. */
const BATCH = 50

export const dynamic = 'force-dynamic'

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get('authorization')
  return header === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    return Response.json({ error: 'not authorised' }, { status: 401 })
  }

  const due = await claimBookingsForRecovery({ minAgeHours: 1, maxAgeHours: 72, limit: BATCH })

  let sent = 0
  let failed = 0
  for (const booking of due) {
    const q = quote(booking.plan, booking.qty, booking.variant, booking.discountPaise)
    const result = await sendRecoveryEmail({
      name: booking.name,
      email: booking.email,
      token: booking.token,
      qty: booking.qty,
      edition: booking.edition,
      nowPaise: q.nowPaise,
      balancePaise: q.balancePaise,
    })
    if (result.ok) {
      sent += 1
      continue
    }
    failed += 1
    // The provider refused outright, so this booking was never actually
    // reminded. Hand the claim back for the next run rather than recording a
    // reminder that does not exist.
    console.error('[recover-unpaid] could not send', { id: booking.id, reason: result.reason })
    await releaseRecoveryClaim(booking.id)
  }

  return Response.json({ claimed: due.length, sent, failed }, { status: 200 })
}
