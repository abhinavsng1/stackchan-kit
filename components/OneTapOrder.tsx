'use client'

import { useEffect, useRef, useState } from 'react'
import { hadTrouble, TROUBLE_EVENT } from '@/lib/magic-checkout'
import { EV, track } from '@/lib/analytics'

/**
 * What the page shows when the payment window lets somebody down.
 *
 * Nothing, until then. The buy box already asks the colour and the quantity
 * — the two things Razorpay cannot ask — beside the price and the
 * photograph, and it opens the window itself. A second panel further down
 * asking the same two questions was a second decision for no new
 * information, and a second way to buy sitting there unasked is a choice
 * somebody has to make before they can get on with paying.
 *
 * So this exists for the case where a window refuses to open or is closed
 * unpaid: the form, under a line saying nothing has been charged. A visitor
 * who wants to buy should never be left with no way to do it.
 */
export default function OneTapOrder({ children }: { children: React.ReactNode }) {
  const [fallback, setFallback] = useState<'failed' | 'dismissed' | null>(null)
  const trouble = useRef<HTMLDivElement>(null)

  useEffect(() => {
    /*
     * Razorpay's window takes the page over, so somebody who leaves it unpaid
     * can come back to a React tree built from scratch with the fact that
     * anything happened wiped out of it. The dismissal reaches our database
     * fine; it was only ever this screen that forgot.
     */
    if (hadTrouble()) setFallback((f) => f ?? 'dismissed')

    /*
     * Every Book on the page opens the same window and none of them are near
     * this component in the React tree, so a failure up there has no way down
     * to the form except through the page itself.
     */
    const heard = (e: Event) => {
      const why = (e as CustomEvent<'failed' | 'dismissed'>).detail
      setFallback((f) => f ?? (why === 'failed' ? 'failed' : 'dismissed'))
    }
    window.addEventListener(TROUBLE_EVENT, heard)
    return () => window.removeEventListener(TROUBLE_EVENT, heard)
  }, [])

  useEffect(() => {
    if (!fallback) return
    // How many people the window sends to the form, and why. This is the
    // number that says whether one tap is actually working.
    track(EV.checkoutFallbackShown, { reason: fallback })

    /*
     * Bring it to them, and take focus so a screen reader announces it
     * rather than the page silently growing. A frame's wait, so the
     * browser's own scroll restoration on a fresh load does not undo it.
     */
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const id = window.requestAnimationFrame(() => {
      trouble.current?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
      trouble.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(id)
  }, [fallback])

  if (!fallback) return null

  return (
    <section id="reserve" className="section scroll-mt-20"
             style={{ paddingTop: 'clamp(48px, 6vw, 96px)' }}>
      <div className="wrap" style={{ maxWidth: 680 }}>
        <div
          ref={trouble}
          tabIndex={-1}
          role="group"
          aria-labelledby="checkout-trouble"
          className="p-6 sm:p-7 scroll-mt-24"
          style={{
            // Marked out rather than merely present: this was not on the page
            // a moment ago and has to read as the answer to what just
            // happened, not as more page.
            borderRadius: 18,
            border: '1.5px solid var(--ember)',
            background: 'var(--surface)',
            outline: 'none',
          }}
        >
          <p id="checkout-trouble" className="t-display text-[19px] m-0 mb-2">
            {fallback === 'failed'
              ? 'That payment window would not open'
              : 'Trouble with the payment window?'}
          </p>
          <p className="text-[14.5px] mt-0 mb-6">
            <strong>Nothing has been charged.</strong> Leave your details here instead and we
            will send you a payment link — it takes about a minute.
          </p>
          {children}
        </div>
      </div>
    </section>
  )
}
