import { magicEnabled, shippingFor, type MagicAddress } from '@/lib/magic'

/**
 * Magic Checkout asks whether we deliver to an address, and on what terms.
 *
 * Razorpay calls this from its own servers, so it is unauthenticated by
 * design — the docs require it. What keeps that safe is that it reveals
 * nothing: it takes a PIN code and answers whether we ship there, which is
 * written on the site anyway, and it reads no buyer, no order and no row.
 *
 * The documented method is GET-with-a-body, which not every runtime will
 * deliver intact, so both verbs are accepted and both read the body.
 */

export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 8 * 1024

async function answer(request: Request) {
  if (!magicEnabled()) return Response.json({ error: 'not enabled' }, { status: 404 })

  let raw = ''
  try {
    raw = await request.text()
  } catch {
    return Response.json({ addresses: [] }, { status: 200 })
  }
  if (raw.length > MAX_BODY_BYTES) return Response.json({ error: 'too large' }, { status: 413 })

  let body: { addresses?: MagicAddress[] } = {}
  try {
    body = raw ? JSON.parse(raw) : {}
  } catch {
    body = {}
  }

  const addresses = Array.isArray(body.addresses) ? body.addresses : []
  return Response.json({ addresses: addresses.map(shippingFor) }, { status: 200 })
}

export const POST = answer
export const GET = answer
