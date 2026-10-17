import { magicEnabled } from '@/lib/magic'
import { listCoupons } from '@/lib/coupons'

/**
 * The codes Magic Checkout offers the buyer, from the same coupons table the
 * rest of the site uses.
 *
 * Only codes that are live and public are listed. A code with a per-buyer
 * limit or a total cap is still honoured when typed — apply-promotion checks
 * it properly — but it is not advertised to everybody who opens checkout,
 * because a code shown to a thousand people and valid for ten is a thousand
 * disappointments.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!magicEnabled()) return Response.json({ error: 'not enabled' }, { status: 404 })
  // The body carries order_id, contact and email. None of it changes which
  // codes are public, so it is read and discarded.
  await request.text().catch(() => '')

  const now = new Date()
  const promotions = (await listCoupons())
    .filter((c) => c.active
      && !c.perEmailLimit
      && (c.maxUses === null || c.redeemed < c.maxUses)
      && (!c.startsAt || now >= c.startsAt)
      && (!c.endsAt || now <= c.endsAt))
    .slice(0, 10)
    .map((c) => ({
      code: c.code,
      summary: c.label ?? (c.kind === 'percent' ? `${c.value}% off` : `₹${Math.round(c.value / 100)} off`),
      description: c.label ?? 'Discount applied at checkout',
    }))

  return Response.json({ promotions }, { status: 200 })
}
