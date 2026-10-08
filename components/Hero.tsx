'use client'

import { useEffect, useRef } from 'react'
import Hero3D from '@/components/Hero3D'
import { PRICE } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'
import { useEdition } from '@/lib/edition-store'
import { SwitchEdition } from '@/components/EditionGate'

/**
 * The first screen: what it is, what it costs, and the thing itself, moving.
 *
 * The robot is now sold assembled, so the first screen leads with the finished
 * robot rather than the build. The words sit on paper to the left and the
 * footage stands upright to the right: it was shot on a phone held portrait,
 * and cropping it to a letterbox to fill the width threw away the robot's
 * legs — the one part that changed since the last batch.
 *
 * The loop is two passages from the desk film, joined, silent, under 800 KB.
 * It is a real batch 01 unit; the caption says so and has to stay true.
 */
export default function Hero() {
  const video = useRef<HTMLVideoElement>(null)
  const edition = useEdition()

  useEffect(() => {
    const el = video.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Muted, so this needs no gesture. A hero that asks permission to move
    // is a hero that never moves.
    void el.play().catch(() => {})
  }, [])

  return (
    <section className="wrap-wide pt-4 pb-12 md:pt-8 md:pb-20">
      <div className="grid gap-8 lg:gap-16 items-center lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="max-w-[640px]">
          <p className="t-label m-0 mb-5 flex items-center gap-2.5">
            <span aria-hidden="true" style={{ width: 8, height: 8, background: 'var(--signal-ink)' }} />
            {edition === 'kit' ? 'An AI companion, in parts' : 'An AI companion for your desk'}
          </p>

          {/* What it does, in the words someone would use about a pet rather
              than about a dev board. The accent falls on the half of the
              sentence that is the product's whole idea. */}
          <h1 className="t-display m-0 mb-6"
              style={{ fontSize: 'clamp(42px, 6.2vw, 88px)', lineHeight: 0.98 }}>
            Think out loud.<br />
            <span style={{ color: 'var(--signal)' }}>It&rsquo;s listening.</span>
          </h1>

          <p className="m-0 mb-8 text-[17px] sm:text-[19px] leading-[28px] sm:leading-[31px] text-[var(--muted)] max-w-[46ch]">
            {edition === 'kit'
              ? <>The same companion, in eight parts, with the shell already printed.
                  An evening to put together and no soldering — then say its name and
                  it looks up, listens and answers out loud.</>
              : <>Say its name and Pebble-chan looks up, listens, and answers out
                  loud. No app to open, no phone in your hand. The rest of the time it
                  simply keeps you company — it reacts, it fidgets, and it dozes off
                  when you do.</>}
          </p>

          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 mb-6">
            <span className="t-display text-[40px] leading-none">{PRICE.now}</span>
            <span className="t-mono text-[15px] text-[var(--muted)] line-through">{PRICE.mrp}</span>
            <span className="t-mono text-[13px] text-[var(--muted)]">
              {PRICE.deposit} to book · {PRICE.balance} on delivery
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a href="#reserve"
               onClick={() => track(EV.reserveCtaClicked, { location: 'hero', edition })}
               className="btn btn-brand !px-7 !py-4 !text-[16px]">
              Book yours — {PRICE.deposit}
            </a>
            <a href="#watch" className="btn btn-ghost !px-6 !py-4 !text-[16px]">
              <span aria-hidden="true">▶</span> Watch it move
            </a>
          </div>

          <ul className="flex flex-wrap gap-x-6 gap-y-2 list-none p-0 mt-7 mb-0">
            {['Built and tested', 'Free delivery across India',
              `${PRICE.deposit} now, the rest on delivery`].map((t) => (
              <li key={t} className="t-mono text-[12.5px] flex items-center gap-2"
                  style={{ color: 'var(--muted)' }}>
                <span aria-hidden="true" style={{ color: 'var(--signal-ink)' }}>✓</span>
                {t}
              </li>
            ))}
          </ul>

          <p className="text-[14px] text-[var(--muted)] mt-3 mb-0">
            {edition === 'kit' ? 'Rather have it ready to go? ' : 'Rather build it yourself? '}
            <SwitchEdition to={edition === 'kit' ? 'assembled' : 'kit'} location="hero"
                           className="text-[var(--ink)] underline underline-offset-4 bg-transparent border-0 p-0 cursor-pointer text-[14px]">
              {edition === 'kit' ? 'Switch to fully assembled' : 'The kit is the same price'}
            </SwitchEdition>.
          </p>
        </div>

        {/* The live model, not footage.
            The "not a render" caption belongs to the films and the desk
            photographs and stays with them — it may never sit beside a 3D
            model, which is exactly what it exists to distinguish. */}
        <Hero3D />
      </div>
    </section>
  )
}
