'use client'

import { useRef, useState } from 'react'
import { CONTACT, PRICE } from '@/lib/kit'
import { openCheckout, CheckoutError } from '@/lib/checkout'
import { EV, track } from '@/lib/analytics'

/**
 * Pays for an order that already exists, from the link we email.
 *
 * The order form on the product page does its own checkout inline; this is the
 * same flow for someone returning to an unpaid order later. Both go through
 * lib/checkout so there is one payment path, not two.
 */

type State =
  | { phase: 'idle' }
  | { phase: 'working' }
  | { phase: 'paid'; paymentId: string }
  | { phase: 'error'; message: string }

export default function CheckoutButton({ token, qty = 1 }: { token: string; qty?: number }) {
  const [state, setState] = useState<State>({ phase: 'idle' })
  // Guards a second modal if the button is double-clicked before React has
  // re-rendered with the busy state.
  const busy = useRef(false)

  async function pay() {
    if (busy.current) return
    busy.current = true
    setState({ phase: 'working' })
    track(EV.paymentOpened, { from: 'payment_link' })

    try {
      const outcome = await openCheckout({
        token,
        entity: CONTACT.entity,
        description: `Pebble-chan kit \u00d7 ${qty} \u2014 batch 01`,
      })
      if (outcome.status === 'paid') {
        track(EV.paymentSucceeded, { from: 'payment_link' })
        return setState({ phase: 'paid', paymentId: outcome.paymentId })
      }
      if (outcome.status === 'dismissed') {
        track(EV.paymentDismissed, { from: 'payment_link' })
        return setState({ phase: 'idle' })
      }
      track(EV.paymentFailed, { from: 'payment_link', outcome: outcome.status, ...outcome.detail })
      setState({
        phase: 'error',
        message: outcome.status === 'unconfirmed'
          ? `${outcome.message} Write to ${CONTACT.email} and we will sort it out.`
          : outcome.message,
      })
    } catch (err) {
      track(EV.paymentFailed, {
        from: 'payment_link', outcome: 'not_started',
        ...(err instanceof CheckoutError ? err.detail : { stage: 'unknown', code: 'exception' }),
      })
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong.',
      })
    } finally {
      busy.current = false
    }
  }

  if (state.phase === 'paid') {
    return (
      <div className="card p-5" role="status">
        <p className="t-label m-0 mb-2" style={{ color: 'var(--mint)' }}>Paid</p>
        <p className="m-0 text-[15px]">
          Thank you \u2014 your kit is confirmed. A receipt is on its way to your email.
        </p>
        <p className="t-mono text-[11.5px] text-[var(--muted)] mt-3 mb-0">
          Payment {state.paymentId}
        </p>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        id="pay-now"
        onClick={pay}
        disabled={state.phase === 'working'}
        className="btn btn-brand"
      >
        {state.phase === 'working' ? 'Opening\u2026' : `Pay ${PRICE.now}`}
      </button>

      {state.phase === 'error' && (
        <p className="text-[14px] mt-3 mb-0" style={{ color: 'var(--danger)' }} role="alert">
          {state.message}
        </p>
      )}
    </div>
  )
}
