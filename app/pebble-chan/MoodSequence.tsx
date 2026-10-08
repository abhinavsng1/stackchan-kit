'use client'

import { useEffect, useRef, useState } from 'react'
import { FACES, faceSvg } from '@/lib/faces'
import { indexForProgress, progressIn } from '@/lib/scroll-sequence'
import { WHEN } from './when'

/**
 * The faces, one at a time, driven by the scroll.
 *
 * The grid version showed all twelve at once, which answers "how many" and
 * nothing else. Here the page holds still and the robot changes its mind
 * while you scroll — the same thing it does on a desk, which is the only
 * argument this product has. One face fills the screen, its name and the
 * situation that produces it sit beside it, and the ambient light behind the
 * device takes the face's own accent colour, so the page itself changes
 * temperature as the mood changes.
 *
 * Everything is drawn from the atlas the firmware reads. No frame here is an
 * illustration of an expression; they are the expressions.
 *
 * Degrades honestly. Without JavaScript, or with reduced motion asked for,
 * the twelve render as a plain grid and nothing moves — see FaceWall, which
 * this renders instead in that case.
 */
export default function MoodSequence({ fallback }: { fallback: React.ReactNode }) {
  const host = useRef<HTMLElement>(null)
  const [i, setI] = useState(0)
  // Null until the client has decided. Rendering the sequence first and
  // swapping it out would animate once in front of someone who asked for no
  // animation, which is the one thing the setting is for.
  const [animate, setAnimate] = useState<boolean | null>(null)

  useEffect(() => {
    const quiet = window.matchMedia('(prefers-reduced-motion: reduce)')
    const decide = () => setAnimate(!quiet.matches)
    decide()
    quiet.addEventListener('change', decide)
    return () => quiet.removeEventListener('change', decide)
  }, [])

  useEffect(() => {
    if (!animate) return
    const el = host.current
    if (!el) return

    let frame = 0
    const read = () => {
      frame = 0
      const r = el.getBoundingClientRect()
      const p = progressIn(-r.top, r.height, window.innerHeight)
      setI(indexForProgress(p, FACES.length))
    }
    // Scroll fires far more often than the screen refreshes; reading layout
    // on every one of them is what makes a sticky section feel heavy.
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(read) }

    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [animate])

  if (animate === null || animate === false) return <>{fallback}</>

  const face = FACES[i]

  return (
    <section
      ref={host}
      aria-label="The twelve expressions"
      /* One viewport pinned, plus a screen of travel per face. */
      style={{ height: `${100 + FACES.length * 42}vh` }}
    >
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        {/* Ambient light. The face's own accent, bled through the page. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(60% 55% at 32% 45%, ${face.acc}2e 0%, transparent 70%)`,
            transition: 'background 700ms cubic-bezier(.2,.7,.3,1)',
          }}
        />

        <div className="wrap-wide relative w-full">
          <div className="grid gap-10 md:gap-16 items-center md:grid-cols-[minmax(0,1fr)_minmax(0,.85fr)]">
            {/* The device. A bezel drawn in CSS around the real panel art. */}
            <div className="relative mx-auto w-full max-w-[520px]">
              <div
                className="relative p-[3.5%]"
                style={{
                  borderRadius: 26,
                  background: 'linear-gradient(160deg, #2a2a2f 0%, #121214 46%, #202024 100%)',
                  boxShadow: `0 40px 90px -20px ${face.acc}33, 0 2px 0 rgba(255,255,255,.07) inset`,
                  transition: 'box-shadow 700ms cubic-bezier(.2,.7,.3,1)',
                }}
              >
                <div
                  className="overflow-hidden [&>svg]:block [&>svg]:w-full [&>svg]:h-auto"
                  style={{ borderRadius: 14, aspectRatio: '4 / 3' }}
                  /* The atlas emits a complete, self-contained <svg>. */
                  dangerouslySetInnerHTML={{ __html: faceSvg(face) }}
                />
              </div>
            </div>

            <div>
              <p className="t-label m-0 mb-5" style={{ color: 'var(--muted)' }}>
                {String(i + 1).padStart(2, '0')} / {FACES.length}
              </p>
              <h3
                className="t-display mt-0 mb-4"
                style={{ fontSize: 'clamp(38px,5vw,72px)', lineHeight: 1, color: face.acc }}
              >
                {face.name}
              </h3>
              <p className="text-[17px] md:text-[19px] leading-[29px] m-0 max-w-[34ch]"
                 style={{ color: 'var(--ink)' }}>
                {WHEN[face.id]}
              </p>

              {/* The rail doubles as the section's progress. */}
              <ul className="flex gap-1.5 list-none p-0 mt-10 mb-0">
                {FACES.map((f, n) => (
                  <li
                    key={f.id}
                    className="h-[3px] flex-1"
                    style={{
                      background: n === i ? face.acc : 'var(--line)',
                      borderRadius: 2,
                      transition: 'background 420ms',
                    }}
                  />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
