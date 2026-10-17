import { magicEnabled } from '@/lib/magic'
import { validateCoupon, findCoupon, discountFor, normaliseCode } from '@/lib/coupons'
import { quote } from '@/lib/plans'

/**
 * Magic Checkout asking whether this buyer may use this code.
 *
 * The same validator the order route uses, so a code cannot be worth one
 * thing inside Razorpay's window and another on our own form. Values go back
 * in paise, as `fixed_amount` or `percentage`, which is what Razorpay expects.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!magicEnabled()) return Response.json({ error: 'not enabled' }, { status: 404 })

  let body: { code?: string; email?: string; contact?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const code = normaliseCode(String(body.code ?? ''))
  if (!code) {
    return Response.json({ failure_code: 'INVALID_PROMOTION', failure_reason: 'Enter a code.' }, { status: 200 })
  }

  // Magic Checkout sells the robot outright, so a code is judged against the
  // full plan — the same judgement the buyer would get on the site.
  const verdict = await validateCoupon({ code, plan: 'full', qty: 1, email: body.email ?? null })
  if (!verdict.valid) {
    const failure = verdict.reason === 'already_used' ? 'REQUIREMENT_NOT_MET' : 'INVALID_PROMOTION'
    return Response.json({
      failure_code: failure,
      failure_reason: 'That code is not valid for this order.',
    }, { status: 200 })
  }

  const coupon = await findCoupon(code)
  const list = quote('full', 1).listPaise
  return Response.json({
    promotion: {
      reference_id: code,
      code,
      type: 'coupon',
      value: coupon ? discountFor(coupon, list) : verdict.discountPaise,
      value_type: coupon?.kind === 'percent' ? 'percentage' : 'fixed_amount',
      description: verdict.label,
    },
  }, { status: 200 })
}
