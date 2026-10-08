'use client'

import Image from 'next/image'

import { useEffect, useState } from 'react'
import { PRICE } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'
import { useEdition } from '@/lib/edition-store'
import { SwitchEdition } from '@/components/EditionGate'

const LINKS: [string, string, 'kit'?][] = [
  ['Watch', '#watch'],
  ['What it does', '#does'],
  ['Builds', '#builds'],
  ['Hardware', '#hardware'],
  // The kit section only exists once the kit is chosen, so neither does its link.
  ['The kit', '#kit', 'kit'],
  ['Specs', '#specs'],
  ['FAQ', '#faq'],
]

export default function Nav() {
  const [stuck, setStuck] = useState(false)
  const edition = useEdition()
  const links = LINKS.filter(([, , only]) => !only || only === edition)

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
        <a href="#top" className="shrink-0 no-underline" aria-label="Pebble Robotics — home">
          {/* Supplied artwork, never retyped. 140px is the stated minimum
              width for the horizontal lockup on screen. */}
          <Image src="/brand/logo-horizontal.svg" alt="Pebble Robotics"
                 width={160} height={17} priority className="w-[150px] h-auto block" />
        </a>

        <nav className="hidden xl:flex items-center gap-7 ml-2">
          {links.map(([label, href]) => (
            <a key={href} href={href}
               className="text-[14px] text-[var(--muted)] no-underline hover:text-[var(--ink)] transition-colors">
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden xl:flex items-baseline gap-2">
            <span className="t-mono text-[13px] text-[var(--muted)] line-through">{PRICE.mrp}</span>
            <span className="t-display text-[18px]">{PRICE.now}</span>
          </span>
          <a href="#reserve" onClick={() => track(EV.reserveCtaClicked, { location: 'nav', edition })}
             className="btn btn-brand !px-5 !py-2.5 !text-[14px] hidden lg:inline-flex">Buy</a>
        </div>
      </div>

      {/* the desktop nav is hidden below xl — seven links do not fit beside the
          logo and the price any narrower — so give everything smaller a strip */}
      <div className="wrap xl:hidden">
        <nav className="navstrip" aria-label="Sections">
          {links.map(([label, href]) => (
            <a key={href} href={href}
               className="text-[13.5px] whitespace-nowrap text-[var(--muted)] no-underline">
              {label}
            </a>
          ))}
        </nav>
      </div>

      {/* The kit is the exception, so it is announced while it is chosen and
          stays in view: the header is sticky, and so is this. One press puts
          the robot back. */}
      {edition === 'kit' && (
        <div data-testid="kit-banner" role="status"
             style={{ background: 'var(--ink)', color: 'var(--bg)' }}>
          <div className="wrap flex items-center gap-3 py-2.5 text-[13px] sm:text-[13.5px]">
            <span className="dot shrink-0" style={{ background: 'var(--bg)' }} aria-hidden="true" />
            <span className="min-w-0 truncate">
              <strong className="font-semibold">Build-it-yourself kit selected</strong>
              <span className="hidden sm:inline opacity-70"> · same {PRICE.now}, you assemble it</span>
            </span>
            <SwitchEdition to="assembled" location="kit-banner"
                           className="ml-auto shrink-0 underline underline-offset-4 cursor-pointer bg-transparent border-0 p-0 text-[13px] sm:text-[13.5px]"
            >
              <span style={{ color: 'var(--bg)' }}>
                <span className="sm:hidden">Switch to assembled</span>
                <span className="hidden sm:inline">Switch to fully assembled</span>
              </span>
            </SwitchEdition>
          </div>
        </div>
      )}
    </header>
  )
}
