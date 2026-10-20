'use client'

import { useEffect, useState } from 'react'
import MagicCheckoutButton from '@/components/MagicCheckoutButton'
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
 * Behind ?magic=1 while a one-tap sale is still unaccounted for: a payment
 * went through this path and left neither a booking row nor an email, which
 * is the worst way for a checkout to fail — the money moves and nothing on
 * our side knows. Until that is understood and fixed, the form is the way in
 * for everybody, exactly as it was.
 */
export default function OneTapOrder({ children }: { children: React.ReactNode }) {
  const previewed = useShell()
  const shell = isOrderableShell(previewed) ? previewed : DEFAULT_SHELL
  const [qty, setQty] = useState(1)
  const [applied, setApplied] = useState<Applied | null>(null)
  const [fallback, setFallback] = useState(false)

  /*
   * Decided in an effect rather than during render: the page is static, and
   * reading the query string while rendering would make the server's HTML and
   * the browser's first paint disagree.
   */
  const [asked, setAsked] = useState(false)
  useEffect(() => {
    setAsked(new URLSearchParams(window.location.search).get('magic') === '1')
  }, [])

  const discountPaise = applied?.discountPaise ?? 0
  const deposit = quote('deposit', qty, null, discountPaise)
  const full = quote('full', qty, null, discountPaise)

  // The ordinary page: the form, and nothing about one tap.
  if (!asked) return <>{children}</>

  return (
    <div>
      {/* Colour. Shared with every other colour control on the page
          (lib/shell-store.ts), so picking beside the robot picks here too. */}
      <fieldset className="border-0 p-0 m-0 mb-6">
        <legend className="t-label mb-2 p-0">Colour</legend>
        <div className="flex flex-wrap items-center gap-3">
          <div role="radiogroup" aria-label="Shell colour"
               className="inline-flex items-center gap-2.5 p-2.5"
               style={{ borderRadius: 999, border: '1px solid var(--line)' }}>
            {ORDERABLE_SHELLS.map((s) => (
              <button
                key={s.id} type="button" role="radio"
                aria-checked={s.id === shell} aria-label={s.name}
                onClick={() => setShell(s.id)}
                className="block cursor-pointer rounded-full"
                style={{
                  // The ring sits outside the swatch so it never tints the
                  // colour someone is trying to judge.
                  outline: s.id === shell ? '2px solid var(--ink)' : '2px solid transparent',
                  outlineOffset: 2,
                }}
              >
                <Swatch way={s} size={26} />
              </button>
            ))}
          </div>
          <span className="t-mono text-[12.5px]" style={{ color: 'var(--muted)' }}>
            {ORDERABLE_SHELLS.find((s) => s.id === shell)?.name ?? ''} · same price in every colour
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

      <CouponField plan="deposit" qty={qty} onApplied={setApplied} />

      {/* The two doors. The deposit leads, because it is the one most people
          take and the smaller ask; paying in full sits beside it rather than
          beneath it, as an equal choice rather than an upsell. */}
      <div className="grid gap-3 sm:grid-cols-2 mt-7">
        <MagicCheckoutButton
          plan="deposit" qty={qty} shell={shell} coupon={applied?.code ?? null}
          label={`Book for ${rupees(deposit.nowPaise)}`}
          note={`${rupees(deposit.balancePaise)} in cash when it is delivered`}
          onUnavailable={() => setFallback(true)}
        />
        <MagicCheckoutButton
          plan="full" qty={qty} shell={shell} coupon={applied?.code ?? null}
          tone="ghost"
          label={`Pay ${rupees(full.nowPaise)} in full`}
          note="Nothing to pay at the door"
          onUnavailable={() => setFallback(true)}
        />
      </div>

      <p className="text-[13px] mt-4 mb-0" style={{ color: 'var(--muted)' }}>
        Address and payment in one window. We never see your card.
      </p>

      {!fallback && (
        <button
          type="button"
          onClick={() => { setFallback(true); track(EV.planChosen, { plan: 'deposit', location: 'form-revealed', qty }) }}
          className="bg-transparent border-0 p-0 mt-5 cursor-pointer text-[13.5px] underline"
          style={{ color: 'var(--muted)' }}
        >
          Rather fill in a form?
        </button>
      )}

      {fallback && (
        <div className="mt-10 pt-8" style={{ borderTop: '1px solid var(--line)' }}>
          <p className="t-label m-0 mb-4">Order by form instead</p>
          {children}
        </div>
      )}
    </div>
  )
}
