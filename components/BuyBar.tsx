'use client'

import { useEffect, useState } from 'react'
import { PRICE } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'

/**
 * Phone-only buy bar. Appears once the hero CTA has scrolled away, and retreats
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
      const hero = document.getElementById('hero-cta')
      const reserve = document.getElementById('reserve')
      if (!hero || !reserve) return

      const heroGone = hero.getBoundingClientRect().bottom < 0
      const r = reserve.getBoundingClientRect()
      const atForm = r.top < window.innerHeight * 0.9 && r.bottom > 0

      setShow(heroGone && !atForm)
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
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
          <div className="t-label mt-1 truncate">{PRICE.ship}</div>
        </div>
        <a href="#reserve" className="btn btn-brand ml-auto shrink-0 !py-3"
           onClick={() => track(EV.reserveCtaClicked, { location: 'buybar' })}
           tabIndex={show ? undefined : -1}>
          Reserve a kit
        </a>
      </div>
    </div>
  )
}
