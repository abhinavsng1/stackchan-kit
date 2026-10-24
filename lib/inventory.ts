import { neon } from '@neondatabase/serverless'
import { isEdition, type Edition } from '@/lib/kit'

/**
 * What there is to sell, and what is already spoken for.
 *
 * Stock here is two numbers that are kept apart on purpose:
 *
 *   on_hand   — finished things sitting on the bench. A person says what it
 *               is, and every change to it is a row in a ledger with a reason
 *               attached, so the figure can always be explained rather than
 *               argued about.
 *   committed — units that paid orders have already claimed and that have not
 *               shipped. Never stored. It is counted from preorders on every
 *               read, so cancelling, archiving or shipping an order releases
 *               or consumes its robots with nothing to remember.
 *
 * available = on_hand − committed, and it is allowed to go negative. That is
 * not an error state to be hidden; it is the one number worth looking at,
 * because it says how many robots have been sold that do not exist yet.
 */

function client() {
  const url = process.env.DATABASE_URL
  return url ? neon(url) : null
}

/* -------------------------------- shapes -------------------------------- */

export const KINDS = ['finished', 'part'] as const
export type Kind = (typeof KINDS)[number]

/**
 * Why stock moved.
 *
 * A closed list, because the reason is the only thing that makes a correction
 * readable a month later, and a free-text one degrades to "adjustment".
 */
export const REASONS = ['built', 'received', 'returned', 'shipped', 'damaged', 'sample', 'count'] as const
export type Reason = (typeof REASONS)[number]

export const isReason = (v: unknown): v is Reason =>
  typeof v === 'string' && (REASONS as readonly string[]).includes(v)

/** Which way each reason is allowed to point. 'count' is a correction, so either. */
export const DIRECTION: Record<Reason, 'in' | 'out' | 'either'> = {
  built: 'in', received: 'in', returned: 'in',
  shipped: 'out', damaged: 'out', sample: 'out',
  count: 'either',
}

export const REASON_LABEL: Record<Reason, string> = {
  built: 'Built',
  received: 'Received',
  returned: 'Came back',
  shipped: 'Shipped',
  damaged: 'Damaged',
  sample: 'Given away',
  count: 'Counted',
}

export type Item = {
  sku: string
  name: string
  kind: Kind
  /** Finished goods only: which edition and colourway this stocks. */
  edition: Edition | null
  shell: string | null
  onHand: number
  reorderAt: number | null
  active: boolean
  note: string | null
  updatedAt: Date
}

/** An item with the demand counted against it. */
export type Stock = Item & {
  /** Paid, unshipped units of this exact edition and colour. */
  committed: number
  /** on_hand − committed. Negative means sold and not yet built. */
  available: number
  /** At or below the reorder level, counting what is already sold. */
  low: boolean
}

export type Move = {
  id: number
  sku: string
  delta: number
  reason: Reason
  orderId: number | null
  note: string | null
  at: Date
}

/* --------------------------- the pure arithmetic ------------------------- */

/** Loose enough to type, tight enough to be a primary key. */
export const SKU_PATTERN = /^[A-Z0-9][A-Z0-9._-]{1,31}$/

export const normaliseSku = (sku: string) => sku.trim().toUpperCase()

/**
 * The key a finished item and an order agree on.
 *
 * A kit was sold for a long time with no colour at all, so an absent shell is
 * a real value here rather than a missing one — those orders are demand for
 * something, and it has to land somewhere.
 */
export const demandKey = (edition: string | null, shell: string | null) =>
  `${edition ?? '?'}:${shell ?? '-'}`

export const itemKey = (item: Pick<Item, 'edition' | 'shell'>) => demandKey(item.edition, item.shell)

/**
 * Why this move cannot be made, or null.
 *
 * The rule worth having is the sign: "damaged 3" meaning three more robots is
 * the kind of entry that is only noticed when the shelf is empty. Stock is
 * allowed to be short — available goes negative all the time — but on_hand
 * counts objects, and a negative count of objects is always a typo.
 */
export function moveProblem(input: { reason: Reason; delta: number; onHand: number }): string | null {
  const { reason, delta, onHand } = input
  if (!Number.isInteger(delta)) return 'Use a whole number.'
  if (delta === 0) return 'That changes nothing.'
  if (Math.abs(delta) > 10_000) return 'That is too big to be a typo-free number.'

  const want = DIRECTION[reason]
  if (want === 'in' && delta < 0) return `“${REASON_LABEL[reason]}” adds stock. Use a positive number.`
  if (want === 'out' && delta > 0) return `“${REASON_LABEL[reason]}” takes stock away. Use a negative number.`

  /*
   * A negative count of physical objects is always a typo — except from
   * dispatch, which is not proposing a change but reporting one that already
   * happened. A robot on a courier has left the bench whatever the figure
   * said, and refusing the entry would keep the figure wrong and quiet. The
   * negative it leaves behind says building was never logged, loudly.
   */
  if (reason !== 'shipped' && onHand + delta < 0) {
    return `There are only ${onHand} on hand. Count them instead if that is wrong.`
  }
  return null
}

/** Paid, unshipped units per edition-and-colour, from rows the caller read. */
export function tallyDemand(
  rows: { edition: string | null; shell: string | null; units: number }[],
): Map<string, number> {
  const out = new Map<string, number>()
  for (const r of rows) {
    const key = demandKey(r.edition, r.shell)
    out.set(key, (out.get(key) ?? 0) + r.units)
  }
  return out
}

/**
 * Join the counts onto the items.
 *
 * Demand for something with no item — a colour somebody bought before anyone
 * thought to stock it — is not silently dropped: `unstocked` carries it out
 * so the page can say so, because that is exactly the case where a stock
 * figure is both wrong and reassuring.
 */
export function withDemand(items: Item[], demand: Map<string, number>): {
  stock: Stock[]
  unstocked: { edition: string | null; shell: string | null; units: number }[]
} {
  const seen = new Set<string>()

  const stock = items.map((item): Stock => {
    const key = itemKey(item)
    // Parts are consumed building robots, not sold, so no order speaks for one.
    const committed = item.kind === 'finished' ? (demand.get(key) ?? 0) : 0
    if (item.kind === 'finished') seen.add(key)
    const available = item.onHand - committed
    return {
      ...item,
      committed,
      available,
      low: item.reorderAt !== null && available <= item.reorderAt,
    }
  })

  const unstocked = [...demand.entries()]
    .filter(([key, units]) => units > 0 && !seen.has(key))
    .map(([key, units]) => {
      const [edition, shell] = key.split(':')
      return { edition: edition === '?' ? null : edition, shell: shell === '-' ? null : shell, units }
    })

  return { stock, unstocked }
}

/* ------------------------------- reading -------------------------------- */

function toItem(r: Record<string, unknown>): Item {
  const txt = (v: unknown) => (v === null || v === undefined ? null : String(v))
  const edition = txt(r.edition)
  return {
    sku: String(r.sku),
    name: String(r.name),
    kind: r.kind === 'part' ? 'part' : 'finished',
    edition: edition && isEdition(edition) ? edition : null,
    shell: txt(r.shell),
    onHand: Number(r.on_hand ?? 0),
    reorderAt: r.reorder_at === null || r.reorder_at === undefined ? null : Number(r.reorder_at),
    active: r.active !== false,
    note: txt(r.note),
    updatedAt: new Date(String(r.updated_at ?? r.created_at ?? Date.now())),
  }
}

/**
 * What every paid order is still waiting for.
 *
 * Shipped means a waybill exists, which is the first moment a robot has
 * demonstrably left the bench. Archived rows are out, exactly as they are out
 * of every figure on the dashboard.
 */
export async function demandFromOrders(): Promise<Map<string, number>> {
  const sql = client()
  if (!sql) return new Map()
  try {
    const rows = await sql`
      select edition, shell, sum(qty)::int units
        from preorders
       where paid_at is not null
         and archived_at is null
         and awb_code is null
         and coalesce(fulfilment, '') <> 'cancelled'
       group by edition, shell`
    return tallyDemand(rows.map((r) => ({
      edition: r.edition === null ? null : String(r.edition),
      shell: r.shell === null ? null : String(r.shell),
      units: Number(r.units ?? 0),
    })))
  } catch (e) {
    console.error('[inventory] could not count demand', { error: String(e) })
    return new Map()
  }
}

export async function listItems(): Promise<Item[]> {
  const sql = client()
  if (!sql) return []
  try {
    const rows = await sql`
      select * from inventory_items
       order by kind, edition nulls last, shell nulls last, sku
       limit 500`
    return rows.map((r) => toItem(r as Record<string, unknown>))
  } catch (e) {
    // An empty shelf that says so, rather than a 500 that looks like the
    // whole back office is down. Most often a deployment where the migration
    // has not run yet.
    console.error('[inventory] could not list', { error: String(e) })
    return []
  }
}

export async function listStock(): Promise<{ stock: Stock[]; unstocked: ReturnType<typeof withDemand>['unstocked'] }> {
  const [items, demand] = await Promise.all([listItems(), demandFromOrders()])
  return withDemand(items, demand)
}

export async function recentMoves(limit = 40): Promise<Move[]> {
  const sql = client()
  if (!sql) return []
  try {
    const rows = await sql`
      select * from inventory_moves order by created_at desc, id desc
       limit ${Math.max(1, Math.min(200, limit))}`
    return rows.map((r) => ({
      id: Number(r.id),
      sku: String(r.sku),
      delta: Number(r.delta),
      reason: isReason(r.reason) ? r.reason : 'count',
      orderId: r.order_id === null || r.order_id === undefined ? null : Number(r.order_id),
      note: r.note === null || r.note === undefined ? null : String(r.note),
      at: new Date(String(r.created_at)),
    }))
  } catch (e) {
    console.error('[inventory] could not read the ledger', { error: String(e) })
    return []
  }
}

/* ------------------------------- writing -------------------------------- */

export type Outcome = { ok: true; note?: string } | { ok: false; error: string }

export type NewItem = {
  sku: string
  name: string
  kind: Kind
  edition?: Edition | null
  shell?: string | null
  onHand?: number
  reorderAt?: number | null
  note?: string | null
}

export async function createItem(input: NewItem): Promise<Outcome> {
  const sql = client()
  if (!sql) return { ok: false, error: 'No database.' }

  const sku = normaliseSku(input.sku)
  if (!SKU_PATTERN.test(sku)) return { ok: false, error: 'An SKU is letters and numbers, 2 to 32 characters.' }
  if (input.name.trim().length < 2) return { ok: false, error: 'Give it a name.' }

  const finished = input.kind === 'finished'
  if (finished && !input.edition) return { ok: false, error: 'Say which edition this stocks.' }
  const onHand = Math.trunc(input.onHand ?? 0)
  if (onHand < 0) return { ok: false, error: 'Stock cannot start below zero.' }

  try {
    await sql`
      insert into inventory_items (sku, name, kind, edition, shell, on_hand, reorder_at, note)
      values (${sku}, ${input.name.trim()}, ${input.kind},
              ${finished ? input.edition : null}, ${finished ? (input.shell ?? null) : null},
              ${onHand}, ${input.reorderAt ?? null}, ${input.note?.trim() || null})`

    // The opening figure is a ledger entry like any other, so the running
    // total is never a number that arrived from nowhere.
    if (onHand > 0) {
      await sql`
        insert into inventory_moves (sku, delta, reason, note)
        values (${sku}, ${onHand}, 'count', 'Opening count')`
    }
    return { ok: true, note: `${sku} is on the shelf.` }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('inventory_items_sellable')) {
      return { ok: false, error: 'Something already stocks that edition and colour.' }
    }
    if (message.includes('duplicate key')) return { ok: false, error: 'That SKU already exists.' }
    console.error('[inventory] could not create', { sku, error: message })
    return { ok: false, error: 'Could not add that.' }
  }
}

/**
 * Move stock, and say why.
 *
 * The ledger row and the running total are written in one statement: two
 * statements would leave a window where a crash puts the figure and its
 * explanation permanently out of step, and nothing afterwards could tell
 * which of the two was right.
 */
export async function applyMove(input: {
  sku: string
  delta: number
  reason: Reason
  orderId?: number | null
  note?: string | null
}): Promise<Outcome> {
  const sql = client()
  if (!sql) return { ok: false, error: 'No database.' }

  const sku = normaliseSku(input.sku)
  const rows = await sql`select on_hand from inventory_items where sku = ${sku} limit 1`
  if (!rows[0]) return { ok: false, error: 'No such SKU.' }

  const problem = moveProblem({
    reason: input.reason,
    delta: input.delta,
    onHand: Number(rows[0].on_hand ?? 0),
  })
  if (problem) return { ok: false, error: problem }

  try {
    const done = await sql`
      with m as (
        insert into inventory_moves (sku, delta, reason, order_id, note)
        values (${sku}, ${input.delta}, ${input.reason}, ${input.orderId ?? null}, ${input.note?.trim() || null})
        on conflict do nothing
        returning sku, delta
      )
      update inventory_items i
         set on_hand = i.on_hand + m.delta, updated_at = now()
        from m
       where i.sku = m.sku
      returning i.on_hand`

    // Nothing updated means the ledger refused the row: the unique index on
    // (sku, reason, order_id) caught a repeat of a move an order already made.
    if (!done[0]) return { ok: true, note: 'Already counted.' }
    return { ok: true, note: `${sku}: ${Number(done[0].on_hand)} on hand.` }
  } catch (e) {
    console.error('[inventory] move failed', { sku, error: String(e) })
    return { ok: false, error: 'That did not go through.' }
  }
}

/**
 * Set the figure to what was actually counted on the bench.
 *
 * Expressed as a move rather than an overwrite so the correction shows up in
 * the ledger with its size — which is the number worth noticing, because a
 * count that is regularly out by five means something upstream is not being
 * recorded.
 */
export async function countTo(sku: string, counted: number, note?: string | null): Promise<Outcome> {
  const sql = client()
  if (!sql) return { ok: false, error: 'No database.' }
  if (!Number.isInteger(counted) || counted < 0) return { ok: false, error: 'Count a whole number of things.' }

  const rows = await sql`select on_hand from inventory_items where sku = ${normaliseSku(sku)} limit 1`
  if (!rows[0]) return { ok: false, error: 'No such SKU.' }

  const delta = counted - Number(rows[0].on_hand ?? 0)
  if (delta === 0) return { ok: true, note: 'That is what it already said.' }
  return applyMove({ sku, delta, reason: 'count', note: note ?? 'Counted on the bench' })
}

export async function setItem(sku: string, patch: {
  name?: string
  reorderAt?: number | null
  active?: boolean
  note?: string | null
}): Promise<Outcome> {
  const sql = client()
  if (!sql) return { ok: false, error: 'No database.' }
  try {
    const done = await sql`
      update inventory_items set
        name       = coalesce(${patch.name?.trim() || null}, name),
        active     = coalesce(${patch.active ?? null}, active),
        -- Absent means leave it; an explicit null means clear it. Without the
        -- distinction, editing a name would silently wipe the reorder level.
        reorder_at = case when ${patch.reorderAt === undefined} then reorder_at
                          else ${patch.reorderAt ?? null}::int end,
        note       = case when ${patch.note === undefined} then note
                          else ${patch.note?.trim() || null}::text end,
        updated_at = now()
      where sku = ${normaliseSku(sku)}
      returning sku`
    return done.length ? { ok: true } : { ok: false, error: 'No such SKU.' }
  } catch (e) {
    console.error('[inventory] could not update', { sku, error: String(e) })
    return { ok: false, error: 'That did not go through.' }
  }
}

/**
 * The shelf, when a robot leaves on a courier.
 *
 * Called from the dispatch chain the moment a waybill exists. It fails soft
 * on purpose: a stock row is not worth failing a dispatch over, and the
 * unique index means a retried dispatch writes the move once however many
 * times this runs.
 */
export async function consumeForShipment(order: {
  id: number
  qty: number
  edition: string | null
  shell: string | null
}): Promise<void> {
  const sql = client()
  if (!sql) return
  try {
    const rows = await sql`
      select sku from inventory_items
       where kind = 'finished'
         and edition = ${order.edition}
         and coalesce(shell, '') = ${order.shell ?? ''}
       limit 1`
    const sku = rows[0]?.sku
    if (!sku) return

    const out = await applyMove({
      sku: String(sku),
      delta: -Math.max(1, Math.trunc(order.qty)),
      reason: 'shipped',
      orderId: order.id,
      note: `Order ${order.id}`,
    })
    if (!out.ok) console.error('[inventory] could not consume for a shipment', { id: order.id, error: out.error })
  } catch (e) {
    console.error('[inventory] could not consume for a shipment', { id: order.id, error: String(e) })
  }
}
