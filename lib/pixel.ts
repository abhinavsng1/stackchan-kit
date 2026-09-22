/**
 * Meta Pixel.
 *
 * Loads only on the live website. Local browser tests use an in-memory queue
 * without loading Meta's SDK or sending events to the production Pixel.
 *
 * NEXT_PUBLIC_META_PIXEL_ID is a publishable identifier: it names the pixel to
 * the browser and carries no privileges. It is not a secret.
 */

import { analyticsMode } from '@/lib/analytics-environment'

type FbqArgs = [string, string, Record<string, unknown>?]
type Fbq = ((...args: FbqArgs) => void) & {
  queue?: FbqArgs[]
  callMethod?: (...args: FbqArgs) => void
  loaded?: boolean
  version?: string
  push?: unknown
}

declare global {
  interface Window {
    fbq?: Fbq & { instance?: { pixelsByID?: Record<string, unknown> } }
    _fbq?: Fbq
  }
}

const SRC = 'https://connect.facebook.net/en_US/fbevents.js'
let started = false

export function pixelId(): string | undefined {
  return process.env.NEXT_PUBLIC_META_PIXEL_ID
}

export function pixelConfigured(): boolean {
  return Boolean(pixelId())
}

/**
 * The queueing stub Meta's own snippet installs, written out longhand so the
 * behaviour is readable instead of minified: calls made before the script
 * finishes loading are queued rather than lost.
 */
function installStub() {
  if (window.fbq) return
  const fbq: Fbq = function (...args: FbqArgs) {
    if (fbq.callMethod) fbq.callMethod(...args)
    else fbq.queue!.push(args)
  } as Fbq
  fbq.queue = []
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.push = fbq
  window.fbq = fbq
  window._fbq = fbq
}

export function initPixel() {
  const id = pixelId()
  const mode = analyticsMode()
  if (!id || started || mode === 'off') return
  started = true

  installStub()
  if (mode === 'live') {
    const script = document.createElement('script')
    script.async = true
    script.src = SRC
    document.head.appendChild(script)
  }

  // Preserve the live site's existing consent-mode configuration.
  window.fbq!('consent', 'grant')
  window.fbq!('init', id)
  window.fbq!('track', 'PageView')
}

export function pixelStarted() {
  return started
}

/** A Meta standard event — the ones their reporting and optimisation understand. */
export function pixelStandard(event: string, params?: Record<string, unknown>) {
  if (!started) return
  window.fbq?.('track', event, params)
}

/** Anything outside Meta's fixed vocabulary. */
export function pixelCustom(event: string, params?: Record<string, unknown>) {
  if (!started) return
  window.fbq?.('trackCustom', event, params)
}

export function stopPixel() {
  // Revoke on Meta's side too, not just stop calling it.
  try { window.fbq?.('consent', 'revoke') } catch { /* never loaded */ }
  started = false
}
