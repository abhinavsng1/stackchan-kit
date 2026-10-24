import { neon } from '@neondatabase/serverless'
import { srCall, type Verdict } from './client'
import { mapOrder, type MapOptions } from './map'
import type { AdminOrder } from '@/lib/admin-orders'

/**
 * Getting one order onto a courier.
 *
 * Four calls, and only the first is idempotent — Shiprocket's create returns
 * the existing order for a known order_id without changing it. assign/awb,
 * generate/pickup and generate/label have no idempotency key whatsoever.
 * Their own backstops exist (three AWB assignments per shipment per day,
 * "Already in Pickup Queue.", five queued label requests) but a backstop that
 * answers with a 400 is not a design. So every step writes its result before
 * the next begins, and every step is skipped when the column it writes is
 * already set. A failure resumes; it does not start over.
 *
 * generate/pickup is the boundary between reversible and not: it is the call
 * that summons a van. The admin crosses it deliberately.
 */

export type Step = 'serviceability' | 'create' | 'awb' | 'pickup' | 'label' | 'done'

/** The steps that reach into the physical world. */
export const IRREVERSIBLE: Step[] = ['pickup']

export type ShipState = {
  srOrderId: number | null
  srShipmentId: number | null
  awbCode: string | null
  pickupScheduledDate: string | null
  labelUrl: string | null
}

/**
 * Which step is next, read from what has already been written.
 *
 * State lives in the database rather than in a progress field, so there is no
 * second thing to keep in sync and a half-finished dispatch is readable from
 * the row itself.
 */
export function nextStep(s: ShipState): Step {
  if (!s.srOrderId || !s.srShipmentId) return s.srOrderId ? 'create' : 'serviceability'
  if (!s.awbCode) return 'awb'
  if (!s.pickupScheduledDate) return 'pickup'
  if (!s.labelUrl) return 'label'
  return 'done'
}

export type StepFn = () => Promise<Verdict>
export type Steps = Record<Exclude<Step, 'done'>, StepFn>

export type ChainResult =
  | { ok: true; ran: Step[] }
  | { ok: false; failedAt: Step; reason: string; walletEmpty?: boolean; ran: Step[] }

/**
 * Walk the chain from wherever this order already is.
 *
 * `untilPickup` stops before the courier is summoned, which is how the admin
 * books a shipment in two deliberate halves.
 */
export async function runChain(
  state: ShipState,
  steps: Steps,
  opts: { untilPickup: boolean; stopAfter?: Exclude<Step, 'done'> },
): Promise<ChainResult> {
  const order: Exclude<Step, 'done'>[] = ['serviceability', 'create', 'awb', 'pickup', 'label']
  const ran: Step[] = []

  // Serviceability is a question, not a mutation, so it is asked whenever a
  // dispatch starts rather than skipped on the basis of a stored column.
  let begun = !state.srOrderId
  for (const step of order) {
    if (opts.untilPickup && IRREVERSIBLE.includes(step)) break

    if (!begun) {
      // Skip forward to whatever this order still needs.
      const want = nextStep(state)
      if (step !== want) continue
      begun = true
    }

    const verdict = await steps[step]()
    ran.push(step)
    if (!verdict.ok) {
      return { ok: false, failedAt: step, reason: verdict.reason, walletEmpty: verdict.walletEmpty, ran }
    }

    /*
     * Stop where the caller asked.
     *
     * A booking made the moment somebody pays wants the order registered at
     * the courier and nothing more: a waybill assigned today for a robot
     * that ships in a fortnight is a stale waybill, and the courier it picks
     * is chosen on today's rates rather than the day's it actually travels.
     */
    if (opts.stopAfter && step === opts.stopAfter) break
  }

  return { ok: true, ran }
}

/* --------------------------- the real thing --------------------------- */

function sql() {
  const url = process.env.DATABASE_URL
  return url ? neon(url) : null
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))
const txt = (v: unknown) => (v === null || v === undefined ? null : String(v))

export function stateOf(row: Record<string, unknown>): ShipState {
  return {
    srOrderId: num(row.sr_order_id),
    srShipmentId: num(row.sr_shipment_id),
    awbCode: txt(row.awb_code),
    pickupScheduledDate: txt(row.pickup_scheduled_date),
    labelUrl: txt(row.label_url),
  }
}

/**
 * Dispatch one order.
 *
 * `untilPickup` books everything up to and including the waybill and stops.
 * Calling again without it schedules the pickup and prints the label.
 */
export async function shipOrder(
  order: AdminOrder,
  state: ShipState,
  opts: MapOptions & { untilPickup: boolean; pickupPincode: string; stopAfter?: Exclude<Step, 'done'> },
): Promise<ChainResult> {
  const db = sql()
  const mapped = mapOrder(order, opts)
  if (!mapped.ok) {
    return { ok: false, failedAt: 'create', reason: mapped.reason, ran: [] }
  }
  const payload = mapped.payload
  // What we ask the courier to collect, recorded as sent rather than
  // recomputed later, so changing the encoding cannot rewrite history.
  const codRupees = payload.sub_total - (payload.partial_cod_collected ?? 0)

  const live = { ...state }

  const steps: Steps = {
    serviceability: async () => {
      const q = new URLSearchParams({
        pickup_postcode: opts.pickupPincode,
        delivery_postcode: payload.billing_pincode,
        weight: String(opts.weight),
        cod: '1',
        declared_value: String(codRupees),
      })
      return srCall('serviceability', `/courier/serviceability/?${q}`, undefined, { method: 'GET' })
    },

    create: async () => {
      const v = await srCall('create', '/orders/create/adhoc', payload)
      if (v.ok && db) {
        live.srOrderId = Number(v.body.order_id)
        live.srShipmentId = Number(v.body.shipment_id)
        await db`
          update preorders set
            sr_order_id = ${live.srOrderId},
            sr_shipment_id = ${live.srShipmentId},
            cod_amount_paise = ${Math.round(codRupees * 100)}
          where id = ${order.id}`
      }
      return v
    },

    awb: async () => {
      const v = await srCall('awb', '/courier/assign/awb', {
        shipment_id: live.srShipmentId, is_return: 0,
      })
      if (v.ok && db) {
        const data = ((v.body.response as Record<string, unknown>)?.data ?? {}) as Record<string, unknown>
        live.awbCode = txt(data.awb_code)
        await db`
          update preorders set
            awb_code = ${live.awbCode},
            courier_name = ${txt(data.courier_name)},
            fulfilment = 'shipped'
          where id = ${order.id}`
      }
      return v
    },

    pickup: async () => {
      // The array is required, and multiple ids are processed in the
      // background with no synchronous confirmation. One at a time.
      const v = await srCall('pickup', '/courier/generate/pickup', {
        shipment_id: [live.srShipmentId],
      })
      if (v.ok && db) {
        const r = (v.body.response ?? {}) as Record<string, unknown>
        const date = txt(r.pickup_scheduled_date)
        live.pickupScheduledDate = date
        await db`
          update preorders set pickup_scheduled_date = ${date ? date.slice(0, 10) : null}
          where id = ${order.id}`
      }
      return v
    },

    label: async () => {
      const v = await srCall('label', '/courier/generate/label', {
        shipment_id: [live.srShipmentId],
      })
      if (v.ok && db) {
        live.labelUrl = txt(v.body.label_url)
        await db`update preorders set label_url = ${live.labelUrl} where id = ${order.id}`
      }
      return v
    },
  }

  return runChain(state, steps, { untilPickup: opts.untilPickup, stopAfter: opts.stopAfter })
}
