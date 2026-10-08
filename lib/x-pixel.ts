/**
 * The X pixel, in the browser.
 *
 * Loads on the live website only, like the Meta Pixel and Mixpanel: local
 * development and preview deployments send nothing. Browser tests get the
 * same queue the base code installs, without X's script ever loading.
 */

import { analyticsMode } from '@/lib/analytics-environment'
import { X_EVENTS, X_PIXEL_ID, type XEvent } from '@/lib/x'

type Twq = ((...args: unknown[]) => void) & { queue?: unknown[][]; version?: string }

declare global {
  interface Window { twq?: Twq }
}

/**
 * X's base code, exactly as Events Manager issues it. It is rendered as-is by
 * components/XPixel.tsx; nothing here should be edited except by pasting a
 * newer copy from X.
 */
export const X_BASE_CODE = `!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
twq('config','rfx4u');`

/** For browser tests: the base code's queue, without loading uwt.js. */
export function installTestQueue(): void {
  if (window.twq) return
  const queue: unknown[][] = []
  const twq: Twq = Object.assign((...args: unknown[]) => { queue.push(args) }, { queue, version: '1.1' })
  window.twq = twq
  twq('config', X_PIXEL_ID)
}

/**
 * Reports a conversion from the browser. Does nothing for an event that has
 * no id in Events Manager yet, and nothing off the live site.
 *
 * For an event the server reports too (lead, purchase), `conversion_id` must
 * be the same value the server sends, or X counts the conversion twice.
 */
export function xEvent(event: XEvent, params: Record<string, unknown> = {}): void {
  const id = X_EVENTS[event]
  if (!id || analyticsMode() === 'off') return
  try { window.twq?.('event', id, params) } catch { /* analytics must never break a purchase */ }
}

/* ------------------------------------------------------------------------ *
 * Click id
 *
 * An X ad appends `twclid` to the link it sends people down. It is the
 * strongest way to tie a sale back to the ad, but it is only in the address
 * of the page someone landed on — by the time they pay, they may have reloaded
 * or come back days later. So it is kept for the length of X's click window
 * and sent with the order, where the server can attach it to the conversion.
 * ------------------------------------------------------------------------ */

const KEY = 'pbl_twclid'
const WINDOW_MS = 30 * 86_400_000

/** An X click id is URL-safe text. Anything else is not one. */
export const isTwclid = (v: unknown): v is string =>
  typeof v === 'string' && /^[A-Za-z0-9._~-]{1,200}$/.test(v)

export function captureTwclid(): void {
  try {
    const v = new URLSearchParams(window.location.search).get('twclid')
    if (isTwclid(v)) localStorage.setItem(KEY, JSON.stringify({ v, at: Date.now() }))
  } catch { /* private mode, or storage blocked: attribution falls back to the hashed contact details */ }
}

export function storedTwclid(): string | undefined {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return undefined
    const { v, at } = JSON.parse(raw) as { v?: unknown; at?: unknown }
    if (typeof at !== 'number' || Date.now() - at > WINDOW_MS) return undefined
    return isTwclid(v) ? v : undefined
  } catch {
    return undefined
  }
}
