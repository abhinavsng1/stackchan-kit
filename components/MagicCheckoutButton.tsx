'use client'

import { useRef, useState } from 'react'
import { CONTACT } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'
import type { Plan } from '@/lib/plans'

/**
 * Buy in one tap: Magic Checkout collects the address, we collect nothing.
 *
 * Rendered only where the server has said the feature is on, so the flag is a
 * prop rather than a public environment variable — with MAGIC_CHECKOUT unset
 * this component is never mounted and its script is never fetched.
 *
 * Both doors come through here. The ₹4,999 sells the robot outright; the ₹499
 * sells the booking, declared to Razorpay as a ₹499 cart that settles in full
 * so nothing reads as cash on delivery — a method this account cannot take,
 * and what greyed out every payment option the first time. What a courier is
 * still owed travels on the order's notes and is read back by the webhook.
 *
 * The colour cannot be chosen inside Razorpay's window, so it is chosen
 * before it opens and carried on the order.
 */

const SRC = 'https://checkout.razorpay.com/v1/magic-checkout.js'

// The global is declared once, in lib/checkout.ts, where the ordinary
// checkout already uses it. Magic Checkout's script defines the same symbol.

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

export default function MagicCheckoutButton({
  plan,
  qty = 1,
  shell = null,
  coupon = null,
  label,
  note,
  tone = 'brand',
  disabled = false,
  onUnavailable,
  onDismissed,
}: {
  plan: Plan
  qty?: number
  shell?: string | null
  coupon?: string | null
  label: string
  note?: string
  tone?: 'brand' | 'ghost' | 'choice'
  /** Held shut until the buyer has chosen the things Razorpay cannot ask for. */
  disabled?: boolean
  /** Called when this window cannot be opened, so the page can offer the form. */
  onUnavailable?: () => void
  /** Called when the buyer shut the window without paying. */
  onDismissed?: () => void
}) {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  /*
   * Razorpay calls ondismiss for every closing of the window, including the
   * one that happens a moment after a payment succeeds. A ref, not state:
   * the callback was built before `state` changed and would still be reading
   * 'working' — which would file a completed sale as abandoned.
   */
  const paid = useRef(false)

  function failed(reason: string) {
    setState('error')
    setMessage(reason)
    // The form is the path that works for everybody, including anyone whose
    // browser blocks Razorpay's window. It is hidden until this moment.
    onUnavailable?.()
  }

  async function buy() {
    if (state === 'working' || disabled) return
    setState('working')
    setMessage(null)
    track(EV.paymentOpened, { from: 'magic', plan, qty })

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
      if (!res.ok || !order.key_id) {
        return failed(order?.error ?? 'Could not open the payment window. Use the form below.')
      }

      const Razorpay = window.Razorpay
      if (!Razorpay) return failed('Could not open the payment window. Use the form below.')

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
          // The booking row is written by the webhook from the address
          // Razorpay collected, so there is nothing for the page to save.
          paid.current = true
          track(EV.paymentSucceeded, { from: 'magic', plan, qty })
          setState('done')
        },
        modal: {
          ondismiss: () => {
            if (paid.current) return
            setState('idle')
            track(EV.paymentDismissed, { from: 'magic', plan })

            /*
             * Tell our own record the buyer walked away. Nothing else can:
             * Razorpay sends no webhook for a window somebody shut, so
             * without this an abandoned order is indistinguishable from a
             * payment whose webhook never arrived — and those two want
             * opposite responses. keepalive, because this often fires as the
             * page is being left.
             */
            void fetch('/api/magic/abandon', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ order_id: order.order_id }),
              keepalive: true,
            }).catch(() => {})

            onDismissed?.()
          },
        },
      })
      rzp.open()
    } catch {
      failed('Could not open the payment window. Use the form below.')
    }
  }

  if (state === 'done') {
    return (
      <p className="text-[15px] m-0">
        Paid — thank you. A confirmation is on its way to your email.
      </p>
    )
  }

  return (
    <div>
      <button
        type="button" onClick={buy} disabled={disabled || state === 'working'}
        className={`btn btn-${tone} w-full`}
      >
        {state === 'working' ? 'Opening…' : label}
      </button>
      {(message ?? note) && (
        <p className="text-[13px] mt-2 mb-0"
           style={{ color: message ? 'var(--danger)' : 'var(--muted)' }}>
          {message ?? note}
        </p>
      )}
    </div>
  )
}
