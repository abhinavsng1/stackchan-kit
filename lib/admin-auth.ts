import crypto from 'node:crypto'

/**
 * Who may see the back office.
 *
 * HTTP Basic, over HTTPS, against one password in the environment. That is a
 * deliberately small amount of security for a deliberately small surface: the
 * admin pages read orders and manage discount codes, they never move money,
 * and a password in Vercel's environment is one fewer login system to keep
 * correct than an accounts table would be.
 *
 * Two properties it does have to get right:
 *
 *   - with ADMIN_PASSWORD unset, everything is refused rather than opened. A
 *     back office that falls open when a variable is missing is worse than
 *     one that locks everybody out, because nobody notices.
 *   - the comparison is constant-time. A plain === returns as soon as two
 *     bytes differ, which leaks the password one character at a time to
 *     anyone patient enough to measure.
 */

export const ADMIN_REALM = 'PebbleRobo'

function same(a: string, b: string): boolean {
  const x = Buffer.from(a, 'utf8')
  const y = Buffer.from(b, 'utf8')
  if (x.length !== y.length) return false
  return crypto.timingSafeEqual(x, y)
}

/** Whether this request carries the right Basic credentials. */
export function adminAuthorised(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false

  const header = request.headers.get('authorization')
  if (!header?.startsWith('Basic ')) return false

  let decoded: string
  try {
    decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8')
  } catch {
    return false
  }

  // "user:password" — the user part is ignored. Browsers insist on asking for
  // one, so anything may be typed there.
  const password = decoded.slice(decoded.indexOf(':') + 1)
  return same(password, expected)
}

/** The challenge that makes a browser show its password box. */
export function adminChallenge(): Response {
  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${ADMIN_REALM}", charset="UTF-8"`,
      'Cache-Control': 'no-store',
    },
  })
}

/** Whether the back office is usable at all on this deployment. */
export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD)
}
