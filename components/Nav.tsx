'use client'

import { useEffect, useState, useCallback } from 'react'
import { PRICE } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'

const LINKS = [
  ['What it does', '#does'],
  ['In the box', '#box'],
  ['Specs', '#specs'],
  ['Build', '#build'],
  ['FAQ', '#faq'],
]

type Theme = 'light' | 'dark'

export default function Nav() {
  const [stuck, setStuck] = useState(false)
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    const root = document.documentElement
    const attr = root.getAttribute('data-theme') as Theme | null
    setTheme(attr ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  }, [])

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      track(EV.themeToggled, { to: next })
      try { localStorage.setItem('theme', next) } catch { /* private mode */ }
      return next
    })
  }, [])

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
          Stack<span className="text-[var(--brand)]">·</span>chan
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
          <button
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            className="btn btn-ghost !px-3 !py-2 !shadow-none"
          >
            <span aria-hidden="true" className="block w-4 h-4">
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </span>
          </button>
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

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a6.7 6.7 0 0 0 10.8 10.8Z" />
    </svg>
  )
}
