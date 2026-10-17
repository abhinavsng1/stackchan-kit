import { z } from 'zod'
import { PLANS } from '@/lib/plans'
import { validateCoupon, refusalMessage, CODE_PATTERN, normaliseCode } from '@/lib/coupons'

/**
 * Checks a code before the buyer commits to it.
 *
 * This endpoint is a courtesy, not a gate. Nothing it returns is trusted
 * later: the order route re-validates the code it was given and prices it
 * again from the database, so a forged response here buys nothing. It exists
 * so that a buyer finds out their code is wrong while they are still looking
 * at the field, rather than at the payment screen.
 */

const MAX_BODY_BYTES = 512

const bodySchema = z.object({
  code: z.string().trim().min(1).max(32),
  plan: z.enum(PLANS).default('deposit'),
  qty: z.coerce.number().int().min(1).max(5).default(1),
  /** Only for the per-buyer limit. Optional: the form may not have it yet. */
  email: z.string().trim().email().max(254).optional(),
  variant: z.string().trim().max(32).optional(),
})

function json(body: unknown, status: number) {
  return Response.json(body, { status })
}

export async function POST(request: Request) {
  let raw: string
  try {
    raw = await request.text()
  } catch {
    return json({ valid: false, error: 'Could not read the request.' }, 400)
  }
  if (raw.length > MAX_BODY_BYTES) return json({ valid: false, error: 'That request was too large.' }, 413)

  let parsed: unknown
  try {
    parsed = JSON.parse(raw || '{}')
  } catch {
    return json({ valid: false, error: 'Expected JSON.' }, 400)
  }

  const result = bodySchema.safeParse(parsed)
  if (!result.success) {
    return json({ valid: false, error: 'That code is not valid.' }, 200)
  }

  const code = normaliseCode(result.data.code)
  if (!CODE_PATTERN.test(code)) {
    // Answered 200 with valid:false, like every other refusal: a different
    // status for a malformed code would say which shapes exist.
    return json({ valid: false, error: 'That code is not valid.' }, 200)
  }

  const verdict = await validateCoupon({
    code,
    plan: result.data.plan,
    qty: result.data.qty,
    email: result.data.email ?? null,
    variant: result.data.variant ?? null,
  })

  if (!verdict.valid) {
    return json({ valid: false, error: refusalMessage(verdict.reason, result.data.qty) }, 200)
  }

  return json({
    valid: true,
    code: verdict.code,
    discountPaise: verdict.discountPaise,
    label: verdict.label,
  }, 200)
}
