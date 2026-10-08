'use client'

import { useEffect, useState } from 'react'
import { EDITION, PRICE } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'
import { useEdition } from '@/lib/edition-store'

/**
 * Phone-only buy bar. Appears once the hero has scrolled away, and retreats
 * over the buy and order sections so it never covers the thing it points at.
 *
 * Deliberately a scroll handler rather than IntersectionObserver: IO only fires
 * when intersection *changes*, so jumping straight from the top of the page to
 * a section below the hero — exactly what the nav links do — produced no
 * callback at all and the bar never appeared.
 */
export default function BuyBar() {
  const [show, setShow] = useState(false)
  const edition = useEdition()

  useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0
      const hero = document.getElementById('hero')
      const buy = document.getElementById('buy')
      const reserve = document.getElementById('reserve')
      if (!hero || !buy || !reserve) return

      const heroGone = hero.getBoundingClientRect().bottom < 0
      const over = (el: HTMLElement) => {
        const r = el.getBoundingClientRect()
        return r.top < window.innerHeight * 0.9 && r.bottom > 0
      }

      setShow(heroGone && !over(buy) && !over(reserve))
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
          <div className="text-[15px] font-medium leading-tight">PebbleRobo · {PRICE.now}</div>
          <div className="t-mono text-[11.5px] text-[var(--muted)] mt-0.5 truncate">
            {EDITION[edition].label} · {PRICE.deposit} to book
          </div>
        </div>
        <a href="#buy" className="btn btn-brand ml-auto shrink-0"
           onClick={() => track(EV.reserveCtaClicked, { location: 'buybar', edition })}
           tabIndex={show ? undefined : -1}>
          Buy <span className="arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  )
}
