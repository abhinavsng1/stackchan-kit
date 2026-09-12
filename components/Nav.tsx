'use client'

import { useEffect, useState } from 'react'
import { PRICE } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'

const LINKS = [
  ['What it does', '#does'],
  ['In the box', '#box'],
  ['Specs', '#specs'],
  ['Build', '#build'],
  ['FAQ', '#faq'],
]

export default function Nav() {
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className="sticky top-0 z-50 transition-colors duration-200"
      style={{
        background: stuck ? 'color-mix(in srgb, var(--bg) 86%, transparent)' : 'transparent',
        backdropFilter: stuck ? 'saturate(180%) blur(12px)' : undefined,
        borderBottom: `1px solid ${stuck ? 'var(--line)' : 'transparent'}`,
      }}
    >
      <div className="wrap flex items-center gap-6 h-16">
        <a href="#top" className="t-display text-[19px] tracking-[-0.04em] no-underline text-[var(--ink)] shrink-0">
          Pebble<span className="text-[var(--brand)]">·</span>chan
        </a>

        <nav className="hidden lg:flex items-center gap-7 ml-2">
          {LINKS.map(([label, href]) => (
            <a key={href} href={href}
               className="text-[14px] text-[var(--muted)] no-underline hover:text-[var(--ink)] transition-colors">
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden lg:flex items-baseline gap-2">
            <span className="t-mono text-[13px] text-[var(--muted)] line-through">{PRICE.mrp}</span>
            <span className="t-display text-[18px]">{PRICE.now}</span>
          </span>
          <a href="#reserve" onClick={() => track(EV.reserveCtaClicked, { location: 'nav' })}
             className="btn btn-brand !px-5 !py-2.5 !text-[14px] hidden lg:inline-flex">Reserve</a>
        </div>
      </div>

      {/* the desktop nav is hidden below lg, so give phones a link strip */}
      <div className="wrap lg:hidden">
        <nav className="navstrip" aria-label="Sections">
          {LINKS.map(([label, href]) => (
            <a key={href} href={href}
               className="text-[13.5px] whitespace-nowrap text-[var(--muted)] no-underline">
              {label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  )
}
