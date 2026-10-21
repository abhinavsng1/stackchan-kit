'use client'

import { CONTACT } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'
import type { Plan } from '@/lib/plans'

/**
 * Opening Razorpay's one-tap window, from anywhere on the page.
 *
 * Lifted out of the buy panel's button because the same thing now has to
 * happen from the header and from the bar that follows you up the page.
 * Three copies of a payment flow is three places for the next fix to be
 * applied twice and forgotten once.
 *
 * Everything that must survive Razorpay taking the page over — the abandoned
 * order, the note that something went wrong — is written here, before any
 * callback that depends on the page still existing.
 */

const SRC = 'https://checkout.razorpay.com/v1/magic-checkout.js'

/**
 * That the payment window was closed without paying, remembered across a
 * page load.
 *
 * Magic Checkout takes the page over, so leaving it unpaid can bring the
 * buyer back to a freshly mounted React tree, and a flag held in state is
 * gone by the time anything could read it.
 *
 * sessionStorage, so it lasts exactly as long as the tab and never follows
 * anybody to another visit. Wrapped, because it throws outright in a private
 * window with site data blocked, and a buy button must not fail for that.
 */
const TROUBLE_KEY = 'pebblerobo.checkout.trouble'
export const TROUBLE_EVENT = 'pebblerobo:checkout-trouble'

export function rememberTrouble(): void {
  try { sessionStorage.setItem(TROUBLE_KEY, '1') } catch { /* nothing to lose */ }
}

export function hadTrouble(): boolean {
  try { return sessionStorage.getItem(TROUBLE_KEY) === '1' } catch { return false }
}

export function forgetTrouble(): void {
  try { sessionStorage.removeItem(TROUBLE_KEY) } catch { /* nothing to lose */ }
}

/**
 * Tell the buy panel that the window let somebody down, without a reload.
 *
 * The header's button and the buy panel are not related in the React tree, so
 * a failure up there has no way down to the form except through the page
 * itself.
 */
function announceTrouble(reason: 'failed' | 'dismissed'): void {
  rememberTrouble()
  try {
    window.dispatchEvent(new CustomEvent(TROUBLE_EVENT, { detail: reason }))
  } catch { /* an older browser simply gets the form on the next load */ }
}

function loadMagic(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('blocked'))
    document.head.appendChild(script)
  })
}

export const CHECKOUT_UNAVAILABLE = 'Could not open the payment window. Use the form below.'

export type OpenCheckout = {
  plan: Plan
  qty?: number
  shell?: string | null
  coupon?: string | null
  /** Where on the page the buyer tapped, for the funnel. */
  from: string
  onDone?: () => void
  onDismissed?: () => void
  onFailed?: (reason: string) => void
}

export async function openMagicCheckout(o: OpenCheckout): Promise<void> {
  const { plan, qty = 1, shell = null, coupon = null, from } = o

  // They are trying again. Whatever went wrong last time is no longer the
  // thing to tell them about, until it happens again.
  forgetTrouble()
  track(EV.paymentOpened, { from, plan, qty })

  const fail = (reason: string) => {
    announceTrouble('failed')
    // How often the window lets somebody down, and at which door. Without
    // this a blocked script looks exactly like a buyer who never tried.
    track(EV.paymentFailed, { from, plan, qty, reason })
    o.onFailed?.(reason)
  }

  try {
    await loadMagic()
    const fromUrl = new URLSearchParams(window.location.search).get('code')
    const res = await fetch('/api/magic/order', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        plan, qty,
        ...(shell ? { shell } : {}),
        coupon: coupon ?? fromUrl ?? undefined,
      }),
    })
    const order = await res.json().catch(() => ({}))
    if (!res.ok || !order.key_id) return fail(order?.error ?? CHECKOUT_UNAVAILABLE)

    const Razorpay = window.Razorpay
    if (!Razorpay) return fail(CHECKOUT_UNAVAILABLE)

    // Razorpay calls ondismiss for every closing of the window, including the
    // one that happens a moment after a payment succeeds — which would file a
    // completed sale as abandoned.
    let paid = false

    const rzp = new Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      // Without this, Razorpay opens its ordinary checkout instead.
      one_click_checkout: true,
      show_coupons: true,
      name: CONTACT.entity,
      description: 'PebbleRobo',
      theme: { color: '#111111' },
      ...(order.coupon ? { prefill: { coupon_code: order.coupon } } : {}),
      handler: () => {
        // The booking row is written by the webhook from the address Razorpay
        // collected, so there is nothing for the page to save.
        paid = true
        forgetTrouble()
        track(EV.paymentSucceeded, { from, plan, qty })
        o.onDone?.()
      },
      modal: {
        ondismiss: () => {
          if (paid) return
          announceTrouble('dismissed')
          track(EV.paymentDismissed, { from, plan })

          /*
           * Tell our own record the buyer walked away. Nothing else can:
           * Razorpay sends no webhook for a window somebody shut, so without
           * this an abandoned order is indistinguishable from a payment whose
           * webhook never arrived — and those two want opposite responses.
           * keepalive, because this often fires as the page is being left.
           */
          void fetch('/api/magic/abandon', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ order_id: order.order_id }),
            keepalive: true,
          }).catch(() => {})

          o.onDismissed?.()
        },
      },
    })
    rzp.open()
  } catch {
    fail(CHECKOUT_UNAVAILABLE)
  }
}
