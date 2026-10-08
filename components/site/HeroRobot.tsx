'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'
import { SHELLS, type Shell } from '@/lib/shells'
import Swatch from '@/components/site/Swatch'
import { MOODS } from '@/lib/companion-face'
import { EASE } from '@/components/site/motion'

/**
 * The hero's robot: the real rig, built from the printed parts, watching the
 * cursor anywhere on the first screen.
 *
 * Everything heavy stays out of the first paint. three and the loaders are a
 * dynamic import; until they land the render carries the hero, and that
 * render is also what remains with reduced motion, Save-Data, or no WebGL.
 *
 * The mood readout under it is the robot's own state, reported back from the
 * face it is drawing — tap it and the word changes with the face.
 */
export default function HeroRobot({ area }: { area: React.RefObject<HTMLElement | null> }) {
  const host = useRef<HTMLDivElement>(null)
  const api = useRef<{ setShell: (way: Shell) => void; dispose: () => void } | null>(null)
  const [live, setLive] = useState(false)
  const [shell, setShell] = useState(0)
  const [mood, setMood] = useState(0)
  const [quiet, setQuiet] = useState<boolean | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const saveData = Boolean((navigator as unknown as { connection?: { saveData?: boolean } })
      .connection?.saveData)
    const read = () => setQuiet(mq.matches || saveData)
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
        const started = await mod.start(el, {
          onFace: setMood,
          pointerArea: area.current ?? undefined,
        })
        if (cancelled) { started.dispose(); return }
        api.current = started
        started.setShell(SHELLS[shell])
        stop = started.dispose
        setLive(true)
      } catch {
        // The render is a perfectly good picture of the robot; a WebGL
        // failure is not worth an error state in a hero.
      }
    }, { rootMargin: '200px' })

    io.observe(el)
    return () => { cancelled = true; io.disconnect(); stop() }
    // The shell is applied on start and by pick(); re-running on change would
    // tear the scene down for a colour swap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiet, area])

  function pick(i: number) {
    setShell(i)
    api.current?.setShell(SHELLS[i])
  }

  return (
    <div className="relative">
      <div className="relative">
        {/* The floor it stands on: one soft ellipse, which is what an object
            lit from above actually casts. No glow, no gradient halo. */}
        <div aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
             style={{
               bottom: '11%', width: '46%', height: '6%',
               background: 'radial-gradient(50% 50% at 50% 50%, rgba(17,17,17,.22) 0%, transparent 70%)',
             }} />
        <div ref={host} className="relative w-full cursor-pointer" style={{ aspectRatio: '1 / 1' }}
             data-testid="hero-robot">
          {SHELLS.map((s, i) => (
            <Image
              key={s.id}
              src={`/media/shots/float-shell-${s.id}.webp`}
              alt={i === 0 ? 'PebbleRobo, the assembled desk robot' : ''}
              aria-hidden={i !== 0}
              width={1600} height={1200} priority={i === 0}
              sizes="(max-width: 1024px) 92vw, 640px"
              className="absolute inset-0 w-full h-full object-contain"
              style={{
                opacity: !live && i === shell ? 1 : 0,
                transition: 'opacity 500ms var(--ease)',
              }}
            />
          ))}
        </div>
      </div>

      {/* The controls sit under the robot, never over it. */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 mt-1">
        <div className="flex items-center gap-3 min-h-[28px]">
          <span className="live-dot" aria-hidden="true" />
          <span className="t-mono text-[12px] text-[var(--muted)]">
            {live ? 'Feeling ' : 'PebbleRobo'}
          </span>
          {live && (
            <span className="relative inline-block overflow-hidden h-[18px] min-w-[80px]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={MOODS[mood]?.id}
                  className="t-mono text-[12px] text-[var(--ink)] absolute left-0 top-0"
                  initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -18, opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  aria-live="polite"
                >
                  {MOODS[mood]?.name.toLowerCase()}
                </motion.span>
              </AnimatePresence>
            </span>
          )}
        </div>

        <div role="radiogroup" aria-label="Shell colour" className="flex items-center gap-2.5">
          <span className="t-mono text-[12px] text-[var(--muted)] mr-1 hidden sm:inline">
            {SHELLS[shell].name}
          </span>
          {SHELLS.map((s, i) => (
            <button
              key={s.id} type="button" role="radio"
              aria-checked={i === shell} aria-label={s.name}
              onClick={() => pick(i)}
              className="block cursor-pointer rounded-full transition-transform duration-200 hover:scale-110"
              style={{
                outline: i === shell ? '1.5px solid var(--ink)' : '1.5px solid transparent',
                outlineOffset: 3,
              }}
            >
              <Swatch way={s} size={22} />
            </button>
          ))}
        </div>
      </div>
      <p className="t-mono text-[11.5px] text-[var(--muted-2)] mt-3 mb-0 hidden md:block">
        {live ? 'It’s watching your cursor. Tap it to change its mood.' : ' '}
      </p>
    </div>
  )
}
