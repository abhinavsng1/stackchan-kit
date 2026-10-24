import type { AdminOrder } from '@/lib/admin-orders'

/**
 * A preorder row, turned into the thing Shiprocket's create endpoint wants.
 *
 * Pure, because this is where the risk is. Shiprocket validates hard and
 * explains badly — a rejected create arrives as a 400 with a sentence in it,
 * or a 422 whose field map you have to ask for — so every rule their API
 * enforces is enforced here first, where the failure can name a field and an
 * operator can fix it.
 *
 * Nothing here truncates. A city silently cut to thirty characters or an
 * address cut to 190 produces a parcel that cannot be delivered, which is a
 * worse outcome than a dispatch that refuses to start.
 */

/**
 * How the split between the deposit and the balance is expressed.
 *
 * `partial` tells Shiprocket the true order value and how much is already in,
 * which is the honest description of the sale. `balance-only` sends just the
 * amount owed as the order value and keeps the rest in our own records.
 *
 * Shiprocket's documentation defines `partial_cod_collected` only through its
 * validation rule — "must be >= 0 and less than sub_total" — and says nowhere
 * what the delivery agent is actually asked to collect, under either
 * encoding. So this is a constant rather than a hard-coded expression: if the
 * first printed label shows ₹4,999 instead of ₹4,500, this flips to
 * 'balance-only' and nothing else changes.
 *
 * No parcel goes to a courier until a real label has been read.
 */
export const COD_ENCODING: Encoding = 'partial'

export type Encoding = 'partial' | 'balance-only'

export type MapOptions = {
  /** The nickname of a pickup address already registered on the account. */
  pickupLocation: string
  /** Packed carton, centimetres. */
  length: number
  breadth: number
  height: number
  /** Packed, kilograms. */
  weight: number
  encoding?: Encoding
}

export type ShiprocketOrderPayload = {
  order_id: string
  order_date: string
  payment_method: 'COD'
  sub_total: number
  partial_cod_collected?: number
  shipping_is_billing: true
  billing_customer_name: string
  billing_last_name: string
  billing_address: string
  billing_city: string
  billing_state: string
  billing_country: 'India'
  billing_pincode: string
  billing_phone: string
  billing_email: string
  order_items: { name: string; sku: string; units: number; selling_price: number }[]
  pickup_location: string
  length: number
  breadth: number
  height: number
  weight: number
  verbose: true
}

export type MapResult =
  | { ok: true; payload: ShiprocketOrderPayload }
  | { ok: false; reason: string }

/**
 * An Indian mobile number as Shiprocket wants it: exactly ten digits.
 *
 * Their validator also rejects a number made of one repeated digit, which is
 * worth doing here — it is the shape a test submission takes, and finding out
 * at dispatch time is finding out too late.
 */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  // Indian numbers arrive with a country code or a trunk zero about as often
  // as they arrive bare.
  const ten = digits.length === 12 && digits.startsWith('91') ? digits.slice(2)
    : digits.length === 11 && digits.startsWith('0') ? digits.slice(1)
      : digits
  if (ten.length !== 10) return null
  if (/^(\d)\1{9}$/.test(ten)) return null
  return ten
}

/**
 * One name field, split into the two Shiprocket insists on.
 *
 * `billing_last_name` is a required key whose value may be empty, so a
 * single-word name gets an empty string. Omitting the key is a 400; sending
 * "" is accepted.
 */
export function splitName(full: string): { first: string; last: string } {
  const parts = String(full).trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { first: parts[0] ?? '', last: '' }
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] }
}

const rupees = (paise: number) => Math.round(paise) / 100

export function mapOrder(order: AdminOrder, opts: MapOptions): MapResult {
  const encoding = opts.encoding ?? COD_ENCODING

  // The deposit is what makes this order real. Shipping one that was never
  // paid would send a parcel against nothing.
  if (!order.paidAt || !order.paidPaise) {
    return { ok: false, reason: 'This order has not been paid for.' }
  }

  const paid = rupees(order.paidPaise)
  const owed = rupees(order.duePaise ?? 0)
  const total = paid + owed

  if (owed <= 0) {
    return { ok: false, reason: 'Nothing is owed on this order, so there is nothing to collect.' }
  }
  // Their validator raises a custom 422 when partial_cod_collected is not
  // strictly below sub_total.
  if (encoding === 'partial' && paid >= total) {
    return { ok: false, reason: 'The deposit is not less than the order value.' }
  }

  const phone = normalisePhone(order.phone)
  if (!phone) {
    return { ok: false, reason: `Phone number is not a usable Indian mobile: ${order.phone ?? 'missing'}` }
  }

  const address = (order.address ?? '').trim()
  if (address.length < 3 || address.length > 190) {
    return {
      ok: false,
      reason: address.length < 3
        ? 'Shipping address is missing or too short.'
        : `Shipping address is ${address.length} characters; Shiprocket allows 190.`,
    }
  }

  const city = (order.city ?? '').trim()
  if (!city) return { ok: false, reason: 'City is missing.' }
  if (city.length > 30) {
    return { ok: false, reason: `City is ${city.length} characters; Shiprocket allows 30.` }
  }

  const pincode = (order.pincode ?? '').trim()
  // Six digits, and their validator additionally requires >= 100000, which
  // rules out a leading zero.
  if (!/^[1-9]\d{5}$/.test(pincode)) {
    return { ok: false, reason: `Pincode is not a six-digit Indian PIN: ${pincode || 'missing'}` }
  }

  const { first, last } = splitName(order.name)

  // Their create rejects an order_date more than six months old, and some of
  // these preorders are older than that. The date we send is the dispatch
  // date, which is also the truthful one for a courier.
  const orderDate = new Date()
  const stamp = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`
    + `-${String(orderDate.getDate()).padStart(2, '0')}`
    + ` ${String(orderDate.getHours()).padStart(2, '0')}:${String(orderDate.getMinutes()).padStart(2, '0')}`

  const payload: ShiprocketOrderPayload = {
    // Our primary key, which is also Shiprocket's retry key: create is
    // idempotent on (order_id, channel_id) and returns the existing order
    // unchanged. It is never reused — a cancelled order burns its id.
    order_id: `PBL-${order.id}`,
    order_date: stamp,
    payment_method: 'COD',
    sub_total: encoding === 'partial' ? total : owed,
    ...(encoding === 'partial' ? { partial_cod_collected: paid } : {}),
    shipping_is_billing: true,
    billing_customer_name: first,
    billing_last_name: last,
    billing_address: address,
    billing_city: city,
    // The state is not collected at checkout. The courier routes on the PIN,
    // which is the authoritative field; this is a label courtesy.
    billing_state: stateForPincode(pincode),
    billing_country: 'India',
    billing_pincode: pincode,
    billing_phone: phone,
    billing_email: order.email,
    order_items: [{
      name: 'Pebble-chan desk robot',
      sku: 'PBL-PEBBLE-1',
      units: order.qty,
      selling_price: total / order.qty,
    }],
    pickup_location: opts.pickupLocation,
    length: opts.length,
    breadth: opts.breadth,
    height: opts.height,
    weight: opts.weight,
    // Turns business-rule failures into a structured 422 with a field map
    // rather than one unparseable sentence.
    verbose: true,
  }

  return { ok: true, payload }
}

/**
 * A state name from the PIN's first digit.
 *
 * Deliberately coarse. The checkout does not ask for a state, the courier
 * routes on the PIN, and Shiprocket requires the field to be present rather
 * than correct. Getting this wrong puts an odd word on a label; leaving it
 * empty fails the create.
 */
function stateForPincode(pin: string): string {
  const zone = pin[0]
  const byZone: Record<string, string> = {
    '1': 'Delhi', '2': 'Uttar Pradesh', '3': 'Gujarat', '4': 'Maharashtra',
    '5': 'Karnataka', '6': 'Tamil Nadu', '7': 'West Bengal', '8': 'Bihar',
  }
  return byZone[zone] ?? 'Karnataka'
}
