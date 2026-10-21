'use client'

import { useState } from 'react'
import type { Plan } from '@/lib/plans'
import { openMagicCheckout, CHECKOUT_UNAVAILABLE } from '@/lib/magic-checkout'

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
 * and what greyed out every payment option the first time.
 *
 * The window itself is opened by lib/magic-checkout.ts, which the header and
 * the sticky bar also call. This is only the button around it.
 */

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

  async function buy() {
    if (state === 'working' || disabled) return
    setState('working')
    setMessage(null)
    await openMagicCheckout({
      plan, qty, shell, coupon, from: 'magic',
      onDone: () => setState('done'),
      onDismissed: () => { setState('idle'); onDismissed?.() },
      onFailed: (reason) => {
        setState('error')
        setMessage(reason || CHECKOUT_UNAVAILABLE)
        // The form is the path that works for everybody, including anyone
        // whose browser blocks Razorpay's window.
        onUnavailable?.()
      },
    })
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
