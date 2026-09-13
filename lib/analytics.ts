/**
 * Mixpanel, with session replay and heatmaps.
 *
 * Two rules shape this file:
 *
 * 1. Nothing loads or records until the visitor has said yes. The SDK is
 *    dynamically imported on consent, so a visitor who declines never even
 *    downloads it.
 * 2. Typed input is never recorded. record_mask_all_inputs stays on, so the
 *    reserve form's name and email are masked in every replay.
 *
 * NEXT_PUBLIC_MIXPANEL_TOKEN is a publishable project token — it identifies a
 * project to the browser and is designed to ship in client code. It is not a
 * secret, and it is not an API secret.
 */

import type { OverridedMixpanel } from 'mixpanel-browser'

type Props = Record<string, string | number | boolean | null | undefined>

export const CONSENT_KEY = 'sc-analytics-consent'
export type Consent = 'granted' | 'denied'

let mp: OverridedMixpanel | null = null
let loading: Promise<void> | null = null
const queue: Array<[string, Props | undefined]> = []

export { EV } from '@/lib/events'

import { EV as EVENTS } from '@/lib/events'
import { initPixel, pixelStandard, pixelCustom, stopPixel, pixelConfigured } from '@/lib/pixel'

/**
 * Meta understands a fixed vocabulary of standard events and reports on them
 * far better than on custom ones. Anything not in this table is still sent,
 * as a custom event, so nothing is silently dropped.
 */
const META_STANDARD: Record<string, string> = {
  [EVENTS.reserveCtaClicked]: 'InitiateCheckout',
  [EVENTS.reserveSucceeded]: 'Lead',
  [EVENTS.sectionViewed]: 'ViewContent',
}

/* ------------------------------- consent ------------------------------- */

export function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    return null
  }
}

export function writeConsent(value: Consent) {
  try { localStorage.setItem(CONSENT_KEY, value) } catch { /* private mode */ }
}

/**
 * Global Privacy Control and Do Not Track are explicit refusals. We honour them
 * without asking, rather than showing a banner that pretends the choice is open.
 */
export function privacySignalOptOut(): boolean {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string }
  const win = typeof window !== 'undefined'
    ? (window as Window & { doNotTrack?: string }) : undefined
  return nav.globalPrivacyControl === true ||
    nav.doNotTrack === '1' || nav.msDoNotTrack === '1' || win?.doNotTrack === '1'
}

/* -------------------------------- loading ------------------------------- */

export function analyticsConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) || pixelConfigured()
}

export async function initAnalytics(): Promise<void> {
  if (privacySignalOptOut()) return

  // The pixel is independent of Mixpanel: either can be configured alone.
  initPixel()

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
  // Meta, mapped to a standard event where one fits.
  const standard = META_STANDARD[event]
  if (standard) pixelStandard(standard, { content_name: event, ...props })
  else pixelCustom(event.replace(/\s+/g, ''), props)

  // Mixpanel.
  if (mp) { mp.track(event, props); return }
  if (analyticsConfigured() && readConsent() === 'granted') {
    queue.push([event, props])
    if (queue.length > 50) queue.shift()
  }
}

/** Called when someone withdraws consent. Stops collection everywhere. */
export function stopAnalytics() {
  queue.length = 0
  stopPixel()
  try { mp?.opt_out_tracking() } catch { /* already gone */ }
}
