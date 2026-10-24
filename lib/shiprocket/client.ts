import { neon } from '@neondatabase/serverless'

/**
 * A thin client over Shiprocket's v1 API.
 *
 * No SDK: there is no official Node one, and a third-party wrapper would lag
 * Shiprocket's monthly additive releases. The surface needed here is six
 * endpoints.
 *
 * Two things about this API shape the whole file.
 *
 * The first is that a 200 does not mean success. assign/awb, generate/pickup,
 * generate/label, manifests/generate and serviceability all report business
 * failures inside a 200 — an empty wallet arrives as
 * `{awb_assign_status: 0, status_code: 350}` with a cheerful status line. So
 * callers never see a raw body; they see `checkBody`'s verdict, which knows
 * the documented success flag for each endpoint.
 *
 * The second is that the token lasts ten days, has no refresh endpoint, and
 * re-login is rate limited to a half-hour lockout after repeated failures.
 * Serverless instances share no memory, so the token lives in Postgres and a
 * failed login is never retried.
 */

export const SHIPROCKET_BASE = 'https://apiv2.shiprocket.in/v1/external'

/** Ten days, minus a day so a token is never used at its edge. */
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>

type Json = Record<string, unknown>

function sql() {
  const url = process.env.DATABASE_URL
  return url ? neon(url) : null
}

/* ----------------------------- the verdict ----------------------------- */

export type Endpoint = 'create' | 'awb' | 'pickup' | 'label' | 'serviceability'

export type Verdict =
  | { ok: true; body: Json }
  | { ok: false; reason: string; walletEmpty?: boolean; body: Json }

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v))
const str = (v: unknown) => (typeof v === 'string' ? v : '')

/**
 * Did this actually work?
 *
 * One function rather than a check at each call site, because the flag to
 * read is different for every endpoint and getting it wrong is silent.
 */
export function checkBody(endpoint: Endpoint, body: Json): Verdict {
  const fail = (reason: string, walletEmpty = false): Verdict =>
    ({ ok: false, reason, walletEmpty, body })

  const message = str(body.message)

  switch (endpoint) {
    case 'create':
      return body.shipment_id && body.order_id
        ? { ok: true, body }
        : fail(message || 'Shiprocket did not return an order.')

    case 'awb': {
      if (num(body.awb_assign_status) === 1) return { ok: true, body }
      // 350 is the documented code for a wallet below the minimum. It is
      // worth distinguishing: it is fixed by topping up, not by retrying.
      const wallet = num(body.status_code) === 350 || /recharge/i.test(message)
      return fail(message || 'Shiprocket did not assign a waybill.', wallet)
    }

    case 'pickup':
      return num(body.pickup_status) === 1
        ? { ok: true, body }
        : fail(message || 'Shiprocket did not schedule a pickup.')

    case 'label':
      return num(body.label_created) === 1 && body.label_url
        ? { ok: true, body }
        : fail(message || 'Shiprocket did not generate a label.')

    case 'serviceability': {
      // Their failure arrives as a 404 in the body of a 200.
      if (num(body.status) === 404) return fail(message || 'No courier serves this pincode.')
      const data = (body.data ?? {}) as Json
      const couriers = (data.available_courier_companies ?? []) as Json[]
      if (!couriers.length) return fail('No courier serves this pincode.')
      // A courier serviceable for prepaid is not necessarily serviceable for
      // cash, and this product only ever ships COD.
      if (!couriers.some((c) => num(c.cod) === 1)) {
        return fail('Couriers serve this pincode, but none of them collect cash on delivery.')
      }
      return { ok: true, body }
    }
  }
}

/* ------------------------------- the token ------------------------------ */

export async function login(opts: { fetcher?: Fetcher } = {}): Promise<string> {
  const email = process.env.SHIPROCKET_EMAIL
  const password = process.env.SHIPROCKET_PASSWORD
  if (!email || !password) {
    throw new Error('SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD are not set.')
  }

  const fetcher = opts.fetcher ?? ((u, i) => fetch(u, i))
  const res = await fetcher(`${SHIPROCKET_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await res.json().catch(() => ({})) as Json

  // Never retried. Repeated failures lock the account out for half an hour,
  // then two hours, and a retry loop is how you get there.
  if (!res.ok || !body.token) {
    throw new Error(`Shiprocket login failed: ${str(body.message) || res.status}`)
  }

  const token = String(body.token)
  const db = sql()
  if (db) {
    const expires = new Date(Date.now() + TOKEN_TTL_MS).toISOString()
    await db`
      insert into shiprocket_token (id, token, expires_at)
      values (true, ${token}, ${expires})
      on conflict (id) do update set token = ${token}, expires_at = ${expires}`
  }
  return token
}

/** The cached token, or a fresh one. */
export async function cachedToken(opts: { fetcher?: Fetcher } = {}): Promise<string> {
  const db = sql()
  if (db) {
    const rows = await db`
      select token from shiprocket_token where id = true and expires_at > now()`
    if (rows.length) return String(rows[0].token)
  }
  return login(opts)
}

/* ------------------------------ the request ----------------------------- */

/**
 * One call, with one re-login on a 401 and one retry.
 *
 * Never more than one. A second 401 means something is wrong with the
 * credentials rather than the token, and hammering login is what triggers the
 * lockout.
 */
export async function srFetch(
  path: string,
  init: RequestInit = {},
  opts: { fetcher?: Fetcher; token?: string } = {},
): Promise<Response> {
  const fetcher = opts.fetcher ?? ((u, i) => fetch(u, i))
  let token = opts.token ?? await cachedToken({ fetcher })

  const send = () => fetcher(`${SHIPROCKET_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  })

  const first = await send()
  if (first.status !== 401) return first

  token = await login({ fetcher })
  return send()
}

/** A call whose body is read and judged. */
export async function srCall(
  endpoint: Endpoint,
  path: string,
  payload: unknown,
  opts: { fetcher?: Fetcher; token?: string; method?: string } = {},
): Promise<Verdict> {
  const res = await srFetch(path, {
    method: opts.method ?? 'POST',
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  }, opts)

  const body = await res.json().catch(() => ({})) as Json

  if (res.status === 429) {
    const wait = res.headers.get('retry-after') ?? 'a moment'
    return { ok: false, reason: `Shiprocket is rate limiting us. Try again in ${wait} seconds.`, body }
  }
  // A 422 carries a field map; a 400 carries one sentence.
  if (res.status === 422) {
    const errors = (body.errors ?? {}) as Record<string, string[]>
    const first = Object.entries(errors)[0]
    return {
      ok: false,
      reason: first ? `${first[0]}: ${first[1]?.[0]}` : str(body.message) || 'Shiprocket rejected the order.',
      body,
    }
  }
  if (!res.ok) {
    return { ok: false, reason: str(body.message) || `Shiprocket returned ${res.status}.`, body }
  }

  return checkBody(endpoint, body)
}
