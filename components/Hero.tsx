'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { PRICE } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'

/**
 * The first screen: one large piece of media, edge to edge, with the headline
 * living on it.
 *
 * Two earlier attempts got this wrong in opposite directions. A two-column
 * layout with a video panel beside the text read as a catalogue. Turning the
 * whole page dark and adding a signal colour read as an engineering tool.
 * What the reference actually does is simpler than either: make the picture
 * enormous, put the words on it, and leave a great deal of air.
 *
 * The footage is the real build — hands, a screwdriver, a desk in Bengaluru.
 * It is the one asset that cannot be faked, so it gets the whole screen.
 */
export default function Hero() {
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = video.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Muted, so this needs no gesture. A hero that asks permission to move
    // is a hero that never moves.
    void el.play().catch(() => {})
  }, [])

  return (
    <section className="px-3 pt-3 pb-6 md:px-4 md:pt-4 md:pb-10">
      <div
        className="relative overflow-hidden isolate"
        style={{ borderRadius: 'var(--radius-tile)', background: 'var(--pebble-black)' }}
      >
        <video
          ref={video}
          data-testid="hero-video"
          className="absolute inset-0 w-full h-full object-cover"
          poster="/media/build-poster.webp"
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        >
          <source src="/media/build.webm" type="video/webm" />
          <source src="/media/build.mp4" type="video/mp4" />
        </video>

        {/* Weighted to the bottom, where the words are. Without it the
            headline fights whatever the footage happens to be doing. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(10,10,11,.93) 0%, rgba(10,10,11,.72) 36%, rgba(10,10,11,.16) 70%, rgba(10,10,11,.30) 100%)',
          }}
        />

        <div className="relative flex flex-col justify-end min-h-[76vh] md:min-h-[80vh] lg:min-h-[660px]
                        p-6 sm:p-10 lg:p-14">
          <Image
            src="/brand/logo-horizontal-white.svg"
            alt="Pebble Robotics"
            width={160} height={17} priority
            className="w-[124px] h-auto mb-auto opacity-90"
          />

          <p className="t-label m-0 mb-5" style={{ color: 'rgba(243,241,237,.70)' }}>
            Pebble-chan · Batch 01
          </p>

          <h1
            className="t-display m-0 mb-6 max-w-[15ch]"
            style={{
              fontSize: 'clamp(40px, 7.4vw, 92px)',
              lineHeight: 0.98,
              color: 'var(--pebble-white)',
            }}
          >
            Build the robot. Then teach it.
          </h1>

          <p className="m-0 mb-9 text-[17px] leading-[27px] max-w-[40ch]"
             style={{ color: 'rgba(243,241,237,.80)' }}>
            Eight parts, one evening, no soldering. After that it runs whatever
            you write.
          </p>

          <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
            <a
              href="#reserve"
              onClick={() => track(EV.reserveCtaClicked, { location: 'hero' })}
              className="btn"
              style={{
                background: 'var(--pebble-white)',
                borderColor: 'var(--pebble-white)',
                color: 'var(--pebble-black)',
                borderRadius: 999,
              }}
            >
              Order a kit — {PRICE.now}
            </a>
            <span className="t-mono text-[12.5px]" style={{ color: 'rgba(243,241,237,.62)' }}>
              {PRICE.ship} · across India
            </span>
          </div>

          <p className="t-mono text-[11px] mt-10 mb-0"
             style={{ color: 'rgba(243,241,237,.42)' }}>
            Not a render — batch 01, assembled at a desk in Bengaluru
          </p>
        </div>
      </div>
    </section>
  )
}
