'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { PRICE, CAMPAIGN } from '@/lib/kit'
import Countdown from '@/components/Countdown'
import { EV, track } from '@/lib/analytics'

/**
 * The first screen: the real build footage, full-bleed and sharp, with the
 * words in a panel that sits on it.
 *
 * Three attempts got here. A two-column layout with a video beside the text
 * read as a catalogue. A dark page with a signal colour read as an
 * engineering tool. Then the footage went behind a 2.5px blur and a heavy
 * top-to-bottom gradient so the headline would clear it — which made the one
 * asset that cannot be faked into an unreadable brown wash. A visitor saw no
 * product at all above the fold.
 *
 * So the footage is now untouched: no blur, no full-frame scrim. The type
 * gets its own bounded panel instead, and contrast is solved where the words
 * are and nowhere else.
 *
 * The clip changed too, and that mattered more than any of the above. The
 * assembly footage is a handheld phone video shot portrait in a dim red-lit
 * room and cropped wide — authentic, but no amount of CSS makes it read as a
 * product at 1440. It has moved to the build section, where being a real
 * phone video of a real assembly is the point. What runs here instead is the
 * finished robot on a desk in daylight: steady, in focus, landscape, and
 * cycling through its own expressions. Someone arriving cold now sees the
 * thing they would be buying.
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
        style={{ borderRadius: 'var(--radius-tile)', background: 'var(--pebble-ink)' }}
      >
        <video
          ref={video}
          data-testid="hero-video"
          className="hero-video absolute inset-0 w-full h-full object-cover"
          poster="/media/unit-demo-poster.webp"
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        >
          <source src="/media/unit-demo.webm" type="video/webm" />
          <source src="/media/unit-demo.mp4" type="video/mp4" />
        </video>

        {/* Just enough at the very top for the logo, and a whisper at the
            bottom so the panel is not a sticker. The middle of the frame is
            left alone. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(11,11,12,.55) 0%, rgba(11,11,12,0) 22%,'
              + ' rgba(11,11,12,0) 62%, rgba(11,11,12,.38) 100%)',
          }}
        />

        <div className="relative flex flex-col min-h-[74vh] md:min-h-[78vh] lg:min-h-[640px]
                        p-4 sm:p-6 lg:p-8">
          <Image
            src="/brand/logo-horizontal-white.svg"
            alt="Pebble Robotics"
            width={160} height={17} priority
            className="w-[124px] h-auto ml-2 mt-1 mb-auto opacity-95"
          />

          {/* The panel. Ink rather than paper: the footage is warm and dim, and
              a light block on it reads as a banner pasted over the film. */}
          <div
            className="w-full sm:max-w-[560px] lg:max-w-[600px] p-5 sm:p-8 lg:p-10 backdrop-blur-md"
            style={{
              borderRadius: 'var(--radius-tile)',
              background: 'rgba(11,11,12,.80)',
              border: '1px solid rgba(243,241,237,.12)',
            }}
          >
            <p className="t-label m-0 mb-3 sm:mb-4" style={{ color: 'rgba(243,241,237,.66)' }}>
              Pebble-chan · Batch 01 · {CAMPAIGN.name}
            </p>

            <h1
              className="t-display m-0 mb-4 sm:mb-5"
              style={{
                fontSize: 'clamp(32px, 4.6vw, 62px)',
                lineHeight: 1.0,
                color: 'var(--pebble-white)',
              }}
            >
              Build the robot.<br />Then teach it.
            </h1>

            <p className="m-0 mb-5 sm:mb-7 text-[15px] sm:text-[16px] leading-[24px] sm:leading-[26px] max-w-[42ch]"
               style={{ color: 'rgba(243,241,237,.78)' }}>
              Eight parts, one evening, no soldering. After that it runs whatever
              you write.
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
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

            <div className="mt-6 pt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2"
                 style={{ borderTop: '1px solid rgba(243,241,237,.14)' }}>
              <span className="t-mono text-[12.5px] line-through" style={{ color: 'rgba(243,241,237,.45)' }}>
                {PRICE.mrp}
              </span>
              <span className="t-mono text-[12.5px]" style={{ color: 'rgba(243,241,237,.78)' }}>
                {PRICE.save}
              </span>
              <Countdown tone="light" />
            </div>
          </div>

          <p className="t-mono text-[11px] mt-4 mb-0 ml-2"
             style={{ color: 'rgba(243,241,237,.58)' }}>
            Not a render — a batch 01 unit running, filmed on a desk in Bengaluru
          </p>
        </div>
      </div>
    </section>
  )
}
