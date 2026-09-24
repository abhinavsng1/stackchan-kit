import { preorderSchema, fieldErrors } from '@/lib/schema'
import { createPreorder, duplicateField } from '@/lib/preorders'
import { waitUntil } from '@vercel/functions'

/** Generous for four short fields, small enough to refuse junk outright. */
const MAX_BODY_BYTES = 4096

function json(body: unknown, status: number) {
  return Response.json(body, { status })
}

/**
 * Run after the response has gone out, so the visitor never waits on a mail
 * server. Outside Vercel there is no request context, so fall back to a
 * detached promise — either way the reservation is already committed and an
 * email failure cannot change what the caller was told.
 */
function afterResponse(work: Promise<unknown>) {
  try {
    waitUntil(work)
  } catch {
    void work.catch(() => {})
  }
}

export async function POST(request: Request) {
  let raw: string
  try {
    raw = await request.text()
  } catch {
    return json({ error: 'Could not read the request.' }, 400)
  }

  if (raw.length > MAX_BODY_BYTES) {
    return json({ error: 'That request was too large.' }, 413)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return json({ error: 'Expected JSON.' }, 400)
  }

  // Authoritative validation. The client ran the same schema, but its result
  // carries no weight here.
  const result = preorderSchema.safeParse(parsed)
  if (!result.success) {
    return json({ error: 'Check the highlighted fields.', fields: fieldErrors(result.error) }, 400)
  }

  const { company, ...record } = result.data

  // Honeypot: hidden from real users, so any content means a bot. Answer 201
  // so the bot cannot distinguish rejection from success, and write nothing.
  if (company) return json({ status: 'created', token: null }, 201)

  try {
    const outcome = await createPreorder(record)

    if (outcome.status === 'unconfigured') {
      console.error('[preorder] DATABASE_URL is not set; reservation was not stored')
      return json({ error: 'Reservations are not open yet. Try again shortly.' }, 503)
    }

    // No email here. This row is an order that has not been paid for, and
    // telling someone their kit is confirmed before their money has moved is
    // a promise we cannot keep — they may close the payment window and never
    // come back. The confirmation is sent when the payment settles instead.

    // The token goes back to the browser that just created this order so it
    // can open checkout immediately. It is the buyer's own reservation, and
    // the token only permits paying for it.
    if (outcome.status === 'created') {
      return json({ status: 'created', token: outcome.token }, 201)
    }

    // Tell them which detail was already taken. "You're already on the list"
    // is confusing when they deliberately used a different email.
    return json({ status: 'duplicate', field: outcome.field }, 409)
  } catch (error) {
    // Phone is unique as well as email, so a second reservation under a new
    // address trips a unique violation rather than the ON CONFLICT clause.
    const field = duplicateField(error)
    if (field) return json({ status: 'duplicate', field }, 409)
    console.error('[preorder] insert failed', error)
    return json({ error: 'Something went wrong on our end. Try again.' }, 500)
  }
}

export async function GET() {
  return json({ error: 'Method not allowed.' }, 405)
}
