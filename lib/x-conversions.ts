import crypto from 'node:crypto'
import { X_EVENTS, X_PIXEL_ID, type XServerEvent } from '@/lib/x'

/**
 * X Conversion API, server side only.
 *
 * Conversions are reported from where they are confirmed — the order route
 * when a row is written, the payment routes when money has settled — never
 * from the browser, which can be blocked, closed, or lied to.
 *
 * X_PIXEL_TOKEN is a secret (generated in X Ads Manager) and has no
 * NEXT_PUBLIC_ prefix, so it never reaches a browser bundle.
 *
 * Like the email module, this never throws: a sale that is safely in Postgres
 * must not be reported as a failure because an ad platform had a bad minute.
 */

const ENDPOINT = `https://ads-api.x.com/12/measurement/conversions/${X_PIXEL_ID}`
const SITE = 'https://pebblerobo.com/'

export const sha256Hex = (v: string) => crypto.createHash('sha256').update(v, 'utf8').digest('hex')

/** X's rule: trimmed and lowercased, then hashed. */
export const normaliseEmail = (email: string) => email.trim().toLowerCase()

/**
 * E.164, which X requires before hashing. Phones are stored as +91 and ten
 * digits already (lib/schema.ts); a bare Indian ten-digit number is accepted
 * too. Anything else is not sent rather than sent wrong.
 */
export function normalisePhone(phone: string): string | null {
  const v = phone.trim().replace(/[\s()-]/g, '')
  if (/^\+[1-9]\d{7,14}$/.test(v)) return v
  if (/^[6-9]\d{9}$/.test(v)) return '+91' + v
  return null
}

export type XIdentity = {
  email?: string | null
  phone?: string | null
  /** The click id from the X ad the buyer arrived through, if any. */
  twclid?: string | null
  /** Sent only as a pair, and only from a request the buyer's browser made. */
  ipAddress?: string | null
  userAgent?: string | null
}

/** Everything X can match on, hashed where X asks for hashing. */
export function identifiersFor(id: XIdentity): Record<string, string> {
  const out: Record<string, string> = {}
  if (id.twclid) out.twclid = id.twclid
  if (id.email?.trim()) out.hashed_email = sha256Hex(normaliseEmail(id.email))
  const phone = id.phone ? normalisePhone(id.phone) : null
  if (phone) out.hashed_phone_number = sha256Hex(phone)
  if (id.ipAddress && id.userAgent) {
    out.ip_address = id.ipAddress
    out.user_agent = id.userAgent
  }
  return out
}

/** The buyer's address and browser, from a request their browser made. */
export function requestIdentity(request: Request): Pick<XIdentity, 'ipAddress' | 'userAgent'> {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return {
    ipAddress: forwarded || request.headers.get('x-real-ip') || null,
    userAgent: request.headers.get('user-agent'),
  }
}

export type XResult =
  | { ok: true; status: number }
  | { ok: false; reason: 'no_token' | 'event_not_configured' | 'no_identifier' | 'refused' | 'unreachable'; status?: number }

export function buildConversion(input: {
  eventId: string
  conversionId?: string
  identity: XIdentity
  at?: Date
  url?: string
}) {
  return {
    conversions: [{
      conversion_time: (input.at ?? new Date()).toISOString(),
      event_id: input.eventId,
      event_source_url: input.url ?? SITE,
      ...(input.conversionId ? { conversion_id: input.conversionId } : {}),
      identifiers: [identifiersFor(input.identity)],
    }],
  }
}

export async function sendXConversion(input: {
  event: XServerEvent
  /** The same value the pixel sends for this event, so X counts it once. */
  conversionId?: string
  identity: XIdentity
  at?: Date
  url?: string
}): Promise<XResult> {
  const token = process.env.X_PIXEL_TOKEN
  if (!token) return { ok: false, reason: 'no_token' }
  const eventId = X_EVENTS[input.event]
  if (!eventId) return { ok: false, reason: 'event_not_configured' }

  const body = buildConversion({ ...input, eventId })
  if (Object.keys(body.conversions[0].identifiers[0]).length === 0) {
    return { ok: false, reason: 'no_identifier' }
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'X-Pixel-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      // The body can echo what we sent, hashes included; it is not logged.
      console.error('[x] conversion refused', { event: input.event, status: res.status })
      return { ok: false, reason: 'refused', status: res.status }
    }
    return { ok: true, status: res.status }
  } catch {
    console.error('[x] conversion API unreachable', { event: input.event })
    return { ok: false, reason: 'unreachable' }
  }
}
