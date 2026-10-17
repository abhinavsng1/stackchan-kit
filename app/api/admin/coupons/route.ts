import { z } from 'zod'
import { adminAuthorised, adminChallenge } from '@/lib/admin-auth'
import { createCoupon, setCouponActive, listCoupons } from '@/lib/coupons'
import { PLANS } from '@/lib/plans'

/**
 * Creating and retiring discount codes.
 *
 * Behind the same Basic auth as the pages, checked here as well as in the
 * proxy: a route that writes to the coupons table should not depend on a
 * matcher pattern staying correct.
 */

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  action: z.literal('create'),
  code: z.string().trim().min(2).max(32),
  kind: z.enum(['fixed', 'percent']),
  /** Rupees for a fixed code, whole percent for a percentage one. */
  value: z.coerce.number().int().positive(),
  maxDiscountRupees: z.coerce.number().int().nonnegative().optional(),
  minQty: z.coerce.number().int().min(1).max(5).optional(),
  plans: z.array(z.enum(PLANS)).optional(),
  endsAt: z.string().trim().optional(),
  maxUses: z.coerce.number().int().positive().optional(),
  perEmailLimit: z.coerce.number().int().positive().optional(),
  label: z.string().trim().max(80).optional(),
})

const activeSchema = z.object({
  action: z.literal('active'),
  code: z.string().trim().min(2).max(32),
  active: z.boolean(),
})

export async function GET(request: Request) {
  if (!adminAuthorised(request)) return adminChallenge()
  return Response.json({ coupons: await listCoupons() })
}

export async function POST(request: Request) {
  if (!adminAuthorised(request)) return adminChallenge()

  let parsed: unknown
  try {
    parsed = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Expected JSON.' }, { status: 400 })
  }

  const asActive = activeSchema.safeParse(parsed)
  if (asActive.success) {
    await setCouponActive(asActive.data.code, asActive.data.active)
    return Response.json({ ok: true })
  }

  const result = createSchema.safeParse(parsed)
  if (!result.success) {
    return Response.json({ ok: false, error: 'Check the fields.' }, { status: 400 })
  }

  const d = result.data
  // Rupees at the form, paise in the database. The conversion happens once,
  // here, so no other caller has to remember which unit it is holding.
  const outcome = await createCoupon({
    code: d.code,
    kind: d.kind,
    value: d.kind === 'fixed' ? d.value * 100 : d.value,
    maxDiscountPaise: d.maxDiscountRupees ? d.maxDiscountRupees * 100 : null,
    minQty: d.minQty ?? 1,
    plans: d.plans ?? [],
    endsAt: d.endsAt ? new Date(d.endsAt) : null,
    maxUses: d.maxUses ?? null,
    perEmailLimit: d.perEmailLimit ?? null,
    label: d.label ?? null,
  })

  return Response.json(outcome, { status: outcome.ok ? 201 : 400 })
}
