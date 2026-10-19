'use client'

import { useEffect, useRef, useState } from 'react'
import { CONTACT } from '@/lib/kit'
import { loadCheckout } from '@/lib/checkout'
import { EV, track } from '@/lib/analytics'

/**
 * Settles what is still owed at the door, online.
 *
 * It does not reuse lib/checkout's openCheckout because that function talks
 * to create-order, which is the deposit's route and refuses a booking that
 * has already been paid for. The gateway part is the same; the order it is
 * opened against is not.
 */

const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`

type State =
  | { phase: 'idle' }
  | { phase: 'working' }
  | { phase: 'paid' }
  | { phase: 'error'; message: string }

export default function BalancePanel({
  token, duePaise, incentivePaise, name,
}: { token: string; duePaise: number; incentivePaise: number; name: string }) {
  const [state, setState] = useState<State>({ phase: 'idle' })
  const busy = useRef(false)
  const now = Math.max(0, duePaise - incentivePaise)

  // How many of the emailed links are opened at all. Without it there is no
  // way to tell "nobody wants to pay early" from "nobody saw the email".
  useEffect(() => {
    track(EV.balancePageOpened, { due_inr: duePaise / 100, incentive_inr: incentivePaise / 100 })
  }, [duePaise, incentivePaise])

  async function pay() {
    if (busy.current) return
    busy.current = true
    setState({ phase: 'working' })
    track(EV.paymentOpened, { from: 'balance_link' })

    try {
      await loadCheckout()
      const res = await fetch('/api/create-balance-order', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const order = await res.json().catch(() => ({}))
      if (!res.ok || !order.key_id) {
        busy.current = false
        return setState({ phase: 'error', message: order?.error ?? 'Could not start the payment.' })
      }

      const Razorpay = window.Razorpay
      if (!Razorpay) {
        busy.current = false
        return setState({ phase: 'error', message: 'Could not load the payment window.' })
      }

      const rzp = new Razorpay({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: CONTACT.entity,
        description: 'PebbleRobo — balance',
        theme: { color: '#111111' },
        prefill: order.prefill,
        handler: () => {
          // The webhook is what records this. The page only has to stop
          // asking for money that has just been paid.
          track(EV.paymentSucceeded, { from: 'balance_link' })
          // Counted separately from a booking deposit: this is money that
          // would otherwise have been collected in cash at a door.
          track(EV.balancePaid, { paid_inr: now / 100, saved_inr: incentivePaise / 100 })
          setState({ phase: 'paid' })
        },
        modal: {
          ondismiss: () => {
            busy.current = false
            setState({ phase: 'idle' })
            track(EV.paymentDismissed, { from: 'balance_link' })
          },
        },
      })
      rzp.open()
    } catch {
      busy.current = false
      setState({ phase: 'error', message: 'Could not start the payment. Try again.' })
    }
  }

  if (state.phase === 'paid') {
    return (
      <div className="card p-6">
        <p className="t-label m-0 mb-2">Paid in full</p>
        <h2 className="t-display text-[22px] mt-0 mb-2">Nothing to pay at the door.</h2>
        <p className="text-[15px] m-0" style={{ color: 'var(--muted)' }}>
          A receipt is on its way to you. If a courier asks for cash anyway, show them
          that email and write to <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>.
        </p>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between gap-4 pb-4 mb-4"
           style={{ borderBottom: '1px solid var(--line)' }}>
        <span className="text-[15px]">Due on delivery, in cash</span>
        <span className="t-mono text-[15px]">{rupees(duePaise)}</span>
      </div>

      {incentivePaise > 0 && (
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <span className="text-[14px]" style={{ color: 'var(--muted)' }}>Pay online and save</span>
          <span className="t-mono text-[14px]" style={{ color: 'var(--accent-ink)' }}>
            −{rupees(incentivePaise)}
          </span>
        </div>
      )}

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[15px] font-medium">Pay now</span>
        <span className="t-display text-[26px] leading-none">{rupees(now)}</span>
      </div>
      <p className="text-[14px] mt-2 mb-5" style={{ color: 'var(--muted)' }}>
        {name ? `${name}, ` : ''}this settles the balance. The courier then collects nothing.
      </p>

      <button type="button" onClick={pay} disabled={state.phase === 'working'} className="btn btn-brand w-full">
        {state.phase === 'working' ? 'Opening…' : `Pay ${rupees(now)}`}
      </button>

      {state.phase === 'error' && (
        <p className="text-[14px] mt-3 mb-0" style={{ color: 'var(--danger)' }}>{state.message}</p>
      )}

      <p className="text-[13px] mt-4 mb-0" style={{ color: 'var(--muted)' }}>
        Prefer cash? Do nothing. The courier collects {rupees(duePaise)} as agreed.
      </p>
    </div>
  )
}
