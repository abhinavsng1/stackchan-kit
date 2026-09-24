'use client'

import { useRef, useState } from 'react'
import { CONTACT, PRICE } from '@/lib/kit'

/**
 * Razorpay Standard Checkout.
 *
 * The flow is: ask our server for an order, hand the order id to Razorpay's
 * modal, then send what the modal returns back to our server to be verified.
 * The browser is never told the price and never sends one — it sends a
 * quantity and the server decides what that costs.
 */

type CheckoutResponse = {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

type RazorpayInstance = {
  open: () => void
  on: (event: 'payment.failed', handler: (r: { error?: { description?: string } }) => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
  }
}

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

/** Loaded on first click rather than on page load: most visitors never pay. */
function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('load failed')), { once: true })
    })
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('load failed'))
    document.head.appendChild(s)
  })
}

type State =
  | { phase: 'idle' }
  | { phase: 'working' }
  | { phase: 'paid'; paymentId: string }
  | { phase: 'error'; message: string }

export default function CheckoutButton({ token, qty = 1 }: { token: string; qty?: number }) {
  const [state, setState] = useState<State>({ phase: 'idle' })
  // Guards against a second modal if the button is double-clicked before React
  // has re-rendered with the busy state.
  const busy = useRef(false)

  async function pay() {
    if (busy.current) return
    busy.current = true
    setState({ phase: 'working' })

    try {
      await loadCheckout()

      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const order = await orderRes.json()
      if (!orderRes.ok) throw new Error(order?.error ?? 'Could not start the payment.')
      if (!order.key_id) throw new Error('Payments are not configured.')

      const Razorpay = window.Razorpay
      if (!Razorpay) throw new Error('Could not start the payment.')

      const rzp = new Razorpay({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: CONTACT.entity,
        description: `Pebble-chan kit × ${qty} — batch 01`,
        theme: { color: '#2f6bff' },
        prefill: order.prefill,

        handler: async (response: CheckoutResponse) => {
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            })
            const verdict = await verifyRes.json()
            if (!verifyRes.ok || verdict.status !== 'verified') {
              throw new Error('We could not verify that payment.')
            }
            setState({ phase: 'paid', paymentId: verdict.payment_id })
          } catch {
            // The money may well have left; what failed is our confirmation of
            // it. Say so plainly rather than implying the payment failed.
            setState({
              phase: 'error',
              message: `Your payment went through but we could not confirm it here. Write to ${CONTACT.email} and we will sort it out.`,
            })
          } finally {
            busy.current = false
          }
        },

        modal: {
          ondismiss: () => {
            busy.current = false
            setState({ phase: 'idle' })
          },
        },
      })

      rzp.on('payment.failed', (r) => {
        busy.current = false
        setState({
          phase: 'error',
          message: r?.error?.description ?? 'The payment did not go through. Nothing was charged.',
        })
      })

      rzp.open()
    } catch (err) {
      busy.current = false
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong.',
      })
    }
  }

  if (state.phase === 'paid') {
    return (
      <div className="card p-5" role="status">
        <p className="t-label m-0 mb-2" style={{ color: 'var(--mint)' }}>Paid</p>
        <p className="m-0 text-[15px]">
          Thank you — your kit is reserved and paid for. A receipt is on its way to your email.
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
        {state.phase === 'working' ? 'Opening…' : `Pay ${PRICE.now}`}
      </button>

      {state.phase === 'error' && (
        <p className="text-[14px] mt-3 mb-0" style={{ color: 'var(--danger)' }} role="alert">
          {state.message}
        </p>
      )}
    </div>
  )
}
