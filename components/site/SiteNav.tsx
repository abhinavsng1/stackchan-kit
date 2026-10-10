'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Wordmark from '@/components/site/Wordmark'
import { EASE } from '@/components/site/motion'
import { PRICE } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'
import { useEdition } from '@/lib/edition-store'

/**
 * Large and transparent over the hero; once the page moves, it gathers itself
 * into a compact floating bar. On a phone the links live in a full-screen
 * menu instead of a cramped strip.
 *
 * The links are written for a buyer, not an org chart: what it is, what it
 * does, who has one, and the questions.
 */
export default function SiteNav({ stories }: { stories: boolean }) {
  const [compact, setCompact] = useState(false)
  const [open, setOpen] = useState(false)
  const edition = useEdition()

  const links: [string, string][] = [
    ['What it does', '#does'],
    ['Colours', '#explore'],
    ['Where it fits', '#everyday'],
    ...(stories ? [['Stories', '#stories'] as [string, string]] : []),
    ['FAQ', '#faq'],
  ]

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // The open menu owns the screen: lock the page behind it, and let Escape
  // close it the way every other overlay does.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [open])

  const buy = (location: string) => () => {
    setOpen(false)
    track(EV.reserveCtaClicked, { location, edition })
  }

  return (
    <>
      <header className="nav" data-compact={compact}>
        <div className="nav-bar">
          <a href="#top" className="shrink-0 no-underline text-[var(--ink)]" aria-label="PebbleRobo, home">
            <Wordmark size={compact ? 20 : 24} />
          </a>

          <nav className="hidden lg:flex items-center gap-7 mx-auto" aria-label="Sections">
            {links.map(([label, href]) => (
              <a key={href} href={href} className="nav-link">{label}</a>
            ))}
          </nav>

          <div className="ml-auto lg:ml-0 flex items-center gap-2">
            <a href="#buy" onClick={buy('nav')} className="btn btn-brand btn-sm hidden sm:inline-flex">
              Buy <span className="opacity-60 font-normal">{PRICE.now}</span>
            </a>
            <button
              type="button"
              className="lg:hidden grid place-items-center w-11 h-11 rounded-full cursor-pointer"
              style={{ background: compact ? 'transparent' : 'var(--surface)', border: '1px solid var(--line-soft)' }}
              aria-label="Open menu" aria-expanded={open} aria-controls="site-menu"
              onClick={() => setOpen(true)}
            >
              <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
                <path d="M0 1h18M0 11h18" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
          </div>
        </div>

      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="site-menu" className="menu" role="dialog" aria-modal="true" aria-label="Menu"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <div className="flex items-center justify-between h-12">
              <Wordmark size={22} />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu"
                      className="grid place-items-center w-11 h-11 rounded-full cursor-pointer"
                      style={{ border: '1px solid var(--line)' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
            </div>

            <motion.nav
              className="flex flex-col mt-12" aria-label="Sections"
              initial="hidden" animate="shown"
              variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.06, delayChildren: 0.18 } } }}
            >
              {links.map(([label, href], i) => (
                <motion.a
                  key={href} href={href} onClick={() => setOpen(false)}
                  className="t-display flex items-baseline justify-between py-4 no-underline text-[var(--ink)]"
                  style={{ fontSize: 'clamp(40px, 11vw, 64px)', borderBottom: '1px solid var(--line-soft)' }}
                  variants={{ hidden: { opacity: 0, y: 28 }, shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
                >
                  {label}
                  <span className="t-mono text-[13px] text-[var(--muted-2)]">0{i + 1}</span>
                </motion.a>
              ))}
            </motion.nav>

            <motion.div className="mt-auto grid gap-3"
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45, duration: 0.5, ease: EASE }}>
              <a href="#buy" onClick={buy('menu')} className="btn btn-brand btn-lg w-full">
                Buy PebbleRobo · {PRICE.now} <span className="arrow" aria-hidden="true">→</span>
              </a>
              <p className="t-mono text-[12px] text-center text-[var(--muted)] m-0">
                {PRICE.deposit} to book · {PRICE.balance} on delivery · Free shipping in India
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
