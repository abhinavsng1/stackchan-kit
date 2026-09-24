'use client'

import { useEffect, useState } from 'react'
import { PRICE } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'

/**
 * Phone-only buy bar. Appears once the buy box has scrolled away, and retreats
 * over the reserve section so it never covers the form it points at.
 *
 * Deliberately a scroll handler rather than IntersectionObserver: IO only fires
 * when intersection *changes*, so jumping straight from the top of the page to
 * a section below the hero — exactly what the nav links do — produced no
 * callback at all and the bar never appeared.
 */
export default function BuyBar() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0
      const box = document.getElementById('buybox')
      const reserve = document.getElementById('reserve')
      if (!box || !reserve) return

      const boxGone = box.getBoundingClientRect().bottom < 0
      const r = reserve.getBoundingClientRect()
      const atForm = r.top < window.innerHeight * 0.9 && r.bottom > 0

      setShow(boxGone && !atForm)
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    /**
     * A hash navigation — a nav link, or someone arriving on /#specs — moves
     * the page without necessarily producing a scroll event we catch in time.
     * Re-measure after it settles, so the bar is right however you got there.
     */
    const onHash = () => {
      measure()
      setTimeout(measure, 120)
      setTimeout(measure, 600)
    }

    measure()
    onHash()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    window.addEventListener('hashchange', onHash)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('hashchange', onHash)
    }
  }, [])

  return (
    <div className="buybar" data-show={show} aria-hidden={!show}>
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="t-display text-[19px] leading-none">{PRICE.now}</span>
            <span className="t-mono text-[12px] text-[var(--muted)] line-through">{PRICE.mrp}</span>
          </div>
          <div className="t-label mt-1 truncate">Per kit · ₹0 today</div>
        </div>
        <a href="#reserve" className="btn btn-brand ml-auto shrink-0 !py-3"
           onClick={() => track(EV.reserveCtaClicked, { location: 'buybar' })}
           tabIndex={show ? undefined : -1}>
          Order a kit
        </a>
      </div>
    </div>
  )
}
