import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Reading what the courier tells us.
 *
 * Shiprocket authenticates its webhook with a shared secret echoed back in an
 * x-api-key header. There is no signature and no body signing, so a payload
 * is only ever evidence that somebody knows the token — which, since the
 * token is optional in their dashboard and travels in plaintext on every
 * call, is a weaker claim than it sounds.
 *
 * Everything here is therefore built to make a forged payload boring: it can
 * move a status label and add a tracking scan, and it can do nothing else.
 */

/**
 * Columns that record money having changed hands.
 *
 * Named here so the test suite can assert the webhook route touches none of
 * them. They are written only by the remittance poll, from a bank UTR.
 */
export const MONEY_COLUMNS = [
  'balance_collected_at',
  'remittance_utr',
  'remittance_date',
  'amount_paid_paise',
  'paid_at',
] as const

/**
 * Constant-time comparison, and a refusal when nothing is configured.
 *
 * An endpoint that accepts anything because no secret was set is worse than
 * one that is switched off, so an absent or empty expected token rejects
 * everything.
 */
export function tokenMatches(got: string | null | undefined, want: string | undefined): boolean {
  if (!want) return false
  if (!got) return false
  // Hashing first makes the comparison constant-length, so the lengths
  // themselves leak nothing.
  const a = createHash('sha256').update(got).digest()
  const b = createHash('sha256').update(want).digest()
  return timingSafeEqual(a, b)
}

export type Scan = {
  awb: string
  scannedAt: Date
  status: string
  activity: string | null
  location: string | null
}

const txt = (v: unknown) => (v === null || v === undefined ? null : String(v))

/**
 * The scans in a payload.
 *
 * Shiprocket sends the entire history on every delivery rather than a delta,
 * which makes an at-least-once feed harmless: the natural key
 * (awb, scanned_at, status) absorbs the repeats.
 *
 * The payload's own order_id is a composite string that is neither our id nor
 * Shiprocket's order id, so rows are matched on the waybill alone. A payload
 * without one is unusable.
 */
export function parseScans(payload: Record<string, unknown>): Scan[] {
  const awb = txt(payload.awb)
  if (!awb) return []
  const scans = Array.isArray(payload.scans) ? payload.scans : []

  return scans.flatMap((raw) => {
    const s = (raw ?? {}) as Record<string, unknown>
    // "NA" is a value their feed really sends.
    const when = new Date(String(s.date ?? '').replace(' ', 'T'))
    if (Number.isNaN(when.getTime())) return []
    return [{
      awb,
      scannedAt: when,
      status: String(s.status ?? '').trim() || 'UNKNOWN',
      activity: txt(s.activity),
      location: txt(s.location),
    }]
  })
}

/**
 * The status string to display.
 *
 * Deliberately the string and not the number: current_status_id and
 * shipment_status_id are different numbers for the same label — two separate
 * code spaces — and Shiprocket publishes no complete table for either.
 */
export function currentStatus(payload: Record<string, unknown>): string | null {
  const s = txt(payload.current_status) ?? txt(payload.shipment_status)
  return s ? s.toUpperCase() : null
}
