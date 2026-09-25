'use client'

import { useEffect, useRef } from 'react'
import { PRICE } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'

/**
 * The first screen.
 *
 * What it replaced was a breadcrumb and a product gallery — a competent
 * catalogue page that told you what the thing was and nothing about why you
 * would want it. This says the only thing worth saying to a developer in the
 * first two seconds: you build this, with your hands, in an evening.
 *
 * The footage is the argument. It is a phone video of a real person actually
 * assembling a real kit at a real desk, and it is deliberately left vertical
 * and slightly rough. A polished landscape render would say "product shoot";
 * this says "someone did this on a Tuesday". For an audience that can smell a
 * stock asset, that roughness is the credential.
 *
 * Black is doing the work the brand asks of it. The palette specifies roughly
 * 30% black, and the page was almost entirely Paper — calm to the point of
 * flat. One full-bleed dark screen at the top spends that budget where it
 * changes the most.
 */
export default function Hero() {
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = video.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Muted, so this is allowed without a gesture. A hero that asks
    // permission to move is a hero that never moves.
    void el.play().catch(() => {})
  }, [])

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: 'var(--pebble-black)', color: 'var(--pebble-paper)' }}
    >
      <div className="wrap flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.78fr)]
                      gap-9 lg:gap-16 items-center py-10 md:py-16 lg:py-24">

        <div className="order-2 lg:order-1">
          <p className="t-label m-0 mb-6" style={{ color: 'var(--pebble-mist)' }}>
            Pebble-chan · Batch 01
          </p>

          {/* Display, at the size the brand actually specifies. The page was
              using it at half scale, which is most of why it read as timid. */}
          <h1
            className="t-display m-0 mb-6"
            style={{ fontSize: 'clamp(32px, 6.4vw, 72px)', lineHeight: 1.05, color: 'var(--pebble-white)' }}
          >
            Build it yourself.<br />Then make it yours.
          </h1>

          <p className="m-0 mb-8 text-[17px] leading-[28px] max-w-[40ch]"
             style={{ color: 'var(--pebble-mist)' }}>
            Eight parts, one evening, no soldering. Then it runs whatever you
            write — JavaScript or Arduino, on a stock ESP32-S3.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <a
              href="#reserve"
              onClick={() => track(EV.reserveCtaClicked, { location: 'hero' })}
              className="btn"
              style={{
                background: 'var(--pebble-white)',
                borderColor: 'var(--pebble-white)',
                color: 'var(--pebble-black)',
              }}
            >
              Order a kit — {PRICE.now}
            </a>
            <a href="#demo" className="text-[15px] no-underline hover:underline underline-offset-4"
               style={{ color: 'var(--pebble-mist)' }}>
              Watch what it does
            </a>
          </div>

          <p className="t-mono text-[12px] mt-8 mb-0" style={{ color: 'var(--pebble-stone)' }}>
            {PRICE.ship} · ships across India · {PRICE.save}
          </p>
        </div>

        {/* The footage, in the shape it was shot in. */}
        <div className="order-1 lg:order-2 relative mx-auto w-full max-w-[340px] sm:max-w-[380px] lg:max-w-none">
          {/* The footage is 9:16. Shown at its full height the hero runs past
              two screens and pushes the price and the button out of sight, so
              the frame is capped and the video covers it. The crop keeps the
              hands, which are the whole point. */}
          <div
            className="relative overflow-hidden h-[340px] sm:h-[420px] lg:h-[540px]"
            style={{ borderRadius: 'var(--radius-tile)', background: 'var(--pebble-graphite)' }}
          >
            <video
              ref={video}
              data-testid="hero-video"
              className="w-full h-full object-cover block"
              poster="/media/build-poster.webp"
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Someone assembling a Pebble-chan kit by hand at a desk"
            >
              <source src="/media/build.webm" type="video/webm" />
              <source src="/media/build.mp4" type="video/mp4" />
            </video>
          </div>

          <p className="t-mono text-[11.5px] mt-4 mb-0 text-center lg:text-left"
             style={{ color: 'var(--pebble-stone)' }}>
            Not a render. Batch 01, assembled at a desk in Bengaluru.
          </p>
        </div>
      </div>
    </section>
  )
}
