'use client'

import { useState } from 'react'
import { PRICE, PARTS } from '@/lib/kit'
import { track } from '@/lib/analytics'
import { EV } from '@/lib/events'

const MAX = 5

/**
 * The buy box. Sticky beside the gallery, so the price and the way to act on it
 * stay in view however far the specifications run.
 *
 * The quantity chosen here is carried to the short reservation form so
 * nobody enters it twice.
 */
export default function BuyBox() {
  const [qty, setQty] = useState(1)

  const step = (by: number) => setQty((q) => Math.min(MAX, Math.max(1, q + by)))

  const reserve = () => {
    track(EV.reserveCtaClicked, { location: 'buybox', qty })
    window.dispatchEvent(new CustomEvent('sc:qty', { detail: qty }))
    document.getElementById('reserve')?.scrollIntoView({ block: 'start' })
  }

  return (
    <div id="buybox" className="lg:sticky lg:top-24">
      <p className="t-label m-0">Pebble Robo · Batch 01</p>
      <h1 className="t-display text-[clamp(28px,4.4vw,40px)] mt-2 mb-0">
        Pebble-chan build kit
      </h1>
      <p className="t-mono text-[12px] text-[var(--muted)] mt-2 mb-0">
        SKU PBL-KIT-01 · {PARTS.length} parts
      </p>

      <div className="flex items-end gap-3 flex-wrap mt-6">
        <span className="t-display text-[clamp(34px,5.5vw,46px)] leading-none">{PRICE.now}</span>
        <span className="t-mono text-[15px] text-[var(--muted)] line-through mb-1">{PRICE.mrp}</span>
        <span className="badge mb-1.5" style={{
          color: 'var(--mint)',
          borderColor: 'color-mix(in srgb, var(--mint) 40%, transparent)',
          background: 'color-mix(in srgb, var(--mint) 10%, var(--surface))',
        }}>{PRICE.save}</span>
      </div>

      <p className="text-[14px] text-[var(--muted)] mt-2 mb-0">Per kit, when your batch is confirmed</p>

      <p className="text-[14px] text-[var(--muted)] mt-2 mb-0 flex items-center gap-2">
        <span className="dot" />In stock · {PRICE.ship}
      </p>

      <div className="flex items-center gap-3 mt-6">
        <div className="flex items-center rounded-full border" style={{ borderColor: 'var(--line)' }}>
          <StepButton label="Fewer kits" onClick={() => step(-1)} disabled={qty === 1}>−</StepButton>
          <span className="t-mono text-[15px] w-9 text-center tabular-nums" aria-live="polite"
                aria-label={`${qty} kit${qty > 1 ? 's' : ''}`}>{qty}</span>
          <StepButton label="More kits" onClick={() => step(1)} disabled={qty === MAX}>+</StepButton>
        </div>
        <button type="button" onClick={reserve} className="btn btn-brand flex-1 justify-center">
          Reserve free
        </button>
      </div>

      <p className="t-label mt-3 mb-0">₹0 today · just your name and email</p>

      <dl className="mt-7 m-0 grid gap-0 border-t" style={{ borderColor: 'var(--line)' }}>
        {[
          ['Dispatch', '1–2 weeks'],
          ['Due today', '₹0'],
          ['Assembly', 'You build it'],
          ['Shell', 'Printed, included'],
          ['Licence', 'Apache-2.0'],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2.5 border-b"
               style={{ borderColor: 'var(--line)' }}>
            <dt className="t-label">{k}</dt>
            <dd className="t-mono text-[13px] m-0 text-right">{v}</dd>
          </div>
        ))}
      </dl>
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
      className="w-9 h-9 grid place-items-center text-[17px] rounded-full disabled:opacity-35
                 hover:bg-[var(--surface-2)] transition-colors"
    >
      {children}
    </button>
  )
}
