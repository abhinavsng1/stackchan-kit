'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { SHELLS } from '@/lib/shells'

/**
 * The hero's robot: the real one, rigged, following the cursor.
 *
 * It was a still before, which is the wrong thing for a product whose whole
 * argument is that it moves. The model is built from the seven printed parts
 * with the head and neck on their own servos, so the thing on the page does
 * what the thing on the desk does.
 *
 * The callouts and the swatches are HTML over the canvas rather than drawn
 * into it: the text stays selectable and readable aloud, it never goes soft,
 * and changing a figure does not mean re-rendering a model.
 *
 * Everything heavy stays out of the first paint. three and the loaders are a
 * dynamic import; until they land the poster carries the hero, which is also
 * what remains if WebGL is unavailable or motion has been turned down.
 */
const CHIPS = [
  { x: 4, y: 26, label: 'Brain', value: 'ESP32-S3 · Wi-Fi + BLE', from: 'left' as const },
  { x: 72, y: 40, label: 'Face', value: '2.0" touch · 320 × 240', from: 'right' as const },
  { x: 10, y: 74, label: 'Neck', value: 'Pan 180° · tilt 90°', from: 'left' as const },
]

export default function Hero3D() {
  const host = useRef<HTMLDivElement>(null)
  const api = useRef<{ setShell: (hex: string) => void; dispose: () => void } | null>(null)
  const [live, setLive] = useState(false)
  const [shell, setShell] = useState(0)
  const [quiet, setQuiet] = useState<boolean | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const read = () => setQuiet(mq.matches)
    read()
    mq.addEventListener('change', read)
    return () => mq.removeEventListener('change', read)
  }, [])

  useEffect(() => {
    if (quiet !== false) return
    const el = host.current
    if (!el) return
    let cancelled = false
    let stop = () => {}

    const io = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting) return
      io.disconnect()
      try {
        const mod = await import('@/lib/live-robot')
        if (cancelled) return
        const started = await mod.start(el)
        api.current = started
        started.setShell(SHELLS[0].hex)
        stop = started.dispose
        setLive(true)
      } catch {
        // The poster is a perfectly good picture of the robot; a WebGL
        // failure is not worth an error state in a hero.
      }
    }, { rootMargin: '200px' })

    io.observe(el)
    return () => { cancelled = true; io.disconnect(); stop() }
  }, [quiet])

  function pick(i: number) {
    setShell(i)
    api.current?.setShell(SHELLS[i].hex)
  }

  return (
    <div className="relative">
      {/* No card. A product shot on a page this dark does not need a frame
          drawn round it — the frame was doing the job a shadow should do, and
          a bordered box in the middle of a hero reads as a widget. What sits
          under the robot instead is one soft radial behind it and an
          elliptical contact shadow below, which is what an object on a
          surface actually casts. */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(44% 40% at 50% 44%, var(--signal-glow) 0%, transparent 70%)',
            filter: 'blur(14px)',
          }}
        />
        <div ref={host} className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
          <Image
            src={`/media/shots/shell-${SHELLS[shell].id}.webp`}
            alt="Pebble-chan, the assembled desk robot"
            width={1600} height={1200} priority
            sizes="(max-width: 1024px) 94vw, 620px"
            className="absolute inset-0 w-full h-full object-contain"
            style={{ opacity: live ? 0 : 1, transition: 'opacity 500ms' }}
          />
        </div>
        {/* The shadow it stands in. Elliptical, because a round object lit
            from above casts an ellipse, and soft enough to read as contact
            rather than as a drawn circle. */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            bottom: '7%', width: '46%', height: '7%',
            background: 'radial-gradient(50% 50% at 50% 50%, rgba(0,0,0,.85) 0%, transparent 72%)',
            filter: 'blur(10px)',
          }}
        />
      </div>

      {/* Callouts sit on an unclipped layer so one may hang over the frame's
          edge, which is the point of a callout. Below sm they become a row
          underneath: floated over a phone-width frame they cover the robot. */}
      {CHIPS.map((c) => (
        <div
          key={c.label}
          className="hidden sm:flex absolute items-center gap-2.5"
          style={{
            left: `${c.x}%`, top: `${c.y}%`,
            transform: `translate(${c.from === 'right' ? '0' : '-30%'}, -50%)`,
          }}
        >
          <span className="px-3 py-2 backdrop-blur-md whitespace-nowrap"
                style={{
                  borderRadius: 10, background: 'rgba(5,5,5,.78)',
                  border: '1px solid var(--line)',
                }}>
            <span className="t-mono block text-[10px] uppercase"
                  style={{ letterSpacing: '.14em', color: 'var(--muted-2)' }}>{c.label}</span>
            <span className="t-mono block text-[12.5px] mt-0.5">{c.value}</span>
          </span>
        </div>
      ))}

      <div className="flex sm:hidden flex-wrap gap-x-5 gap-y-2 mt-4">
        {CHIPS.map((c) => (
          <span key={c.label} className="t-mono text-[11.5px]" style={{ color: 'var(--muted-2)' }}>
            {c.value}
          </span>
        ))}
      </div>

      {/* The swatches recolour the live model, not a photograph of it. */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-4 flex items-center gap-3 px-3.5 py-2.5"
           style={{
             borderRadius: 999, background: 'rgba(5,5,5,.78)',
             border: '1px solid var(--line)', backdropFilter: 'blur(10px)',
           }}>
        <span className="t-mono text-[11px] pl-1" style={{ color: 'var(--muted-2)' }}>
          {SHELLS[shell].name}
        </span>
        <div role="radiogroup" aria-label="Shell colour" className="flex items-center gap-2">
          {SHELLS.map((s, i) => (
            <button
              key={s.id} type="button" role="radio"
              aria-checked={i === shell} aria-label={s.name}
              onClick={() => pick(i)}
              className="block cursor-pointer"
              style={{
                width: 20, height: 20, borderRadius: 999, background: s.hex,
                // Drawn outside the swatch, so the ring never tints the
                // colour someone is trying to judge.
                outline: i === shell ? '2px solid var(--ink)' : '1px solid rgba(255,255,255,.2)',
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
