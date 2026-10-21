'use client'

import { useEffect, useRef, useState } from 'react'
import MagicCheckoutButton from '@/components/MagicCheckoutButton'
import { hadTrouble, TROUBLE_EVENT } from '@/lib/magic-checkout'
import CouponField, { type Applied } from '@/components/CouponField'
import Swatch from '@/components/site/Swatch'
import { ORDERABLE_SHELLS, isOrderableShell, DEFAULT_SHELL } from '@/lib/shells'
import { useShell, setShell } from '@/lib/shell-store'
import { quote, rupees } from '@/lib/plans'
import { EV, track } from '@/lib/analytics'

/**
 * Ordering without a form.
 *
 * Razorpay's window asks for the name, phone and address, so the only things
 * this page still has to ask are the ones the window cannot: the colour, how
 * many, and whether there is a code. Then two doors, priced out loud, because
 * both are now on screen at once and a buyer must not have to guess which one
 * takes ₹499 and which takes ₹4,999.
 *
 * The form is still here, passed in as children and hidden. It appears only
 * if a window will not open — a blocked script, a refused order — or if
 * somebody asks for it, because a visitor who wants to buy should never be
 * left with no way to do it.
 */
export default function OneTapOrder({ oneButton = false, children }: {
  /**
   * The gateway carries the choice.
   *
   * With cash on delivery available, there is one order at the full price and
   * the buyer decides between paying now and paying on delivery by choosing a
   * payment method inside Razorpay's window — where partial COD takes the
   * ₹499 advance. Two buttons here would be asking a question the window is
   * about to ask properly.
   */
  oneButton?: boolean
  children: React.ReactNode
}) {
  /*
   * Both start answered: one robot, in the colour the page is already
   * showing. Razorpay's window cannot ask for either, so whatever these say
   * at the moment of the tap is what gets built and posted — which means the
   * defaults have to be the ones a buyer would have picked anyway, and have
   * to be visibly selected rather than merely assumed.
   */
  /*
   * Whatever the page is already showing.
   *
   * The shared store starts on LEAD_SHELL and follows every other colour
   * control on the page, so picking Moss beside the robot arrives here
   * picked. Defaulting to DEFAULT_SHELL instead put Black in this panel
   * while an Ember robot sat on the screen above it — and since Razorpay's
   * window cannot ask, whatever this says is what gets built and posted.
   */
  const previewed = useShell()
  const chosenShell = isOrderableShell(previewed) ? previewed : DEFAULT_SHELL
  const [qty, setQty] = useState<number>(1)
  const [applied, setApplied] = useState<Applied | null>(null)
  const [fallback, setFallback] = useState<'failed' | 'dismissed' | null>(null)

  /*
   * Razorpay's window takes the page over, so a buyer who leaves it unpaid
   * can come back to a React tree that has been built from scratch — with
   * the fact that anything went wrong wiped out of it. The dismissal itself
   * reaches our database fine; it was only ever this screen that forgot.
   *
   * Read in an effect rather than during render: the page is static, and
   * reading storage while rendering would make the server's HTML and the
   * browser's first paint disagree.
   */
  useEffect(() => {
    if (hadTrouble()) setFallback((f) => f ?? 'dismissed')

    /*
     * The header's button and the bar that follows you up the page open the
     * same window, and they are nowhere near this component in the React
     * tree. When one of them is closed unpaid there is no way down to the
     * form except through the page itself, so they say so on the window and
     * this listens.
     */
    const heard = (e: Event) => {
      const why = (e as CustomEvent<'failed' | 'dismissed'>).detail
      setFallback((f) => f ?? (why === 'failed' ? 'failed' : 'dismissed'))
    }
    window.addEventListener(TROUBLE_EVENT, heard)
    return () => window.removeEventListener(TROUBLE_EVENT, heard)
  }, [])

  const trouble = useRef<HTMLDivElement>(null)

  /*
   * Bring it to them.
   *
   * The form was appearing well below the fold, which on a phone means it
   * had not appeared at all: somebody who has just failed to pay is looking
   * at two buttons that did nothing, with the answer a screen and a half
   * further down. So the panel scrolls itself into view and takes focus,
   * which also announces it to a screen reader instead of silently growing
   * the page.
   *
   * Honours prefers-reduced-motion, and waits a frame so the browser's own
   * scroll restoration on a fresh load does not immediately undo it.
   */
  useEffect(() => {
    if (!fallback) return
    // How many people the one-tap window sends to the form, and why. This is
    // the number that says whether one tap is actually working.
    track(EV.checkoutFallbackShown, { reason: fallback })
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const id = window.requestAnimationFrame(() => {
      trouble.current?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
      trouble.current?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(id)
  }, [fallback])

  const count = qty
  const discountPaise = applied?.discountPaise ?? 0
  const deposit = quote('deposit', count, null, discountPaise)
  const full = quote('full', count, null, discountPaise)

  return (
    <div>
      {/* Colour. Picking here sets it everywhere else on the page
          (lib/shell-store.ts), but the choice has to be made here: the window
          cannot ask, and a swatch that merely looks selected is not an
          instruction anybody gave us. */}
      <fieldset className="border-0 p-0 m-0 mb-6">
        <legend className="t-label mb-2 p-0">Colour</legend>
        <div className="flex flex-wrap items-center gap-3">
          <div role="radiogroup" aria-label="Shell colour"
               className="inline-flex items-center gap-2.5 p-2.5"
               style={{ borderRadius: 999, border: '1px solid var(--line)' }}>
            {ORDERABLE_SHELLS.map((s) => (
              <button
                key={s.id} type="button" role="radio"
                aria-checked={chosenShell === s.id} aria-label={s.name}
                onClick={() => {
                  setShell(s.id)
                  track(EV.colourChosen, { shell: s.id, location: 'one-tap' })
                }}
                className="block cursor-pointer rounded-full"
                style={{
                  // The ring sits outside the swatch so it never tints the
                  // colour someone is trying to judge.
                  outline: chosenShell === s.id ? '2px solid var(--ink)' : '2px solid transparent',
                  outlineOffset: 2,
                }}
              >
                <Swatch way={s} size={26} />
              </button>
            ))}
          </div>
          <span className="t-mono text-[12.5px]" style={{ color: 'var(--muted)' }}>
            {ORDERABLE_SHELLS.find((s) => s.id === chosenShell)?.name ?? ''} · same price in every colour
          </span>
        </div>
      </fieldset>

      <div className="mb-6" style={{ maxWidth: 160 }}>
        <label htmlFor="onetap-qty" className="t-label block mb-2">How many</label>
        <select
          id="onetap-qty" className="field" value={qty}
          onChange={(e) => {
            const n = Number(e.target.value)
            setQty(n)
            track(EV.quantityChosen, { qty: n, location: 'one-tap' })
          }}
        >
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <CouponField plan="deposit" qty={count} onApplied={setApplied} />

      {/* The two doors, weighted the same. Neither is dressed as the
          recommendation: the difference between them is written underneath
          in rupees, which is the only part a buyer should be deciding on. */}
      {oneButton ? (
        <div className="mt-7">
          <MagicCheckoutButton
            plan="full" qty={count} shell={chosenShell} coupon={applied?.code ?? null}
            tone="brand"
            label={`Order for ${rupees(full.nowPaise)}`}
            note={`Pay now, or ${rupees(deposit.nowPaise)} now and ${rupees(deposit.balancePaise)} in cash on delivery — choose in the next window.`}
            onUnavailable={() => setFallback('failed')}
            onDismissed={() => setFallback((f) => f ?? 'dismissed')}
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 mt-7">
          <MagicCheckoutButton
            plan="deposit" qty={count} shell={chosenShell} coupon={applied?.code ?? null}
            tone="choice"
            label={`Book for ${rupees(deposit.nowPaise)}`}
            note={`(${rupees(deposit.balancePaise)} in cash on delivery)`}
            onUnavailable={() => setFallback('failed')}
            onDismissed={() => setFallback((f) => f ?? 'dismissed')}
          />
          <MagicCheckoutButton
            plan="full" qty={count} shell={chosenShell} coupon={applied?.code ?? null}
            tone="choice"
            label={`Pay ${rupees(full.nowPaise)} in full`}
            note="Then nothing to pay at the door"
            onUnavailable={() => setFallback('failed')}
            onDismissed={() => setFallback((f) => f ?? 'dismissed')}
          />
        </div>
      )}

      <p className="text-[13px] mt-4 mb-0" style={{ color: 'var(--muted)' }}>
        Address and payment in one window. We never see your card.
      </p>

      {/* Only ever shown because something broke. There is no link offering
          it: a second way to buy, sitting there unasked, is a choice the
          buyer has to make before they can get on with paying. It appears
          when a window refuses to open and not one moment before. */}
      {fallback && (
        <div
          ref={trouble}
          tabIndex={-1}
          role="group"
          aria-labelledby="checkout-trouble"
          className="mt-10 p-6 sm:p-7 scroll-mt-24"
          style={{
            // Marked out rather than merely present: this panel was not on
            // the page a moment ago, and the buyer needs to see that it is
            // the answer to what just happened to them.
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
      )}
    </div>
  )
}
