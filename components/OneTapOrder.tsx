'use client'

import { useState } from 'react'
import MagicCheckoutButton from '@/components/MagicCheckoutButton'
import CouponField, { type Applied } from '@/components/CouponField'
import Swatch from '@/components/site/Swatch'
import { ORDERABLE_SHELLS, DEFAULT_SHELL } from '@/lib/shells'
import { setShell } from '@/lib/shell-store'
import { quote, rupees } from '@/lib/plans'

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
export default function OneTapOrder({ children }: { children: React.ReactNode }) {
  /*
   * Both start answered: one robot, in the colour the page is already
   * showing. Razorpay's window cannot ask for either, so whatever these say
   * at the moment of the tap is what gets built and posted — which means the
   * defaults have to be the ones a buyer would have picked anyway, and have
   * to be visibly selected rather than merely assumed.
   */
  const [chosenShell, setChosenShell] = useState<string>(DEFAULT_SHELL)
  const [qty, setQty] = useState<number>(1)
  const [applied, setApplied] = useState<Applied | null>(null)
  const [fallback, setFallback] = useState<'failed' | 'dismissed' | null>(null)

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
                onClick={() => { setShell(s.id); setChosenShell(s.id) }}
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
          onChange={(e) => setQty(Number(e.target.value))}
        >
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <CouponField plan="deposit" qty={count} onApplied={setApplied} />

      {/* The two doors, weighted the same. Neither is dressed as the
          recommendation: the difference between them is written underneath
          in rupees, which is the only part a buyer should be deciding on. */}
      <div className="grid gap-3 sm:grid-cols-2 mt-7">
        <MagicCheckoutButton
          plan="deposit" qty={count} shell={chosenShell} coupon={applied?.code ?? null}
          tone="choice"
          label={`Book for ${rupees(deposit.nowPaise)}`}
          note={`Then ${rupees(deposit.balancePaise)} in cash when it is delivered`}
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

      <p className="text-[13px] mt-4 mb-0" style={{ color: 'var(--muted)' }}>
        Address and payment in one window. We never see your card.
      </p>

      {/* Only ever shown because something broke. There is no link offering
          it: a second way to buy, sitting there unasked, is a choice the
          buyer has to make before they can get on with paying. It appears
          when a window refuses to open and not one moment before. */}
      {fallback && (
        <div className="mt-10 pt-8" style={{ borderTop: '1px solid var(--line)' }}>
          <p className="t-label m-0 mb-2">
            {fallback === 'failed'
              ? 'The payment window would not open'
              : 'Trouble with the payment window?'}
          </p>
          <p className="text-[14px] mt-0 mb-6" style={{ color: 'var(--muted)' }}>
            Nothing has been charged. Leave your details and we will send you a payment
            link instead — it takes about a minute.
          </p>
          {children}
        </div>
      )}
    </div>
  )
}
