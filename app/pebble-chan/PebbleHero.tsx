'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { pricing, type Variant } from '@/lib/variants'

/**
 * The first screen: the real robot, running, on a real desk.
 *
 * The footage is unretouched and handheld-steady rather than a studio render,
 * which is the whole argument — this page sells a thing that exists, and the
 * warm lamp and the figurines behind it are what a desk actually looks like.
 * Type sits in a bounded panel so contrast is solved where the words are and
 * the rest of the frame stays legible.
 */
export default function PebbleHero({ variant }: { variant: Variant }) {
  const video = useRef<HTMLVideoElement>(null)
  const p = pricing(variant)

  useEffect(() => {
    const el = video.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    void el.play().catch(() => {})
  }, [])

  return (
    <section className="px-3 pt-3 pb-6 md:px-4 md:pt-4 md:pb-10">
      <div className="relative overflow-hidden isolate"
           style={{ borderRadius: 'var(--radius-tile)', background: 'var(--pebble-ink)' }}>
        <video
          ref={video}
          data-testid="pebble-hero-video"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: '30% 50%' }}
          poster="/media/pebble/hero-poster.webp"
          muted loop playsInline preload="metadata" aria-hidden="true"
        >
          <source src="/media/pebble/hero.webm" type="video/webm" />
          <source src="/media/pebble/hero.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 pointer-events-none" style={{
          background:
            'linear-gradient(to bottom, rgba(11,11,12,.55) 0%, rgba(11,11,12,0) 24%,'
            + ' rgba(11,11,12,0) 58%, rgba(11,11,12,.42) 100%)',
        }} />

        <div className="relative flex flex-col min-h-[76vh] md:min-h-[80vh] lg:min-h-[660px]
                        p-4 sm:p-6 lg:p-8">
          <Image src="/brand/logo-horizontal-white.svg" alt="Pebble Robotics"
                 width={160} height={17} priority
                 className="w-[124px] h-auto ml-2 mt-1 mb-auto opacity-95" />

          {/* Panel right, robot left. The unit sits left-of-centre in this
              footage, so a panel on the left covers the one thing the page is
              selling. */}
          <div className="w-full sm:max-w-[520px] lg:max-w-[560px] sm:ml-auto p-5 sm:p-8 lg:p-10 backdrop-blur-md"
               style={{
                 borderRadius: 'var(--radius-tile)',
                 background: 'rgba(11,11,12,.80)',
                 border: '1px solid rgba(243,241,237,.12)',
               }}>
            <p className="t-label m-0 mb-3 sm:mb-4" style={{ color: 'rgba(243,241,237,.66)' }}>
              Pebble-chan · built and tested
            </p>

            <h1 className="t-display m-0 mb-4 sm:mb-5"
                style={{ fontSize: 'clamp(32px,4.6vw,62px)', lineHeight: 1.0, color: 'var(--pebble-white)' }}>
              A small robot<br />that looks up.
            </h1>

            <p className="m-0 mb-5 sm:mb-7 text-[15px] sm:text-[16px] leading-[24px] sm:leading-[26px] max-w-[42ch]"
               style={{ color: 'rgba(243,241,237,.78)' }}>
              It has a face that reacts, a head that turns to find you, and a voice.
              Assembled, flashed and switched on before it ships.
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <a href="#prebook" className="btn"
                 style={{
                   background: 'var(--pebble-white)', borderColor: 'var(--pebble-white)',
                   color: 'var(--pebble-black)', borderRadius: 999,
                 }}>
                Prebook for {p.deposit}
              </a>
              <span className="t-mono text-[12.5px]" style={{ color: 'rgba(243,241,237,.62)' }}>
                {variant === 'subscription'
                  ? `${p.total} + ${p.monthly}/mo`
                  : `${p.total} total · no subscription`}
              </span>
            </div>
          </div>

          <p className="t-mono text-[11px] mt-4 mb-0 ml-2" style={{ color: 'rgba(243,241,237,.58)' }}>
            Not a render: a finished unit running on a desk in Bengaluru
          </p>
        </div>
      </div>
    </section>
  )
}
