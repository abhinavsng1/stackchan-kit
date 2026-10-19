'use client'

import { useState } from 'react'
import { CONTACT, PRICE } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'

/**
 * Buy in one tap: Magic Checkout collects the address, we collect nothing.
 *
 * Rendered only where the server has said the feature is on, so the flag is a
 * prop rather than a public environment variable — with MAGIC_CHECKOUT unset
 * this component is never mounted and its script is never fetched.
 *
 * It sells the robot outright at the full price. The ₹499 deposit does not
 * come through this window: Magic Checkout would have to treat the ₹4,500
 * balance as cash on delivery, which this Razorpay account cannot take, and
 * offering it is what greyed out every payment method the first time. The
 * form below is the deposit's path.
 *
 * The ordinary form stays exactly where it is. This is a second door, not a
 * replacement: the form is the one that works for everybody, including anyone
 * whose browser blocks Razorpay's window.
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

export default function MagicCheckoutButton({ qty = 1, coupon = null }: { qty?: number; coupon?: string | null }) {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function buy() {
    if (state === 'working') return
    setState('working')
    setMessage(null)
    track(EV.paymentOpened, { from: 'magic' })

    try {
      await loadMagic()
      const fromUrl = new URLSearchParams(window.location.search).get('code')
      const res = await fetch('/api/magic/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ qty, coupon: coupon ?? fromUrl ?? undefined }),
      })
      const order = await res.json().catch(() => ({}))
      if (!res.ok || !order.key_id) {
        setState('error')
        return setMessage(order?.error ?? 'Could not open checkout. Use the form below.')
      }

      const Razorpay = window.Razorpay
      if (!Razorpay) {
        setState('error')
        return setMessage('Could not open checkout. Use the form below.')
      }

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
          track(EV.paymentSucceeded, { from: 'magic' })
          setState('done')
        },
        modal: {
          ondismiss: () => {
            setState('idle')
            track(EV.paymentDismissed, { from: 'magic' })
          },
        },
      })
      rzp.open()
    } catch {
      setState('error')
      setMessage('Could not open checkout. Use the form below.')
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
      <button type="button" onClick={buy} disabled={state === 'working'} className="btn btn-brand">
        {state === 'working' ? 'Opening…' : 'Buy with 1-tap checkout'}
      </button>
      <p className="text-[13px] mt-2 mb-0" style={{ color: 'var(--muted)' }}>
        {message ?? `Pay ${PRICE.now} in full — address and payment in one window. Or book for ${PRICE.deposit} with the form below.`}
      </p>
    </div>
  )
}
