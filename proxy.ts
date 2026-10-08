import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { VARIANT_COOKIE, VARIANT_COOKIE_DAYS, assignVariant, isVariant } from '@/lib/variants'

/**
 * Assigns the pricing variant before the page renders.
 *
 * This happens here rather than in the page because a React Server Component
 * cannot set a cookie, and doing it in the browser would paint one price and
 * then replace it — the first number a visitor sees is the one the experiment
 * is actually measuring, so it has to be right in the first frame.
 *
 * Sticky for six months. Somebody who comes back to think about it must see
 * the same price, or they are in both arms and in neither.
 */
export function proxy(request: NextRequest) {
  const existing = request.cookies.get(VARIANT_COOKIE)?.value
  if (existing && isVariant(existing)) return NextResponse.next()

  const variant = assignVariant()
  // Rewritten onto the request too, so this very first render sees it rather
  // than waiting for the next navigation.
  const headers = new Headers(request.headers)
  headers.set('x-pbl-variant', variant)

  const res = NextResponse.next({ request: { headers } })
  res.cookies.set(VARIANT_COOKIE, variant, {
    path: '/',
    maxAge: VARIANT_COOKIE_DAYS * 24 * 3600,
    sameSite: 'lax',
    // Readable by the client is fine — it decides a price shown on screen,
    // never an amount charged. The server recomputes that from the row.
    httpOnly: false,
  })
  return res
}

export const config = { matcher: ['/pebble-chan'] }
