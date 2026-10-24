import { neon } from '@neondatabase/serverless'
import { shipOrder, stateOf } from '@/lib/shiprocket/ship'
import { listOrders } from '@/lib/admin-orders'

/**
 * Register a paid booking with the courier, the moment it is paid.
 *
 * Only the order is created. No waybill, no pickup, no label: a waybill
 * assigned today for a robot that ships in a fortnight is a stale waybill,
 * and the courier it picks is chosen on today's rates rather than the day's
 * it actually travels. Those stay deliberate acts in the admin.
 *
 * Off unless SHIPROCKET_AUTO_CREATE is '1' and the account is configured.
 * It runs after the response has gone, never inside it: a courier having a
 * bad afternoon must not turn a captured payment into a webhook we answer
 * with a 500 and Razorpay retries into a duplicate booking.
 *
 * Every failure is recorded and swallowed. A booking with no courier order
 * is a thing somebody can fix from the dashboard in a minute; a payment with
 * no booking is what we spent a night chasing.
 */

export function autoCreateEnabled(): boolean {
  return process.env.SHIPROCKET_AUTO_CREATE === '1'
    && Boolean(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD)
    && Boolean(process.env.SHIPROCKET_PICKUP_LOCATION && process.env.SHIPROCKET_PICKUP_PINCODE)
}

function box() {
  const cm = (process.env.SHIPROCKET_BOX_CM ?? '').split('x').map(Number)
  const kg = Number(process.env.SHIPROCKET_BOX_KG)
  if (cm.length !== 3 || cm.some((n) => !Number.isFinite(n) || n <= 0)) return null
  if (!Number.isFinite(kg) || kg <= 0) return null
  return { length: cm[0]!, breadth: cm[1]!, height: cm[2]!, weight: kg }
}

export async function createCourierOrder(preorderId: number): Promise<void> {
  if (!autoCreateEnabled()) return

  const dims = box()
  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION
  const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE
  if (!dims || !pickupLocation || !pickupPincode) {
    console.error('[shiprocket] auto-create is on but the box or pickup is not configured')
    return
  }

  try {
    // listOrders is the one reader that already assembles every field the
    // mapping needs, including the money split and the address.
    const order = (await listOrders()).find((o) => o.id === preorderId)
    if (!order) {
      console.error('[shiprocket] no booking to register', { preorderId })
      return
    }
    if (order.srOrderId) return

    const db = neon(process.env.DATABASE_URL!)
    const rows = await db`
      select sr_order_id, sr_shipment_id, awb_code, pickup_scheduled_date, label_url
      from preorders where id = ${preorderId} limit 1`
    const state = stateOf((rows[0] ?? {}) as Record<string, unknown>)
    const result = await shipOrder(order, state, {
      pickupLocation,
      pickupPincode,
      ...dims,
      untilPickup: true,
      // The order and nothing after it.
      stopAfter: 'create',
    })

    if (result.ok) {
      console.log('[shiprocket] order registered', { preorderId, ran: result.ran })
    } else {
      // Named, because "it did not appear in Shiprocket" is otherwise a
      // mystery with five possible causes.
      console.error('[shiprocket] could not register the order', {
        preorderId, failedAt: result.failedAt, reason: result.reason,
        walletEmpty: result.walletEmpty === true,
      })
    }
  } catch (error) {
    console.error('[shiprocket] auto-create threw', { preorderId, error: String(error) })
  }
}
