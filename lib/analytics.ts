/**
 * Mixpanel, with session replay and heatmaps.
 *
 * Collection starts on the live website. Local and preview builds stay out of
 * production analytics. Typed input is never recorded: record_mask_all_inputs
 * stays on, so the reserve form's name and email are masked in every replay.
 *
 * NEXT_PUBLIC_MIXPANEL_TOKEN is a publishable project token — it identifies a
 * project to the browser and is designed to ship in client code. It is not a
 * secret, and it is not an API secret.
 */

import type { OverridedMixpanel } from 'mixpanel-browser'

/* `string[]` is here for Meta's `content_ids`, which is an array by
   specification. Mixpanel accepts arrays too. */
type Props = Record<string, string | number | boolean | string[] | null | undefined>

let mp: OverridedMixpanel | null = null
let loading: Promise<void> | null = null
const queue: Array<[string, Props | undefined]> = []

export { EV } from '@/lib/events'

import { EV as EVENTS } from '@/lib/events'
import { PRICE, SKU } from '@/lib/kit'
import { initPixel, pixelStandard, pixelCustom, stopPixel, pixelConfigured } from '@/lib/pixel'
import { analyticsMode } from '@/lib/analytics-environment'

/**
 * Meta understands a fixed vocabulary of standard events and reports on them
 * far better than on custom ones. Anything not in this table is still sent,
 * as a custom event, so nothing is silently dropped.
 */
const META_STANDARD: Record<string, string> = {
  [EVENTS.reserveCtaClicked]: 'InitiateCheckout',
  // The order exists but is not paid for yet: a lead, not a sale.
  [EVENTS.reserveSucceeded]: 'Lead',
  // Money actually moved. This is the conversion Meta should optimise towards,
  // and reporting it as anything weaker trains the ad delivery on the wrong
  // outcome.
  [EVENTS.paymentSucceeded]: 'Purchase',
  [EVENTS.sectionViewed]: 'ViewContent',
}

/**
 * Money, for the events that represent it.
 *
 * Meta cannot report return on ad spend, or optimise delivery towards higher
 * value orders, from an event with no `value` and `currency`. Purchase was
 * firing without either, so every sale counted as a conversion of unknown
 * worth — which is the same as telling the campaign that a one-kit order and
 * a three-kit order are identical.
 *
 * The figure comes from the same constant the server charges, so a price
 * change cannot leave the ad account reporting the old one. `props.qty`
 * multiplies it where the caller knows the quantity.
 */
function metaValue(standard: string, props?: Props): Props {
  if (standard !== 'Purchase' && standard !== 'InitiateCheckout' && standard !== 'Lead') return {}
  const qty = typeof props?.qty === 'number' && props.qty > 0 ? props.qty : 1
  return {
    value: (PRICE.nowPaise / 100) * qty,
    currency: 'INR',
    content_type: 'product',
    content_ids: [SKU],
  }
}

/* -------------------------------- loading ------------------------------- */

export function analyticsConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) || pixelConfigured()
}

export async function initAnalytics(): Promise<void> {
  const mode = analyticsMode()
  if (mode === 'off') return
  // The pixel is independent of Mixpanel: either can be configured alone.
  initPixel()
  if (mode === 'test') return

  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN
  if (!token || mp || loading) return loading ?? undefined

  loading = (async () => {
    const instance = (await import('mixpanel-browser')).default

    instance.init(token, {
      // Autocapture records clicks and scrolls, which is what populates heatmaps.
      autocapture: true,
      // Session replay. Heatmaps are derived from it.
      record_sessions_percent: 100,
      record_heatmap_data: true,
      // Never capture what anyone types — the reserve form takes a name and email.
      record_mask_all_inputs: true,
      // Page copy is public marketing text, so replays stay readable.
      record_mask_all_text: false,
      record_block_selector: 'img, video',
      record_network: false,
      record_canvas: false,
      persistence: 'localStorage',
      // We send our own, with useful properties attached.
      track_pageview: false,
      debug: false,
    })

    /**
     * Attached to every event from here on, so any report can be split by
     * device or traffic source without each call site remembering to pass them.
     */
    instance.register({
      viewport: window.innerWidth < 640 ? 'phone'
        : window.innerWidth < 1024 ? 'tablet' : 'desktop',
      landing_path: window.location.pathname,
      referrer_host: document.referrer ? new URL(document.referrer).host : 'direct',
    })

    mp = instance
    for (const [name, props] of queue.splice(0)) instance.track(name, props)
  })()

  return loading
}

/**
 * One call, both destinations. Events raised before an SDK finishes loading are
 * queued by that SDK rather than dropped.
 */
export function track(event: string, props?: Props) {
  const mode = analyticsMode()
  if (mode === 'off') return
  // Meta, mapped to a standard event where one fits.
  const standard = META_STANDARD[event]
  if (standard) pixelStandard(standard, { content_name: event, ...metaValue(standard, props), ...props })
  else pixelCustom(event.replace(/\s+/g, ''), props)

  // The existing campaign optimizes for CompleteRegistration. Keep Lead for
  // existing reports and retargeting exclusions; both mean confirmed success.
  if (event === EVENTS.reserveSucceeded) {
    pixelStandard('CompleteRegistration', { content_name: event, status: true })
  }
  if (mode === 'test') return

  // Mixpanel.
  if (mp) { mp.track(event, props); return }
  if (analyticsConfigured()) {
    queue.push([event, props])
    if (queue.length > 50) queue.shift()
  }
}

/**
 * A stable, non-reversible id for one buyer.
 *
 * Mixpanel counts a browser, not a person: the same buyer on a phone and a
 * laptop is two users, and clearing site data makes a third. That inflates
 * every unique count and splits one person's funnel across several.
 *
 * The email is the only thing we know that is stable across devices, but the
 * privacy page states plainly that neither analytics tool is sent an email
 * address, and that promise is worth more than the convenience. So we send a
 * SHA-256 of it instead: the same buyer resolves to the same id everywhere,
 * and the id cannot be turned back into an address.
 */
async function personId(email: string): Promise<string> {
  const normalised = email.trim().toLowerCase()
  const bytes = new TextEncoder().encode(normalised)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Ties this browser to a buyer, once we know who they are.
 *
 * Called when an order is placed. Mixpanel merges the anonymous history that
 * came before — the pages they read, where they hesitated — into the
 * identified profile, so the journey stays whole rather than starting at
 * checkout.
 *
 * Safe to call more than once with the same address; identifying to an id
 * that is already current is a no-op.
 */
export async function identifyPerson(email: string): Promise<void> {
  if (analyticsMode() !== 'live' || !email) return
  let id: string
  try {
    id = await personId(email)
  } catch {
    // No SubtleCrypto (an insecure origin). Better to stay anonymous than to
    // fall back to sending the address itself.
    return
  }
  try {
    mp?.identify(id)
    // Profile properties, deliberately free of anything identifying: enough to
    // count returning buyers, not enough to name one.
    mp?.people.set_once({ 'First Seen': new Date().toISOString() })
    mp?.people.set({ 'Last Order At': new Date().toISOString() })
  } catch { /* analytics must never break a purchase */ }
}

/** Records that the identified person actually paid. */
export function recordPurchase(props: { qty: number }): void {
  if (analyticsMode() !== 'live') return
  try {
    mp?.people.set({ 'Last Paid At': new Date().toISOString() })
    mp?.people.increment({ 'Kits Bought': props.qty, 'Orders Paid': 1 })
  } catch { /* analytics must never break a purchase */ }
}

/** Stops collection everywhere. Kept for a future opt-out control. */
export function stopAnalytics() {
  queue.length = 0
  stopPixel()
  try { mp?.opt_out_tracking() } catch { /* already gone */ }
  // Forget who this browser was, so a shared machine does not attribute the
  // next person's visit to the last one.
  try { mp?.reset() } catch { /* already gone */ }
}
