'use client'

import { smoothScrollTo } from '@/lib/smooth-scroll'
import EmiNote from '@/components/EmiNote'

import { useState } from 'react'
import { EDITION, PRICE } from '@/lib/kit'
import { useEdition } from '@/lib/edition-store'
import { track } from '@/lib/analytics'
import { EV } from '@/lib/events'
import ShellPicker from '@/components/site/ShellPicker'

const MAX = 5

/**
 * The buy box: the product, its price, and one clear way to act on it.
 *
 * It does not contain the form — ordering asks for a shipping address, and
 * eight fields do not belong in a sticky panel. The quantity chosen here is
 * carried to the form, and the edition is shared through one store, so
 * nobody chooses either twice.
 *
 * The assembled robot is the product. The kit is offered as a quiet
 * alternative underneath rather than as an equal choice: most buyers want a
 * robot, not a project.
 */
export default function BuyBox() {
  const [qty, setQty] = useState(1)
  const edition = useEdition()


  const step = (by: number) => setQty((q) => Math.min(MAX, Math.max(1, q + by)))

  const reserve = () => {
    track(EV.reserveCtaClicked, { location: 'buybox', qty, edition })
    window.dispatchEvent(new CustomEvent('sc:qty', { detail: qty }))
    smoothScrollTo('reserve')
  }

  const e = EDITION[edition]

  return (
    <div id="buybox">
      <p className="t-label m-0">Batch 01</p>
      <h2 className="t-display mt-4 mb-0" style={{ fontSize: 'clamp(44px, 5vw, 72px)' }}>PebbleRobo</h2>
      <p className="text-[17px] text-[var(--muted)] mt-3 mb-0 max-w-[36ch]">{e.pitch}</p>

      {/* Booking leads: it is the only thing charged on this page. The full
          price sits beside it so nobody mistakes ₹499 for the price. */}
      <div className="flex items-end gap-x-8 gap-y-4 flex-wrap mt-8">
        <div>
          <p className="t-label m-0 mb-2">Book today</p>
          <span className="t-display leading-none" style={{ fontSize: 'clamp(52px, 5.5vw, 80px)', color: 'var(--accent)' }}>
            {PRICE.deposit}
          </span>
        </div>
        <div className="pb-1">
          <p className="t-label m-0 mb-2">Full price</p>
          <span className="flex items-baseline gap-2">
            <span className="t-display text-[26px] leading-none">{PRICE.now}</span>
            <span className="t-mono text-[13px] text-[var(--muted-2)] line-through">{PRICE.mrp}</span>
          </span>
        </div>
      </div>
      <p className="text-[15px] mt-4 mb-0 max-w-[40ch]">
        <strong className="font-medium">Pay {PRICE.deposit} now to book yours.</strong>
        <span className="text-[var(--muted)]"> The remaining {PRICE.balance} is charged after booking, in cash when it’s delivered.</span>
      </p>
      {/* Only renders when a monthly figure has actually been configured. */}
      <EmiNote amountPaise={PRICE.nowPaise} />
      <p className="text-[14px] text-[var(--muted)] mt-2 mb-0 flex items-center gap-2">
        <span className="dot" aria-hidden="true" />Free delivery in India · {PRICE.ship}
      </p>

      <div className="mt-7">
        <p className="t-label m-0 mb-2">Colour</p>
        <ShellPicker location="buybox" size={24} label="below" />
      </div>

      <div className="flex items-stretch gap-3 mt-7">
        <div className="flex items-center rounded-full border shrink-0" style={{ borderColor: 'var(--line)' }}>
          <StepButton label="Fewer" onClick={() => step(-1)} disabled={qty === 1}>−</StepButton>
          <span className="t-mono text-[15px] w-8 text-center tabular-nums" aria-live="polite"
                aria-label={`Quantity ${qty}`}>{qty}</span>
          <StepButton label="More" onClick={() => step(1)} disabled={qty === MAX}>+</StepButton>
        </div>
        <button type="button" onClick={reserve} className="btn btn-brand btn-lg flex-1">
          Book for {PRICE.deposit} <span className="arrow" aria-hidden="true">→</span>
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <p className="t-mono text-[12px] text-[var(--muted)] m-0">Card · UPI · netbanking · EMI, via Razorpay</p>
        <a href="#included" className="link text-[14px]">See what’s included</a>
      </div>


    </div>
  )
}

function StepButton({
  children, onClick, disabled, label,
}: { children: React.ReactNode; onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-11 h-11 grid place-items-center text-[18px] rounded-full disabled:opacity-30
                 hover:bg-[var(--surface-2)] transition-colors cursor-pointer disabled:cursor-not-allowed"
    >
      {children}
    </button>
  )
}
