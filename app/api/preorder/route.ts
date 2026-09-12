import { preorderSchema, fieldErrors } from '@/lib/schema'
import { createPreorder } from '@/lib/preorders'

/** Generous for four short fields, small enough to refuse junk outright. */
const MAX_BODY_BYTES = 4096

function json(body: unknown, status: number) {
  return Response.json(body, { status })
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

  const { name, email, qty, city, company } = result.data

  // Honeypot: hidden from real users, so any content means a bot. Answer 201
  // so the bot cannot distinguish rejection from success, and write nothing.
  if (company) return json({ status: 'created' }, 201)

  try {
    const outcome = await createPreorder({ name, email, qty, city: city || undefined })

    if (outcome.status === 'unconfigured') {
      console.error('[preorder] DATABASE_URL is not set; reservation was not stored')
      return json({ error: 'Reservations are not open yet. Try again shortly.' }, 503)
    }

    // A duplicate is a success from the visitor's point of view: their email is
    // on the list either way. Distinct status so the UI can word it honestly.
    return json({ status: outcome.status }, outcome.status === 'created' ? 201 : 409)
  } catch (error) {
    console.error('[preorder] insert failed', error)
    return json({ error: 'Something went wrong on our end. Try again.' }, 500)
  }
}

export async function GET() {
  return json({ error: 'Method not allowed.' }, 405)
}
