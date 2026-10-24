import { z } from 'zod'
import { adminAuthorised, adminChallenge } from '@/lib/admin-auth'
import { EDITIONS } from '@/lib/kit'
import { ORDERABLE_SHELL_IDS } from '@/lib/shells'
import {
  KINDS, REASONS, createItem, applyMove, countTo, setItem, listStock, recentMoves,
} from '@/lib/inventory'

/**
 * Adding, counting and moving stock.
 *
 * Behind the same Basic auth as the pages, checked here as well as in the
 * proxy: a route that writes to the ledger should not depend on a matcher
 * pattern staying correct.
 */

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  action: z.literal('create'),
  sku: z.string().trim().min(2).max(32),
  name: z.string().trim().min(2).max(80),
  kind: z.enum(KINDS),
  edition: z.enum(EDITIONS).optional(),
  shell: z.enum(ORDERABLE_SHELL_IDS).optional(),
  onHand: z.coerce.number().int().nonnegative().max(10_000).optional(),
  reorderAt: z.coerce.number().int().nonnegative().max(10_000).optional(),
  note: z.string().trim().max(200).optional(),
})

const moveSchema = z.object({
  action: z.literal('move'),
  sku: z.string().trim().min(2).max(32),
  /** Signed, and the reason decides which signs are allowed. */
  delta: z.coerce.number().int(),
  reason: z.enum(REASONS),
  note: z.string().trim().max(200).optional(),
})

const countSchema = z.object({
  action: z.literal('count'),
  sku: z.string().trim().min(2).max(32),
  counted: z.coerce.number().int().nonnegative().max(10_000),
  note: z.string().trim().max(200).optional(),
})

const updateSchema = z.object({
  action: z.literal('update'),
  sku: z.string().trim().min(2).max(32),
  name: z.string().trim().min(2).max(80).optional(),
  /** null clears the level; absent leaves it alone. */
  reorderAt: z.coerce.number().int().nonnegative().max(10_000).nullable().optional(),
  active: z.boolean().optional(),
  note: z.string().trim().max(200).nullable().optional(),
})

export async function GET(request: Request) {
  if (!adminAuthorised(request)) return adminChallenge()
  const [shelf, moves] = await Promise.all([listStock(), recentMoves()])
  return Response.json({ ...shelf, moves })
}

export async function POST(request: Request) {
  if (!adminAuthorised(request)) return adminChallenge()

  let parsed: unknown
  try {
    parsed = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Expected JSON.' }, { status: 400 })
  }

  const create = createSchema.safeParse(parsed)
  if (create.success) {
    const d = create.data
    const out = await createItem({
      sku: d.sku,
      name: d.name,
      kind: d.kind,
      edition: d.edition ?? null,
      shell: d.shell ?? null,
      onHand: d.onHand ?? 0,
      reorderAt: d.reorderAt ?? null,
      note: d.note ?? null,
    })
    return Response.json(out, { status: out.ok ? 201 : 400 })
  }

  const move = moveSchema.safeParse(parsed)
  if (move.success) {
    // orderId stays out of reach from here: a move typed by a person is a
    // person's move, and letting the browser claim an order id would let it
    // spend the one idempotency key dispatch relies on.
    const out = await applyMove({ ...move.data, orderId: null })
    return Response.json(out, { status: out.ok ? 200 : 400 })
  }

  const count = countSchema.safeParse(parsed)
  if (count.success) {
    const out = await countTo(count.data.sku, count.data.counted, count.data.note ?? null)
    return Response.json(out, { status: out.ok ? 200 : 400 })
  }

  const update = updateSchema.safeParse(parsed)
  if (update.success) {
    const { sku, ...patch } = update.data
    const out = await setItem(sku, patch)
    return Response.json(out, { status: out.ok ? 200 : 400 })
  }

  return Response.json({ ok: false, error: 'Check the fields.' }, { status: 400 })
}
