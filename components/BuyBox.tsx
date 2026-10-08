'use client'

import { useEffect, useState } from 'react'
import { EDITION, PRICE } from '@/lib/kit'
import { editionFromUrl, useEdition } from '@/lib/edition-store'
import { track } from '@/lib/analytics'
import { EV } from '@/lib/events'
import { SwitchEdition } from '@/components/EditionGate'

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

  // An advert for the kit links to ?edition=kit and should land on the kit.
  useEffect(() => { editionFromUrl() }, [])

  const step = (by: number) => setQty((q) => Math.min(MAX, Math.max(1, q + by)))

  const reserve = () => {
    track(EV.reserveCtaClicked, { location: 'buybox', qty, edition })
    window.dispatchEvent(new CustomEvent('sc:qty', { detail: qty }))
    document.getElementById('reserve')?.scrollIntoView({ block: 'start' })
  }

  const e = EDITION[edition]

  return (
    <div id="buybox">
      <p className="t-label m-0">Batch 01 · {edition === 'assembled' ? 'Fully assembled' : 'Build-it-yourself kit'}</p>
      <h2 className="t-display mt-4 mb-0" style={{ fontSize: 'clamp(44px, 5vw, 72px)' }}>PebbleRobo</h2>
      <p className="text-[17px] text-[var(--muted)] mt-3 mb-0 max-w-[36ch]">{e.pitch}</p>

      <div className="flex items-baseline gap-3 flex-wrap mt-8">
        <span className="t-display leading-none" style={{ fontSize: 'clamp(40px, 4vw, 56px)' }}>{PRICE.now}</span>
        <span className="t-mono text-[15px] text-[var(--muted-2)] line-through">{PRICE.mrp}</span>
      </div>
      <p className="text-[15px] mt-3 mb-0">
        <strong className="font-medium">{PRICE.deposit} today</strong>
        <span className="text-[var(--muted)]"> · {PRICE.balance} in cash when it arrives</span>
      </p>
      <p className="text-[14px] text-[var(--muted)] mt-2 mb-0 flex items-center gap-2">
        <span className="dot" aria-hidden="true" />Free delivery in India · {PRICE.ship}
      </p>

      <div className="flex items-stretch gap-3 mt-8">
        <div className="flex items-center rounded-full border shrink-0" style={{ borderColor: 'var(--line)' }}>
          <StepButton label="Fewer" onClick={() => step(-1)} disabled={qty === 1}>−</StepButton>
          <span className="t-mono text-[15px] w-8 text-center tabular-nums" aria-live="polite"
                aria-label={`Quantity ${qty}`}>{qty}</span>
          <StepButton label="More" onClick={() => step(1)} disabled={qty === MAX}>+</StepButton>
        </div>
        <button type="button" onClick={reserve} className="btn btn-brand btn-lg flex-1">
          Buy PebbleRobo <span className="arrow" aria-hidden="true">→</span>
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <p className="t-mono text-[12px] text-[var(--muted)] m-0">Card · UPI · netbanking · EMI, via Razorpay</p>
        <a href="#included" className="link text-[14px]">See what’s included</a>
      </div>

      <p className="text-[14px] text-[var(--muted)] mt-8 mb-0 pt-5 border-t" style={{ borderColor: 'var(--line)' }}>
        {edition === 'kit' ? 'Rather have it ready to go? ' : 'Prefer to build it yourself? '}
        <SwitchEdition to={edition === 'kit' ? 'assembled' : 'kit'} location="buybox"
                       className="link bg-transparent border-0 p-0 cursor-pointer text-[14px]">
          {edition === 'kit' ? 'Switch to fully assembled' : 'The kit is the same price'}
        </SwitchEdition>
      </p>
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
