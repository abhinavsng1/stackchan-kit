'use client'

import { useEffect, useState } from 'react'
import { EDITION, PRICE } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'
import BookNowButton from '@/components/BookNowButton'
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
export default function BuyBar({ location = 'buybar', magic = false }: {
  location?: string
  /** Whether Book opens the one-tap window or jumps to the form. */
  magic?: boolean
} = {}) {
  const [show, setShow] = useState(false)
  const edition = useEdition()

  useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0
      const hero = document.getElementById('hero')
      const buy = document.getElementById('buy') ?? document.getElementById('editions')
      const demo = document.getElementById('does')
      const reserve = document.getElementById('reserve')
      if (!hero || !reserve) return

      const heroGone = hero.getBoundingClientRect().bottom < 0
      const over = (el: HTMLElement) => {
        const r = el.getBoundingClientRect()
        return r.top < window.innerHeight * 0.9 && r.bottom > 0
      }

      // Not over the demo either: its words and controls sit at the bottom of
      // the screen, exactly where the bar would cover them.
      // The demo only counts while it fills the middle of the screen, so the
      // bar comes back as soon as the next section takes over.
      const centred = (el: HTMLElement) => {
        const r = el.getBoundingClientRect()
        return r.top < window.innerHeight / 2 && r.bottom > window.innerHeight / 2
      }
      setShow(heroGone && !(buy && over(buy)) && !over(reserve) && !(demo && centred(demo)))
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
          <div className="text-[15px] font-medium leading-tight">Book {edition === 'kit' ? 'the kit' : 'PebbleRobo'} for {PRICE.deposit}</div>
          <div className="t-mono text-[11.5px] text-[var(--muted)] mt-0.5 truncate">
            {PRICE.now} to buy · rest on delivery · free shipping
          </div>
        </div>
        <BookNowButton magic={magic} location={location}
                       className="btn btn-brand ml-auto shrink-0"
                       tabIndex={show ? undefined : -1}>
          Book <span className="arrow" aria-hidden="true">→</span>
        </BookNowButton>
      </div>
    </div>
  )
}
