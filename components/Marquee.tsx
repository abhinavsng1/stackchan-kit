'use client'

import { PRICE } from '@/lib/kit'

/**
 * The scrolling strip at the top of the page.
 *
 * It is decoration with facts in it, which means two rules. It is
 * aria-hidden, because a screen reader reading five repeated claims in a loop
 * is noise — every one of these appears as real text further down the page.
 * And it stops entirely under prefers-reduced-motion rather than slowing
 * down: a marquee is horizontal motion the reader did not ask for, which is
 * exactly the thing that setting exists to switch off.
 *
 * The content is duplicated once, and the animation translates by half the
 * track. That is what makes the loop seamless — at the moment it resets, the
 * second copy is exactly where the first began.
 */
const ITEMS = [
  'Batch 01 · booking open',
  `${PRICE.now} · ${PRICE.deposit} to book`,
  'Free delivery across India',
  'Assembled or kit, same price',
  'Open-source Stack-chan firmware',
]

export default function Marquee() {
  const run = [...ITEMS, ...ITEMS]
  return (
    <div
      aria-hidden="true"
      className="marquee"
      style={{
        borderBottom: '1px solid var(--line-soft)',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      <div className="marquee-track">
        {run.map((item, i) => (
          <span key={i} className="marquee-item t-mono">
            {item}
            <span className="marquee-star" aria-hidden="true">★</span>
          </span>
        ))}
      </div>
    </div>
  )
}
